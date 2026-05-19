/**
 * Sales Forecast Engine
 *
 * Fetches last 12 months of revenue (Inflow transactions) from Supabase,
 * runs simple linear regression, and projects the next 3 months with
 * confidence interval bands.
 */
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyRevenue {
  /** Display label, e.g. "JAN 2026" */
  label: string;
  /** ISO yyyy-MM key used internally */
  key: string;
  /** Total inflow revenue for the month */
  revenue: number;
}

export interface ForecastPoint {
  label: string;
  actual: number | null;
  projected: number | null;
  upperBand: number | null;
  lowerBand: number | null;
}

export interface ForecastResult {
  data: ForecastPoint[];
  /** Coefficient of determination */
  rSquared: number;
  /** Monthly growth rate implied by the regression slope */
  monthlyGrowthRate: number;
  /** Whether we used real DB data or fell back to demo/transaction-based data */
  dataSource: 'supabase' | 'local';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function monthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Generate the last N month keys ending at `endDate` (inclusive).
 */
function lastNMonthKeys(n: number, endDate: Date = new Date()): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const d = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    const target = new Date(d.getFullYear(), d.getMonth() - (n - 1 - i), 1);
    result.push({ key: monthKey(target), label: monthLabel(target) });
  }
  return result;
}

// ── Simple Linear Regression ─────────────────────────────────────────────────

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  /** Standard error of the residuals */
  stdError: number;
}

function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = xs.length;
  if (n < 2) {
    return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0, stdError: 0 };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssTot += (ys[i] - yMean) ** 2;
    ssRes += (ys[i] - predicted) ** 2;
  }
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  // Standard error
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return { slope, intercept, rSquared, stdError };
}

// ── Main Forecast Function ───────────────────────────────────────────────────

/**
 * Fetches the last 12 months of Inflow revenue from Supabase,
 * performs linear regression, and projects the next 3 months.
 *
 * Falls back to local transaction data if Supabase is unavailable
 * or in demo mode.
 */
export async function getSalesForecast(
  localTransactions?: { date: string; amount: number; type: 'Inflow' | 'Outflow' }[]
): Promise<ForecastResult> {
  const isDemo = localStorage.getItem('is_demo_mode') === 'true';

  let anchorDate = new Date();
  if (localTransactions && localTransactions.length > 0) {
    const dates = localTransactions
      .filter(t => t.type === 'Inflow')
      .map(t => new Date(t.date).getTime())
      .filter(t => !isNaN(t));
    if (dates.length > 0) {
      anchorDate = new Date(Math.max(...dates));
    }
  }

  // Build the 12-month window
  const months = lastNMonthKeys(12, anchorDate);
  const startDate = months[0].key + '-01';

  let revenueByMonth: Record<string, number> = {};
  let dataSource: 'supabase' | 'local' = 'local';

  // ── Try Supabase first ───────────────────────────────────────────────────
  if (!isDemo) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('transactions')
          .select('date, amount, type')
          .eq('type', 'Inflow')
          .gte('date', startDate)
          .order('date', { ascending: true });

        if (!error && data && data.length > 0) {
          dataSource = 'supabase';
          data.forEach((tx: any) => {
            const d = new Date(tx.date);
            const key = monthKey(d);
            revenueByMonth[key] = (revenueByMonth[key] || 0) + Number(tx.amount);
          });
        }
      }
    } catch (e) {
      console.warn('[ForecastEngine] Supabase fetch failed, falling back to local data:', e);
    }
  }

  // ── Fallback: use passed-in local transactions ───────────────────────────
  if (dataSource === 'local' && localTransactions && localTransactions.length > 0) {
    localTransactions
      .filter(t => t.type === 'Inflow')
      .forEach(t => {
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return;
        const key = monthKey(d);
        revenueByMonth[key] = (revenueByMonth[key] || 0) + Math.abs(t.amount);
      });
  }

  // ── Build the actuals array ──────────────────────────────────────────────
  const actuals: MonthlyRevenue[] = months.map(m => ({
    label: m.label,
    key: m.key,
    revenue: revenueByMonth[m.key] || 0,
  }));

  // Filter to only months that have positive revenue for regression
  const nonZeroActuals = actuals.filter(a => a.revenue > 0);

  // ── Regression ───────────────────────────────────────────────────────────
  // Use sequential indices (0..n-1) for the months with data
  const xs = nonZeroActuals.map((_, i) => i);
  const ys = nonZeroActuals.map(a => a.revenue);

  const reg = linearRegression(xs, ys);

  // Confidence multiplier for ~80% prediction interval
  const confidenceMultiplier = 1.28;

  // ── Build chart data ─────────────────────────────────────────────────────
  const chartData: ForecastPoint[] = [];

  // Actual months
  actuals.forEach(a => {
    chartData.push({
      label: a.label.split(' ')[0], // short month name
      actual: a.revenue > 0 ? a.revenue : null,
      projected: null,
      upperBand: null,
      lowerBand: null,
    });
  });

  // Connect the last actual to the projection line
  const lastActualIdx = chartData.length - 1;
  if (lastActualIdx >= 0 && chartData[lastActualIdx].actual !== null) {
    chartData[lastActualIdx].projected = chartData[lastActualIdx].actual;
    chartData[lastActualIdx].upperBand = chartData[lastActualIdx].actual;
    chartData[lastActualIdx].lowerBand = chartData[lastActualIdx].actual;
  }

  // Next 3 months projection
  const lastDate = new Date();
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    const xVal = nonZeroActuals.length + i - 1;
    const predicted = Math.max(0, reg.slope * xVal + reg.intercept);

    // Widen confidence band as we project further out
    const uncertaintyFactor = 1 + (i - 1) * 0.15;
    const band = reg.stdError * confidenceMultiplier * uncertaintyFactor;

    chartData.push({
      label: MONTH_LABELS[futureDate.getMonth()],
      actual: null,
      projected: Math.round(predicted),
      upperBand: Math.round(predicted + band),
      lowerBand: Math.max(0, Math.round(predicted - band)),
    });
  }

  // Monthly growth rate
  const avgRevenue = ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : 1;
  const monthlyGrowthRate = avgRevenue !== 0 ? (reg.slope / avgRevenue) * 100 : 0;

  return {
    data: chartData,
    rSquared: Math.max(0, reg.rSquared),
    monthlyGrowthRate,
    dataSource,
  };
}

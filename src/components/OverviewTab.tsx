import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  ArrowUpRight, ArrowDownRight, Activity, Zap, Settings, BarChart as BarChartIcon, Plus, 
  RefreshCw, Globe, TrendingUp, Package, Brain, AlertTriangle, MessageSquare, Sparkles, X, 
  Calendar, Upload, Move, Shield, MessageCircle, FileText, CheckCircle2, ChevronRight, LayoutDashboard, Database, Container,
  Scale, Building2, ExternalLink, Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, PieChart, Pie, AreaChart, Area, Line 
} from 'recharts';

import { supabase, logAudit } from '../lib/supabase';
import { 
  getPredictiveAnalytics, AnalyticsInsight, generateMetisDailyBrief 
} from '../services/geminiService';
import { 
  getSalesForecast, ForecastPoint, ForecastResult 
} from '../services/forecastService';
import { EmptyState } from './EmptyState';

// Imported from App.tsx (after exporting them there)
import { 
  Transaction, LanguageContext, cn, convertGregorianToBS, getInventory, formatCurrency, formatTimeAgo
} from '../App';

interface MarketRow {
  ticker: string;
  company_name: string;
  price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
  fetched_at: string;
}

interface NrbUpdate {
  id: string;
  title: string;
  link: string | null;
  description: string | null;
  pub_date: string | null;
  category: string;
}

const NRB_CATEGORY_COLORS: Record<string, string> = {
  'Press Release': 'text-intelligence border-intelligence/40 bg-intelligence/10',
  'Monetary Policy': 'text-brand border-brand/40 bg-brand/10',
  'Notice': 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  'General': 'text-gray-400 border-gray-400/40 bg-gray-400/10'
};

const PIE_COLORS = ['#00f2ff', '#dc143c', '#ffffff', '#333333'];

// ─── NEPSE WATCHLIST ────────────────────────────────────────────────────────
function NepseWatchlist() {
  const [stocks, setStocks] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchMarketData() {
      try {
        const { data: latestRow } = await supabase
          .from('market_data')
          .select('fetched_at')
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestRow?.fetched_at) {
          const { data, error } = await supabase
            .from('market_data')
            .select('ticker, company_name, price, change_amount, change_percent, volume, fetched_at')
            .eq('fetched_at', latestRow.fetched_at)
            .order('ticker');

          if (!error && data && data.length > 0) {
            setStocks(data);
            setLastUpdated(new Date(latestRow.fetched_at).toLocaleTimeString());
            setIsLive(true);
          }
        }
      } catch (err) {
        console.error('[NepseWatchlist] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMarketData();
  }, []);

  const fallbackStocks: MarketRow[] = [
    { ticker: 'NABIL', company_name: 'Nabil Bank', price: 510.20, change_amount: 12.1, change_percent: 2.43, volume: 12340, fetched_at: '' },
    { ticker: 'NTC', company_name: 'Nepal Telecom', price: 890.00, change_amount: -10.8, change_percent: -1.20, volume: 8920, fetched_at: '' },
    { ticker: 'NICA', company_name: 'NIC Asia Bank', price: 720.50, change_amount: 5.7, change_percent: 0.80, volume: 15670, fetched_at: '' },
    { ticker: 'EBL', company_name: 'Everest Bank', price: 430.10, change_amount: 6.3, change_percent: 1.49, volume: 9340, fetched_at: '' },
    { ticker: 'CHCL', company_name: 'Chilime Hydro', price: 310.80, change_amount: -11.0, change_percent: -3.42, volume: 6780, fetched_at: '' },
  ];

  const displayStocks = stocks.length > 0 ? stocks : fallbackStocks;

  return (
    <div className="glass border-white/5 p-8 mt-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Activity size={120} className="text-intelligence" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 border-b border-white/5 pb-4 relative z-10 gap-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-intelligence mb-2 flex items-center gap-2">
            <Globe size={14} />
            Market Telemetry · Merolagani
          </h4>
          <h2 className="text-2xl font-black italic uppercase text-white flex items-center gap-3">
            NEPSE WATCHLIST
            {isLive && (
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-intelligence bg-intelligence/10 border border-intelligence/30 px-2 py-1 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-intelligence rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {lastUpdated && (
            <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest bg-black/40 px-3 py-1 border border-white/5">
              Last synced: {lastUpdated}
            </p>
          )}
          <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
            {isLive ? 'Source: Merolagani · Updated hourly' : 'Cached data — cron pending'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10">
          {displayStocks.map((stock) => {
            const up = stock.change_percent >= 0;
            return (
              <div key={stock.ticker} className="bg-white/[0.02] border border-white/5 p-4 hover:bg-white/[0.05] transition-all group flex flex-col justify-between gap-2">
                <div>
                  <h5 className="text-sm font-black tracking-widest text-white">{stock.ticker}</h5>
                  <p className="text-[9px] font-mono text-gray-600 truncate">{stock.company_name}</p>
                </div>
                <div>
                  <p className="text-lg font-mono text-white">Rs. {stock.price.toFixed(2)}</p>
                  <div className="flex items-center gap-1">
                    {up ? <ArrowUpRight size={12} className="text-intelligence" /> : <ArrowDownRight size={12} className="text-brand" />}
                    <span className={cn("text-[10px] font-bold font-mono", up ? "text-intelligence" : "text-brand")}>
                      {up ? '+' : ''}{stock.change_percent.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-gray-600 mt-1">Vol: {stock.volume.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legal Disclaimer */}
      <div className="mt-6 p-3 border border-white/5 bg-white/[0.01] flex items-start gap-2">
        <AlertTriangle size={12} className="text-brand shrink-0 mt-0.5" />
        <p className="text-[9px] font-mono text-gray-600 leading-relaxed">
          <span className="text-brand font-black">DISCLAIMER:</span> Market data displayed is sourced from Merolagani.com and is provided for informational purposes only. Data may be delayed. This is not financial advice. PROJECT N is not affiliated with NEPSE or any licensed brokerage. Always consult a SEBON-registered advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}

// ─── NRB POLICY TRACKER ─────────────────────────────────────────────────────
function NrbPolicyTracker() {
  const [updates, setUpdates] = useState<NrbUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    async function loadNrbUpdates() {
      try {
        const { data, error } = await supabase
          .from('nrb_updates')
          .select('*')
          .order('pub_date', { ascending: false })
          .limit(5);

        if (!error && data) {
          setUpdates(data);
          setLastFetched(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('[NrbPolicyTracker] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNrbUpdates();
  }, []);

  const fallbackUpdates: NrbUpdate[] = [
    { id: '1', title: 'Circular on Working Capital Loan Guidelines Revision', link: '#', description: 'Amended clauses regarding credit monitoring and inventory audits.', pub_date: '2026-05-15', category: 'Monetary Policy' },
    { id: '2', title: 'Press Release on Third Quarter Economic Review', link: '#', description: 'Highlights of balance of payments and foreign currency reserves.', pub_date: '2026-05-10', category: 'Press Release' },
    { id: '3', title: 'Notice on Licensed Payment Service Providers', link: '#', description: 'Updated directory of authorized e-wallet operators.', pub_date: '2026-05-02', category: 'Notice' }
  ];

  const displayUpdates = updates.length > 0 ? updates : fallbackUpdates;

  return (
    <div className="glass border-white/5 p-8 mt-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Scale size={120} className="text-brand" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 border-b border-white/5 pb-4 relative z-10 gap-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-2 flex items-center gap-2">
            <Building2 size={14} />
            NRB Telemetry · Regulatory Compliance
          </h4>
          <h2 className="text-2xl font-black italic uppercase text-white">NRB POLICY TRACKER</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {lastFetched && (
            <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest bg-black/40 px-3 py-1 border border-white/5">
              Sync complete: {lastFetched}
            </p>
          )}
          <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
            Source: Nepal Rastra Bank RSS · Updated daily
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.02] border border-white/5 animate-pulse rounded-sm" />
          ))}
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          {displayUpdates.map((update) => (
            <div key={update.id} className="border border-white/5 bg-white/[0.01] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.03] transition-all group">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-3">
                  <span className={cn("text-[8px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-sm", NRB_CATEGORY_COLORS[update.category] || NRB_CATEGORY_COLORS['General'])}>
                    {update.category}
                  </span>
                  <span className="text-[9px] font-mono text-gray-600">{update.pub_date}</span>
                </div>
                <h4 className="text-sm font-black text-white uppercase group-hover:text-brand transition-colors">{update.title}</h4>
                {update.description && (
                  <p className="text-[11px] text-gray-500 font-mono leading-relaxed">{update.description}</p>
                )}
              </div>
              {update.link && (
                <a 
                  href={update.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono text-intelligence hover:text-white uppercase tracking-widest flex items-center gap-1 shrink-0"
                >
                  View PDF <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QUANTUM INTELLIGENCE ───────────────────────────────────────────────────
function QuantumIntelligence() {
  const [insight, setInsight] = useState<AnalyticsInsight | null>(null);
  const [brief, setBrief] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const context = "Global market volatility is increasing, corporate debt is at record highs, and institutional capital is shifting towards emerging tech sectors.";
      const result = await getPredictiveAnalytics(context);
      setInsight(result);

      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('metis_briefs')
          .select('content')
          .eq('date', today)
          .maybeSingle();

        if (data && data.content) {
          setBrief(data.content);
        }
      } catch (err) {
        console.error("Could not fetch daily brief:", err);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const handleForceGenerate = async () => {
    setGenerating(true);
    try {
      const { data: txs } = await supabase.from('transactions').select('date, description, amount, type').limit(50);
      const { data: inv } = await supabase.from('inventory').select('name, stock, price').limit(50);
      const { data: queries } = await supabase.from('customer_queries').select('message').limit(20);

      const newBrief = await generateMetisDailyBrief(
        localStorage.getItem('business_name') || 'N CORP',
        txs || [],
        inv || [],
        queries || []
      );

      if (newBrief) {
        setBrief(newBrief);
        const { data: userData } = await supabase.from('users').select('business_id').eq('auth_id', (await supabase.auth.getSession()).data.session?.user?.id).maybeSingle();
        if (userData?.business_id) {
          await supabase.from('metis_briefs').upsert({
            business_id: userData.business_id,
            date: new Date().toISOString().split('T')[0],
            content: newBrief
          }, { onConflict: 'business_id,date' });
        }
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="glass border-white/5 p-8 flex flex-col gap-6 min-h-[300px]">
        <div className="h-8 w-1/3 bg-white/5 animate-pulse rounded-sm"></div>
        <div className="space-y-4">
          <div className="h-4 w-full bg-white/5 animate-pulse rounded-sm"></div>
          <div className="h-4 w-5/6 bg-white/5 animate-pulse rounded-sm"></div>
          <div className="h-4 w-4/6 bg-white/5 animate-pulse rounded-sm"></div>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="h-20 bg-white/5 animate-pulse rounded-sm"></div>
          <div className="h-20 bg-white/5 animate-pulse rounded-sm"></div>
          <div className="h-20 bg-white/5 animate-pulse rounded-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="xl:col-span-3 glass border-intelligence/20 p-8 relative overflow-hidden bg-intelligence/[0.02]"
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Brain size={120} className="text-intelligence" />
      </div>

      <div className="flex flex-col md:flex-row gap-12 relative z-10">
        
        {/* METIS DAILY BRIEF SECTION */}
        <div className="md:w-1/2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/20 border border-brand/50 rounded-sm shadow-[0_0_15px_rgba(220,20,60,0.3)]">
                <Brain className="text-brand" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase text-white tracking-widest">METIS DAILY BRIEF</h3>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">{new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
            
            {!brief && (
              <button 
                onClick={handleForceGenerate}
                disabled={generating}
                className="bg-brand/10 border border-brand text-brand hover:bg-brand hover:text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {generating ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
                {generating ? "PROCESSING..." : "FORCE CRON SYNC"}
              </button>
            )}
          </div>

          {brief ? (
            <div className="space-y-6 flex-1 bg-white/[0.02] border border-white/5 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 space-y-5">
                <div>
                  <h4 className="text-[9px] font-black text-brand uppercase tracking-widest mb-1">Executive Summary</h4>
                  <p className="text-sm text-white font-mono leading-relaxed">{brief.executiveSummary}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/5 p-3">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Database size={10} /> Financial Health</h4>
                    <p className="text-xs text-gray-300 font-mono leading-relaxed">{brief.financialHealth}</p>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-3">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Container size={10} /> Inventory Status</h4>
                    <p className="text-xs text-gray-300 font-mono leading-relaxed">{brief.inventoryInsights}</p>
                  </div>
                </div>
                
                <div className="bg-black/40 border border-white/5 p-3">
                  <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><MessageSquare size={10} /> Customer Sentiment</h4>
                  <p className="text-xs text-gray-300 font-mono leading-relaxed">{brief.customerSentiment}</p>
                </div>
                
                <div className="border-l-2 border-brand pl-4 py-2 bg-brand/5">
                  <h4 className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">Strategic Recommendation</h4>
                  <p className="text-sm text-white font-mono italic">{brief.strategicRecommendation}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-dashed border-gray-700 bg-black/20 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <AlertTriangle className="text-gray-600 mb-4" size={32} />
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest leading-relaxed max-w-xs">
                Awaiting Nightly Cron Execution.<br/>No brief synthesized for {new Date().toISOString().split('T')[0]}.
              </p>
            </div>
          )}
        </div>

        {/* QUANTUM INSIGHTS SECTION */}
        <div className="md:w-1/2 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-intelligence/20 rounded-sm shadow-[0_0_15px_rgba(0,242,255,0.2)]">
              <Sparkles className="text-intelligence" size={20} />
            </div>
            <h3 className="text-xl font-black italic uppercase glow-text">Predictive Models</h3>
          </div>

          <div className="flex-1">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Advanced Outcome Forecasts</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insight?.predictions.map((pred, i) => (
                <div key={i} className="p-6 bg-white/[0.03] border border-white/10 hover:border-intelligence/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest",
                      pred.impactLevel === 'Critical' ? "bg-brand/20 text-brand" :
                        pred.impactLevel === 'High' ? "bg-orange-500/20 text-orange-500" :
                          "bg-intelligence/20 text-intelligence"
                    )}>
                      {pred.impactLevel} IMPACT
                    </div>
                    <p className="text-[10px] font-mono text-gray-500">{pred.timeframe}</p>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-2 uppercase group-hover:text-intelligence transition-colors">{pred.title}</h4>
                  <p className="text-[11px] text-gray-500 font-mono mb-4 leading-normal">{pred.description}</p>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-mono text-gray-600 uppercase">
                      <span>Probability</span>
                      <span>{pred.probability}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pred.probability}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={cn("h-full", pred.impactLevel === 'Critical' ? "bg-brand" : "bg-intelligence")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── OVERVIEW VIEW ──────────────────────────────────────────────────────────
function OverviewView({ 
  transactions, 
  setTransactions, 
  onViewReport, 
  dateFormat, 
  onBulkAdd, 
  onSelectTab 
}: { 
  transactions: Transaction[], 
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>, 
  onViewReport: () => void, 
  dateFormat: 'AD' | 'BS', 
  onBulkAdd: (txs: Transaction[]) => Promise<void>,
  onSelectTab?: (tab: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => localStorage.getItem('overview_banner_dismissed') === 'true');

  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('overview_layout');
    if (saved) return JSON.parse(saved);
    return {
      summaryCardsOrder: [0, 1, 2, 3],
      showBarChart: true,
      showPieChart: true,
      showForecast: true,
      showNepse: true,
      showEconomic: true,
      aiInsightsVisibility: [true, true, true, true]
    };
  });
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('overview_layout', JSON.stringify(layout));
  }, [layout]);

  const handleCardDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditingLayout) return;
    setDraggedCardIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleCardDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!isEditingLayout) return;
    let dragIndex = draggedCardIndex;
    if (dragIndex === null) {
      const data = e.dataTransfer.getData('text/plain');
      if (data) {
        dragIndex = parseInt(data, 10);
      }
    }
    if (dragIndex === null || isNaN(dragIndex)) return;
    
    const newOrder = [...layout.summaryCardsOrder];
    const item = newOrder.splice(dragIndex, 1)[0];
    newOrder.splice(dropIndex, 0, item);
    setLayout({ ...layout, summaryCardsOrder: newOrder });
    setDraggedCardIndex(null);
  };

  const businessName = localStorage.getItem('business_name') || 'NEPAL VENTURES GLOBAL';
  const today = new Date();
  const adDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  const getDynamicFormattedBSDate = (adDateStr: string): string => {
    const bsStr = convertGregorianToBS(adDateStr);
    const parts = bsStr.split(' ')[0].split('-');
    if (parts.length < 3) return bsStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const BS_MONTH_NAMES = ["Baishakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Fagun", "Chaitra"];
    return `${BS_MONTH_NAMES[monthIndex]} ${day}, ${year} BS`;
  };
  
  const bsDate = getDynamicFormattedBSDate(today.toISOString().split('T')[0]);

  const dismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem('overview_banner_dismissed', 'true');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: Transaction[] = results.data.map((row: any) => {
          const amount = Math.abs(Number(row.amount));
          const type: 'Inflow' | 'Outflow' = Number(row.amount) >= 0 ? 'Inflow' : 'Outflow';
          return {
            date: String(row.date || new Date().toISOString().split('T')[0]),
            description: String(row.description || ''),
            amount: amount,
            category: String(row.category || 'Uncategorized'),
            type: type
          };
        }).filter(t => !isNaN(t.amount) && t.amount > 0);
        if (parsed.length > 0) {
          onBulkAdd(parsed);
        }
      }
    });
  };

  const dashboardStats = useMemo(() => {
    const totalInflow = transactions.filter(t => t.type === 'Inflow').reduce((acc, t) => acc + t.amount, 0);
    const totalOutflow = Math.abs(transactions.filter(t => t.type === 'Outflow').reduce((acc, t) => acc + t.amount, 0));
    const netDelta = totalInflow - totalOutflow;

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
      notation: 'compact'
    });

    return [
      { label: "Total Inflow", val: formatter.format(totalInflow), trend: "LIVE", c: "intelligence", icon: ArrowUpRight },
      { label: "Total Outflow", val: formatter.format(totalOutflow), trend: "LIVE", c: "brand", icon: ArrowDownRight },
      { label: "Net Delta", val: formatter.format(netDelta), trend: netDelta >= 0 ? "SURPLUS" : "DEFICIT", c: netDelta >= 0 ? "intelligence" : "brand", icon: Activity },
      { label: "Transactions", val: transactions.length.toLocaleString(), trend: "SYNCED", c: "intelligence", icon: Zap }
    ];
  }, [transactions]);

  const barChartData = useMemo(() => {
    const groups: Record<string, { inflow: number; outflow: number }> = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
      if (!groups[month]) groups[month] = { inflow: 0, outflow: 0 };
      if (t.type === 'Inflow') groups[month].inflow += t.amount;
      else groups[month].outflow += Math.abs(t.amount);
    });

    return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
  }, [transactions]);

  const pieChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  const loadForecast = async () => {
    setIsForecastLoading(true);
    try {
      const result = await getSalesForecast(
        transactions.map(t => ({ date: t.date, amount: t.amount, type: t.type }))
      );
      setForecastResult(result);
    } catch (e) {
      console.error('[ForecastEngine] Failed:', e);
    } finally {
      setIsForecastLoading(false);
    }
  };

  useEffect(() => {
    if (transactions.length > 0) {
      loadForecast();
    }
  }, [transactions]);

  const forecastChartData = forecastResult?.data ?? [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <AnimatePresence>
        {!isBannerDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="glass p-10 border-intelligence/30 bg-intelligence/[0.02] relative group">
              <button 
                onClick={dismissBanner}
                className="absolute top-6 right-6 text-gray-500 hover:text-white p-2 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-intelligence uppercase tracking-[0.4em] mb-3">Operational Authorization Active</h4>
                    <h2 className="text-4xl font-black italic uppercase leading-tight">Welcome back to the Command Node, <span className="text-intelligence underline decoration-intelligence/30">{businessName}</span></h2>
                  </div>
                  
                  <div className="flex flex-wrap gap-8">
                     <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-gray-600" />
                        <div>
                           <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Standard_AD</p>
                           <p className="text-xs font-black text-white uppercase">{adDate}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Globe size={18} className="text-intelligence/60" />
                        <div>
                           <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Regional_BS</p>
                           <p className="text-xs font-black text-intelligence uppercase">{bsDate}</p>
                        </div>
                     </div>
                  </div>

                  <p className="text-sm font-mono text-gray-400 italic">"The future of finance isn't just about data; it's about the intelligence that drives it."</p>
                </div>

                <div className="flex flex-col gap-3">
                   <button 
                     onClick={() => {
                        onSelectTab?.('Data Entry');
                     }}
                     className="w-full bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] py-4 flex items-center justify-center gap-3 hover:bg-intelligence transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
                   >
                      <Plus size={14} />
                      ADD_TRANSACTION
                   </button>
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full bg-intelligence/10 text-intelligence border border-intelligence/30 font-black uppercase text-[10px] tracking-[0.3em] py-4 flex items-center justify-center gap-3 hover:bg-intelligence hover:text-black transition-all cursor-pointer"
                   >
                      <Upload size={14} />
                      UPLOAD_CSV_BATCH
                   </button>
                   <button 
                     onClick={onViewReport}
                     className="w-full bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.3em] py-4 flex items-center justify-center gap-3 hover:bg-white/10 transition-all cursor-pointer"
                   >
                      <BarChartIcon size={14} />
                      GENERATE_REPORT
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Header with Upload */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-intelligence mb-2">Platform Overview</h4>
          <h2 className="text-5xl font-black italic uppercase">FINANCIAL INTELLIGENCE</h2>
        </div>
        <div className="flex gap-4">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => setIsEditingLayout(!isEditingLayout)}
            className={cn(
              "border px-8 py-3 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all cursor-pointer",
              isEditingLayout ? "bg-brand text-black border-brand shadow-[0_0_20px_rgba(220,20,60,0.4)]" : "border-brand text-brand hover:bg-brand/10"
            )}
          >
            <Settings size={16} />
            {isEditingLayout ? 'FINISH EDITING' : 'EDIT DASHBOARD'}
          </button>
          <button
            onClick={onViewReport}
            className="border border-white/10 text-white px-8 py-3 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer"
          >
            <BarChartIcon size={16} />
            VIEW FULL REPORT
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-intelligence text-black px-8 py-3 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all cursor-pointer"
          >
            <Plus size={16} />
            UPLOAD_CSV_DATA
          </button>
        </div>
      </div>

      <AnimatePresence>
      {isEditingLayout && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass p-8 mb-8 border-brand bg-brand/[0.02] border-2 border-dashed relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 border-b border-brand/20 pb-4">
            <h3 className="text-xl font-black italic uppercase text-brand flex items-center gap-3">
              <Settings size={24} /> Dashboard Customization Mode
            </h3>
            <p className="text-[10px] font-mono text-brand uppercase tracking-widest italic">Changes auto-save to Kernel Memory</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h4 className="text-xs font-black uppercase text-gray-400 mb-6 tracking-widest">Section Visibility</h4>
              <div className="space-y-4">
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={layout.showBarChart} onChange={(e) => setLayout({...layout, showBarChart: e.target.checked})} className="sr-only" />
                      <div className={cn("w-10 h-5 rounded-full transition-colors", layout.showBarChart ? "bg-brand" : "bg-white/10")}></div>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", layout.showBarChart ? "left-6" : "left-1")}></div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white transition-colors">Financial Activity (Bar Chart)</span>
                 </label>
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={layout.showPieChart} onChange={(e) => setLayout({...layout, showPieChart: e.target.checked})} className="sr-only" />
                      <div className={cn("w-10 h-5 rounded-full transition-colors", layout.showPieChart ? "bg-brand" : "bg-white/10")}></div>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", layout.showPieChart ? "left-6" : "left-1")}></div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white transition-colors">Asset Distribution (Pie Chart)</span>
                 </label>
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={layout.showForecast} onChange={(e) => setLayout({...layout, showForecast: e.target.checked})} className="sr-only" />
                      <div className={cn("w-10 h-5 rounded-full transition-colors", layout.showForecast ? "bg-brand" : "bg-white/10")}></div>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", layout.showForecast ? "left-6" : "left-1")}></div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white transition-colors">Sales Forecast Panel</span>
                 </label>
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={layout.showNepse} onChange={(e) => setLayout({...layout, showNepse: e.target.checked})} className="sr-only" />
                      <div className={cn("w-10 h-5 rounded-full transition-colors", layout.showNepse ? "bg-brand" : "bg-white/10")}></div>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", layout.showNepse ? "left-6" : "left-1")}></div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white transition-colors">NEPSE Watchlist</span>
                 </label>
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={layout.showEconomic} onChange={(e) => setLayout({...layout, showEconomic: e.target.checked})} className="sr-only" />
                      <div className={cn("w-10 h-5 rounded-full transition-colors", layout.showEconomic ? "bg-brand" : "bg-white/10")}></div>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", layout.showEconomic ? "left-6" : "left-1")}></div>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white transition-colors">Economic Indicators</span>
                 </label>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-gray-400 mb-6 tracking-widest">AI Insights Visibility</h4>
              <div className="space-y-4">
                 {['Revenue Trend', 'Top Expense Warning', 'Cash Flow Health', 'Inventory Alert'].map((name, i) => (
                   <label key={i} className="flex items-center gap-4 cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" checked={layout.aiInsightsVisibility[i]} onChange={(e) => {
                           const newVis = [...layout.aiInsightsVisibility];
                           newVis[i] = e.target.checked;
                           setLayout({...layout, aiInsightsVisibility: newVis});
                        }} className="sr-only" />
                        <div className={cn("w-10 h-5 rounded-full transition-colors", layout.aiInsightsVisibility[i] ? "bg-intelligence" : "bg-white/10")}></div>
                        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", layout.aiInsightsVisibility[i] ? "left-6" : "left-1")}></div>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-gray-300 group-hover:text-white transition-colors">{name}</span>
                   </label>
                 ))}
              </div>
              <div className="mt-8 p-4 border border-brand/20 bg-brand/5">
                <p className="text-[9px] font-mono text-brand uppercase leading-relaxed flex items-center gap-2">
                   <Move size={12} />
                   Drag and drop the 4 top summary cards below to reorder them in real-time.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {layout.summaryCardsOrder.map((statIndex, displayIndex) => {
          const stat = dashboardStats[statIndex];
          if (!stat) return null;
          return (
            <div 
              key={statIndex} 
              draggable={isEditingLayout}
              onDragStart={(e) => handleCardDragStart(e, displayIndex)}
              onDragOver={(e) => {
                e.preventDefault();
                if (isEditingLayout) {
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(e) => handleCardDrop(e, displayIndex)}
              className={cn(
                "glass p-8 border-white/5 relative overflow-hidden group transition-all",
                isEditingLayout ? "cursor-move border-dashed border-2 border-brand hover:bg-brand/5" : ""
              )}
            >
              <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 opacity-20", stat.c === 'brand' ? 'bg-brand' : 'bg-intelligence')}></div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">{stat.label}</p>
                <stat.icon className={cn("w-4 h-4", stat.c === 'brand' ? 'text-brand' : 'text-intelligence')} />
              </div>
              <p className="text-4xl font-black text-white font-mono tracking-tighter mb-2 italic">{stat.val}</p>
              <div className="flex items-center gap-2">
                <div className={cn("w-1 h-1 rounded-full", stat.c === 'brand' ? 'bg-brand animate-ping' : 'bg-intelligence animate-pulse')}></div>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", stat.c === 'brand' ? 'text-brand' : 'text-intelligence')}>{stat.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      {(layout.showBarChart || layout.showPieChart) && (
      <div className={cn("grid gap-8", layout.showBarChart && layout.showPieChart ? "grid-cols-1 xl:grid-cols-3" : "grid-cols-1")}>
        {/* Bar Chart */}
        {layout.showBarChart && (
        <div className={cn("glass border-white/5 p-8", layout.showPieChart ? "xl:col-span-2" : "")}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-intelligence mb-1">Financial Activity</h4>
              <p className="text-xl font-black italic">INFLOW VS OUTFLOW OVERVIEW</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-intelligence"></div>
                <span className="text-[9px] font-mono text-gray-500 uppercase">Inflow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand"></div>
                <span className="text-[9px] font-mono text-gray-500 uppercase">Outflow</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#444', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#444', fontSize: 10, fontWeight: 'bold' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#05070a', border: '1px solid #333', fontSize: '10px', color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="inflow" fill="#00f2ff" radius={[2, 2, 0, 0]} />
                <Bar dataKey="outflow" fill="#dc143c" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Pie Chart */}
        {layout.showPieChart && (
        <div className="glass border-white/5 p-8 flex flex-col">
          <div className="mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-1">Asset Distribution</h4>
            <p className="text-xl font-black italic">PORTFOLIO DENSITY</p>
          </div>
          <div className="flex-1 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#05070a', border: '1px solid #333', fontSize: '10px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {pieChartData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                <span className="text-[10px] font-mono text-gray-500 uppercase">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
      )}

      {/* Sales Forecast Panel — Real Data + Linear Regression + Confidence Bands */}
      {layout.showForecast && (
      <div className="glass border-white/5 p-8 mt-8 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-intelligence/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 relative z-10">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-1 flex items-center gap-2">
              <TrendingUp size={12} />
              Regression Forecast Engine
            </h4>
            <p className="text-xl font-black italic">SALES FORECAST (90-DAY OUTLOOK)</p>
            {forecastResult && (
              <div className="flex gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", forecastResult.rSquared > 0.6 ? 'bg-green-400' : forecastResult.rSquared > 0.3 ? 'bg-yellow-400' : 'bg-brand')}></div>
                  <span className="text-[9px] font-mono text-gray-500 uppercase">R² = {forecastResult.rSquared.toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {forecastResult.monthlyGrowthRate >= 0
                    ? <ArrowUpRight size={10} className="text-intelligence" />
                    : <ArrowDownRight size={10} className="text-brand" />}
                  <span className={cn("text-[9px] font-mono uppercase font-bold", forecastResult.monthlyGrowthRate >= 0 ? 'text-intelligence' : 'text-brand')}>
                    {forecastResult.monthlyGrowthRate >= 0 ? '+' : ''}{forecastResult.monthlyGrowthRate.toFixed(1)}% / MONTH
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database size={10} className="text-gray-600" />
                  <span className="text-[9px] font-mono text-gray-600 uppercase">
                    Source: {forecastResult.dataSource === 'supabase' ? 'LIVE DB' : 'LOCAL CACHE'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
             <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-intelligence"></div>
                 <span className="text-[9px] font-mono text-gray-500 uppercase">Actual Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 border border-brand bg-brand/20"></div>
                 <span className="text-[9px] font-mono text-gray-500 uppercase">Projected Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-2 bg-brand/10 border border-brand/30"></div>
                 <span className="text-[9px] font-mono text-gray-500 uppercase">80% Confidence Band</span>
               </div>
             </div>
             <button
               onClick={loadForecast}
               disabled={isForecastLoading}
               className="text-[9px] font-mono text-intelligence uppercase tracking-widest bg-intelligence/5 border border-intelligence/20 px-4 py-2 flex items-center gap-2 hover:bg-intelligence/10 transition-all disabled:opacity-50 cursor-pointer"
             >
               <RefreshCw size={10} className={cn(isForecastLoading && 'animate-spin')} />
               {isForecastLoading ? 'COMPUTING...' : 'REFRESH MODEL'}
             </button>
          </div>
        </div>

        {isForecastLoading && forecastChartData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-intelligence rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-intelligence rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-intelligence rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Initializing Regression Engine...</p>
            </div>
          </div>
        ) : (
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastConfBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc143c" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#dc143c" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f2ff" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#00f2ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555', fontSize: 10, fontWeight: 'bold' }}
                  width={80}
                  tickFormatter={(val: number) => {
                    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                    return String(val);
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0c14', border: '1px solid #222', borderRadius: '0', fontSize: '10px', color: '#fff', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  formatter={(value: any, name: string) => {
                    const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
                    const labels: Record<string, string> = {
                      actual: 'Actual Revenue',
                      projected: 'Projected',
                      upperBand: 'Upper Bound',
                      lowerBand: 'Lower Bound',
                    };
                    return [formatted, labels[name] || name];
                  }}
                />
                {/* Confidence interval band (upper) */}
                <Area
                  type="monotone"
                  dataKey="upperBand"
                  stroke="none"
                  fill="url(#forecastConfBand)"
                  fillOpacity={1}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
                {/* Confidence interval band (lower boundary eraser) */}
                <Area
                  type="monotone"
                  dataKey="lowerBand"
                  stroke="none"
                  fill="#05070a"
                  fillOpacity={0.8}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
                {/* Actual revenue area + line */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#00f2ff"
                  strokeWidth={3}
                  fill="url(#actualAreaGrad)"
                  fillOpacity={1}
                  dot={{ r: 4, fill: '#00f2ff', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#00f2ff', stroke: '#00f2ff', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={800}
                />
                {/* Projected revenue line */}
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#dc143c"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={{ r: 5, fill: '#0a0c14', stroke: '#dc143c', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#dc143c', stroke: '#dc143c', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationBegin={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Regression stats footer */}
        {forecastResult && !isForecastLoading && (
          <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Model Confidence',
                value: `${(forecastResult.rSquared * 100).toFixed(1)}%`,
                sub: forecastResult.rSquared > 0.7 ? 'STRONG FIT' : forecastResult.rSquared > 0.4 ? 'MODERATE FIT' : 'WEAK FIT',
                color: forecastResult.rSquared > 0.7 ? 'text-green-400' : forecastResult.rSquared > 0.4 ? 'text-yellow-400' : 'text-brand'
              },
              {
                label: 'Monthly Growth',
                value: `${forecastResult.monthlyGrowthRate >= 0 ? '+' : ''}${forecastResult.monthlyGrowthRate.toFixed(1)}%`,
                sub: forecastResult.monthlyGrowthRate > 0 ? 'UPTREND' : forecastResult.monthlyGrowthRate < 0 ? 'DOWNTREND' : 'FLAT',
                color: forecastResult.monthlyGrowthRate >= 0 ? 'text-intelligence' : 'text-brand'
              },
              {
                label: 'Data Points',
                value: String(forecastChartData.filter((d: ForecastPoint) => d.actual !== null && d.actual > 0).length),
                sub: 'MONTHS ANALYZED',
                color: 'text-gray-400'
              },
              {
                label: 'Projection Window',
                value: '3 MO',
                sub: '90-DAY OUTLOOK',
                color: 'text-brand'
              }
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 p-4 hover:bg-white/[0.04] transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">{stat.label}</p>
                <p className={cn("text-xl font-black font-mono", stat.color)}>{stat.value}</p>
                <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* NEPSE Watchlist */}
      {layout.showNepse && <NepseWatchlist />}

      {/* Economic Indicators */}
      {layout.showEconomic && (
      <div className="glass border-white/5 p-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 border-b border-white/5 pb-4 gap-4">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-1">Macro Trends</h4>
            <p className="text-xl font-black italic">ECONOMIC INDICATORS</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 flex items-center gap-2">
               <Activity size={10} className="text-intelligence" />
               Last Updated: {today.toLocaleDateString()} {today.toLocaleTimeString()}
            </p>
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest italic">
               Data for reference only
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'USD/NPR Rate', val: '133.45', trend: '+0.12%', up: true, icon: Globe },
            { label: 'Inflation Rate', val: '7.3%', trend: '-0.2%', up: false, icon: TrendingUp },
            { label: 'NRB Policy Rate', val: '6.5%', trend: '0.0%', up: true, icon: Activity },
            { label: 'Fuel Price Index', val: 'Rs. 170', trend: '+1.5%', up: true, icon: Package }
          ].map((indicator, i) => (
             <div key={i} className="bg-white/[0.02] border border-white/5 p-5 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                   <indicator.icon size={80} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">{indicator.label}</p>
                <div className="flex items-end gap-4 relative z-10">
                   <p className="text-3xl font-black font-mono text-white leading-none">{indicator.val}</p>
                   <div className="flex items-center gap-1 mb-1">
                      {indicator.up ? <ArrowUpRight size={12} className="text-intelligence" /> : <ArrowDownRight size={12} className="text-brand" />}
                      <span className={cn("text-[10px] font-bold font-mono", indicator.up ? "text-intelligence" : "text-brand")}>{indicator.trend}</span>
                   </div>
                </div>
             </div>
          ))}
        </div>
      </div>
      )}

      {/* JARVIS Analysis Section */}
      {layout.aiInsightsVisibility.some(v => v) && (
      <div className="space-y-6 mt-12 mb-12">
        <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-4">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-2 flex items-center gap-2">
              <Brain size={14} />
              AI Synthesizer
            </h4>
            <h2 className="text-3xl font-black italic uppercase text-white">PROJECT N ANALYSIS AI</h2>
          </div>
          <button className="bg-white/5 text-white border border-white/10 px-6 py-3 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all cursor-pointer">
            <RefreshCw size={14} className="text-intelligence" />
            REFRESH ANALYSIS
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Trend */}
          {layout.aiInsightsVisibility[0] && (
          <div className="glass p-6 border-l-2 border-l-intelligence bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-intelligence/10 text-intelligence rounded-sm group-hover:scale-110 transition-transform">
                <TrendingUp size={16} />
              </div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revenue Trend</h5>
            </div>
            <p className="text-sm font-mono text-white leading-relaxed">
              Q1 SaaS subscriptions generated 45% of total inflow. Suggesting a pivot to scale enterprise licensing model for Q3.
            </p>
          </div>
          )}

          {/* Top Expense Warning */}
          {layout.aiInsightsVisibility[1] && (
          <div className="glass p-6 border-l-2 border-l-brand bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand/10 text-brand rounded-sm group-hover:scale-110 transition-transform">
                <AlertTriangle size={16} />
              </div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Top Expense</h5>
            </div>
            <p className="text-sm font-mono text-white leading-relaxed">
              Cloud infra costs spiked by 18% relative to previous month. Recommended to audit inactive vertex AI nodes.
            </p>
          </div>
          )}

          {/* Cash Flow Health */}
          {layout.aiInsightsVisibility[2] && (
          <div className="glass p-6 border-l-2 border-l-green-500 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 text-green-500 rounded-sm group-hover:scale-110 transition-transform">
                <Activity size={16} />
              </div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cash Flow Health</h5>
            </div>
            <p className="text-sm font-mono text-white leading-relaxed">
              Operating cash flow is stable. 6-month runway maintained at current burn rate. High liquidity detected.
            </p>
          </div>
          )}

          {/* Inventory Alert */}
          {layout.aiInsightsVisibility[3] && (
          <div className="glass p-6 border-l-2 border-l-orange-500 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-sm group-hover:scale-110 transition-transform">
                <Package size={16} />
              </div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inventory Alert</h5>
            </div>
            <p className="text-sm font-mono text-white leading-relaxed">
              "Alpha Node" stock is approaching critical minimum threshold. Recommend automated reorder from primary supplier.
            </p>
          </div>
          )}
        </div>
      </div>
      )}

      {/* Predictive Analytics */}
      <QuantumIntelligence />

      {/* NRB Policy Tracker */}
      <NrbPolicyTracker />
    </div>
  );
}

// ─── MANAGER DASHBOARD VIEW ──────────────────────────────────────────────────
function ManagerDashboardView({
  transactions,
  loadTransactions,
  queries,
  onMarkAsReplied,
  dateFormat
}: {
  transactions: Transaction[];
  loadTransactions: () => void;
  queries: any[];
  onMarkAsReplied: (id: string, replyText: string) => Promise<void>;
  dateFormat: 'AD' | 'BS';
}) {
  const { t } = React.useContext(LanguageContext);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState(50);
  const [replyQuery, setReplyQuery] = useState<any>(null);
  const [manualReplyText, setManualReplyText] = useState('');
  
  const [approvedTxIds, setApprovedTxIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('manager_approved_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const isDemo = localStorage.getItem('is_demo_mode') === 'true';

  const pendingApprovals = useMemo(() => {
    return transactions.filter(t => t.amount > 50000 && !approvedTxIds.includes(t.id || ''));
  }, [transactions, approvedTxIds]);

  const queryBacklog = useMemo(() => {
    return queries.filter(q => q.status === 'Pending');
  }, [queries]);

  const loadInventoryAlerts = async () => {
    if (isDemo) {
      const mockInventory = [
        { id: 'inv-1', name: 'OPTIC_SENSOR_V9', category: 'Components', sku: 'SKU-001', qty: 3, min_stock: 10, price: 120, status: 'LOW STOCK' },
        { id: 'inv-2', name: 'HYPERLINK_CABLE', category: 'Networking', sku: 'SKU-002', qty: 25, min_stock: 50, price: 25, status: 'LOW STOCK' },
        { id: 'inv-3', name: 'COOLANT_FLUID_Z', category: 'Support', sku: 'SKU-003', qty: 0, min_stock: 5, price: 85, status: 'EXPIRED' }
      ];
      setInventoryItems(mockInventory);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase.from('users').select('business_id').eq('auth_id', session.user.id).single();
      if (!profile?.business_id) return;

      const data = await getInventory(profile.business_id);
      if (data) {
        const alerts = data.filter(item => item.qty <= item.min_stock || item.status === 'EXPIRED' || item.status === 'EXPIRING SOON');
        setInventoryItems(alerts);
      }
    } catch (e) {
      console.error('Failed to load inventory alerts:', e);
    }
  };

  const loadAuditLogs = async () => {
    if (isDemo) {
      const mockLogs = [
        { id: 'log-1', timestamp: new Date(Date.now() - 600000).toISOString(), action_type: 'CREATE', table_name: 'transactions', record_id: 'tx-100', user_name: 'Pooja Karki', details: 'Added Inflow transaction: Room Booking' },
        { id: 'log-2', timestamp: new Date(Date.now() - 3600000).toISOString(), action_type: 'UPDATE', table_name: 'inventory', record_id: 'inv-200', user_name: 'Siddharth Lama', details: 'Updated stock: OPTIC_SENSOR_V9 (+15)' },
        { id: 'log-3', timestamp: new Date(Date.now() - 7200000).toISOString(), action_type: 'CREATE', table_name: 'transactions', record_id: 'tx-101', user_name: 'Aayush Shrestha', details: 'Created Outflow transaction: Electricity' },
        { id: 'log-4', timestamp: new Date(Date.now() - 86400000).toISOString(), action_type: 'DELETE', table_name: 'transactions', record_id: 'tx-99', user_name: 'Pooja Karki', details: 'Removed duplicate transaction record' }
      ];
      setAuditLogs(mockLogs);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase.from('users').select('business_id').eq('auth_id', session.user.id).single();
      if (!profile?.business_id) return;

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, users:user_id(name)')
        .eq('business_id', profile.business_id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        const { data: fallbackData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('business_id', profile.business_id)
          .order('timestamp', { ascending: false })
          .limit(10);
        setAuditLogs(fallbackData || []);
      } else {
        setAuditLogs(data.map((log: any) => ({
          ...log,
          user_name: log.users?.name || 'System Agent',
          details: `${log.action_type} on ${log.table_name} (ID: ${log.record_id})`
        })));
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const initData = async () => {
    setIsLoading(true);
    await Promise.all([loadInventoryAlerts(), loadAuditLogs()]);
    setIsLoading(false);
  };

  useEffect(() => {
    initData();
  }, [transactions]);

  const handleApproveTransaction = async (txId: string) => {
    const nextApproved = [...approvedTxIds, txId];
    setApprovedTxIds(nextApproved);
    localStorage.setItem('manager_approved_transactions', JSON.stringify(nextApproved));
    
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      await logAudit('UPDATE', 'transactions', txId, tx, { ...tx, approved_by_manager: true });
    }
    loadTransactions();
    loadAuditLogs();
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || restockQty <= 0) return;

    if (isDemo) {
      setInventoryItems(prev => prev.map(item => item.id === restockItem.id ? { ...item, qty: item.qty + restockQty, status: 'GOOD' } : item).filter(item => item.qty <= item.min_stock));
      setRestockItem(null);
      return;
    }

    try {
      const newQty = restockItem.qty + restockQty;
      const { error } = await supabase
        .from('inventory')
        .update({ stock: newQty })
        .eq('id', restockItem.id);

      if (error) throw error;
      await logAudit('UPDATE', 'inventory', restockItem.id, restockItem, { ...restockItem, stock: newQty });
      await loadInventoryAlerts();
      setRestockItem(null);
    } catch (e) {
      console.error('Failed to restock:', e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyQuery || !manualReplyText) return;

    await onMarkAsReplied(replyQuery.id, manualReplyText);
    setReplyQuery(null);
    setManualReplyText('');
    loadAuditLogs();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-1">Ecosystem Control</h4>
        <p className="text-2xl font-black italic uppercase">Manager Operations Dashboard</p>
        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">
          Heuristic Task Telemetry, Sign-offs, Alerts, and Query Backlogs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={cn("glass p-6 border-white/5 relative overflow-hidden", pendingApprovals.length > 0 ? "border-brand/30 shadow-[0_0_15px_rgba(220,20,60,0.1)]" : "")}>
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Compliance sign-off hold</span>
          <p className={cn("text-3xl font-black font-mono", pendingApprovals.length > 0 ? "text-brand animate-pulse" : "text-white")}>
            {pendingApprovals.length}
          </p>
          <p className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mt-2">Transactions &gt; Rs. 50,000</p>
        </div>

        <div className={cn("glass p-6 border-white/5 relative overflow-hidden", inventoryItems.length > 0 ? "border-yellow-500/30" : "")}>
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Critical stock Alerts</span>
          <p className="text-3xl font-black font-mono text-yellow-500">
            {inventoryItems.length}
          </p>
          <p className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mt-2">Low Stock or Expired items</p>
        </div>

        <div className={cn("glass p-6 border-white/5 relative overflow-hidden", queryBacklog.length > 0 ? "border-intelligence/30" : "")}>
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Unresolved Queries</span>
          <p className="text-3xl font-black font-mono text-intelligence">
            {queryBacklog.length}
          </p>
          <p className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mt-2">Awaiting dispatch replies</p>
        </div>

        <div className="glass p-6 border-white/5 relative overflow-hidden">
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Today Team Telemetry</span>
          <p className="text-3xl font-black font-mono text-white">
            {auditLogs.length}
          </p>
          <p className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mt-2">Events logged in feed</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pending Approvals */}
        <div className="glass border-white/5 p-6 relative overflow-hidden flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand">NPR 50,000+ COMPLIANCE QUEUE</h3>
              <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Sign-off required for processing</p>
            </div>
            <div className="w-2 h-2 bg-brand rounded-full animate-ping"></div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={24} className="text-intelligence mb-2" />
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">All transactions cleared and signed-off</p>
              </div>
            ) : (
              pendingApprovals.map(tx => (
                <div key={tx.id} className="glass border-white/5 bg-white/[0.01] p-4 flex justify-between items-center group hover:border-brand/20 transition-all duration-300">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-gray-400">{dateFormat === 'BS' ? convertGregorianToBS(tx.date) : tx.date}</span>
                      <span className="text-[8px] font-mono bg-white/5 border border-white/5 px-2 py-0.2 rounded-sm text-gray-500 uppercase tracking-widest">{tx.category}</span>
                    </div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white mt-1.5">{tx.description}</h4>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <span className="text-[7px] font-mono text-gray-600 block uppercase">Amount</span>
                      <span className="text-xs font-mono font-black text-brand">Rs. {new Intl.NumberFormat('en-NP').format(tx.amount)}</span>
                    </div>
                    <button
                      onClick={() => handleApproveTransaction(tx.id || '')}
                      className="text-[9px] font-mono text-black bg-brand px-3 py-1.5 hover:bg-brand-bright hover:shadow-[0_0_10px_#dc143c] transition-all font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Sign Off
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Activity Feed */}
        <div className="glass border-white/5 p-6 relative overflow-hidden flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">TEAM TELEMETRY FEED</h3>
              <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Real-time ecosystem logs</p>
            </div>
            <Activity size={14} className="text-intelligence animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {auditLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">No activities recorded today</p>
              </div>
            ) : (
              auditLogs.map(log => {
                const getActionColor = (act: string) => {
                  if (act === 'CREATE') return 'text-intelligence border-intelligence/20 bg-intelligence/5';
                  if (act === 'UPDATE') return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';
                  return 'text-brand border-brand/20 bg-brand/5';
                };
                return (
                  <div key={log.id} className="border border-white/5 bg-white/[0.01] p-3 text-[10px] font-mono relative">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[7px] border px-1.5 py-0.2 rounded-sm font-black tracking-widest uppercase", getActionColor(log.action_type))}>
                          {log.action_type}
                        </span>
                        <span className="text-white font-bold">{log.user_name}</span>
                      </div>
                      <span className="text-[8px] text-gray-600">{log.timestamp ? formatTimeAgo(log.timestamp) : 'Recently'}</span>
                    </div>
                    <p className="text-gray-400 text-[9px] mt-1.5">{log.details || `${log.action_type} execution on table ${log.table_name}`}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Inventory Warning Alerts */}
        <div className="glass border-white/5 p-6 relative overflow-hidden flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500">INVENTORY WARP DEVIATION (LOW STOCK)</h3>
              <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Items at or below critical replenishment threshold</p>
            </div>
            <AlertTriangle size={14} className="text-yellow-500 animate-bounce" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {inventoryItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={24} className="text-intelligence mb-2" />
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Inventory levels within normal range parameters</p>
              </div>
            ) : (
              inventoryItems.map(item => (
                <div key={item.id} className="glass border-white/5 bg-white/[0.01] p-4 flex justify-between items-center group hover:border-yellow-500/20 transition-all duration-300">
                  <div>
                    <span className="text-[8px] font-mono bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.2 rounded-sm text-yellow-500 uppercase tracking-widest">{item.category}</span>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white mt-1.5">{item.name}</h4>
                    <span className="text-[8px] font-mono text-gray-500 block uppercase mt-0.5">SKU: {item.sku || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[7px] font-mono text-gray-600 block uppercase">Stock Level</span>
                      <span className="text-xs font-mono font-black text-brand">{item.qty} <span className="text-[8px] text-gray-500 font-normal">/ {item.min_stock} MIN</span></span>
                    </div>
                    <button
                      onClick={() => setRestockItem(item)}
                      className="text-[9px] font-mono text-black bg-yellow-500 px-3 py-1.5 hover:bg-yellow-400 hover:shadow-[0_0_10px_#eab308] transition-all font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Query Backlog */}
        <div className="glass border-white/5 p-6 relative overflow-hidden flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-intelligence">METIS DISPATCH BACKLOG</h3>
              <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Customer queries awaiting manual neural intervention</p>
            </div>
            <MessageSquare size={14} className="text-intelligence animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {queryBacklog.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={24} className="text-intelligence mb-2" />
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">All incoming customer traffic processed</p>
              </div>
            ) : (
              queryBacklog.map(q => (
                <div key={q.id} className="glass border-white/5 bg-white/[0.01] p-4 flex flex-col justify-between group hover:border-intelligence/20 transition-all duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[8px] font-mono bg-intelligence/10 border border-intelligence/20 px-2 py-0.2 rounded-sm text-intelligence uppercase tracking-widest">{q.platform}</span>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white mt-1">{q.name}</h4>
                    </div>
                    <span className="text-[8px] font-mono text-gray-500">{q.time}</span>
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 bg-black/40 border border-white/5 p-2 italic my-1.5">"{q.message}"</p>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setReplyQuery(q);
                        setManualReplyText('');
                      }}
                      className="text-[9px] font-mono text-black bg-intelligence px-3 py-1.5 hover:bg-intelligence-bright hover:shadow-[0_0_10px_#00f2ff] transition-all font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Process Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Restock Dialog */}
      {restockItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass border-white/10 p-8 max-w-sm w-full relative">
            <button
              onClick={() => setRestockItem(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors text-[10px] font-mono tracking-widest cursor-pointer"
            >
              [CLOSE]
            </button>
            <h3 className="text-lg font-black uppercase tracking-widest text-yellow-500 mb-1">Restock Replenish</h3>
            <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-6">
              Enter quantity units to restock {restockItem.name}.
            </p>

            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="text-[8px] font-mono text-gray-400 uppercase tracking-widest block mb-1">Item Code</label>
                <p className="text-xs font-mono font-black text-white">{restockItem.name} ({restockItem.sku})</p>
              </div>
              <div>
                <label className="text-[8px] font-mono text-gray-400 uppercase tracking-widest block mb-1">Restock Quantity</label>
                <input
                  type="number"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/5 px-4 py-2 text-[10px] font-mono focus:border-yellow-500/40 focus:outline-none text-white rounded-none"
                />
              </div>
              <button
                type="submit"
                className="w-full text-[10px] font-mono text-black uppercase tracking-widest bg-yellow-500 px-4 py-3 hover:bg-yellow-400 hover:shadow-[0_0_15px_#eab308] transition-all font-bold mt-4 cursor-pointer"
              >
                Execute Reorder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Process Reply Dialog */}
      {replyQuery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass border-white/10 p-8 max-w-md w-full relative">
            <button
              onClick={() => setReplyQuery(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors text-[10px] font-mono tracking-widest cursor-pointer"
            >
              [CLOSE]
            </button>
            <h3 className="text-lg font-black uppercase tracking-widest text-intelligence mb-1">METIS Dispatch Interface</h3>
            <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-6">
              Neural gateway communication response channel.
            </p>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="text-[8px] font-mono text-gray-400 uppercase tracking-widest block mb-1">Customer Query Details</label>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{replyQuery.name} via {replyQuery.platform}</p>
                <p className="text-xs font-mono text-white italic bg-white/5 p-3 border border-white/5 mt-1">"{replyQuery.message}"</p>
              </div>
              <div>
                <label className="text-[8px] font-mono text-gray-400 uppercase tracking-widest block mb-1">Manual Response Dispatch</label>
                <textarea
                  required
                  rows={4}
                  value={manualReplyText}
                  onChange={(e) => setManualReplyText(e.target.value)}
                  placeholder="Enter manual override dispatch message here..."
                  className="w-full bg-black/40 border border-white/5 p-3 text-[10px] font-mono focus:border-intelligence/40 focus:outline-none text-white rounded-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full text-[10px] font-mono text-black uppercase tracking-widest bg-intelligence px-4 py-3 hover:bg-intelligence-bright hover:shadow-[0_0_15px_#00f2ff] transition-all font-bold mt-4 cursor-pointer"
              >
                Dispatch Over Neural Mesh
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORTED COMPONENT ────────────────────────────────────────────────
export function OverviewTab({
  transactions,
  setTransactions,
  onViewReport,
  dateFormat,
  onBulkAdd,
  userRole,
  queries,
  loadTransactions,
  handleMarkAsReplied,
  onSelectTab
}: {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onViewReport: () => void;
  dateFormat: 'AD' | 'BS';
  onBulkAdd: (txs: Transaction[]) => Promise<void>;
  userRole: string;
  queries: any[];
  loadTransactions: () => void;
  handleMarkAsReplied: (id: string, replyText: string) => Promise<void>;
  onSelectTab: (tab: string) => void;
}) {
  
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No transactions yet"
        description="No transactions yet — add your first transaction to view overview metrics and insights."
        ctaText="ADD TRANSACTION"
        onCtaClick={() => onSelectTab('Data Entry')}
      />
    );
  }

  if (userRole === 'Manager') {
    return (
      <ManagerDashboardView
        transactions={transactions}
        loadTransactions={loadTransactions}
        queries={queries}
        onMarkAsReplied={handleMarkAsReplied}
        dateFormat={dateFormat}
      />
    );
  }

  return (
    <OverviewView
      transactions={transactions}
      setTransactions={setTransactions}
      onViewReport={onViewReport}
      dateFormat={dateFormat}
      onBulkAdd={onBulkAdd}
      onSelectTab={onSelectTab}
    />
  );
}

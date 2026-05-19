/**
 * NEPSE Market Data Fetcher — Hourly Cron Script
 * 
 * Scrapes live stock prices from Merolagani.com and stores in Supabase market_data table.
 * Deploy as a Render Cron Job or run via node-cron on a server.
 * 
 * Schedule: Every hour (0 * * * *)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Watchlist tickers to track
const WATCHLIST = [
  { ticker: 'NABIL', name: 'Nabil Bank Ltd' },
  { ticker: 'NTC', name: 'Nepal Telecom' },
  { ticker: 'NICA', name: 'NIC Asia Bank' },
  { ticker: 'EBL', name: 'Everest Bank Ltd' },
  { ticker: 'CHCL', name: 'Chilime Hydropower' },
  { ticker: 'NIFRA', name: 'Nepal Infrastructure Bank' },
  { ticker: 'PRVU', name: 'Prabhu Bank' },
  { ticker: 'GBIME', name: 'Global IME Bank' },
];

interface StockData {
  ticker: string;
  company_name: string;
  price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
  high: number;
  low: number;
}

/**
 * Fetch stock data from Merolagani's public API endpoint.
 * 
 * NOTE: Merolagani does not have an official public API. This uses their
 * undocumented JSON endpoint which returns live NEPSE data.
 * If this breaks due to site changes, update the URL or parsing logic below.
 */
async function fetchFromMerolagani(ticker: string): Promise<StockData | null> {
  try {
    const url = `https://merolagani.com/Handlers/StockDataHandler.ashx?type=stock_summary&symbol=${ticker}`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*',
        'Referer': 'https://merolagani.com/'
      }
    });

    if (!res.ok) {
      console.error(`[NEPSE] HTTP ${res.status} for ${ticker}`);
      return null;
    }

    const data = await res.json();
    
    // Merolagani returns data in this shape (may vary):
    // { ltp: 510.2, change: 12.1, per_change: 2.43, volume: 12430, high: 515, low: 505 }
    const price = parseFloat(data.ltp ?? data.lastTradedPrice ?? 0);
    const change_amount = parseFloat(data.change ?? data.priceChange ?? 0);
    const change_percent = parseFloat(data.per_change ?? data.percentChange ?? 0);
    const volume = parseInt(data.volume ?? 0, 10);
    const high = parseFloat(data.high ?? data.todayHigh ?? price);
    const low = parseFloat(data.low ?? data.todayLow ?? price);

    return { ticker, company_name: ticker, price, change_amount, change_percent, volume, high, low };
  } catch (err) {
    console.error(`[NEPSE] Failed to fetch ${ticker}:`, err);
    return null;
  }
}

async function runFetcher() {
  console.log('===================================');
  console.log('📈 NEPSE MARKET DATA FETCHER START');
  console.log(`⏰  ${new Date().toISOString()}`);
  console.log('===================================');

  const results: StockData[] = [];
  
  for (const stock of WATCHLIST) {
    console.log(`[NEPSE] Fetching ${stock.ticker}...`);
    const data = await fetchFromMerolagani(stock.ticker);

    if (data) {
      data.company_name = stock.name;
      results.push(data);
      console.log(`[NEPSE] ✅ ${stock.ticker} — Rs. ${data.price} (${data.change_percent > 0 ? '+' : ''}${data.change_percent}%)`);
    } else {
      console.warn(`[NEPSE] ⚠️  ${stock.ticker} — skipped (fetch failed)`);
    }

    // Polite delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1200));
  }

  if (results.length === 0) {
    console.error('[NEPSE] No data retrieved. Exiting.');
    process.exit(1);
  }

  // Bulk upsert into Supabase
  const rows = results.map(r => ({
    ticker: r.ticker,
    company_name: r.company_name,
    price: r.price,
    change_amount: r.change_amount,
    change_percent: r.change_percent,
    volume: r.volume,
    high: r.high,
    low: r.low,
    source: 'merolagani',
    fetched_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('market_data').insert(rows);

  if (error) {
    console.error('[NEPSE] Supabase insert error:', error.message);
    process.exit(1);
  }

  console.log(`[NEPSE] ✅ Saved ${rows.length} records to Supabase market_data.`);
  console.log('===================================');
  console.log('📈 NEPSE FETCHER CYCLE COMPLETE');
  console.log('===================================');
  process.exit(0);
}

runFetcher();

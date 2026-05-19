/**
 * NRB Policy Tracker — Cron Script
 *
 * Fetches press releases and policy updates from the Nepal Rastra Bank (NRB)
 * official RSS feed and stores them in Supabase nrb_updates table.
 *
 * NRB RSS Feed: https://www.nrb.org.np/rss/press-release
 * Deploy as: Render Cron Job — Schedule: 0 * * * * (every hour)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// NRB RSS/feed endpoints to scrape
const NRB_FEEDS = [
  {
    url: 'https://www.nrb.org.np/rss/press-release',
    category: 'Press Release'
  },
  {
    url: 'https://www.nrb.org.np/rss/notices',
    category: 'Notice'
  },
  {
    url: 'https://www.nrb.org.np/rss/monetary-policy',
    category: 'Monetary Policy'
  }
];

interface NrbItem {
  title: string;
  link: string;
  description: string;
  pub_date: string | null;
  category: string;
}

/**
 * Parse RSS XML into structured items.
 * Uses simple regex-based parsing to avoid needing xml2js dependency.
 */
function parseRssItems(xml: string, category: string): NrbItem[] {
  const items: NrbItem[] = [];

  // Extract all <item> blocks
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches) {
    const getTag = (tag: string) => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return match ? (match[1] || match[2] || '').trim() : '';
    };

    const title = getTag('title');
    const link = getTag('link') || getTag('guid');
    const description = getTag('description').replace(/<[^>]+>/g, '').trim().substring(0, 500);
    const pubDateStr = getTag('pubDate');

    if (!title || !link) continue;

    let pub_date: string | null = null;
    if (pubDateStr) {
      try {
        pub_date = new Date(pubDateStr).toISOString();
      } catch {
        pub_date = null;
      }
    }

    items.push({ title, link, description, pub_date, category });
  }

  return items;
}

async function fetchFeed(feedUrl: string, category: string): Promise<NrbItem[]> {
  try {
    console.log(`[NRB] Fetching ${category} from ${feedUrl}`);

    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProjectN-NRBTracker/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.warn(`[NRB] HTTP ${res.status} for ${feedUrl} — skipping`);
      return [];
    }

    const xml = await res.text();
    const items = parseRssItems(xml, category);
    console.log(`[NRB] ✅ Parsed ${items.length} items from ${category}`);
    return items;
  } catch (err: any) {
    console.error(`[NRB] Failed to fetch ${feedUrl}:`, err.message);
    return [];
  }
}

async function runNrbFetcher() {
  console.log('===========================================');
  console.log('🏛️  NRB POLICY TRACKER CRON START');
  console.log(`⏰  ${new Date().toISOString()}`);
  console.log('===========================================');

  const allItems: NrbItem[] = [];

  for (const feed of NRB_FEEDS) {
    const items = await fetchFeed(feed.url, feed.category);
    allItems.push(...items);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 800));
  }

  if (allItems.length === 0) {
    console.warn('[NRB] No items retrieved from any feed. Exiting.');
    process.exit(0); // Exit 0 — not an error, site may be down temporarily
  }

  console.log(`[NRB] Total items to upsert: ${allItems.length}`);

  // Upsert with conflict on unique link — won't duplicate existing entries
  const rows = allItems.map(item => ({
    title: item.title,
    link: item.link,
    description: item.description,
    pub_date: item.pub_date,
    category: item.category,
    fetched_at: new Date().toISOString()
  }));

  const { error, count } = await supabase
    .from('nrb_updates')
    .upsert(rows, { onConflict: 'link', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('[NRB] Supabase upsert error:', error.message);
    process.exit(1);
  }

  console.log(`[NRB] ✅ Upserted ${rows.length} records (new rows only).`);
  console.log('===========================================');
  console.log('🏛️  NRB TRACKER CYCLE COMPLETE');
  console.log('===========================================');
  process.exit(0);
}

runNrbFetcher();

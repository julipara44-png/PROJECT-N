import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Requires service role to bypass RLS for cron job!
const geminiApiKey = process.env.VITE_GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

async function generateBriefForBusiness(businessId: string, businessName: string) {
  try {
    console.log(`[METIS ENGINE] Processing business: ${businessName} (${businessId})`);
    
    // 1. Fetch Last 30 Days Transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: transactions } = await supabase
      .from('transactions')
      .select('date, description, amount, type')
      .eq('business_id', businessId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    // 2. Fetch Current Inventory Levels
    const { data: inventory } = await supabase
      .from('inventory')
      .select('name, stock, min_stock, price')
      .eq('business_id', businessId)
      .limit(50);

    // 3. Fetch Recent Customer Queries
    const { data: queries } = await supabase
      .from('customer_queries')
      .select('message, status, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. Construct Cross-Domain Context
    const context = `
      Business: ${businessName}
      Transactions (Last 30 Days): ${JSON.stringify(transactions)}
      Inventory Levels: ${JSON.stringify(inventory)}
      Recent Customer Queries: ${JSON.stringify(queries)}
      Market Data: Assume NEPSE is slightly bearish today and NRB (Nepal Rastra Bank) maintained interest rates.
    `;

    // 5. Query Gemini Core
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are METIS, an advanced cross-domain analysis engine for PROJECT N.
      Generate a highly analytical business intelligence daily brief based on the provided cross-domain context.
      
      Context: ${context}
      
      Return a JSON object with exactly these keys:
      - date (string, today's date YYYY-MM-DD)
      - executiveSummary (string, max 3 sentences)
      - financialHealth (string, max 2 sentences)
      - inventoryInsights (string, max 2 sentences)
      - customerSentiment (string, max 2 sentences)
      - strategicRecommendation (string, max 2 sentences)`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const briefData = JSON.parse(response.text || "{}");

    // 6. Store in Supabase
    const { error } = await supabase
      .from('metis_briefs')
      .upsert({
        business_id: businessId,
        date: briefData.date || new Date().toISOString().split('T')[0],
        content: briefData
      }, { onConflict: 'business_id,date' });

    if (error) {
      console.error(`[METIS ENGINE] Failed to save brief for ${businessName}:`, error);
    } else {
      console.log(`[METIS ENGINE] Successfully generated and stored brief for ${businessName}.`);
    }

  } catch (error) {
    console.error(`[METIS ENGINE] Error processing ${businessName}:`, error);
  }
}

async function runCronJob() {
  console.log("=========================================");
  console.log("🧠 INITIALIZING METIS CROSS-DOMAIN ENGINE");
  console.log("=========================================");
  
  // Fetch all active businesses
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name');

  if (error || !businesses) {
    console.error("Failed to fetch businesses:", error);
    process.exit(1);
  }

  console.log(`[METIS ENGINE] Found ${businesses.length} businesses. Commencing deep analysis...`);

  // Process in parallel (could be batched for large DBs)
  await Promise.all(businesses.map(b => generateBriefForBusiness(b.id, b.name)));

  console.log("=========================================");
  console.log("✅ METIS NIGHTLY CYCLE COMPLETE");
  console.log("=========================================");
  process.exit(0);
}

runCronJob();

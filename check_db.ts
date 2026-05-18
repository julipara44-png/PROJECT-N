import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function main() {
  console.log('Fetching a business_id...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch businesses:', await response.text());
      return;
    }
    const businesses = await response.json();
    console.log('Businesses:', businesses);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

main().catch(console.error);

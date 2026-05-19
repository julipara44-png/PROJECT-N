import { supabase } from './supabase';

interface SeedResult {
  success: boolean;
  businessId?: string;
  error?: string;
}

export async function resetAndSeedDemoData(authId: string): Promise<SeedResult> {
  try {
    console.log('[Seeder] Starting demo account provisioning/reset...');

    // 1. Ensure the business "NEPAL ROYAL RESORT & SPA" exists
    let businessId: string;
    const { data: existingBusiness, error: bFindErr } = await supabase
      .from('businesses')
      .select('id')
      .eq('name', 'NEPAL ROYAL RESORT & SPA')
      .maybeSingle();

    if (bFindErr) throw bFindErr;

    if (existingBusiness) {
      businessId = existingBusiness.id;
      console.log(`[Seeder] Found existing demo business ID: ${businessId}`);
    } else {
      const { data: newBusiness, error: bCreateErr } = await supabase
        .from('businesses')
        .insert({
          name: 'NEPAL ROYAL RESORT & SPA',
          industry: 'Hotel',
          phone: '+977-61-460000',
          address: 'Lakeside, Pokhara, Nepal',
          tax_id: 'PAN-609871234'
        })
        .select('id')
        .single();

      if (bCreateErr) throw bCreateErr;
      if (!newBusiness) throw new Error('Failed to create demo business record.');
      businessId = newBusiness.id;
      console.log(`[Seeder] Created new demo business ID: ${businessId}`);
    }

    // 2. Ensure public user profile mapping is set up correctly for demo@projectn.ai
    const { data: existingProfile, error: pFindErr } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (pFindErr) throw pFindErr;

    if (!existingProfile) {
      const { error: pCreateErr } = await supabase
        .from('users')
        .insert({
          auth_id: authId,
          email: 'demo@projectn.ai',
          full_name: 'Resort Administrator',
          business_id: businessId,
          role: 'Owner',
          status: 'Active'
        });

      if (pCreateErr) throw pCreateErr;
      console.log('[Seeder] Created user profile for demo@projectn.ai');
    } else {
      // Ensure business_id and role are correct in case they changed
      const { error: pUpdateErr } = await supabase
        .from('users')
        .update({
          business_id: businessId,
          role: 'Owner',
          status: 'Active'
        })
        .eq('auth_id', authId);

      if (pUpdateErr) throw pUpdateErr;
      console.log('[Seeder] Updated existing user profile for demo@projectn.ai');
    }

    // 3. Clear existing tenant data to perform a clean 24h reset
    console.log('[Seeder] Cleaning existing tenant tables to prepare for seed...');
    await supabase.from('transactions').delete().eq('business_id', businessId);
    await supabase.from('inventory').delete().eq('business_id', businessId);
    await supabase.from('customer_queries').delete().eq('business_id', businessId);
    await supabase.from('team_members').delete().eq('business_id', businessId);
    await supabase.from('employees').delete().eq('business_id', businessId);
    await supabase.from('categories').delete().eq('business_id', businessId);

    // 4. Seed Categories
    console.log('[Seeder] Seeding categories...');
    const inflowCats = ['Room Booking', 'Restaurant', 'Spa & Wellness', 'Banquets & Events', 'Miscellaneous Inflow'];
    const outflowCats = ['Payroll', 'Kitchen Inventory', 'Utilities', 'Marketing', 'Maintenance', 'SaaS & Software'];

    const categoriesToInsert = [
      ...inflowCats.map(name => ({ business_id: businessId, name, type: 'Inflow' as const })),
      ...outflowCats.map(name => ({ business_id: businessId, name, type: 'Outflow' as const }))
    ];

    const { data: seededCats, error: catErr } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select('id, name, type');

    if (catErr) throw catErr;
    if (!seededCats) throw new Error('Failed to seed categories.');

    const categoryMap: Record<string, string> = {};
    seededCats.forEach(c => {
      categoryMap[`${c.name}_${c.type}`] = c.id;
    });

    // 5. Seed Employees
    console.log('[Seeder] Seeding employees...');
    const employeesToInsert = [
      { business_id: businessId, name: 'Ram Prasad', role: 'General Manager', department: 'Management', monthly_target: 600000 },
      { business_id: businessId, name: 'Sita Devi', role: 'Senior Accountant', department: 'Finance', monthly_target: 0 },
      { business_id: businessId, name: 'Hari Bahadur', role: 'Marketing Director', department: 'Marketing', monthly_target: 250000 },
      { business_id: businessId, name: 'Gita Shrestha', role: 'Spa & Wellness Director', department: 'Wellness', monthly_target: 180000 },
      { business_id: businessId, name: 'Shyam Thapa', role: 'Executive Chef', department: 'F&B', monthly_target: 350000 }
    ];

    const { data: seededEmployees, error: empErr } = await supabase
      .from('employees')
      .insert(employeesToInsert)
      .select('id, name');

    if (empErr) throw empErr;
    if (!seededEmployees) throw new Error('Failed to seed employees.');

    const empIdMap: Record<string, string> = {};
    seededEmployees.forEach(e => {
      empIdMap[e.name] = e.id;
    });

    // 6. Seed Team Members (Workspace Members)
    console.log('[Seeder] Seeding workspace team members...');
    const teamMembersToInsert = [
      { business_id: businessId, email: 'demo@projectn.ai', name: 'Resort Administrator', role: 'Owner', status: 'Active' },
      { business_id: businessId, email: 'ram.manager@projectn.ai', name: 'Ram Prasad', role: 'Manager', status: 'Active' },
      { business_id: businessId, email: 'sita.accountant@projectn.ai', name: 'Sita Devi', role: 'Accountant', status: 'Active' },
      { business_id: businessId, email: 'hari.marketer@projectn.ai', name: 'Hari Bahadur', role: 'Marketer', status: 'Active' },
      { business_id: businessId, email: 'shyam.chef@projectn.ai', name: 'Shyam Thapa', role: 'Manager', status: 'Active' }
    ];

    const { error: teamErr } = await supabase
      .from('team_members')
      .insert(teamMembersToInsert);

    if (teamErr) throw teamErr;

    // 7. Seed Inventory Items
    console.log('[Seeder] Seeding hotel inventory...');
    const inventoryToInsert = [
      { business_id: businessId, name: 'Premium Egyptian Cotton Bed Sheets', sku: 'INV-HOT-BedSheet-001', category: 'Rooms', stock: 150, min_stock: 30, price: 45.00 },
      { business_id: businessId, name: 'Organic Spa Lavender Massage Oil', sku: 'INV-HOT-LavenderOil-002', category: 'Spa & Wellness', stock: 80, min_stock: 20, price: 12.00 },
      { business_id: businessId, name: 'Single Malt Himalayan Oak Whiskey', sku: 'INV-HOT-Whiskey-003', category: 'F&B Bar', stock: 45, min_stock: 15, price: 95.00 },
      { business_id: businessId, name: 'Smart RFID Suite Door Locks', sku: 'INV-HOT-DoorLock-004', category: 'Maintenance', stock: 12, min_stock: 5, price: 150.00 },
      { business_id: businessId, name: 'Luxury Silk-Blend Bathrobes', sku: 'INV-HOT-Bathrobe-005', category: 'Rooms', stock: 65, min_stock: 15, price: 35.00 },
      { business_id: businessId, name: 'Artisan Bamboo Room Slippers', sku: 'INV-HOT-Slipper-006', category: 'Rooms', stock: 240, min_stock: 50, price: 4.50 },
      { business_id: businessId, name: 'Biodegradable Amenity Toiletries Kits', sku: 'INV-HOT-Amenities-007', category: 'Rooms', stock: 450, min_stock: 100, price: 2.20 },
      { business_id: businessId, name: 'Organic Coffee Beans (Himalayan Blend)', sku: 'INV-HOT-Coffee-008', category: 'F&B Kitchen', stock: 110, min_stock: 25, price: 18.00 },
      { business_id: businessId, name: 'High-Thread Count Bath Towels', sku: 'INV-HOT-Towels-009', category: 'Rooms', stock: 180, min_stock: 40, price: 15.00 },
      { business_id: businessId, name: 'Imported Premium Dark Chocolates (Minibar)', sku: 'INV-HOT-Chocolates-010', category: 'F&B Minibar', stock: 95, min_stock: 20, price: 6.50 },
      { business_id: businessId, name: 'Himalayan Herbal Tea Box (Assorted)', sku: 'INV-HOT-HerbalTea-011', category: 'Rooms', stock: 160, min_stock: 30, price: 8.00 },
      { business_id: businessId, name: 'Eco-Friendly Bamboo Toothbrushes', sku: 'INV-HOT-Toothbrush-012', category: 'Rooms', stock: 320, min_stock: 50, price: 1.50 }
    ];

    const { error: invErr } = await supabase
      .from('inventory')
      .insert(inventoryToInsert);

    if (invErr) throw invErr;

    // 8. Seed 20 Customer Queries
    console.log('[Seeder] Seeding 20 customer queries...');
    const now = new Date();
    const queryTemplates = [
      { platform: 'Website', name: 'Anil Gurung', msg: 'Hello, do you have deluxe rooms available for this weekend?', status: 'Pending', reply: null },
      { platform: 'WhatsApp', name: 'Sarah Jenkins', msg: 'What are the spa packages and pricing?', status: 'Replied', reply: 'Namaste Sarah, our wellness packages range from $60 for the Himalayan Herbal Scrub to $150 for our 90-minute signature Ayurvedic Massage.' },
      { platform: 'Facebook', name: 'Pradeep Thapa', msg: 'Can we book the banquet hall for a wedding of 150 guests in October?', status: 'Replied', reply: 'Hello Pradeep, yes, our main banquet hall can accommodate up to 250 guests. We do have dates available in October. Let us know if you want to tour the venue.' },
      { platform: 'Messenger', name: 'John Doe', msg: 'Is airport transfer included in room rates?', status: 'Pending', reply: null },
      { platform: 'Viber', name: 'Kiran Shrestha', msg: 'Do you have vegan options in the restaurant?', status: 'Replied', reply: 'Namaste Kiran, yes, our restaurant menu has a dedicated vegan section featuring organic plant-based local momos, salad, and curries.' },
      { platform: 'Website', name: 'Sophia Mueller', msg: 'Can I check out late at 4 PM on Sunday?', status: 'Pending', reply: null },
      { platform: 'Instagram', name: 'Maria Rossi', msg: 'What is your policy for booking cancellations?', status: 'Replied', reply: 'Hello Maria, bookings cancelled 48 hours prior to arrival incur no charges. Cancellations within 48 hours incur a 1-night room charge fee.' },
      { platform: 'WhatsApp', name: 'David Lee', msg: 'Are pets allowed in the resort rooms?', status: 'Pending', reply: null },
      { platform: 'Website', name: 'Rajesh Hamal', msg: 'Do you have high-speed Wi-Fi in rooms? I have video calls for remote work.', status: 'Replied', reply: 'Namaste Rajesh, yes, we have dedicated high-speed fiber internet in all suites (100 Mbps symmetric) and reliable backups.' },
      { platform: 'Facebook', name: 'Ritesh Pandey', msg: 'Can we host a corporate conference with 50 people next month?', status: 'Pending', reply: null },
      { platform: 'Instagram', name: 'Emma Watson', msg: 'Is the outdoor swimming pool open to non-guests?', status: 'Replied', reply: 'Hello Emma, yes, pool day passes are available for NPR 1,500, which includes complimentary towel service and a wellness juice.' },
      { platform: 'WhatsApp', name: 'Niranjan Dev', msg: 'What are the timings for the steam room and sauna?', status: 'Replied', reply: 'Namaste Niranjan, our spa facilities, including steam and sauna, are open daily from 7:00 AM until 9:00 PM.' },
      { platform: 'Viber', name: 'Bhim Bahadur', msg: 'Could you share the restaurant menu for tonight?', status: 'Pending', reply: null },
      { platform: 'WhatsApp', name: 'Jessica Taylor', msg: 'We want to book a couples massage, are there slots today after 4 PM?', status: 'Replied', reply: 'Namaste Jessica, yes, we have a couples slot available at 5:30 PM. I have tentatively held it for you. Please confirm to book!' },
      { platform: 'Website', name: 'Kabir Dixit', msg: 'Is there parking available on site? Do you charge extra?', status: 'Replied', reply: 'Namaste Kabir, we offer spacious complimentary on-site parking for all resort and restaurant guests, with 24/7 security.' },
      { platform: 'Messenger', name: 'Li Na', msg: 'Do you offer laundry service for guests staying 3 nights?', status: 'Pending', reply: null },
      { platform: 'Instagram', name: 'Robert Vance', msg: 'What brands of single malt whiskey do you have in the lounge?', status: 'Replied', reply: 'Hello Robert, our lounge features Himalayan Oak, Glenfiddich 12/15, Macallan Double Cask 12, and Yamazaki Single Malt.' },
      { platform: 'Website', name: 'Dinesh KC', msg: 'Are there discounts for long-term stays of over 2 weeks?', status: 'Pending', reply: null },
      { platform: 'Facebook', name: 'Preeti Adhikari', msg: 'Is the Pokhara lake view visible from Deluxe suites?', status: 'Replied', reply: 'Namaste Preeti, yes! All our Deluxe suites feature private balconies facing Lake Phewa and the Annapurna range.' },
      { platform: 'Viber', name: 'Tsering Sherpa', msg: 'What is the temperature of the outdoor pool? Is it heated?', status: 'Replied', reply: 'Namaste Tsering, our outdoor pool is solar-heated and maintained at a comfortable 26 to 28 degrees Celsius.' }
    ];

    const queriesToInsert = queryTemplates.map((q, idx) => {
      const createdTime = new Date(now.getTime() - idx * 4 * 60 * 60 * 1000); // spread over last 3-4 days
      const repliedTime = q.status === 'Replied' ? new Date(createdTime.getTime() + 45 * 60 * 1000) : null;
      return {
        business_id: businessId,
        platform: q.platform,
        customer_name: q.name,
        message: q.msg,
        status: q.status,
        reply_text: q.reply,
        created_at: createdTime.toISOString(),
        replied_at: repliedTime ? repliedTime.toISOString() : null,
        updated_at: createdTime.toISOString()
      };
    });

    const { error: queryErr } = await supabase
      .from('customer_queries')
      .insert(queriesToInsert);

    if (queryErr) throw queryErr;

    // 9. Seed 6 Months of Daily Transactions (Inflows and Outflows)
    console.log('[Seeder] Generating 6 months of historical transactions...');
    const transactionsToInsert = [];

    // Assigning employees to transactions where appropriate
    const staffGM = empIdMap['Ram Prasad'];
    const staffSpa = empIdMap['Gita Shrestha'];
    const staffChef = empIdMap['Shyam Thapa'];

    // We will generate transactions for 180 days back up to today
    for (let d = 180; d >= 0; d--) {
      const dateStr = new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // ─── DAILY INFLOWS ───
      // 1. Room Booking: every day (1-3 bookings)
      const numBookings = Math.floor(Math.random() * 3) + 1; // 1 to 3
      for (let b = 0; b < numBookings; b++) {
        const amount = Math.floor(Math.random() * 200) + 180; // $180 - $380
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: `Deluxe Suite Booking - Room ${300 + Math.floor(Math.random() * 90)}`,
          amount: amount,
          category_id: categoryMap['Room Booking_Inflow'],
          employee_id: staffGM,
          type: 'Inflow'
        });
      }

      // 2. Restaurant Billing: every day
      const restInflow = Math.floor(Math.random() * 120) + 60; // $60 - $180
      transactionsToInsert.push({
        business_id: businessId,
        date: dateStr,
        description: 'Himalayan Oak Restaurant Dining Revenue',
        amount: restInflow,
        category_id: categoryMap['Restaurant_Inflow'],
        employee_id: staffChef,
        type: 'Inflow'
      });

      // 3. Spa Inflow: every 2 days
      if (d % 2 === 0) {
        const spaInflow = Math.floor(Math.random() * 80) + 70; // $70 - $150
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Himalayan Wellness Spa Session Revenue',
          amount: spaInflow,
          category_id: categoryMap['Spa & Wellness_Inflow'],
          employee_id: staffSpa,
          type: 'Inflow'
        });
      }

      // 4. Banquet event booking: weekly (every 7 days)
      if (d % 7 === 0) {
        const banquetInflow = Math.floor(Math.random() * 1500) + 1800; // $1800 - $3300
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Corporate Banquet Seminar Event Booking Inflow',
          amount: banquetInflow,
          category_id: categoryMap['Banquets & Events_Inflow'],
          employee_id: staffGM,
          type: 'Inflow'
        });
      }

      // ─── PERIODIC OUTFLOWS ───
      // 5. Monthly Staff Salaries (Payroll): every 30 days
      if (d % 30 === 5) {
        const salaryOutflow = 8500; // $8500 flat
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Monthly Resort Employee Salaries Distribution',
          amount: salaryOutflow,
          category_id: categoryMap['Payroll_Outflow'],
          type: 'Outflow'
        });
      }

      // 6. Food & Beverage Supplies (Kitchen Inventory): every 4 days
      if (d % 4 === 1) {
        const fbOutflow = Math.floor(Math.random() * 300) + 400; // $400 - $700
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'F&B Fresh Kitchen Produce and Drinks Restock',
          amount: fbOutflow,
          category_id: categoryMap['Kitchen Inventory_Outflow'],
          employee_id: staffChef,
          type: 'Outflow'
        });
      }

      // 7. Monthly Utility Bills: every 30 days
      if (d % 30 === 12) {
        const utilOutflow = Math.floor(Math.random() * 400) + 1200; // $1200 - $1600
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Pokhara Electricity Authority & Water Board Utility Billing',
          amount: utilOutflow,
          category_id: categoryMap['Utilities_Outflow'],
          type: 'Outflow'
        });
      }

      // 8. Monthly Marketing Ads Campaign: every 30 days
      if (d % 30 === 20) {
        const mktOutflow = Math.floor(Math.random() * 500) + 900; // $900 - $1400
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Google Ads & Tourism Portal Monthly Campaign Outflow',
          amount: mktOutflow,
          category_id: categoryMap['Marketing_Outflow'],
          type: 'Outflow'
        });
      }

      // 9. Resort Maintenance: every 14 days
      if (d % 14 === 3) {
        const maintOutflow = Math.floor(Math.random() * 400) + 450; // $450 - $850
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Resort Infrastructure Repairs & Swimming Pool Maintenance',
          amount: maintOutflow,
          category_id: categoryMap['Maintenance_Outflow'],
          type: 'Outflow'
        });
      }

      // 10. PMS Cloud software subscription: every 30 days
      if (d % 30 === 27) {
        const saasOutflow = 350; // $350 flat
        transactionsToInsert.push({
          business_id: businessId,
          date: dateStr,
          description: 'Property Management SaaS Systems Cloud License Fee',
          amount: saasOutflow,
          category_id: categoryMap['SaaS & Software_Outflow'],
          type: 'Outflow'
        });
      }
    }

    console.log(`[Seeder] Total generated transactions count: ${transactionsToInsert.length}. Inserting in chunks...`);

    // Insert transactions in chunks of 100 to avoid payload size errors
    const chunkSize = 100;
    for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
      const chunk = transactionsToInsert.slice(i, i + chunkSize);
      const { error: txErr } = await supabase
        .from('transactions')
        .insert(chunk);

      if (txErr) throw txErr;
    }

    // 10. Seed a pre-analyzed METIS Daily Brief
    console.log('[Seeder] Seeding METIS daily intelligence brief...');
    const metisBriefContent = {
      pnl_summary: {
        total_inflow: 135400,
        total_outflow: 82450,
        net_profit: 52950,
        margin_percent: 39.1
      },
      insights: [
        'Revenue is stable, showing a 14.2% month-on-month increase driven by peak season room reservations and corporate seminar hall bookings.',
        'Operational outflows spike during the first week of the month due to salary disbursements ($8,500) and utility billing ($1,420).',
        'Spa wellness package bookings have increased by 22% since introducing targeted digital campaigns on social channels.',
        'Bar and kitchen inventory levels are healthy, but "Single Malt Himalayan Oak Whiskey" is approaching reorder threshold (stock: 45).'
      ],
      recommendations: [
        'Automate reordering of low-stock beverage items to avoid stockouts ahead of the upcoming weekend event banquet.',
        'Reallocate $500 from utility buffer towards social marketing campaigns specifically promoting Pokhara lake views.',
        'Optimize air conditioning and lighting scheduling in public areas to reduce monthly utility outflow by 8%.'
      ]
    };

    const todayDate = now.toISOString().split('T')[0];
    const { error: briefErr } = await supabase
      .from('metis_briefs')
      .insert({
        business_id: businessId,
        date: todayDate,
        content: metisBriefContent
      });

    if (briefErr) {
      // It might fail if already exists, try upserting instead
      await supabase
        .from('metis_briefs')
        .upsert({
          business_id: businessId,
          date: todayDate,
          content: metisBriefContent
        }, { onConflict: 'business_id,date' });
    }

    console.log('[Seeder] Demo account successfully seeded!');
    return { success: true, businessId };
  } catch (error: any) {
    console.error('[Seeder] Error seeding demo account:', error);
    return { success: false, error: error.message || String(error) };
  }
}

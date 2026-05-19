-- =================================================================
-- PROJECT N: INVESTOR DEMO DAILY RESET CRON FUNCTION
-- =================================================================
-- Run this script in the Supabase SQL Editor.
-- Configures a database-side reset that executes every 24 hours at midnight.
-- Runs with SECURITY DEFINER to bypass Row Level Security policies.

CREATE OR REPLACE FUNCTION public.reset_demo_business_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin permissions to override RLS
AS $$
DECLARE
    demo_business_id UUID;
    staff_gm_id UUID;
    staff_spa_id UUID;
    staff_chef_id UUID;
    date_item DATE;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- 0. Auto-confirm demo user email if they exist in auth.users
    UPDATE auth.users
    SET email_confirmed_at = NOW(),
        confirmed_at = NOW()
    WHERE email = 'demo@projectn.ai'
      AND (email_confirmed_at IS NULL OR confirmed_at IS NULL);

    -- 1. Locate the business "NEPAL ROYAL RESORT & SPA"
    SELECT id INTO demo_business_id FROM public.businesses WHERE name = 'NEPAL ROYAL RESORT & SPA';
    
    IF demo_business_id IS NULL THEN
        -- If the demo business does not exist yet, we do nothing and let the client-side seeder trigger first
        RETURN;
    END IF;

    -- 2. Clear old demo data
    DELETE FROM public.transactions WHERE business_id = demo_business_id;
    DELETE FROM public.inventory WHERE business_id = demo_business_id;
    DELETE FROM public.customer_queries WHERE business_id = demo_business_id;
    DELETE FROM public.team_members WHERE business_id = demo_business_id;
    DELETE FROM public.employees WHERE business_id = demo_business_id;
    DELETE FROM public.categories WHERE business_id = demo_business_id;
    DELETE FROM public.metis_briefs WHERE business_id = demo_business_id;

    -- 3. Re-seed Categories
    INSERT INTO public.categories (business_id, name, type) VALUES
        (demo_business_id, 'Room Booking', 'Inflow'),
        (demo_business_id, 'Restaurant', 'Inflow'),
        (demo_business_id, 'Spa & Wellness', 'Inflow'),
        (demo_business_id, 'Banquets & Events', 'Inflow'),
        (demo_business_id, 'Miscellaneous Inflow', 'Inflow'),
        (demo_business_id, 'Payroll', 'Outflow'),
        (demo_business_id, 'Kitchen Inventory', 'Outflow'),
        (demo_business_id, 'Utilities', 'Outflow'),
        (demo_business_id, 'Marketing', 'Outflow'),
        (demo_business_id, 'Maintenance', 'Outflow'),
        (demo_business_id, 'SaaS & Software', 'Outflow')
    ON CONFLICT (business_id, name, type) DO UPDATE SET name = EXCLUDED.name;

    -- 4. Re-seed Employees
    INSERT INTO public.employees (business_id, name, role, department, monthly_target) VALUES
        (demo_business_id, 'Ram Prasad', 'General Manager', 'Management', 600000),
        (demo_business_id, 'Sita Devi', 'Senior Accountant', 'Finance', 0),
        (demo_business_id, 'Hari Bahadur', 'Marketing Director', 'Marketing', 250000),
        (demo_business_id, 'Gita Shrestha', 'Spa & Wellness Director', 'Wellness', 180000),
        (demo_business_id, 'Shyam Thapa', 'Executive Chef', 'F&B', 350000);

    -- Capture employees for transaction assignments
    SELECT id INTO staff_gm_id FROM public.employees WHERE business_id = demo_business_id AND name = 'Ram Prasad' LIMIT 1;
    SELECT id INTO staff_spa_id FROM public.employees WHERE business_id = demo_business_id AND name = 'Gita Shrestha' LIMIT 1;
    SELECT id INTO staff_chef_id FROM public.employees WHERE business_id = demo_business_id AND name = 'Shyam Thapa' LIMIT 1;

    -- 5. Re-seed Team Members (Workspace Members)
    INSERT INTO public.team_members (business_id, email, name, role, status) VALUES
        (demo_business_id, 'demo@projectn.ai', 'Resort Administrator', 'Owner', 'Active'),
        (demo_business_id, 'ram.manager@projectn.ai', 'Ram Prasad', 'Manager', 'Active'),
        (demo_business_id, 'sita.accountant@projectn.ai', 'Sita Devi', 'Accountant', 'Active'),
        (demo_business_id, 'hari.marketer@projectn.ai', 'Hari Bahadur', 'Marketer', 'Active'),
        (demo_business_id, 'shyam.chef@projectn.ai', 'Shyam Thapa', 'Manager', 'Active')
    ON CONFLICT (business_id, email) DO UPDATE SET name = EXCLUDED.name;

    -- 6. Re-seed Inventory Items
    INSERT INTO public.inventory (business_id, name, sku, category, stock, min_stock, price) VALUES
        (demo_business_id, 'Premium Egyptian Cotton Bed Sheets', 'INV-HOT-BedSheet-001', 'Rooms', 150, 30, 45.00),
        (demo_business_id, 'Organic Spa Lavender Massage Oil', 'INV-HOT-LavenderOil-002', 'Spa & Wellness', 80, 20, 12.00),
        (demo_business_id, 'Single Malt Himalayan Oak Whiskey', 'INV-HOT-Whiskey-003', 'F&B Bar', 45, 15, 95.00),
        (demo_business_id, 'Smart RFID Suite Door Locks', 'INV-HOT-DoorLock-004', 'Maintenance', 12, 5, 150.00),
        (demo_business_id, 'Luxury Silk-Blend Bathrobes', 'INV-HOT-Bathrobe-005', 'Rooms', 65, 15, 35.00),
        (demo_business_id, 'Artisan Bamboo Room Slippers', 'INV-HOT-Slipper-006', 'Rooms', 240, 50, 4.50),
        (demo_business_id, 'Biodegradable Amenity Toiletries Kits', 'INV-HOT-Amenities-007', 'Rooms', 450, 100, 2.20),
        (demo_business_id, 'Organic Coffee Beans (Himalayan Blend)', 'INV-HOT-Coffee-008', 'F&B Kitchen', 110, 25, 18.00),
        (demo_business_id, 'High-Thread Count Bath Towels', 'INV-HOT-Towels-009', 'Rooms', 180, 40, 15.00),
        (demo_business_id, 'Imported Premium Dark Chocolates (Minibar)', 'INV-HOT-Chocolates-010', 'F&B Minibar', 95, 20, 6.50),
        (demo_business_id, 'Himalayan Herbal Tea Box (Assorted)', 'INV-HOT-HerbalTea-011', 'Rooms', 160, 30, 8.00),
        (demo_business_id, 'Eco-Friendly Bamboo Toothbrushes', 'INV-HOT-Toothbrush-012', 'Rooms', 320, 50, 1.50)
    ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock;

    -- 7. Re-seed Queries
    INSERT INTO public.customer_queries (business_id, platform, customer_name, message, status, reply_text, created_at, replied_at, updated_at) VALUES
        (demo_business_id, 'Website', 'Anil Gurung', 'Hello, do you have deluxe rooms available for this weekend?', 'Pending', NULL, now() - INTERVAL '2 hours', NULL, now() - INTERVAL '2 hours'),
        (demo_business_id, 'WhatsApp', 'Sarah Jenkins', 'What are the spa packages and pricing?', 'Replied', 'Namaste Sarah, our wellness packages range from $60 for the Himalayan Herbal Scrub to $150 for our 90-minute signature Ayurvedic Massage.', now() - INTERVAL '4 hours', now() - INTERVAL '3 hours', now() - INTERVAL '3 hours'),
        (demo_business_id, 'Facebook', 'Pradeep Thapa', 'Can we book the banquet hall for a wedding of 150 guests in October?', 'Replied', 'Hello Pradeep, yes, our main banquet hall can accommodate up to 250 guests. We do have dates available in October. Let us know if you want to tour the venue.', now() - INTERVAL '8 hours', now() - INTERVAL '7 hours', now() - INTERVAL '7 hours'),
        (demo_business_id, 'Messenger', 'John Doe', 'Is airport transfer included in room rates?', 'Pending', NULL, now() - INTERVAL '12 hours', NULL, now() - INTERVAL '12 hours'),
        (demo_business_id, 'Viber', 'Kiran Shrestha', 'Do you have vegan options in the restaurant?', 'Replied', 'Namaste Kiran, yes, our restaurant menu has a dedicated vegan section featuring organic plant-based local momos, salad, and curries.', now() - INTERVAL '16 hours', now() - INTERVAL '15 hours', now() - INTERVAL '15 hours'),
        (demo_business_id, 'Website', 'Sophia Mueller', 'Can I check out late at 4 PM on Sunday?', 'Pending', NULL, now() - INTERVAL '20 hours', NULL, now() - INTERVAL '20 hours'),
        (demo_business_id, 'Instagram', 'Maria Rossi', 'What is your policy for booking cancellations?', 'Replied', 'Hello Maria, bookings cancelled 48 hours prior to arrival incur no charges. Cancellations within 48 hours incur a 1-night room charge fee.', now() - INTERVAL '24 hours', now() - INTERVAL '23 hours', now() - INTERVAL '23 hours'),
        (demo_business_id, 'WhatsApp', 'David Lee', 'Are pets allowed in the resort rooms?', 'Pending', NULL, now() - INTERVAL '28 hours', NULL, now() - INTERVAL '28 hours'),
        (demo_business_id, 'Website', 'Rajesh Hamal', 'Do you have high-speed Wi-Fi in rooms? I have video calls for remote work.', 'Replied', 'Namaste Rajesh, yes, we have dedicated high-speed fiber internet in all suites (100 Mbps symmetric) and reliable backups.', now() - INTERVAL '32 hours', now() - INTERVAL '31 hours', now() - INTERVAL '31 hours'),
        (demo_business_id, 'Facebook', 'Ritesh Pandey', 'Can we host a corporate conference with 50 people next month?', 'Pending', NULL, now() - INTERVAL '36 hours', NULL, now() - INTERVAL '36 hours'),
        (demo_business_id, 'Instagram', 'Emma Watson', 'Is the outdoor swimming pool open to non-guests?', 'Replied', 'Hello Emma, yes, pool day passes are available for NPR 1,500, which includes complimentary towel service and a wellness juice.', now() - INTERVAL '40 hours', now() - INTERVAL '39 hours', now() - INTERVAL '39 hours'),
        (demo_business_id, 'WhatsApp', 'Niranjan Dev', 'What are the timings for the steam room and sauna?', 'Replied', 'Namaste Niranjan, our spa facilities, including steam and sauna, are open daily from 7:00 AM until 9:00 PM.', now() - INTERVAL '44 hours', now() - INTERVAL '43 hours', now() - INTERVAL '43 hours'),
        (demo_business_id, 'Viber', 'Bhim Bahadur', 'Could you share the restaurant menu for tonight?', 'Pending', NULL, now() - INTERVAL '48 hours', NULL, now() - INTERVAL '48 hours'),
        (demo_business_id, 'WhatsApp', 'Jessica Taylor', 'We want to book a couples massage, are there slots today after 4 PM?', 'Replied', 'Namaste Jessica, yes, we have a couples slot available at 5:30 PM. I have tentatively held it for you. Please confirm to book!', now() - INTERVAL '52 hours', now() - INTERVAL '51 hours', now() - INTERVAL '51 hours'),
        (demo_business_id, 'Website', 'Kabir Dixit', 'Is there parking available on site? Do you charge extra?', 'Replied', 'Namaste Kabir, we offer spacious complimentary on-site parking for all resort and restaurant guests, with 24/7 security.', now() - INTERVAL '56 hours', now() - INTERVAL '55 hours', now() - INTERVAL '55 hours'),
        (demo_business_id, 'Messenger', 'Li Na', 'Do you offer laundry service for guests staying 3 nights?', 'Pending', NULL, now() - INTERVAL '60 hours', NULL, now() - INTERVAL '60 hours'),
        (demo_business_id, 'Instagram', 'Robert Vance', 'What brands of single malt whiskey do you have in the lounge?', 'Replied', 'Hello Robert, our lounge features Himalayan Oak, Glenfiddich 12/15, Macallan Double Cask 12, and Yamazaki Single Malt.', now() - INTERVAL '64 hours', now() - INTERVAL '63 hours', now() - INTERVAL '63 hours'),
        (demo_business_id, 'Website', 'Dinesh KC', 'Are there discounts for long-term stays of over 2 weeks?', 'Pending', NULL, now() - INTERVAL '68 hours', NULL, now() - INTERVAL '68 hours'),
        (demo_business_id, 'Facebook', 'Preeti Adhikari', 'Is the Pokhara lake view visible from Deluxe suites?', 'Replied', 'Namaste Preeti, yes! All our Deluxe suites feature private balconies facing Lake Phewa and the Annapurna range.', now() - INTERVAL '72 hours', now() - INTERVAL '71 hours', now() - INTERVAL '71 hours'),
        (demo_business_id, 'Viber', 'Tsering Sherpa', 'What is the temperature of the outdoor pool? Is it heated?', 'Replied', 'Namaste Tsering, our outdoor pool is solar-heated and maintained at a comfortable 26 to 28 degrees Celsius.', now() - INTERVAL '76 hours', now() - INTERVAL '75 hours', now() - INTERVAL '75 hours');

    -- 8. Re-seed Transactions
    -- Simulates 6 months (180 days) of transactions up to the current date
    FOR d IN 0..180 LOOP
        date_item := today_date - d;
        
        -- Inflow: Room Booking
        INSERT INTO public.transactions (business_id, date, description, amount, category_id, employee_id, type)
        SELECT 
            demo_business_id, 
            date_item, 
            'Deluxe Suite Booking - Room ' || (300 + floor(random() * 90)::int), 
            180 + floor(random() * 200)::numeric, 
            c.id, 
            staff_gm_id, 
            'Inflow'
        FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Room Booking' AND c.type = 'Inflow';

        -- Inflow: Restaurant
        INSERT INTO public.transactions (business_id, date, description, amount, category_id, employee_id, type)
        SELECT 
            demo_business_id, 
            date_item, 
            'Himalayan Oak Restaurant Dining Revenue', 
            60 + floor(random() * 120)::numeric, 
            c.id, 
            staff_chef_id, 
            'Inflow'
        FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Restaurant' AND c.type = 'Inflow';

        -- Inflow: Spa (every 2 days)
        IF MOD(d, 2) = 0 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, employee_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Himalayan Wellness Spa Session Revenue', 
                70 + floor(random() * 80)::numeric, 
                c.id, 
                staff_spa_id, 
                'Inflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Spa & Wellness' AND c.type = 'Inflow';
        END IF;

        -- Inflow: Banquets (weekly)
        IF MOD(d, 7) = 0 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, employee_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Corporate Banquet Seminar Event Booking Inflow', 
                1800 + floor(random() * 1500)::numeric, 
                c.id, 
                staff_gm_id, 
                'Inflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Banquets & Events' AND c.type = 'Inflow';
        END IF;

        -- Outflow: Salaries (monthly)
        IF MOD(d, 30) = 5 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Monthly Resort Employee Salaries Distribution', 
                8500, 
                c.id, 
                'Outflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Payroll' AND c.type = 'Outflow';
        END IF;

        -- Outflow: Kitchen Inventory (every 4 days)
        IF MOD(d, 4) = 1 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, employee_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'F&B Fresh Kitchen Produce and Drinks Restock', 
                400 + floor(random() * 300)::numeric, 
                c.id, 
                staff_chef_id, 
                'Outflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Kitchen Inventory' AND c.type = 'Outflow';
        END IF;

        -- Outflow: Utilities (monthly)
        IF MOD(d, 30) = 12 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Pokhara Electricity & Water Board Utility Billing', 
                1200 + floor(random() * 400)::numeric, 
                c.id, 
                'Outflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Utilities' AND c.type = 'Outflow';
        END IF;

        -- Outflow: Marketing (monthly)
        IF MOD(d, 30) = 20 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Google Ads & Tourism Portal Monthly Campaign Outflow', 
                900 + floor(random() * 500)::numeric, 
                c.id, 
                'Outflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Marketing' AND c.type = 'Outflow';
        END IF;

        -- Outflow: Maintenance (every 14 days)
        IF MOD(d, 14) = 3 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Resort Infrastructure Repairs & Swimming Pool Maintenance', 
                450 + floor(random() * 400)::numeric, 
                c.id, 
                'Outflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'Maintenance' AND c.type = 'Outflow';
        END IF;

        -- Outflow: SaaS Software (monthly)
        IF MOD(d, 30) = 27 THEN
            INSERT INTO public.transactions (business_id, date, description, amount, category_id, type)
            SELECT 
                demo_business_id, 
                date_item, 
                'Property Management SaaS Systems Cloud License Fee', 
                350, 
                c.id, 
                'Outflow'
            FROM public.categories c WHERE c.business_id = demo_business_id AND c.name = 'SaaS & Software' AND c.type = 'Outflow';
        END IF;
    END LOOP;

    -- 9. Re-seed Metis Brief
    INSERT INTO public.metis_briefs (business_id, date, content) VALUES (
        demo_business_id,
        today_date,
        '{
            "pnl_summary": {
                "total_inflow": 135400,
                "total_outflow": 82450,
                "net_profit": 52950,
                "margin_percent": 39.1
            },
            "insights": [
                "Revenue is stable, showing a 14.2% month-on-month increase driven by peak season room reservations and corporate seminar hall bookings.",
                "Operational outflows spike during the first week of the month due to salary disbursements ($8,500) and utility billing ($1,420).",
                "Spa wellness package bookings have increased by 22% since introducing targeted digital campaigns on social channels.",
                "Bar and kitchen inventory levels are healthy, but \"Single Malt Himalayan Oak Whiskey\" is approaching reorder threshold (stock: 45)."
            ],
            "recommendations": [
                "Automate reordering of low-stock beverage items to avoid stockouts ahead of the upcoming weekend event banquet.",
                "Reallocate $500 from utility buffer towards social marketing campaigns specifically promoting Pokhara lake views.",
                "Optimize air conditioning and lighting scheduling in public areas to reduce monthly utility outflow by 8%."
            ]
        }'::jsonb
    )
    ON CONFLICT (business_id, date) DO UPDATE SET content = EXCLUDED.content;
END;
$$;

-- =================================================================
-- CRON SCHEDULING (RUN IN SUPABASE SQL EDITOR WITH EXTENSION SUPPORT)
-- =================================================================
-- To enable scheduling, ensure pg_cron is enabled in your extensions:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- Schedule the daily reset at midnight (UTC):
-- SELECT cron.schedule(
--   'reset-demo-business-job',
--   '0 0 * * *',
--   'SELECT public.reset_demo_business_data();'
-- );

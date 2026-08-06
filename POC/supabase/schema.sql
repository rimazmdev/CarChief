-- ===================================================
-- CARCHIEF SUPABASE DATABASE SCHEMA & SEED DATA
-- ===================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure Supabase default roles exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END $$;

-- 1. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    type TEXT DEFAULT 'Sedan',
    year INT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    mileage INT DEFAULT 0,
    condition TEXT DEFAULT 'Used',
    color TEXT DEFAULT 'White',
    transmission TEXT DEFAULT 'Automatic',
    fuel_type TEXT DEFAULT 'Petrol',
    engine TEXT,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Available',
    stock_location TEXT,
    current_location TEXT,
    eta_date DATE,
    etd_date DATE,
    inspection_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to vehicles" ON public.vehicles;
CREATE POLICY "Allow public read access to vehicles"
    ON public.vehicles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to vehicles" ON public.vehicles;
CREATE POLICY "Allow authenticated full access to vehicles"
    ON public.vehicles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 2. FAQS TABLE
CREATE TABLE IF NOT EXISTS public.faqs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    keywords TEXT,
    status TEXT DEFAULT 'active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to active faqs" ON public.faqs;
CREATE POLICY "Allow public read access to active faqs"
    ON public.faqs FOR SELECT
    USING (status = 'active');

DROP POLICY IF EXISTS "Allow authenticated full access to faqs" ON public.faqs;
CREATE POLICY "Allow authenticated full access to faqs"
    ON public.faqs FOR ALL
    TO authenticated
    USING (true);


-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    auth_user_id UUID,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    tier TEXT DEFAULT 'Standard',
    country TEXT,
    city TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to customers" ON public.customers;
CREATE POLICY "Allow public read access to customers"
    ON public.customers FOR SELECT
    USING (true);


-- 4. ORDERS & RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    order_type TEXT DEFAULT 'Reservation',
    total_amount NUMERIC(12,2) NOT NULL,
    deposit_amount NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
CREATE POLICY "Allow public read access to orders"
    ON public.orders FOR SELECT
    USING (true);


-- ===================================================
-- DUMMY SEED DATA
-- ===================================================

-- Seed Vehicles
INSERT INTO public.vehicles (id, make, model, type, year, price, mileage, condition, color, transmission, fuel_type, engine, description, images, status, stock_location, current_location, inspection_status)
VALUES
  ('vh-101', 'Toyota', 'Land Cruiser Prado', 'SUV', 2021, 38500.00, 45000, 'Used', 'Pearl White', 'Automatic', 'Diesel', '2.8L Turbo Diesel', 'Mint condition TX-L package with leather interior and sunroof.', ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Yokohama Yard', 'Port of Yokohama', 'Passed 150-Point Check'),
  ('vh-102', 'Honda', 'Civic Sedan', 'Sedan', 2022, 19800.00, 22000, 'Certified Pre-Owned', 'Crystal Black', 'Automatic', 'Petrol', '1.5L VTEC Turbo', 'Single owner, pristine maintenance history, Apple CarPlay equipped.', ARRAY['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Tokyo Yard', 'In Transit to Mombasa', 'Passed 150-Point Check'),
  ('vh-103', 'BMW', 'X5 xDrive40i', 'SUV', 2023, 62000.00, 12500, 'Certified Pre-Owned', 'Phytonic Blue', 'Automatic', 'Petrol', '3.0L Turbo Inline-6', 'M Sport package, panoramic roof, Harman Kardon sound system.', ARRAY['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Kobe Port', 'Kobe Port', 'Verified Pristine'),
  ('vh-104', 'Mercedes-Benz', 'C-Class C300', 'Sedan', 2022, 44500.00, 18000, 'Used', 'Obsidian Black', 'Automatic', 'Hybrid', '2.0L Turbo Mild-Hybrid', 'AMG line styling, ambient lighting, head-up display.', ARRAY['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=1000'], 'Reserved', 'Nagoya Yard', 'Customs Clearance', 'Passed 150-Point Check'),
  ('vh-105', 'Tesla', 'Model Y Long Range', 'SUV', 2023, 48900.00, 8500, 'Used', 'Solid Black', 'Automatic', 'Electric', 'Dual Motor AWD', 'Full Self-Driving Capability, 20-inch Induction wheels.', ARRAY['https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Tokyo Yard', 'Tokyo Yard', 'Battery Certified 98%'),
  ('vh-106', 'Porsche', '911 Carrera S', 'Coupe', 2021, 115000.00, 14200, 'Used', 'Guards Red', 'Automatic', 'Petrol', '3.0L Twin-Turbo Flat-6', 'Sport Chrono Package, PASM Sport Suspension, Sport Exhaust.', ARRAY['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Yokohama Yard', 'Yokohama Yard', 'Passed Master Inspection'),
  ('vh-107', 'Ford', 'F-150 Lariat', 'Truck', 2022, 51200.00, 29000, 'Used', 'Oxford White', 'Automatic', 'Petrol', '3.5L EcoBoost V6', '4x4 SuperCrew cab, FX4 Off-Road Package, Bang & Olufsen sound.', ARRAY['https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Osaka Yard', 'On Board Vessel', 'Passed 150-Point Check'),
  ('vh-108', 'Audi', 'Q7 55 TFSI', 'SUV', 2022, 53800.00, 26000, 'Certified Pre-Owned', 'Glacier White', 'Automatic', 'Petrol', '3.0L V6 Turbo', 'Quattro AWD, Virtual Cockpit, 3rd-row seating, air suspension.', ARRAY['https://images.unsplash.com/photo-1541348263662-e082662d82da?auto=format&fit=crop&q=80&w=1000'], 'Available', 'Nagoya Yard', 'Nagoya Yard', 'Passed 150-Point Check')
ON CONFLICT (id) DO UPDATE SET
  make = EXCLUDED.make,
  model = EXCLUDED.model,
  price = EXCLUDED.price,
  status = EXCLUDED.status;


-- Seed FAQs
INSERT INTO public.faqs (id, question, answer, category, keywords, status, sort_order)
VALUES
  ('faq-1', 'How does global vehicle shipping work?', 'We coordinate Roll-on/Roll-off (RoRo) and container shipping directly from major ports in Japan, Europe, and the US to your destination port, complete with full tracking.', 'Shipping', 'shipping, roro, container, freight, delivery', 'active', 1),
  ('faq-2', 'What payment methods are accepted for reservations?', 'We accept Wire Transfers (T/T), Credit Cards, Cryptocurrencies (USDT/BTC), and Escrow payments for secure vehicle reservations.', 'Payment', 'payment, wire transfer, credit card, crypto, deposit', 'active', 2),
  ('faq-3', 'Are all vehicles pre-inspected before dispatch?', 'Yes! Every vehicle undergoes a rigorous 150-point inspection including engine diagnostic, chassis integrity, and cosmetic assessment before listing.', 'Inspection', 'inspection, quality, condition, 150-point', 'active', 3),
  ('faq-4', 'How do I reserve a vehicle?', 'Click on any available vehicle, select "Reserve Now", pay the refundable deposit, and our logistics manager will assist you with contract details.', 'Reservations', 'reserve, booking, deposit, purchase', 'active', 4),
  ('faq-5', 'Do you handle customs clearance documentation?', 'We provide all essential export documents including Bill of Lading (B/L), Export Certificate, De-registration Certificate, and Commercial Invoice.', 'Customs', 'customs, bill of lading, export certificate, documents', 'active', 5)
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  answer = EXCLUDED.answer;


-- Seed Customers
INSERT INTO public.customers (id, email, name, company_name, phone, tier, country, city, status)
VALUES
  ('cust-101', 'alex.smith@globalfleet.com', 'Alex Smith', 'Global Fleet Solutions', '+1-555-0192', 'VIP', 'United States', 'Los Angeles', 'active'),
  ('cust-102', 'kenji.t@tokyomotors.jp', 'Kenji Tanaka', 'Tokyo Auto Exports', '+81-90-1234-5678', 'Wholesale', 'Japan', 'Tokyo', 'active'),
  ('cust-103', 'sarah.jenkins@ukcars.co.uk', 'Sarah Jenkins', 'Jenkins Luxury Cars', '+44-20-7946-0912', 'Standard', 'United Kingdom', 'London', 'active'),
  ('cust-104', 'david.o@nairobiauto.co.ke', 'David Otieno', 'Nairobi Motors Ltd', '+254-712-345678', 'VIP', 'Kenya', 'Nairobi', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;


-- Seed Orders
INSERT INTO public.orders (id, customer_id, vehicle_id, order_type, total_amount, deposit_amount, status)
VALUES
  ('ord-501', 'cust-101', 'vh-104', 'Reservation', 44500.00, 5000.00, 'Confirmed'),
  ('ord-502', 'cust-104', 'vh-101', 'Sale', 38500.00, 38500.00, 'Completed'),
  ('ord-503', 'cust-103', 'vh-102', 'Reservation', 19800.00, 2000.00, 'Pending')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

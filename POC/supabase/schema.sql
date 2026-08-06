-- ===================================================
-- CARCHIEF SUPABASE DATABASE SCHEMA & RLS SETUP
-- ===================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Enable Row Level Security (RLS) on Vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Allow Public Read access for Vehicles
CREATE POLICY "Allow public read access to vehicles"
    ON public.vehicles FOR SELECT
    USING (true);

-- Allow Authenticated Users to Insert/Update/Delete Vehicles
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

CREATE POLICY "Allow public read access to active faqs"
    ON public.faqs FOR SELECT
    USING (status = 'active');

CREATE POLICY "Allow authenticated full access to faqs"
    ON public.faqs FOR ALL
    TO authenticated
    USING (true);


-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

CREATE POLICY "Allow users to read their own customer profile"
    ON public.customers FOR SELECT
    TO authenticated
    USING (auth.uid() = auth_user_id);


-- 4. ORDERS & RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    order_type TEXT DEFAULT 'Reservation', -- Reservation, Invoice, Sale
    total_amount NUMERIC(12,2) NOT NULL,
    deposit_amount NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow customers to view their own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (customer_id IN (
        SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
    ));

-- Insert sample seed vehicle data
INSERT INTO public.vehicles (id, make, model, type, year, price, mileage, condition, color, transmission, fuel_type, engine, description, status)
VALUES
  ('vh-101', 'Toyota', 'Land Cruiser Prado', 'SUV', 2021, 38500.00, 45000, 'Used', 'Pearl White', 'Automatic', 'Diesel', '2.8L Turbo Diesel', 'Mint condition TX-L package with leather interior.', 'Available'),
  ('vh-102', 'Honda', 'Civic Sedan', 'Sedan', 2022, 19800.00, 22000, 'Certified Pre-Owned', 'Crystal Black', 'Automatic', 'Petrol', '1.5L VTEC Turbo', 'Single owner, pristine maintenance history.', 'Available')
ON CONFLICT (id) DO NOTHING;

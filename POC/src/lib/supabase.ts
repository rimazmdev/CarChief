import { createClient } from '@supabase/supabase-js';

// Local Supabase defaults to http://127.0.0.1:54321
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE1Nzg1Nzg4MDAsImV4cCI6MTkwNDEzNDgwMH0.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseVehicle {
  id: string;
  make: string;
  model: string;
  type: string;
  year: number;
  price: number;
  mileage: number;
  condition: string;
  color: string;
  transmission: string;
  fuel_type: string;
  engine: string;
  description: string;
  images: string[];
  status: string;
  created_at?: string;
}

export const fetchVehiclesFromSupabase = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return data || [];
};

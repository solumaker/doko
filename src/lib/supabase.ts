import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Company {
  id: string;
  name: string;
  cif: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  role: 'admin' | 'driver';
  full_name: string;
  email: string;
  created_at: string;
}

export interface Location {
  id: string;
  company_id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  contact_name: string;
  phone: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  tractor_plate: string;
  trailer_plate: string;
  alias: string;
  created_at: string;
}

export interface DocumentContent {
  origin: {
    name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    contact_name: string;
    phone: string;
  };
  destination: {
    name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    contact_name: string;
    phone: string;
  };
  vehicle: {
    tractor_plate: string;
    trailer_plate: string;
    alias: string;
  };
  cargo: {
    description: string;
    packages: number;
    weight_kg: number;
  };
  company: {
    name: string;
    cif: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
  };
}

export interface Document {
  id: string;
  company_id: string;
  creator_id: string;
  content: DocumentContent;
  departure_date: string;
  created_at: string;
  pdf_url?: string;
}

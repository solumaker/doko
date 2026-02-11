import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callEdgeFunction(functionName: string, body: Record<string, unknown>, authToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { data, ok: res.ok, status: res.status };
}

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
  contractual_shipper?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
  };
  origin: {
    domicilio?: string;
    poblacion?: string;
    name?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    contact_name?: string;
    phone?: string;
  };
  destination: {
    domicilio?: string;
    poblacion?: string;
    name?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    contact_name?: string;
    phone?: string;
  };
  vehicle: {
    tractor_plate: string;
    trailer_plate_1?: string;
    trailer_plate_2?: string;
    trailer_plate?: string;
    alias?: string;
  };
  cargo: {
    description: string;
    packages?: number;
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
  pdf_original_url?: string;
  driver_name?: string;
}

export interface DriverCompanyLink {
  id: string;
  driver_id: string;
  company_id: string;
  access_token: string;
  is_active: boolean;
  created_at: string;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callEdgeFunction(functionName: string, body: Record<string, unknown>, authToken?: string) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`callEdgeFunction [${functionName}] error ${response.status}:`, data);
      return { data, ok: false, status: response.status };
    }
    return { data, ok: true, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`callEdgeFunction [${functionName}] fetch error:`, message);
    return { data: { message }, ok: false, status: 0 };
  }
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
  stripe_customer_id?: string;
  trial_ends_at?: string;
  created_at: string;
}

export type PlanId = 'autonomo' | 'pyme' | 'flotas';

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  document_limit: number;
  user_limit: number;
  support: string;
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  autonomo: { id: 'autonomo', name: 'Autonomo', price: 40, document_limit: 100, user_limit: 1, support: 'Email' },
  pyme: { id: 'pyme', name: 'Pyme', price: 99, document_limit: 500, user_limit: 3, support: 'Email prioritario' },
  flotas: { id: 'flotas', name: 'Flotas', price: 200, document_limit: 2500, user_limit: 10, support: 'Telefono y email' },
};

export interface Subscription {
  id: string;
  company_id: string;
  stripe_subscription_id: string | null;
  plan: PlanId;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  document_limit: number;
  user_limit: number;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentPack {
  id: string;
  company_id: string;
  stripe_payment_intent_id: string | null;
  documents_purchased: number;
  documents_remaining: number;
  purchased_at: string;
}

export interface SubscriptionUsage {
  documents_used: number;
  document_limit: number;
  documents_extra_remaining: number;
  users_count: number;
  user_limit: number;
  plan: PlanId | null;
  status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  is_trial_active: boolean;
}

export interface Profile {
  id: string;
  company_id: string;
  role: 'admin' | 'driver';
  full_name: string;
  email: string;
  dni?: string;
  created_at: string;
}

export interface DocumentVisibility {
  id: string;
  document_id: string;
  profile_id: string;
  hidden_at: string;
}

export interface Location {
  id: string;
  company_id: string;
  name: string;
  nif: string;
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

export interface SignatureData {
  firmante: string;
  dni: string;
  firma_imagen: string;
  fecha: string;
}

export interface VehicleAmendment {
  tractor_plate?: string;
  trailer_plate_1?: string;
  trailer_plate_2?: string;
  amended_at: string;
}

export interface DocumentContent {
  contractual_shipper?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
  };
  origin: {
    empresa?: string;
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
    empresa?: string;
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
    amendments?: VehicleAmendment[];
  };
  cargo: {
    description: string;
    packages?: number;
    weight_kg: number;
  };
  unloading_date?: string;
  company: {
    name: string;
    cif: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
  };
  driver?: {
    name: string;
    email?: string;
    dni?: string;
  };
  signatures?: {
    origin?: SignatureData;
    destination?: SignatureData;
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

export interface ShipperHistory {
  id: string;
  company_id: string;
  nombre: string;
  nif: string;
  domicilio: string;
  poblacion: string;
  use_count: number;
  last_used: string;
  created_at: string;
}

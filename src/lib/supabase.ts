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
  let token = authToken;
  if (!token) {
    try {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      token = refreshed?.access_token ?? undefined;
    } catch {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token ?? undefined;
    }
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export type CompanyRole = 'cargador' | 'transportista';

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
  driver_doc_visibility_days?: number | null;
  company_role: CompanyRole;
}

export type PlanId = 'basico' | 'pro' | 'grandes_empresas' | 'autonomo' | 'pyme' | 'flotas';
export type PaidPlanId = 'basico' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  document_limit: number;
  support: string;
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  basico: { id: 'basico', name: 'Basico', price: 9, document_limit: 100, support: 'Email' },
  pro: { id: 'pro', name: 'Pro', price: 16, document_limit: 100, support: 'Soporte prioritario' },
  grandes_empresas: { id: 'grandes_empresas', name: 'Grandes empresas', price: 0, document_limit: 0, support: 'Soporte dedicado' },
  autonomo: { id: 'autonomo', name: 'Basico', price: 9, document_limit: 100, support: 'Email' },
  pyme: { id: 'pyme', name: 'Pro', price: 16, document_limit: 100, support: 'Soporte prioritario' },
  flotas: { id: 'flotas', name: 'Pro', price: 16, document_limit: 100, support: 'Soporte prioritario' },
};

export interface PlanTier {
  plan: PaidPlanId;
  documents: number;
  price_monthly_eur: number | null;
  price_yearly_eur: number | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  available_monthly: boolean;
  available_yearly: boolean;
}

export interface ExtraPackConfig {
  plan: PaidPlanId;
  price_per_10_eur: number;
  stripe_price_id: string | null;
}

export const TIER_VALUES: number[] = [100, 200, 400, 800, 1500, 3000, 5000, 7500, 10000];
export const TIER_LABELS: Record<number, string> = {
  100: '100',
  200: '200',
  400: '400',
  800: '800',
  1500: '1.500',
  3000: '3.000',
  5000: '5.000',
  7500: '7.500',
  10000: '10.000',
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
  documents_extra_purchased: number;
  users_count: number;
  user_limit: number;
  plan: PlanId | null;
  normalized_plan: PaidPlanId | null;
  status: string | null;
  billing_cycle: BillingCycle;
  document_tier: number | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  is_trial_active: boolean;
  is_subscription_expired: boolean;
  trial_docs_used: number;
  trial_doc_limit: number;
  free_doc_limit: number;
  free_docs_used: number;
  free_window_start: string | null;
  free_window_end: string | null;
  cancel_at_period_end: boolean;
  pending_plan: PlanId | null;
  pending_plan_effective_date: string | null;
  extra_unit_price: number | null;
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

export interface DocumentFieldChange {
  field: string;
  label: string;
  old_value: string;
  new_value: string;
}

export interface DocumentAmendment {
  id: string;
  reason: string;
  changes: DocumentFieldChange[];
  amended_at: string;
  amended_by?: string;
}

export interface DocumentContent {
  acting_as?: 'transportista' | 'cargador';
  contractual_shipper?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
    postal_code?: string;
  };
  transportista_efectivo?: {
    nombre: string;
    nif: string;
    domicilio: string;
    poblacion: string;
    postal_code?: string;
  };
  origin: {
    empresa?: string;
    domicilio?: string;
    poblacion?: string;
    nif?: string;
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
    nif?: string;
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
    special_authorization?: string;
    amendments?: VehicleAmendment[];
  };
  cargo: {
    description: string;
    packages?: number;
    weight_kg: number;
    weight_unit?: string;
  };
  observations?: string;
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
  amendments?: DocumentAmendment[];
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

export type PartyType = 'contractual_shipper' | 'transportista_efectivo' | 'origin' | 'destination';

export interface PartyHistory {
  id: string;
  company_id: string;
  party_type: PartyType;
  nombre: string;
  nif: string;
  domicilio: string;
  poblacion: string;
  postal_code: string;
  use_count: number;
  last_used: string;
  created_at: string;
}

export interface VehicleHistory {
  id: string;
  company_id: string;
  tractor_plate: string;
  trailer_plate_1: string;
  trailer_plate_2: string;
  use_count: number;
  last_used: string;
  created_at: string;
}

export interface ObservationHistory {
  id: string;
  company_id: string;
  text: string;
  use_count: number;
  last_used: string;
  created_at: string;
}

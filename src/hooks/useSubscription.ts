import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionUsage {
  plan: string | null;
  status: string | null;
  normalized_plan: string | null;
  documents_used: number;
  document_limit: number;
  documents_extra_remaining: number;
  users_count: number;
  user_limit: number;
  is_trial_active: boolean;
  is_subscription_expired: boolean;
  free_docs_used: number;
  free_doc_limit: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  pending_plan: string | null;
  pending_plan_effective_date: string | null;
  billing_cycle: string | null;
  document_tier: number | null;
}

export function useSubscription() {
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
          .single();

        if (!profile?.company_id || cancelled) return;

        const { data, error: rpcError } = await supabase.rpc('get_subscription_usage', {
          p_company_id: profile.company_id,
        });

        if (cancelled) return;
        if (rpcError) throw rpcError;
        setUsage(data as SubscriptionUsage);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { usage, loading, error };
}
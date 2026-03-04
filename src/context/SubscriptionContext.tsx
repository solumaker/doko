import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, SubscriptionUsage, PlanId, callEdgeFunction } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  usage: SubscriptionUsage | null;
  loading: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  hasActiveSubscription: boolean;
  trialDaysLeft: number;
  canCreateDocument: () => boolean;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: (plan: PlanId) => Promise<void>;
  purchaseDocumentPack: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { profile, company } = useAuth();
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!profile?.company_id) {
      setUsage(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('get_subscription_usage', {
      p_company_id: profile.company_id,
    });

    if (error) {
      console.error('Error fetching subscription usage:', error);
      setLoading(false);
      return;
    }

    if (data && !data.error) {
      setUsage(data as SubscriptionUsage);
    }
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id) {
      fetchUsage();
    } else {
      setUsage(null);
      setLoading(false);
    }
  }, [profile?.company_id, fetchUsage]);

  const isTrialActive = usage?.is_trial_active ?? false;

  const hasActiveSubscription = usage?.status === 'active' || usage?.status === 'trialing';

  const isTrialExpired = !loading && usage !== null && !isTrialActive && !hasActiveSubscription && !!profile;

  const trialDaysLeft = (() => {
    if (!company?.trial_ends_at) return 0;
    const diff = new Date(company.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const canCreateDocument = useCallback(() => {
    if (!usage) return false;
    if (isTrialActive) return true;
    if (!hasActiveSubscription) return false;
    const totalAvailable = usage.document_limit + usage.documents_extra_remaining;
    return usage.documents_used < totalAvailable;
  }, [usage, isTrialActive, hasActiveSubscription]);

  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await fetchUsage();
  }, [fetchUsage]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const createCheckoutSession = useCallback(async (plan: PlanId) => {
    const token = await getToken();
    if (!token) return;
    const { data, ok } = await callEdgeFunction('stripe-checkout', {
      plan,
      mode: 'subscription',
      success_url: `${window.location.origin}?checkout_success=true`,
      cancel_url: `${window.location.origin}?checkout_cancel=true`,
    }, token);

    if (ok && data.url) {
      window.location.href = data.url;
    }
  }, [getToken]);

  const purchaseDocumentPack = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const { data, ok } = await callEdgeFunction('stripe-checkout', {
      mode: 'payment',
      pack: true,
      success_url: `${window.location.origin}?checkout_success=true&type=pack`,
      cancel_url: `${window.location.origin}?checkout_cancel=true`,
    }, token);

    if (ok && data.url) {
      window.location.href = data.url;
    }
  }, [getToken]);

  const openCustomerPortal = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const { data, ok } = await callEdgeFunction('stripe-portal', {
      return_url: window.location.origin,
    }, token);

    if (ok && data.url) {
      window.location.href = data.url;
    }
  }, [getToken]);

  return (
    <SubscriptionContext.Provider
      value={{
        usage,
        loading,
        isTrialActive,
        isTrialExpired,
        hasActiveSubscription,
        trialDaysLeft,
        canCreateDocument,
        refreshSubscription,
        createCheckoutSession,
        purchaseDocumentPack,
        openCustomerPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

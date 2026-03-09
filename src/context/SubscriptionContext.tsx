import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, callEdgeFunction, SubscriptionUsage, PlanId } from '../lib/supabase';
import { useAuth } from './AuthContext';

export const TRIAL_DOC_LIMIT = 50;

interface SubscriptionContextType {
  usage: SubscriptionUsage | null;
  loading: boolean;
  isSyncing: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  hasActiveSubscription: boolean;
  isSubscriptionExpired: boolean;
  isQuotaExhausted: boolean;
  trialDaysLeft: number;
  trialDocsUsed: number;
  trialDocsLeft: number;
  canCreateDocument: () => boolean;
  refreshSubscription: () => Promise<void>;
  syncAndRefresh: () => Promise<void>;
  createCheckoutSession: (plan: PlanId) => Promise<void>;
  purchaseDocumentPack: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { profile, company } = useAuth();
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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

  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel(`subscriptions_${profile.company_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `company_id=eq.${profile.company_id}`,
        },
        () => {
          fetchUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, fetchUsage]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && profile?.company_id) {
        fetchUsage();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [profile?.company_id, fetchUsage]);

  const isTrialActive = usage?.is_trial_active ?? false;

  const hasActiveSubscription = usage?.status === 'active' || usage?.status === 'trialing';

  const isSubscriptionExpired = !loading && !!usage && (usage.is_subscription_expired === true);

  const isTrialExpired = !loading && usage !== null && !isTrialActive && !hasActiveSubscription && !isSubscriptionExpired && !!profile;

  const isQuotaExhausted = (() => {
    if (!usage || !hasActiveSubscription) return false;
    const totalAvailable = usage.document_limit + usage.documents_extra_remaining;
    return usage.documents_used >= totalAvailable;
  })();

  const trialDaysLeft = (() => {
    if (!company?.trial_ends_at) return 0;
    const diff = new Date(company.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const trialDocsUsed = usage?.trial_docs_used ?? 0;
  const trialDocsLeft = Math.max(0, TRIAL_DOC_LIMIT - trialDocsUsed);

  const canCreateDocument = useCallback(() => {
    if (!usage) return false;
    if (isTrialActive) {
      return trialDocsUsed < TRIAL_DOC_LIMIT;
    }
    if (!hasActiveSubscription) return false;
    const totalAvailable = usage.document_limit + usage.documents_extra_remaining;
    return usage.documents_used < totalAvailable;
  }, [usage, isTrialActive, hasActiveSubscription, trialDocsUsed]);

  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await fetchUsage();
  }, [fetchUsage]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    return refreshed?.access_token ?? null;
  }, []);

  const callWithRetry = useCallback(async (
    functionName: string,
    body: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; ok: boolean }> => {
    const token = await getToken();
    if (!token) return { data: null, ok: false };

    return callEdgeFunction(functionName, body, token);
  }, [getToken]);

  const syncAndRefresh = useCallback(async () => {
    const previousPlan = usage?.plan ?? null;
    const previousLimit = usage?.document_limit ?? null;
    const previousPeriodEnd = usage?.current_period_end ?? null;

    setIsSyncing(true);
    setLoading(true);
    await callWithRetry('stripe-sync', {});

    const maxAttempts = 8;
    const delayMs = 2000;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (!profile?.company_id) break;

      const { data, error } = await supabase.rpc('get_subscription_usage', {
        p_company_id: profile.company_id,
      });

      if (!error && data && !data.error) {
        const result = data as SubscriptionUsage;
        const isActive = result.status === 'active' || result.status === 'trialing';
        const planChanged = previousPlan !== null && result.plan !== previousPlan;
        const limitChanged = previousLimit !== null && result.document_limit !== previousLimit;
        const periodChanged = previousPeriodEnd !== null && result.current_period_end !== previousPeriodEnd;
        const dataChanged = planChanged || limitChanged || periodChanged;
        const noKnownPrevious = previousPlan === null && isActive;

        if (dataChanged || noKnownPrevious || attempt === maxAttempts - 1) {
          setUsage(result);
          setLoading(false);
          break;
        }
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    setIsSyncing(false);
    setLoading(false);
  }, [callWithRetry, profile?.company_id, usage]);

  const createCheckoutSession = useCallback(async (plan: PlanId) => {
    const { data, ok } = await callWithRetry('stripe-checkout', {
      plan,
      mode: 'subscription',
      success_url: `${window.location.origin}?checkout_success=true`,
      cancel_url: `${window.location.origin}?checkout_cancel=true`,
    });

    if (!ok) console.error('stripe-checkout error:', data);
    if (ok && data?.url) {
      window.location.href = data.url as string;
    }
  }, [callWithRetry]);

  const purchaseDocumentPack = useCallback(async () => {
    const { data, ok } = await callWithRetry('stripe-checkout', {
      mode: 'payment',
      pack: true,
      success_url: `${window.location.origin}?checkout_success=true&type=pack`,
      cancel_url: `${window.location.origin}?checkout_cancel=true`,
    });

    if (!ok) console.error('stripe-checkout error:', data);
    if (ok && data?.url) {
      window.location.href = data.url as string;
    }
  }, [callWithRetry]);

  const openCustomerPortal = useCallback(async () => {
    const { data, ok } = await callWithRetry('stripe-portal', {
      return_url: `${window.location.origin}?portal_return=true`,
    });

    if (!ok) console.error('stripe-portal error:', data);
    if (ok && data?.url) {
      window.location.href = data.url as string;
    }
  }, [callWithRetry]);

  return (
    <SubscriptionContext.Provider
      value={{
        usage,
        loading,
        isSyncing,
        isTrialActive,
        isTrialExpired,
        hasActiveSubscription,
        isSubscriptionExpired,
        isQuotaExhausted,
        trialDaysLeft,
        trialDocsUsed,
        trialDocsLeft,
        canCreateDocument,
        refreshSubscription,
        syncAndRefresh,
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

import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Crown, Loader2 } from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  autonomo: 'Autónomo',
  pyme: 'Pyme',
  flotas: 'Flota',
  grandes_empresas: 'Grandes Empresas',
};

export function ActivePlanBadge() {
  const { usage, loading } = useSubscription();

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Cargando plan…</span>
      </div>
    );
  }

  if (!usage?.plan || usage.is_trial_active) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
        <span>Plan Gratuito</span>
      </div>
    );
  }

  const label = PLAN_LABELS[usage.plan.toLowerCase()] ?? usage.plan;
  const isActive = usage.status === 'active' || usage.status === 'trialing';

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
      isActive
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      <Crown className="w-3 h-3" />
      <span>{label}</span>
      {!isActive && <span className="opacity-70">({usage.status})</span>}
    </div>
  );
}
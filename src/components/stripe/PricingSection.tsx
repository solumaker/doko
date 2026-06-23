import React from 'react';
import { PricingCard } from './PricingCard';
import { SUBSCRIPTION_PLANS, EXTRA_PACKS } from '../../stripe-config';
import { useSubscription } from '../../hooks/useSubscription';
import { Package, Crown } from 'lucide-react';

export function PricingSection() {
  const { usage } = useSubscription();
  const currentPlan = usage?.plan ?? null;

  return (
    <div className="space-y-12">
      {/* Subscription Plans */}
      <section>
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <Crown className="w-3.5 h-3.5" />
            Planes de suscripción
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Elige el plan que mejor se adapta a tu empresa</h2>
          <p className="text-gray-500 mt-2 text-sm">Cancela en cualquier momento. Sin permanencia.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {SUBSCRIPTION_PLANS.map((plan, i) => (
            <PricingCard
              key={plan.priceId}
              product={plan}
              highlighted={plan.name === 'Pro'}
              badge={plan.name === 'Pro' ? 'Más popular' : undefined}
              currentPlan={currentPlan}
            />
          ))}
        </div>
      </section>

      {/* Extra Packs */}
      <section>
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <Package className="w-3.5 h-3.5" />
            Paquetes adicionales
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¿Necesitas más documentos puntualmente?</h2>
          <p className="text-gray-500 mt-2 text-sm">Compra documentos extra sin cambiar de plan.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto gap-4">
          {EXTRA_PACKS.map((pack) => (
            <PricingCard key={pack.priceId} product={pack} currentPlan={currentPlan} />
          ))}
        </div>
      </section>
    </div>
  );
}
import { Check, Star, CreditCard, Package, Loader2, ShieldCheck, Clock, Settings, ArrowRight } from 'lucide-react';
import { QuantityStepper } from '../components/QuantityStepper';
import { format } from 'date-fns';
import { PLAN_CONFIG, PlanId } from '../lib/supabase';
import { useSubscription } from '../context/SubscriptionContext';
import { useState } from 'react';
import { AppLayout } from '../components/AppLayout';

interface PlanesProps {
  onBack: () => void;
  onGoToEquipo?: () => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

const planOrder: PlanId[] = ['autonomo', 'pyme', 'flotas'];

const planFeatures: Record<PlanId, string[]> = {
  autonomo: ['100 documentos/mes', 'Usuarios ilimitados', 'Soporte por email'],
  pyme: ['500 documentos/mes', 'Usuarios ilimitados', 'Soporte email prioritario'],
  flotas: ['2.500 documentos/mes', 'Usuarios ilimitados', 'Soporte telefono y email'],
};

export function Planes({ onBack, onGoToEquipo: _onGoToEquipo, onLogout, onNavigate }: PlanesProps) {
  const { usage, hasActiveSubscription, freeDocsUsed, freeDocLimit, daysUntilReset, createCheckoutSession, purchaseDocumentPack, openCustomerPortal } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [packQty, setPackQty] = useState(1);

  const currentPlan = usage?.plan;

  const handleSelectPlan = async (planId: PlanId) => {
    if (hasActiveSubscription && currentPlan === planId) return;
    if (hasActiveSubscription) {
      await openCustomerPortal();
      return;
    }
    setLoadingPlan(planId);
    await createCheckoutSession(planId);
    setLoadingPlan(null);
  };

  const handleBuyPack = async () => {
    setLoadingPack(true);
    await purchaseDocumentPack(packQty);
    setLoadingPack(false);
  };

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    await openCustomerPortal();
    setLoadingPortal(false);
  };

  const handleNavItem = (item: string) => {
    onNavigate(item);
  };

  const docsUsed = usage?.documents_used ?? 0;
  const docsLimit = usage?.document_limit ?? 0;
  const docsExtra = usage?.documents_extra_remaining ?? 0;
  const totalLimit = docsLimit + docsExtra;
  const docsPct = totalLimit > 0 ? Math.min(100, Math.round((docsUsed / totalLimit) * 100)) : 0;

  const planLabel = currentPlan ? PLAN_CONFIG[currentPlan]?.name : 'Gratuito (prueba)';
  const statusLabel = usage?.status === 'trialing' ? 'Periodo de prueba' : usage?.status === 'active' ? 'Activa' : usage?.is_trial_active ? 'Periodo de prueba' : 'Sin suscripcion';

  const isCanceling = hasActiveSubscription && usage?.cancel_at_period_end;

  const dateLabel = (() => {
    if (hasActiveSubscription && usage?.current_period_end) {
      if (isCanceling) {
        return `Finaliza el ${format(new Date(usage.current_period_end), 'dd/MM/yyyy')}`;
      }
      return `Se renueva el ${format(new Date(usage.current_period_end), 'dd/MM/yyyy')}`;
    }
    if (!hasActiveSubscription && usage?.trial_ends_at) {
      return `Vence el ${format(new Date(usage.trial_ends_at), 'dd/MM/yyyy')}`;
    }
    return null;
  })();

  return (
    <AppLayout
      activeNav="suscripcion"
      onNavigate={handleNavItem}
      onLogout={onLogout}
      pageTitle="Mi Suscripcion"
    >
      <div className="w-full space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Estado actual</h2>
            {hasActiveSubscription && (
              <button
                onClick={handleOpenPortal}
                disabled={loadingPortal}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-60"
              >
                {loadingPortal ? <Loader2 size={15} className="animate-spin" /> : <Settings size={15} />}
                Gestionar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-xl ${hasActiveSubscription ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              {hasActiveSubscription
                ? <ShieldCheck size={22} className="text-emerald-500" />
                : <Clock size={22} className="text-amber-500" />
              }
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{planLabel}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hasActiveSubscription ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {statusLabel}
                </span>
                {dateLabel && <p className="text-xs text-slate-400">{dateLabel}</p>}
              </div>
            </div>
          </div>

          {hasActiveSubscription && usage?.pending_plan && usage.pending_plan !== usage.plan && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <ArrowRight size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Cambio de plan programado</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  A partir del{' '}
                  <span className="font-bold">
                    {usage.pending_plan_effective_date
                      ? format(new Date(usage.pending_plan_effective_date), 'dd/MM/yyyy')
                      : usage.current_period_end
                        ? format(new Date(usage.current_period_end), 'dd/MM/yyyy')
                        : '—'}
                  </span>{' '}
                  pasaras al plan{' '}
                  <span className="font-bold">{PLAN_CONFIG[usage.pending_plan]?.name ?? usage.pending_plan}</span>.
                </p>
              </div>
            </div>
          )}

          {hasActiveSubscription && usage?.cancel_at_period_end && !usage.pending_plan && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <Clock size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">Cancelacion programada</p>
                <p className="text-sm text-red-600 mt-0.5">
                  Tu suscripcion se cancelara el{' '}
                  <span className="font-bold">
                    {usage.current_period_end
                      ? format(new Date(usage.current_period_end), 'dd/MM/yyyy')
                      : '—'}
                  </span>. Podras seguir usando el servicio hasta esa fecha.
                </p>
              </div>
            </div>
          )}

          {!hasActiveSubscription ? (
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-slate-600">Documentos en Plan Gratuito</span>
                <span className="text-sm font-bold text-slate-800">{freeDocsUsed} / {freeDocLimit}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    freeDocLimit > 0 && freeDocsUsed / freeDocLimit >= 0.9 ? 'bg-red-500' : freeDocLimit > 0 && freeDocsUsed / freeDocLimit >= 0.7 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${freeDocLimit > 0 ? Math.min(100, Math.round((freeDocsUsed / freeDocLimit) * 100)) : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Reinicio en {daysUntilReset} {daysUntilReset === 1 ? 'dia' : 'dias'} &middot; {Math.max(0, freeDocLimit - freeDocsUsed)} documentos disponibles
              </p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-slate-600">Documentos utilizados</span>
                <span className="text-sm font-bold text-slate-800">
                  {docsUsed} / {totalLimit > 0 ? totalLimit : '—'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    docsPct >= 90 ? 'bg-red-500' : docsPct >= 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: totalLimit > 0 ? `${docsPct}%` : '0%' }}
                />
              </div>
              {docsExtra > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Incluye <span className="font-semibold text-amber-600">{docsExtra} extra</span> sin caducidad
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            {hasActiveSubscription ? 'Cambiar plan' : 'Elige tu plan'}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {planOrder.map((planId, idx) => {
              const plan = PLAN_CONFIG[planId];
              const isCurrentPlan = hasActiveSubscription && currentPlan === planId;
              const isPopular = idx === 1;
              const isLoading = loadingPlan === planId;

              return (
                <div
                  key={planId}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all ${
                    isPopular
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                      : isCurrentPlan
                        ? 'border-emerald-500 bg-white'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-amber-400 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                        <Star size={10} fill="currentColor" />
                        Recomendado
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">Plan actual</span>
                    </div>
                  )}

                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isPopular ? 'text-blue-200' : 'text-slate-400'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-4">
                    <span className={`text-3xl font-extrabold leading-none ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                      {plan.price}€
                    </span>
                    <span className={`text-sm mb-0.5 ${isPopular ? 'text-blue-200' : 'text-slate-400'}`}>/mes</span>
                  </div>

                  <ul className="space-y-2 mb-5 flex-1">
                    {planFeatures[planId].map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm">
                        <Check size={14} className={isPopular ? 'text-blue-200 shrink-0' : 'text-emerald-500 shrink-0'} strokeWidth={3} />
                        <span className={isPopular ? 'text-blue-100' : 'text-slate-600'}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <div className={`w-full py-3 rounded-xl font-bold text-center text-sm bg-emerald-50 text-emerald-700`}>
                      Plan activo
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(planId)}
                      disabled={isLoading}
                      className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                        isPopular
                          ? 'bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98]'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                      } disabled:opacity-60`}
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={15} />}
                      {hasActiveSubscription ? 'Cambiar plan' : 'Suscribirme'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-50 p-2.5 rounded-xl">
              <Package size={22} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Documentos extra</h3>
              <p className="text-sm text-slate-500">Pago unico, no expiran</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Anade paquetes de <span className="font-bold text-slate-900">+10 documentos</span> a tu saldo.
            No se pierden al renovar tu plan.
          </p>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
            <QuantityStepper value={packQty} onChange={setPackQty} min={1} max={50} />
            <span className="text-sm text-slate-500">
              {packQty} x 5 EUR = <span className="font-bold text-slate-900">{packQty * 5} EUR</span>
            </span>
          </div>
          <button
            onClick={handleBuyPack}
            disabled={loadingPack || !hasActiveSubscription}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loadingPack ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={17} />}
            Comprar +{packQty * 10} documentos
          </button>
          {!hasActiveSubscription && (
            <p className="text-xs text-slate-400 text-center mt-2">Necesitas una suscripcion activa para comprar documentos extra</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

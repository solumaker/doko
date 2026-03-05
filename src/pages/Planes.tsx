import { ArrowLeft, Check, Star, CreditCard, Package, Loader2, ShieldCheck, Clock, Settings, ArrowRight, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { PLAN_CONFIG, PlanId } from '../lib/supabase';
import { useSubscription, TRIAL_DOC_LIMIT } from '../context/SubscriptionContext';
import { useState } from 'react';

interface PlanesProps {
  onBack: () => void;
  onGoToEquipo?: () => void;
}

const planOrder: PlanId[] = ['autonomo', 'pyme', 'flotas'];

const planFeatures: Record<PlanId, string[]> = {
  autonomo: ['100 documentos/mes', '1 usuario', 'Soporte por email'],
  pyme: ['500 documentos/mes', '3 usuarios', 'Soporte email prioritario'],
  flotas: ['2.500 documentos/mes', '10 usuarios', 'Soporte telefono y email'],
};

export function Planes({ onBack, onGoToEquipo }: PlanesProps) {
  const { usage, hasActiveSubscription, trialDocsUsed, trialDaysLeft, createCheckoutSession, purchaseDocumentPack, openCustomerPortal } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const currentPlan = usage?.plan;
  const driverCount = usage?.users_count ?? 0;

  const getMinPlanForDrivers = (count: number): PlanId | null => {
    for (const planId of planOrder) {
      if (PLAN_CONFIG[planId].user_limit >= count) return planId;
    }
    return null;
  };

  const isPlanCompatibleWithDrivers = (planId: PlanId): boolean => {
    return PLAN_CONFIG[planId].user_limit >= driverCount;
  };

  const minRequiredPlan = getMinPlanForDrivers(driverCount);
  const hasDriversExceedingMinPlan = driverCount > PLAN_CONFIG['autonomo'].user_limit;
  const driversExceedAllPlans = driverCount > PLAN_CONFIG['flotas'].user_limit;

  const handleSelectPlan = async (planId: PlanId) => {
    if (hasActiveSubscription && currentPlan === planId) return;
    if (hasActiveSubscription) {
      await openCustomerPortal();
      return;
    }
    if (!isPlanCompatibleWithDrivers(planId)) return;
    setLoadingPlan(planId);
    await createCheckoutSession(planId);
    setLoadingPlan(null);
  };

  const handleBuyPack = async () => {
    setLoadingPack(true);
    await purchaseDocumentPack();
    setLoadingPack(false);
  };

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    await openCustomerPortal();
    setLoadingPortal(false);
  };

  const docsUsed = usage?.documents_used ?? 0;
  const docsLimit = usage?.document_limit ?? 0;
  const docsExtra = usage?.documents_extra_remaining ?? 0;
  const totalLimit = docsLimit + docsExtra;
  const docsPct = totalLimit > 0 ? Math.min(100, Math.round((docsUsed / totalLimit) * 100)) : 0;

  const planLabel = currentPlan ? PLAN_CONFIG[currentPlan]?.name : 'Gratuito (prueba)';
  const statusLabel = usage?.status === 'trialing' ? 'Periodo de prueba' : usage?.status === 'active' ? 'Activa' : usage?.is_trial_active ? 'Periodo de prueba' : 'Sin suscripcion';

  const dateLabel = (() => {
    if (hasActiveSubscription && usage?.current_period_end) {
      return `Se renueva el ${format(new Date(usage.current_period_end), 'dd/MM/yyyy')}`;
    }
    if (!hasActiveSubscription && usage?.trial_ends_at) {
      return `Vence el ${format(new Date(usage.trial_ends_at), 'dd/MM/yyyy')}`;
    }
    return null;
  })();

  const showDriversBanner = !hasActiveSubscription && hasDriversExceedingMinPlan;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft size={28} />
        </button>
        <h1 className="text-xl font-bold">{hasActiveSubscription ? 'Mi Suscripcion' : 'Elige tu plan'}</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4 pb-8">

        {showDriversBanner && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-xl shrink-0">
                <Users size={20} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-amber-900 mb-1">
                  Tienes {driverCount} {driverCount === 1 ? 'usuario' : 'usuarios'} registrados
                </p>
                {driversExceedAllPlans ? (
                  <p className="text-sm text-amber-800">
                    Ningun plan cubre {driverCount} usuarios. Debes eliminar conductores antes de suscribirte.
                  </p>
                ) : (
                  <p className="text-sm text-amber-800">
                    Solo puedes contratar el plan{' '}
                    <span className="font-bold">{minRequiredPlan ? PLAN_CONFIG[minRequiredPlan].name : '—'}</span>
                    {minRequiredPlan && minRequiredPlan !== 'flotas' ? ' o superior' : ''}.
                    Los planes con menos usuarios no estan disponibles hasta que reduzcas tu equipo.
                  </p>
                )}
                {onGoToEquipo && (
                  <button
                    onClick={onGoToEquipo}
                    className="mt-2.5 text-sm font-semibold text-amber-800 underline underline-offset-2"
                  >
                    Gestionar equipo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-700 uppercase tracking-wide">Mi Suscripcion</h2>
            {hasActiveSubscription && (
              <button
                onClick={handleOpenPortal}
                disabled={loadingPortal}
                className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-semibold px-3.5 py-2 rounded-lg active:bg-slate-900 transition-colors disabled:opacity-60"
              >
                {loadingPortal ? <Loader2 size={15} className="animate-spin" /> : <Settings size={15} />}
                Gestionar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-xl ${hasActiveSubscription ? 'bg-green-100' : 'bg-amber-100'}`}>
              {hasActiveSubscription
                ? <ShieldCheck size={22} className="text-green-600" />
                : <Clock size={22} className="text-amber-600" />
              }
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{planLabel}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasActiveSubscription ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {statusLabel}
              </span>
              {dateLabel && (
                <p className="text-xs text-slate-400 mt-1">{dateLabel}</p>
              )}
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
                <span className="text-sm font-medium text-slate-600">Documentos de prueba</span>
                <span className="text-sm font-bold text-slate-800">{trialDocsUsed} / {TRIAL_DOC_LIMIT}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    trialDocsUsed / TRIAL_DOC_LIMIT >= 0.9 ? 'bg-red-500' : trialDocsUsed / TRIAL_DOC_LIMIT >= 0.7 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((trialDocsUsed / TRIAL_DOC_LIMIT) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} restantes &middot; {TRIAL_DOC_LIMIT - trialDocsUsed} documentos disponibles
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
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    docsPct >= 90 ? 'bg-red-500' : docsPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
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

        {planOrder.map((planId) => {
          const plan = PLAN_CONFIG[planId];
          const isCurrentPlan = hasActiveSubscription && currentPlan === planId;
          const isRecommended = planId === 'pyme';
          const compatible = isPlanCompatibleWithDrivers(planId);
          const isBlocked = !hasActiveSubscription && !compatible;
          const driversToRemove = isBlocked ? driverCount - plan.user_limit : 0;

          return (
            <div
              key={planId}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-colors ${
                isBlocked
                  ? 'border-slate-200 opacity-60'
                  : isRecommended
                    ? 'border-blue-600'
                    : isCurrentPlan
                      ? 'border-green-500'
                      : 'border-slate-200'
              }`}
            >
              {isRecommended && !isBlocked && (
                <div className="bg-blue-600 text-white text-center py-1.5 px-4 flex items-center justify-center gap-1.5">
                  <Star size={14} fill="currentColor" />
                  <span className="text-sm font-bold tracking-wide uppercase">Recomendado</span>
                </div>
              )}

              {isBlocked && (
                <div className="bg-slate-100 text-slate-500 text-center py-1.5 px-4 flex items-center justify-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span className="text-sm font-semibold">No disponible con tu equipo actual</span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500 text-base font-medium"> EUR/mes</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5 tracking-wide">antes de IVA</p>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {planFeatures[planId].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="bg-green-100 rounded-full p-0.5 shrink-0">
                        <Check size={14} className="text-green-600" strokeWidth={3} />
                      </div>
                      <span className="text-base text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {isBlocked && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 mb-4 flex items-start gap-2.5">
                    <Users size={16} className="text-slate-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-600">
                      Debes eliminar{' '}
                      <span className="font-bold text-slate-800">
                        {driversToRemove} {driversToRemove === 1 ? 'conductor' : 'conductores'}
                      </span>{' '}
                      para poder contratar este plan.
                      {onGoToEquipo && (
                        <button
                          onClick={onGoToEquipo}
                          className="ml-1 font-semibold text-blue-600 underline underline-offset-1"
                        >
                          Gestionar equipo
                        </button>
                      )}
                    </p>
                  </div>
                )}

                {isCurrentPlan ? (
                  <div className="w-full bg-green-100 text-green-700 py-3.5 rounded-xl font-bold text-center text-base">
                    Plan actual
                  </div>
                ) : isBlocked ? (
                  <div className="w-full bg-slate-100 text-slate-400 py-3.5 rounded-xl font-bold text-center text-base cursor-not-allowed flex items-center justify-center gap-2">
                    <AlertTriangle size={16} />
                    No disponible
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(planId)}
                    disabled={loadingPlan === planId}
                    className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
                      isRecommended
                        ? 'bg-blue-600 text-white active:bg-blue-700 shadow-lg shadow-blue-600/20'
                        : 'bg-slate-800 text-white active:bg-slate-900'
                    } disabled:opacity-60`}
                  >
                    {loadingPlan === planId ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <CreditCard size={18} />
                    )}
                    {hasActiveSubscription ? 'Cambiar a este plan' : 'Suscribirme'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-slate-300 p-5 mt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Package size={22} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Documentos extra</h3>
              <p className="text-sm text-slate-500">Pago unico, no expiran</p>
            </div>
          </div>
          <p className="text-base text-slate-600 mb-4">
            Anade <span className="font-bold text-slate-900">+10 documentos</span> a tu saldo por solo{' '}
            <span className="font-bold text-slate-900">5 EUR</span>. No se pierden al renovar tu plan.
          </p>
          <button
            onClick={handleBuyPack}
            disabled={loadingPack || !hasActiveSubscription}
            className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 active:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {loadingPack ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            Comprar +10 documentos
          </button>
          {!hasActiveSubscription && (
            <p className="text-sm text-slate-400 text-center mt-2">
              Necesitas una suscripcion activa para comprar documentos extra
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

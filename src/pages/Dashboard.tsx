import { BarChart2, CalendarCheck, FilePlus, CheckCircle, FileText, Check, Loader2, Zap, AlertTriangle, CreditCard, ArrowUpCircle, Clock, RefreshCw, Package } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppLayout } from '../components/AppLayout';
import { QuantityStepper } from '../components/QuantityStepper';
import { Document, PLAN_CONFIG, PlanId } from '../lib/supabase';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo' | 'planes' | 'configuracion';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onViewDocument?: (doc: Document) => void;
}

const planOrder: PlanId[] = ['autonomo', 'pyme', 'flotas'];

const planFeatures: Record<PlanId, string[]> = {
  autonomo: ['100 documentos/mes', 'Usuarios ilimitados', 'Soporte por email'],
  pyme: ['500 documentos/mes', 'Usuarios ilimitados', 'Soporte email prioritario'],
  flotas: ['2.500 documentos/mes', 'Usuarios ilimitados', 'Soporte telefono y email'],
};

function CircularProgress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={pct >= 1 ? '#ef4444' : '#1d4ed8'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="relative text-center">
        <p className="text-3xl font-extrabold text-slate-800 leading-none">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase mt-1">DE {max}</p>
      </div>
    </div>
  );
}

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className ?? ''}`} />;
}

function DocumentUsageCard() {
  const { usage, isTrialActive, trialDocsUsed, hasActiveSubscription, isSyncing } = useSubscription();

  if (isSyncing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center min-h-[200px]">
        <div className="flex items-center gap-2 self-start mb-4">
          <BarChart2 size={18} className="text-blue-700" />
          <h3 className="text-base font-bold text-slate-800">Uso de Documentos</h3>
        </div>
        <div className="flex flex-col items-center gap-4 w-full flex-1 justify-center">
          <SkeletonPulse className="w-36 h-36 rounded-full" />
          <SkeletonPulse className="w-48 h-4" />
        </div>
      </div>
    );
  }

  if (isTrialActive) {
    const trialLimit = usage?.trial_doc_limit ?? 50;
    const pct = trialLimit > 0 ? Math.round((trialDocsUsed / trialLimit) * 100) : 0;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 self-start mb-4">
          <BarChart2 size={18} className="text-blue-700" />
          <h3 className="text-base font-bold text-slate-800">Documentos de Control generados</h3>
        </div>
        <CircularProgress value={trialDocsUsed} max={trialLimit} />
        <p className="text-sm text-slate-600 text-center mt-4">
          Haz utilizado el{' '}
          <span className="font-bold text-blue-700">{pct}%</span>{' '}
          de tu limite de prueba.
        </p>
      </div>
    );
  }

  if (hasActiveSubscription && usage) {
    const used = usage.documents_used;
    const limit = usage.document_limit + usage.documents_extra_remaining;
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 self-start mb-4">
          <BarChart2 size={18} className="text-blue-700" />
          <h3 className="text-base font-bold text-slate-800">Uso de Documentos</h3>
        </div>
        <CircularProgress value={used} max={limit} />
        <p className="text-sm text-slate-600 text-center mt-4">
          Has utilizado el{' '}
          <span className={`font-bold ${pct >= 100 ? 'text-red-600' : 'text-blue-700'}`}>{Math.min(pct, 100)}%</span>{' '}
          de tu limite mensual.
        </p>
        {usage.documents_extra_remaining > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            Incluye <span className="font-semibold text-amber-600">{usage.documents_extra_remaining} extra</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center min-h-[200px]">
      <div className="flex items-center gap-2 self-start mb-4">
        <BarChart2 size={18} className="text-blue-700" />
        <h3 className="text-base font-bold text-slate-800">Uso de Documentos</h3>
      </div>
      <p className="text-sm text-slate-400">Sin datos de suscripcion disponibles.</p>
    </div>
  );
}

function RenewalCard() {
  const { usage, hasActiveSubscription, isTrialActive, isSyncing } = useSubscription();

  if (isSyncing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col min-h-[200px]">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck size={18} className="text-emerald-600" />
          <h3 className="text-base font-bold text-slate-800">Proxima Renovacion</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 mb-4 gap-3">
          <SkeletonPulse className="w-40 h-8" />
          <SkeletonPulse className="w-20 h-6" />
        </div>
        <SkeletonPulse className="w-56 h-4" />
      </div>
    );
  }

  const isCanceling = hasActiveSubscription && usage?.cancel_at_period_end;

  const renewalDate = (() => {
    if (hasActiveSubscription && usage?.current_period_end) {
      return new Date(usage.current_period_end);
    }
    if (isTrialActive && usage?.trial_ends_at) {
      return new Date(usage.trial_ends_at);
    }
    return null;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        {isCanceling ? (
          <Clock size={18} className="text-red-500" />
        ) : (
          <CalendarCheck size={18} className="text-emerald-600" />
        )}
        <h3 className="text-base font-bold text-slate-800">
          {isCanceling ? 'Fin de Suscripcion' : isTrialActive ? 'Fin de Prueba' : 'Proxima Renovacion'}
        </h3>
      </div>

      {renewalDate ? (
        <div className={`flex-1 flex flex-col items-center justify-center rounded-xl p-6 mb-4 ${isCanceling ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className={`text-4xl font-extrabold leading-none ${isCanceling ? 'text-red-700' : 'text-blue-800'}`}>
            {format(renewalDate, "dd 'de' MMMM", { locale: es })}
          </p>
          <p className={`text-xl font-bold mt-2 ${isCanceling ? 'text-red-600' : 'text-slate-700'}`}>{format(renewalDate, 'yyyy')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 mb-4">
          <p className="text-slate-400 text-sm">Sin fecha disponible</p>
        </div>
      )}

      {isCanceling ? (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <Clock size={18} className="text-red-500" />
          <span>Tu suscripcion no se renovara. Finaliza en la fecha indicada.</span>
        </div>
      ) : hasActiveSubscription && !usage?.cancel_at_period_end ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle size={18} className="text-emerald-500" />
          <span>Tu plan se renovara automaticamente</span>
        </div>
      ) : !isTrialActive ? (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <span>Renovacion no activa</span>
        </div>
      ) : null}
    </div>
  );
}

function RecentActivityTable({ documents, onViewDocument, onNavigate }: {
  documents: Document[];
  onViewDocument: (doc: Document) => void;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-800">Actividad Reciente</h3>
        <button
          onClick={() => onNavigate('historial')}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Ver todo
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-400 text-sm">
          No hay documentos recientes.
        </div>
      ) : (
        <>
          <div className="hidden lg:grid grid-cols-[160px_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Fecha</span>
            <span>Cargador Contractual</span>
            <span>Origen</span>
            <span>Destino</span>
            <span>Conductor</span>
            <span>Matricula</span>
          </div>

          {documents.map((doc) => {
            const shipperName = doc.content.contractual_shipper?.nombre || doc.content.company?.name || '-';
            const originCity = doc.content.origin?.poblacion || doc.content.origin?.city || doc.content.origin?.empresa || '-';
            const destCity = doc.content.destination?.poblacion || doc.content.destination?.city || doc.content.destination?.empresa || '-';
            const driverName = doc.content.driver?.name || doc.driver_name || '-';
            const plate = doc.content.vehicle?.tractor_plate || '-';

            return (
              <button
                key={doc.id}
                onClick={() => onViewDocument(doc)}
                className="w-full text-left border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
              >
                <div className="hidden lg:grid grid-cols-[160px_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 items-center">
                  <span className="text-sm text-slate-500">
                    {format(new Date(doc.created_at), "d MMM, HH:mm", { locale: es })}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{shipperName}</span>
                  <span className="text-sm text-slate-600 truncate">{originCity}</span>
                  <span className="text-sm text-slate-600 truncate">{destCity}</span>
                  <span className="text-sm text-slate-600 truncate">{driverName}</span>
                  <span className="text-sm text-slate-600">{plate}</span>
                </div>

                <div className="lg:hidden flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{shipperName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {originCity} &rarr; {destCity} &middot; {format(new Date(doc.created_at), "d MMM", { locale: es })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

function TrialPricingCards() {
  const { createCheckoutSession } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelect = async (planId: PlanId) => {
    setLoadingPlan(planId);
    await createCheckoutSession(planId);
    setLoadingPlan(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={18} className="text-amber-500" />
        <h3 className="text-base font-bold text-slate-800">Elige tu plan</h3>
      </div>
      <p className="text-sm text-slate-500 mb-6">Tu periodo de prueba esta activo. Suscribete ahora para continuar sin interrupciones.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {planOrder.map((planId, idx) => {
          const plan = PLAN_CONFIG[planId];
          const isPopular = idx === 1;
          const isLoading = loadingPlan === planId;

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                isPopular
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-400 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">
                    Mas popular
                  </span>
                </div>
              )}

              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isPopular ? 'text-blue-200' : 'text-slate-400'}`}>
                {plan.name}
              </p>
              <div className="flex items-end gap-1 mb-4">
                <span className={`text-4xl font-extrabold leading-none ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                  {plan.price}€
                </span>
                <span className={`text-sm mb-1 ${isPopular ? 'text-blue-200' : 'text-slate-400'}`}>/mes</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {planFeatures[planId].map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <Check size={15} className={isPopular ? 'text-blue-200 shrink-0' : 'text-emerald-500 shrink-0'} />
                    <span className={isPopular ? 'text-blue-100' : 'text-slate-600'}>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(planId)}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                  isPopular
                    ? 'bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98]'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                } disabled:opacity-60`}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Suscribirme
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuotaExhaustedCard({ onNavigatePlanes }: { onNavigatePlanes: () => void }) {
  const { purchaseDocumentPack } = useSubscription();
  const [loadingPack, setLoadingPack] = useState(false);
  const [packQty, setPackQty] = useState(1);

  const handleBuyPack = async () => {
    setLoadingPack(true);
    await purchaseDocumentPack(packQty);
    setLoadingPack(false);
  };

  const totalDocs = packQty * 10;
  const totalPrice = packQty * 5;

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-300 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-50 p-2.5 rounded-xl">
          <AlertTriangle size={22} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Limite de documentos alcanzado</h3>
          <p className="text-sm text-slate-500">Has consumido toda tu cuota de documentos para este periodo.</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-5">
        Para seguir creando documentos, puedes subir de plan o comprar un pack de documentos extra.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <QuantityStepper value={packQty} onChange={setPackQty} min={1} max={50} />
            <span className="text-sm text-slate-500">
              {packQty} x 5 EUR = <span className="font-bold text-slate-900">{totalPrice} EUR</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onNavigatePlanes}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowUpCircle size={18} />
            Gestionar mi suscripcion
          </button>
          <button
            onClick={handleBuyPack}
            disabled={loadingPack}
            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loadingPack ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            Comprar +{totalDocs} documentos
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionBanner({ onNavigatePlanes }: { onNavigatePlanes: () => void }) {
  const { usage, hasActiveSubscription, openCustomerPortal } = useSubscription();

  if (!hasActiveSubscription) return null;

  const planName = usage?.plan ? PLAN_CONFIG[usage.plan]?.name ?? usage.plan : null;
  if (!planName) return null;

  const isCanceling = usage?.cancel_at_period_end;

  return (
    <div className={`bg-white rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isCanceling ? 'border-red-200' : 'border-slate-200/80'}`}>
      <div>
        <h3 className="text-base font-bold text-slate-800">Gestionar mi suscripcion</h3>
        {isCanceling ? (
          <p className="text-sm text-red-600 mt-1">
            Tu plan {planName} se cancelara al final del periodo actual. Puedes reactivarlo desde el portal.
          </p>
        ) : (
          <p className="text-sm text-slate-500 mt-1">
            Tu plan {planName} esta activo. Puedes cambiar tu metodo de pago o mejorar tu plan.
          </p>
        )}
      </div>
      <button
        onClick={openCustomerPortal}
        className={`shrink-0 border-2 font-bold text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide ${
          isCanceling
            ? 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
            : 'border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white'
        }`}
      >
        Gestionar suscripcion
      </button>
    </div>
  );
}

function ExtraPacksBanner() {
  const { purchaseDocumentPack, hasActiveSubscription } = useSubscription();
  const { isAdmin } = useAuth();
  const [packQty, setPackQty] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isAdmin || !hasActiveSubscription) return null;

  const totalDocs = packQty * 10;
  const totalPrice = packQty * 5;

  const handleBuy = async () => {
    setLoading(true);
    await purchaseDocumentPack(packQty);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-amber-50 p-2.5 rounded-xl shrink-0">
            <Package size={20} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800">Documentos extra</h3>
            <p className="text-xs text-slate-500 mt-0.5">Compra paquetes de +10 documentos. Pago unico, no expiran.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <QuantityStepper value={packQty} onChange={setPackQty} min={1} max={50} />
          <span className="text-sm text-slate-500 whitespace-nowrap">
            {packQty} x 5 EUR = <span className="font-bold text-slate-900">{totalPrice} EUR</span>
          </span>
          <button
            onClick={handleBuy}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Comprar +{totalDocs}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ onNavigate, onLogout, onViewDocument }: DashboardProps) {
  const { isAdmin } = useAuth();
  const { documents } = useData();
  const { isTrialActive, isQuotaExhausted, hasActiveSubscription, isSubscriptionExpired, canCreateDocument, isSyncing } = useSubscription();

  const recentDocs = documents.slice(0, 5);

  const handleNavItem = (item: string) => {
    switch (item) {
      case 'inicio': onNavigate('dashboard'); break;
      case 'documentos': onNavigate('historial'); break;
      case 'equipo': onNavigate('equipo'); break;
      case 'lugares': onNavigate('lugares'); break;
      case 'configuracion': onNavigate('configuracion'); break;
    }
  };

  const handleViewDocument = (doc: Document) => {
    if (onViewDocument) {
      onViewDocument(doc);
    } else {
      onNavigate('documento');
    }
  };

  const showCreateButton = canCreateDocument() && !isSubscriptionExpired;
  const showQuotaExhausted = isAdmin && hasActiveSubscription && isQuotaExhausted;

  return (
    <AppLayout activeNav="inicio" onNavigate={handleNavItem} onLogout={onLogout}>
      <div className="space-y-6 max-w-5xl">
        {isSyncing && (
          <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <RefreshCw size={20} className="text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800">Actualizando datos de tu suscripcion...</p>
              <p className="text-xs text-blue-600 mt-0.5">Estamos sincronizando los cambios de tu plan. Esto puede tardar unos segundos.</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        {showQuotaExhausted ? (
          <QuotaExhaustedCard onNavigatePlanes={() => onNavigate('planes')} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bienvenido de nuevo!</h2>
              <p className="text-sm text-slate-500 mt-1">Que te gustaria hacer hoy? Empieza creando un nuevo documento.</p>
            </div>
            {showCreateButton && (
              <button
                onClick={() => onNavigate('crear')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-8 py-4 flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98] shrink-0"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <FilePlus size={22} />
                </div>
                <span className="text-base font-extrabold uppercase tracking-wide">Crear Nuevo Documento</span>
              </button>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentUsageCard />
            <RenewalCard />
          </div>
        )}

        <RecentActivityTable
          documents={recentDocs}
          onViewDocument={handleViewDocument}
          onNavigate={onNavigate}
        />

        {isAdmin && isTrialActive && <TrialPricingCards />}
        {isAdmin && !isTrialActive && hasActiveSubscription && <SubscriptionBanner onNavigatePlanes={() => onNavigate('planes')} />}
        <ExtraPacksBanner />
      </div>
    </AppLayout>
  );
}

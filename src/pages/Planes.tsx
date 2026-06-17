import { Check, Crown, ChevronUp, X, CreditCard, FileText, CircleDot, CalendarCheck, Loader2, ShieldCheck, FileBarChart, TrendingUp, Star } from 'lucide-react';
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

interface PaidPlanCardData {
  id: PlanId;
  title: string;
  description: string;
  highlight: boolean;
  features: string[];
  docOptions: number[];
}

const paidPlans: PaidPlanCardData[] = [
  {
    id: 'autonomo',
    title: 'Basico',
    description: 'Todo en GRATUITO, mas:',
    highlight: false,
    features: ['Usuarios ilimitados', 'Historial accesible durante 3 meses'],
    docOptions: [100, 250, 500],
  },
  {
    id: 'pyme',
    title: 'Pro',
    description: 'Todo en BASICO, mas:',
    highlight: true,
    features: ['Duplicar documentos', 'Exportacion masiva de documentos', 'Importacion de datos'],
    docOptions: [100, 500, 1000],
  },
];

const enterpriseFeatures = [
  'Volumen personalizado',
  'Varias empresas o delegaciones',
  'Integraciones personalizadas',
  'Soporte dedicado',
];

const gratuitoFeatures = [
  '1 usuario',
  'Creacion rapida de documentos',
  'Documento accesible y verificable en inspeccion',
  'Comparte por enlace, QR o WhatsApp',
  'Historial accesible durante 30 dias',
];

export function Planes({ onLogout, onNavigate }: PlanesProps) {
  const {
    usage,
    hasActiveSubscription,
    freeDocsUsed,
    freeDocLimit,
    daysUntilReset,
    createCheckoutSession,
    openCustomerPortal,
  } = useSubscription();

  const [billingAnnual, setBillingAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [docSelections, setDocSelections] = useState<Record<PlanId, number>>({
    autonomo: 100,
    pyme: 100,
    flotas: 2500,
  });

  const currentPlan = usage?.plan;
  const isCanceling = hasActiveSubscription && usage?.cancel_at_period_end;

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

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    await openCustomerPortal();
    setLoadingPortal(false);
  };

  const handleNavItem = (item: string) => onNavigate(item);

  const planActualLabel = (() => {
    if (hasActiveSubscription && currentPlan) return PLAN_CONFIG[currentPlan]?.name ?? currentPlan;
    return 'Prueba gratuita';
  })();

  const monthlyLimit = hasActiveSubscription ? (usage?.document_limit ?? 0) : freeDocLimit;
  const usedDocs = hasActiveSubscription ? (usage?.documents_used ?? 0) : freeDocsUsed;

  const dateLabel = (() => {
    if (hasActiveSubscription && usage?.current_period_end) {
      return format(new Date(usage.current_period_end), 'dd/MM/yyyy');
    }
    return null;
  })();

  const computePrice = (planId: PlanId) => {
    const base = PLAN_CONFIG[planId].price;
    if (billingAnnual) {
      const annual = base * 12 * 0.85;
      return annual / 12;
    }
    return base;
  };

  return (
    <AppLayout
      activeNav="suscripcion"
      onNavigate={handleNavItem}
      onLogout={onLogout}
      pageTitle="Suscripcion"
    >
      <div className="w-full space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Crown size={22} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tu suscripcion</h2>
                <p className="text-sm text-slate-500 mt-0.5">Gestiona tu plan, limites y facturacion de forma sencilla.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleOpenPortal}
                disabled={loadingPortal && hasActiveSubscription}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                <ChevronUp size={16} strokeWidth={3} />
                Mejorar plan
              </button>
              {hasActiveSubscription && !isCanceling && (
                <button
                  onClick={handleOpenPortal}
                  disabled={loadingPortal}
                  className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loadingPortal ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                  Cancelar suscripcion
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <StatPill icon={CreditCard} label="Plan actual" value={planActualLabel} />
            <StatPill
              icon={CalendarCheck}
              label="Restablecimiento de uso en"
              value={`${daysUntilReset} ${daysUntilReset === 1 ? 'dia' : 'dias'}`}
              hint={dateLabel ?? undefined}
            />
            <StatPill icon={FileText} label="Limite mensual" value={`${monthlyLimit} documentos`} />
            <StatPill icon={CircleDot} label="Uso actual" value={`${usedDocs} de ${monthlyLimit}`} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900">Planes disponibles</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-sm font-semibold ${!billingAnnual ? 'text-slate-900' : 'text-slate-400'}`}>
                Facturado mensualmente
              </span>
              <button
                onClick={() => setBillingAnnual(!billingAnnual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${billingAnnual ? 'bg-blue-600' : 'bg-slate-300'}`}
                aria-label="Toggle billing period"
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    billingAnnual ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold ${billingAnnual ? 'text-slate-900' : 'text-slate-400'}`}>
                Facturado anualmente
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Ahorra un 15% o mas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <GratuitoCard isCurrent={!hasActiveSubscription} features={gratuitoFeatures} />

            {paidPlans.map((p) => (
              <PaidPlanCard
                key={p.id}
                data={p}
                price={computePrice(p.id)}
                billingAnnual={billingAnnual}
                selectedDocs={docSelections[p.id]}
                onChangeDocs={(n) => setDocSelections({ ...docSelections, [p.id]: n })}
                isCurrent={hasActiveSubscription && currentPlan === p.id}
                onSelect={() => handleSelectPlan(p.id)}
                loading={loadingPlan === p.id}
              />
            ))}

            <EnterpriseCard features={enterpriseFeatures} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Highlight icon={ShieldCheck} title="Sin permanencia" text="Cambia de plan o cancela cuando lo necesites." />
          <Highlight icon={FileBarChart} title="Facturacion clara" text="Sin sorpresas. Recibe tu factura mensual al instante." />
          <Highlight icon={TrendingUp} title="Escala con tu flota" text="Aumenta tu limite de documentos segun crezca tu equipo." />
        </div>
      </div>
    </AppLayout>
  );
}

function StatPill({ icon: Icon, label, value, hint }: { icon: typeof CreditCard; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-slate-900 mt-1 truncate">{value}</p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function GratuitoCard({ isCurrent, features }: { isCurrent: boolean; features: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 overflow-hidden flex flex-col">
      {isCurrent && (
        <div className="bg-blue-600 text-white text-center py-2 text-sm font-bold">Tu plan</div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-base font-bold text-slate-900 text-center">Gratuito</p>
        <div className="flex items-baseline justify-center gap-1 mt-3">
          <span className="text-xl text-slate-700 font-bold">EUR</span>
          <span className="text-5xl font-extrabold text-slate-900 leading-none">0</span>
          <span className="text-sm text-slate-500 self-end">/mes</span>
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">Gratis para siempre</p>

        <p className="text-sm font-bold text-slate-700 mt-6 mb-3">El plan GRATUITO incluye:</p>
        <ul className="space-y-2 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
              <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PaidPlanCard({
  data,
  price,
  billingAnnual,
  selectedDocs,
  onChangeDocs,
  isCurrent,
  onSelect,
  loading,
}: {
  data: PaidPlanCardData;
  price: number;
  billingAnnual: boolean;
  selectedDocs: number;
  onChangeDocs: (n: number) => void;
  isCurrent: boolean;
  onSelect: () => void;
  loading: boolean;
}) {
  const integerPart = Math.floor(price);
  const decimalPart = price.toFixed(2).split('.')[1];

  return (
    <div
      className={`relative rounded-2xl border-2 overflow-visible flex flex-col ${
        data.highlight ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'border-slate-200 bg-white'
      }`}
    >
      {data.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-amber-400 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 whitespace-nowrap">
            <Star size={9} fill="currentColor" />
            Recomendado
          </span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <p className={`text-base font-bold text-center ${data.highlight ? 'text-white' : 'text-slate-900'}`}>
          {data.title}
        </p>
        <div className="flex items-baseline justify-center gap-0.5 mt-3">
          <span className={`text-xl font-bold ${data.highlight ? 'text-white' : 'text-slate-700'}`}>EUR</span>
          <span className={`text-5xl font-extrabold leading-none ${data.highlight ? 'text-white' : 'text-slate-900'}`}>
            {integerPart}
          </span>
          <span className={`text-base font-bold ${data.highlight ? 'text-blue-200' : 'text-slate-500'}`}>.{decimalPart}</span>
          <span className={`text-sm self-end ${data.highlight ? 'text-blue-200' : 'text-slate-500'}`}>/mes</span>
        </div>
        <p className={`text-xs text-center mt-2 ${data.highlight ? 'text-blue-200' : 'text-slate-500'}`}>
          {billingAnnual ? 'Facturacion anual' : 'Facturacion mensual'}
        </p>

        <div className="mt-5">
          <select
            value={selectedDocs}
            onChange={(e) => onChangeDocs(Number(e.target.value))}
            className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold border focus:outline-none ${
              data.highlight
                ? 'bg-white text-slate-800 border-white'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {data.docOptions.map((n) => (
              <option key={n} value={n}>{n} documentos/mes</option>
            ))}
          </select>
        </div>

        <button
          onClick={onSelect}
          disabled={loading || isCurrent}
          className={`w-full py-2.5 rounded-xl font-bold text-sm mt-3 transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
            data.highlight
              ? 'bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98]'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {isCurrent ? 'Plan activo' : billingAnnual ? 'Comprar plan anual' : 'Comprar plan mensual'}
        </button>

        <p className={`text-xs font-bold mt-5 mb-3 ${data.highlight ? 'text-blue-100' : 'text-slate-600'}`}>
          {data.description}
        </p>
        <ul className="space-y-2">
          {data.features.map((f) => (
            <li key={f} className={`flex items-start gap-2 text-sm ${data.highlight ? 'text-blue-50' : 'text-slate-600'}`}>
              <Check size={14} className={`shrink-0 mt-0.5 ${data.highlight ? 'text-blue-200' : 'text-emerald-500'}`} strokeWidth={3} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EnterpriseCard({ features }: { features: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 overflow-hidden flex flex-col">
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-base font-bold text-slate-900 text-center">Premium</p>
        <p className="text-xs text-slate-500 text-center mt-3">A medida para grandes flotas</p>

        <a
          href="mailto:ventas@doko.app?subject=Plan%20Premium"
          className="w-full mt-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm text-center transition-colors"
        >
          Habla con ventas
        </a>

        <p className="text-xs font-bold text-slate-600 mt-5 mb-3">Todo en PRO, mas:</p>
        <ul className="space-y-2 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
              <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Highlight({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

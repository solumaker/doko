import { Check, Crown, ChevronUp, X, CreditCard, FileText, CircleDot, CalendarCheck, Loader2, ShieldCheck, FileBarChart, TrendingUp, Package, Star, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { PaidPlanId, BillingCycle, TIER_VALUES, TIER_LABELS } from '../lib/supabase';
import { useSubscription } from '../context/SubscriptionContext';
import { useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { QuantityStepper } from '../components/QuantityStepper';

interface PlanesProps {
  onBack: () => void;
  onGoToEquipo?: () => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

const planLabel = (p: string | null | undefined): string => {
  if (!p) return 'Gratuito';
  if (p === 'basico' || p === 'autonomo') return 'Basico';
  if (p === 'pro' || p === 'pyme' || p === 'flotas') return 'Pro';
  if (p === 'grandes_empresas') return 'Premium';
  return p;
};

const formatPrice = (n: number): { intPart: string; decPart: string } => {
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  return { intPart, decPart };
};

export function Planes({ onLogout, onNavigate }: PlanesProps) {
  const {
    usage,
    hasActiveSubscription,
    freeDocsUsed,
    freeDocLimit,
    daysUntilReset,
    createCheckoutSession,
    purchaseDocumentPack,
    openCustomerPortal,
    quote,
  } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [basicoTier, setBasicoTier] = useState<number>(100);
  const [proTier, setProTier] = useState<number>(100);
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingPack, setLoadingPack] = useState(false);
  const [packQty, setPackQty] = useState(1);

  const basicoTiers = useMemo(
    () => TIER_VALUES.filter((t) => quote('basico', t, billingCycle).available),
    [quote, billingCycle]
  );
  const proTiers = useMemo(
    () => TIER_VALUES.filter((t) => quote('pro', t, billingCycle).available),
    [quote, billingCycle]
  );

  const basicoQuote = useMemo(() => quote('basico', basicoTier, billingCycle), [quote, basicoTier, billingCycle]);
  const proQuote = useMemo(() => quote('pro', proTier, billingCycle), [quote, proTier, billingCycle]);

  const handleSelect = async (plan: PaidPlanId, tier: number) => {
    setLoadingPlan(plan);
    await createCheckoutSession({
      plan,
      billing_cycle: billingCycle,
      document_tier: tier,
    });
    setLoadingPlan(null);
  };

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    await openCustomerPortal();
    setLoadingPortal(false);
  };

  const handleBuyPack = async () => {
    setLoadingPack(true);
    await purchaseDocumentPack(packQty);
    setLoadingPack(false);
  };

  const currentPlanLabel = planLabel(usage?.plan);
  const monthlyLimit = hasActiveSubscription ? (usage?.document_limit ?? 0) : freeDocLimit;
  const usedDocs = hasActiveSubscription ? (usage?.documents_used ?? 0) : freeDocsUsed;
  const extraUnitPrice = usage?.extra_unit_price ?? null;

  const periodEndLabel = usage?.current_period_end
    ? format(new Date(usage.current_period_end), 'dd/MM/yyyy')
    : null;

  const isFreeActive = !hasActiveSubscription;
  const isBasicoActive = hasActiveSubscription && (usage?.plan === 'basico' || usage?.plan === 'autonomo');
  const isProActive = hasActiveSubscription && (usage?.plan === 'pro' || usage?.plan === 'pyme' || usage?.plan === 'flotas');

  const ctaLabel = billingCycle === 'yearly' ? 'Comprar plan anual' : 'Comprar plan mensual';
  const cycleSubtitle = billingCycle === 'yearly' ? 'Facturacion anual' : 'Facturacion mensual';

  return (
    <AppLayout activeNav="suscripcion" onNavigate={onNavigate} onLogout={onLogout} pageTitle="Suscripcion">
      <div className="w-full space-y-5">
        <SubscriptionSummaryCard
          currentPlanLabel={currentPlanLabel}
          daysUntilReset={daysUntilReset}
          periodEndLabel={periodEndLabel}
          monthlyLimit={monthlyLimit}
          usedDocs={usedDocs}
          hasActiveSubscription={hasActiveSubscription}
          loadingPortal={loadingPortal}
          onUpgrade={handleOpenPortal}
          onCancel={handleOpenPortal}
        />

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Planes disponibles</h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
                Facturado mensualmente
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-slate-300'}`}
                aria-label="Cambiar ciclo de facturacion"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold transition-colors ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
                Facturado anualmente
              </span>
              <span className="text-xs font-bold text-emerald-600 hidden lg:inline">Ahorra un 15% o mas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <FreePlanCard isActive={isFreeActive} />

            <PaidPlanCard
              name="Basico"
              tone="white"
              isActive={isBasicoActive}
              tiers={basicoTiers}
              selectedTier={basicoTier}
              onChangeTier={setBasicoTier}
              priceEur={basicoQuote.available ? basicoQuote.price : null}
              cycleSubtitle={cycleSubtitle}
              ctaLabel={ctaLabel}
              ctaDisabled={!basicoQuote.available || isBasicoActive}
              onCta={() => handleSelect('basico', basicoTier)}
              loading={loadingPlan === 'basico'}
              features={['Usuarios ilimitados', 'Soporte de email', 'Historial accesible durante 3 meses']}
              featuresHeading="Todo en GRATUITO, mas:"
            />

            <PaidPlanCard
              name="Pro"
              tone="highlight"
              isActive={isProActive}
              tiers={proTiers}
              selectedTier={proTier}
              onChangeTier={setProTier}
              priceEur={proQuote.available ? proQuote.price : null}
              cycleSubtitle={cycleSubtitle}
              ctaLabel={ctaLabel}
              ctaDisabled={!proQuote.available || isProActive}
              onCta={() => handleSelect('pro', proTier)}
              loading={loadingPlan === 'pro'}
              features={['Duplicar documentos', 'Exportacion masiva de documentos', 'Importacion de datos', 'Soporte prioritario', 'Historial accesible durante 1 ano']}
              featuresHeading="Todo en BASICO, mas:"
              badge="Recomendado"
            />

            <PremiumCard
              onContact={() => { window.location.href = 'mailto:comercial@documentocontroltransporte.com?subject=Plan%20Premium'; }}
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-5">*impuestos no incluidos</p>
        </div>

        {hasActiveSubscription && extraUnitPrice && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-amber-50 p-3 rounded-xl">
                <Package size={22} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Documentos extra</h3>
                <p className="text-sm text-slate-500 mt-0.5">Compras puntuales que no caducan. Se descuentan despues de tu limite mensual.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
              <QuantityStepper value={packQty} onChange={setPackQty} min={1} max={50} />
              <span className="text-sm text-slate-500">
                {packQty} x {Number(extraUnitPrice).toFixed(2)} EUR / 10 docs ={' '}
                <span className="font-bold text-slate-900">{(packQty * Number(extraUnitPrice)).toFixed(2)} EUR</span>
                {' '}-{' '}
                <span className="font-bold text-slate-900">+{packQty * 10} documentos</span>
              </span>
            </div>
            <button
              onClick={handleBuyPack}
              disabled={loadingPack}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {loadingPack ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={17} />}
              Comprar +{packQty * 10} documentos
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Highlight icon={ShieldCheck} title="Sin permanencia" text="Cambia de plan o cancela cuando lo necesites." />
          <Highlight icon={FileBarChart} title="Facturacion clara" text="Sin sorpresas. Recibe tu factura mensual al instante." />
          <Highlight icon={TrendingUp} title="Escala con tu flota" text="Aumenta tu limite de documentos segun crezca tu equipo." />
        </div>
      </div>
    </AppLayout>
  );
}

function SubscriptionSummaryCard({
  currentPlanLabel,
  daysUntilReset,
  periodEndLabel,
  monthlyLimit,
  usedDocs,
  hasActiveSubscription,
  loadingPortal,
  onUpgrade,
  onCancel,
}: {
  currentPlanLabel: string;
  daysUntilReset: number;
  periodEndLabel: string | null;
  monthlyLimit: number;
  usedDocs: number;
  hasActiveSubscription: boolean;
  loadingPortal: boolean;
  onUpgrade: () => void;
  onCancel: () => void;
}) {
  return (
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
          {hasActiveSubscription && (
            <button
              onClick={onUpgrade}
              disabled={loadingPortal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              <ChevronUp size={16} strokeWidth={3} />
              Mejorar plan
            </button>
          )}
          {hasActiveSubscription && (
            <button
              onClick={onCancel}
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
        <StatPill icon={CreditCard} label="Plan actual" value={currentPlanLabel} />
        <StatPill
          icon={CalendarCheck}
          label="Restablecimiento de uso en"
          value={`${daysUntilReset} ${daysUntilReset === 1 ? 'dia' : 'dias'}`}
          hint={periodEndLabel ?? undefined}
        />
        <StatPill icon={FileText} label="Limite mensual" value={`${monthlyLimit} documentos`} />
        <StatPill icon={CircleDot} label="Uso actual" value={`${usedDocs} de ${monthlyLimit}`} />
      </div>
    </div>
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

function CardShell({
  children,
  isActive,
  tone,
  badge,
}: {
  children: React.ReactNode;
  isActive?: boolean;
  tone: 'white' | 'highlight';
  badge?: string;
}) {
  const isHighlight = tone === 'highlight';
  return (
    <div
      className={`relative rounded-3xl border-2 flex flex-col shadow-sm overflow-hidden ${
        isHighlight ? 'border-blue-600 bg-blue-600 text-white shadow-blue-600/10' : 'bg-white border-slate-200 text-slate-900'
      } ${isActive ? 'ring-2 ring-blue-500' : ''}`}
    >
      {badge && (
        <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-amber-400 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-b-lg uppercase tracking-wide flex items-center gap-1 whitespace-nowrap shadow">
            <Star size={10} className="fill-amber-900" />
            {badge}
          </span>
        </div>
      )}
      {isActive && (
        <div className="bg-blue-600 text-white text-center py-2 text-sm font-bold uppercase tracking-wide">
          Tu plan
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}

function FreePlanCard({ isActive }: { isActive: boolean }) {
  return (
    <CardShell isActive={isActive} tone="white">
      <h3 className="text-xl font-bold text-center">Gratuito</h3>
      <div className="mt-5 flex items-end justify-center gap-1">
        <span className="text-2xl font-bold text-blue-700">EUR</span>
        <span className="text-6xl font-extrabold text-blue-700 leading-none">0</span>
        <span className="text-base text-slate-500 self-end mb-1">/mes</span>
      </div>
      <p className="text-xs text-slate-500 text-center mt-2">Gratis para siempre</p>

      <p className="text-sm font-bold text-slate-800 mt-6 mb-3">El plan GRATUITO incluye:</p>
      <ul className="space-y-2">
        {['1 usuario', 'Creacion rapida de documentos', 'Documento accesible y verificable en inspeccion', 'Comparte por enlace, QR o WhatsApp', 'Historial accesible durante 30 dias'].map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

interface PaidPlanCardProps {
  name: string;
  tone: 'white' | 'highlight';
  isActive: boolean;
  tiers: number[];
  selectedTier: number;
  onChangeTier: (t: number) => void;
  priceEur: number | null;
  cycleSubtitle: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  onCta: () => void;
  loading?: boolean;
  features: string[];
  featuresHeading: string;
  badge?: string;
}

function PaidPlanCard({
  name,
  tone,
  isActive,
  tiers,
  selectedTier,
  onChangeTier,
  priceEur,
  cycleSubtitle,
  ctaLabel,
  ctaDisabled,
  onCta,
  loading,
  features,
  featuresHeading,
  badge,
}: PaidPlanCardProps) {
  const isHighlight = tone === 'highlight';
  const priceParts = priceEur != null ? formatPrice(priceEur) : null;

  return (
    <CardShell isActive={isActive} tone={tone} badge={badge}>
      <h3 className={`text-xl font-bold text-center ${isHighlight ? 'text-white' : 'text-slate-900'} ${badge ? 'mt-2' : ''}`}>
        {name}
      </h3>

      {priceParts ? (
        <div className="mt-5 flex items-end justify-center gap-1">
          <span className={`text-2xl font-bold ${isHighlight ? 'text-white' : 'text-blue-700'}`}>EUR</span>
          <span className={`text-6xl font-extrabold leading-none ${isHighlight ? 'text-white' : 'text-blue-700'}`}>
            {priceParts.intPart}
          </span>
          <span className={`text-2xl font-bold ${isHighlight ? 'text-white' : 'text-blue-700'} self-start mt-1`}>
            .{priceParts.decPart}
          </span>
          <span className={`text-base ${isHighlight ? 'text-blue-100' : 'text-slate-500'} self-end mb-1`}>/mes</span>
        </div>
      ) : (
        <div className="mt-5 text-center min-h-[68px] flex flex-col items-center justify-center">
          <p className={`text-sm font-bold ${isHighlight ? 'text-blue-100' : 'text-slate-400'}`}>No disponible</p>
          <p className={`text-xs mt-1 ${isHighlight ? 'text-blue-100/80' : 'text-slate-400'}`}>en este ciclo</p>
        </div>
      )}

      <p className={`text-xs text-center mt-2 ${isHighlight ? 'text-blue-100' : 'text-slate-500'}`}>{cycleSubtitle}</p>

      <div className="relative mt-4">
        <select
          value={selectedTier}
          onChange={(e) => onChangeTier(Number(e.target.value))}
          className={`w-full appearance-none rounded-xl border-2 px-4 py-2.5 pr-9 text-sm font-semibold cursor-pointer transition-colors ${
            isHighlight
              ? 'bg-white text-slate-900 border-white'
              : 'bg-white text-slate-900 border-slate-300 hover:border-blue-500'
          }`}
        >
          {tiers.map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]} documentos/mes
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>

      <button
        onClick={onCta}
        disabled={ctaDisabled || loading}
        className={`w-full mt-3 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
          isHighlight
            ? 'bg-white text-blue-700 hover:bg-blue-50'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {isActive ? 'Plan activo' : ctaLabel}
      </button>

      <p className={`text-sm font-bold mt-6 mb-3 ${isHighlight ? 'text-white' : 'text-slate-800'}`}>{featuresHeading}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className={`flex items-start gap-2 text-sm ${isHighlight ? 'text-blue-50' : 'text-slate-600'}`}>
            <Check size={14} className={`shrink-0 mt-0.5 ${isHighlight ? 'text-emerald-300' : 'text-emerald-500'}`} strokeWidth={3} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function PremiumCard({ onContact }: { onContact: () => void }) {
  return (
    <CardShell tone="white">
      <h3 className="text-xl font-bold text-center text-slate-900">Premium</h3>
      <p className="text-sm text-slate-500 text-center mt-5">A medida para grandes flotas</p>

      <button
        onClick={onContact}
        className="w-full mt-6 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Habla con ventas
      </button>

      <p className="text-sm font-bold text-slate-800 mt-6 mb-3">Todo en PRO, mas:</p>
      <ul className="space-y-2">
        {['Volumen personalizado', 'Varias empresas o delegaciones', 'Integraciones personalizadas', 'Soporte dedicado'].map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </CardShell>
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

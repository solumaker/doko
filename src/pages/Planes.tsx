import { Check, Crown, ChevronUp, X, CreditCard, FileText, CircleDot, CalendarCheck, Loader2, ShieldCheck, FileBarChart, TrendingUp, Package, Sparkles } from 'lucide-react';
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

const SLIDER_STEPS = [...TIER_VALUES, 999999];
const SLIDER_LABELS: Record<number, string> = { ...TIER_LABELS, 999999: '10.000+' };

const planLabel = (p: string | null | undefined): string => {
  if (!p) return 'Prueba gratuita';
  if (p === 'basico' || p === 'autonomo') return 'Basico';
  if (p === 'pro' || p === 'pyme' || p === 'flotas') return 'Pro';
  if (p === 'grandes_empresas') return 'Grandes empresas';
  return p;
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
    resolvePlanForTier,
  } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [stepIdx, setStepIdx] = useState(0);
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingPack, setLoadingPack] = useState(false);
  const [packQty, setPackQty] = useState(1);

  const selectedDocs = SLIDER_STEPS[stepIdx];
  const isEnterprise = selectedDocs === 999999;

  const basicoQuote = useMemo(() => (isEnterprise ? null : quote('basico', selectedDocs, billingCycle)), [quote, selectedDocs, billingCycle, isEnterprise]);
  const proQuote = useMemo(() => (isEnterprise ? null : quote('pro', selectedDocs, billingCycle)), [quote, selectedDocs, billingCycle, isEnterprise]);

  const handleSelect = async (plan: PaidPlanId) => {
    if (isEnterprise) return;
    const resolved = resolvePlanForTier(plan, selectedDocs, billingCycle);
    if (resolved === 'grandes_empresas') {
      window.location.href = 'mailto:ventas@doko.app?subject=Plan%20Grandes%20Empresas';
      return;
    }
    setLoadingPlan(resolved);
    await createCheckoutSession({
      plan: resolved,
      billing_cycle: billingCycle,
      document_tier: selectedDocs,
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

        <div className="rounded-3xl overflow-hidden border border-blue-700/20 shadow-xl shadow-blue-900/10">
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-6 lg:px-10 pt-8 pb-12 text-white relative">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-blue-200">Cuantos documentos al mes?</p>
                <p className="text-3xl lg:text-4xl font-extrabold mt-2 tracking-tight">
                  {SLIDER_LABELS[selectedDocs]} <span className="text-blue-200 font-bold text-2xl">documentos/mes</span>
                </p>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                <span className="text-xs font-semibold text-emerald-300">Ahorra un 15% o mas</span>
                <div className="flex items-center bg-blue-800/60 rounded-full p-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                      billingCycle === 'monthly' ? 'bg-white text-blue-900 shadow' : 'text-blue-100'
                    }`}
                  >
                    Pago mensual
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                      billingCycle === 'yearly' ? 'bg-white text-blue-900 shadow' : 'text-blue-100'
                    }`}
                  >
                    Pago anual
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <input
                type="range"
                min={0}
                max={SLIDER_STEPS.length - 1}
                step={1}
                value={stepIdx}
                onChange={(e) => setStepIdx(Number(e.target.value))}
                className="w-full accent-white slider-doko"
              />
              <div className="grid grid-cols-10 mt-2 text-[10px] lg:text-xs font-semibold text-blue-100">
                {SLIDER_STEPS.map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setStepIdx(i)}
                    className={`text-center transition-colors ${i === stepIdx ? 'text-white font-extrabold' : 'hover:text-white'}`}
                  >
                    {SLIDER_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-4 lg:px-10 pt-0 pb-8 -mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <PlanCard
                name="Gratuito"
                price={0}
                priceDecimals={null}
                cta={hasActiveSubscription ? null : 'Empieza gratis'}
                ctaDisabled={!hasActiveSubscription ? false : true}
                onCta={() => undefined}
                docsLabel="Hasta 20 documentos / mes"
                description="Para aquellos que buscan crear sus primeros documentos de control sin complicaciones."
                features={['20 documentos/mes', '1 usuario', 'Creacion rapida de documentos', 'Documento accesible y verificable en inspeccion', 'Comparte por enlace, QR o WhatsApp', 'Historial accesible durante 30 dias']}
                featuresHeading="Incluye gratis:"
                tone="white"
              />

              <PlanCard
                name="Basico"
                price={basicoQuote?.available ? basicoQuote.price : null}
                priceDecimals={null}
                cta={isEnterprise ? null : (basicoQuote?.available ? 'Empieza ahora' : 'Disponible solo en Pro')}
                ctaDisabled={isEnterprise || !basicoQuote?.available}
                onCta={() => handleSelect('basico')}
                loading={loadingPlan === 'basico'}
                docsLabel={`Hasta ${SLIDER_LABELS[selectedDocs]} documentos / mes`}
                description="Para autonomos y pequenas empresas que quieren generar documentos de control de forma rapida y sencilla."
                features={['100 documentos/mes', 'Usuarios ilimitados', 'Soporte de email', 'Historial accesible durante 3 meses']}
                featuresHeading="Todo en Gratuito, mas:"
                tone="white"
              />

              <PlanCard
                name="Pro"
                price={proQuote?.available ? proQuote.price : null}
                priceDecimals={null}
                cta={isEnterprise ? null : (proQuote?.available ? 'Empieza ahora' : 'No disponible')}
                ctaDisabled={isEnterprise || !proQuote?.available}
                onCta={() => handleSelect('pro')}
                loading={loadingPlan === 'pro'}
                docsLabel={`Hasta ${SLIDER_LABELS[selectedDocs]} documentos / mes`}
                description="Para empresas que generan documentos a diario y quieren ahorrar tiempo en cada operacion."
                features={['100 documentos/mes', 'Duplicar documentos', 'Exportacion masiva de documentos', 'Importar datos', 'Soporte prioritario', 'Historial accesible durante 1 ano']}
                featuresHeading="Todo en Basico, mas:"
                tone="highlight"
                badge="Recomendado"
              />

              <PlanCard
                name="Grandes empresas"
                customPrice="Precios personalizados"
                customSubtitle="Hablemos sobre tus necesidades"
                cta="Hablar con ventas"
                onCta={() => { window.location.href = 'mailto:ventas@doko.app?subject=Plan%20Grandes%20Empresas'; }}
                docsLabel=""
                description="Para organizaciones que necesitan mas volumen, usuarios, soporte o integraciones personalizadas"
                features={['Volumen personalizado', 'Varias empresas o delegaciones', 'Integraciones personalizadas', 'Soporte dedicado']}
                featuresHeading="Todo en Pro, mas:"
                tone="white"
                ctaVariant="outline"
              />
            </div>

            <p className="text-xs text-slate-500 text-center mt-5">*impuestos no incluidos</p>
          </div>
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
          <button
            onClick={onUpgrade}
            disabled={loadingPortal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            <ChevronUp size={16} strokeWidth={3} />
            Mejorar plan
          </button>
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

interface PlanCardProps {
  name: string;
  price?: number | null;
  priceDecimals?: string | null;
  customPrice?: string;
  customSubtitle?: string;
  cta: string | null;
  ctaDisabled?: boolean;
  ctaVariant?: 'solid' | 'outline';
  onCta: () => void;
  loading?: boolean;
  docsLabel: string;
  description: string;
  features: string[];
  featuresHeading: string;
  tone: 'white' | 'highlight';
  badge?: string;
}

function PlanCard({
  name,
  price,
  customPrice,
  customSubtitle,
  cta,
  ctaDisabled,
  ctaVariant = 'solid',
  onCta,
  loading,
  docsLabel,
  description,
  features,
  featuresHeading,
  tone,
  badge,
}: PlanCardProps) {
  const isHighlight = tone === 'highlight';
  const isUnavailable = price === null && !customPrice;

  return (
    <div
      className={`relative rounded-3xl bg-white border-2 p-6 flex flex-col shadow-sm transition-all ${
        isHighlight ? 'border-blue-600 shadow-blue-600/10' : 'border-slate-200'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-blue-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 whitespace-nowrap shadow">
            <Sparkles size={10} />
            {badge}
          </span>
        </div>
      )}
      <h3 className="text-xl font-bold text-slate-900 text-center">{name}</h3>

      {customPrice ? (
        <div className="mt-5 text-center">
          <p className="text-2xl font-extrabold text-blue-700 leading-tight">{customPrice}</p>
          {customSubtitle && <p className="text-xs text-slate-500 mt-2">{customSubtitle}</p>}
        </div>
      ) : price === null ? (
        <div className="mt-5 text-center min-h-[88px] flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-slate-400">No disponible</p>
          <p className="text-xs text-slate-400 mt-1">en este volumen</p>
        </div>
      ) : (
        <div className="mt-5 flex items-end justify-center gap-1">
          <span className="text-3xl font-bold text-blue-700">EUR</span>
          <span className="text-6xl font-extrabold text-blue-700 leading-none">
            {Math.round(Number(price))}
          </span>
          <span className="text-base text-slate-500 self-end mb-1">/mes</span>
        </div>
      )}

      {docsLabel && !customPrice && (
        <p className="text-xs text-slate-500 text-center mt-3">{docsLabel}</p>
      )}

      {cta && (
        <button
          onClick={onCta}
          disabled={ctaDisabled || loading}
          className={`w-full mt-5 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
            ctaVariant === 'outline'
              ? 'border-2 border-blue-600 text-blue-700 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } ${isUnavailable ? 'opacity-50' : ''}`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {cta}
        </button>
      )}

      <p className="text-xs text-slate-500 mt-5 leading-relaxed">{description}</p>

      <p className="text-sm font-bold text-slate-800 mt-5 mb-3">{featuresHeading}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
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

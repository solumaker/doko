import { BarChart2, CalendarCheck, FilePlus, CheckCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppLayout } from '../components/AppLayout';
import { Document, PLAN_CONFIG } from '../lib/supabase';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo' | 'planes';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onViewDocument?: (doc: Document) => void;
}

function CircularProgress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#1d4ed8"
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
      <p className="text-sm text-slate-600 text-center">
        {label}
      </p>
    </div>
  );
}

function DocumentUsageCard() {
  const { usage, isTrialActive, trialDocsUsed, hasActiveSubscription } = useSubscription();

  if (isTrialActive) {
    const trialLimit = usage?.trial_doc_limit ?? 50;
    const pct = trialLimit > 0 ? Math.round((trialDocsUsed / trialLimit) * 100) : 0;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 self-start mb-2">
          <BarChart2 size={18} className="text-blue-700" />
          <h3 className="text-base font-bold text-slate-800">Uso de Documentos</h3>
        </div>
        <CircularProgress
          value={trialDocsUsed}
          max={trialLimit}
          label={`Has utilizado el `}
        />
        <p className="text-sm text-slate-600 text-center">
          Has utilizado el{' '}
          <span className="font-bold text-blue-700">{pct}%</span>{' '}
          de tu limite de prueba.
        </p>
      </div>
    );
  }

  if (hasActiveSubscription && usage) {
    const used = usage.documents_used;
    const limit = usage.document_limit;
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 self-start mb-4">
          <BarChart2 size={18} className="text-blue-700" />
          <h3 className="text-base font-bold text-slate-800">Uso de Documentos</h3>
        </div>
        <CircularProgress value={used} max={limit} label="" />
        <p className="text-sm text-slate-600 text-center mt-2">
          Has utilizado el{' '}
          <span className="font-bold text-blue-700">{pct}%</span>{' '}
          de tu limite mensual.
        </p>
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

function RenewalCard({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { usage, hasActiveSubscription, isTrialActive } = useSubscription();

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
        <CalendarCheck size={18} className="text-emerald-600" />
        <h3 className="text-base font-bold text-slate-800">
          {isTrialActive ? 'Fin de Prueba' : 'Proxima Renovacion'}
        </h3>
      </div>

      {renewalDate ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 mb-4">
          <p className="text-4xl font-extrabold text-blue-800 leading-none">
            {format(renewalDate, "dd 'de' MMMM", { locale: es })}
          </p>
          <p className="text-xl font-bold text-slate-700 mt-2">{format(renewalDate, 'yyyy')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 mb-4">
          <p className="text-slate-400 text-sm">Sin fecha disponible</p>
        </div>
      )}

      {hasActiveSubscription && !usage?.cancel_at_period_end ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle size={18} className="text-emerald-500" />
          <span>Tu plan se renovara automaticamente</span>
        </div>
      ) : isTrialActive ? (
        <button
          onClick={() => onNavigate('planes')}
          className="mt-auto text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors text-left"
        >
          Elegir un plan &rarr;
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <span>Renovacion no activa</span>
        </div>
      )}
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

function SubscriptionBanner({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { usage, hasActiveSubscription, isTrialActive } = useSubscription();

  const planName = hasActiveSubscription && usage?.plan
    ? PLAN_CONFIG[usage.plan]?.name ?? usage.plan
    : isTrialActive
    ? 'Prueba gratuita'
    : null;

  if (!planName) return null;

  const description = hasActiveSubscription
    ? `Tu plan ${planName} esta activo. Puedes cambiar tu metodo de pago o mejorar tu plan aqui.`
    : `Tu periodo de prueba esta activo. Elige un plan para continuar.`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">Gestionar mi suscripcion</h3>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      <button
        onClick={() => onNavigate('planes')}
        className="shrink-0 border-2 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white font-bold text-sm px-6 py-3 rounded-xl transition-all uppercase tracking-wide"
      >
        Ver detalles del plan
      </button>
    </div>
  );
}

export function Dashboard({ onNavigate, onLogout, onViewDocument }: DashboardProps) {
  const { isAdmin } = useAuth();
  const { documents } = useData();

  const recentDocs = documents.slice(0, 5);

  const handleNavItem = (item: string) => {
    switch (item) {
      case 'inicio': onNavigate('dashboard'); break;
      case 'documentos': onNavigate('historial'); break;
      case 'equipo': onNavigate('equipo'); break;
      case 'lugares': onNavigate('lugares'); break;
    }
  };

  const handleViewDocument = (doc: Document) => {
    if (onViewDocument) {
      onViewDocument(doc);
    } else {
      onNavigate('documento');
    }
  };

  return (
    <AppLayout activeNav="inicio" onNavigate={handleNavItem} onLogout={onLogout}>
      <div className="space-y-6 max-w-5xl">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bienvenido de nuevo!</h2>
            <p className="text-sm text-slate-500 mt-1">Que te gustaria hacer hoy? Empieza creando un nuevo documento.</p>
          </div>
          <button
            onClick={() => onNavigate('crear')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-8 py-4 flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98] shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FilePlus size={22} />
            </div>
            <span className="text-base font-extrabold uppercase tracking-wide">Crear Nuevo Documento</span>
          </button>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentUsageCard />
            <RenewalCard onNavigate={onNavigate} />
          </div>
        )}

        <RecentActivityTable
          documents={recentDocs}
          onViewDocument={handleViewDocument}
          onNavigate={onNavigate}
        />

        {isAdmin && <SubscriptionBanner onNavigate={onNavigate} />}
      </div>
    </AppLayout>
  );
}

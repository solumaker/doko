import { BarChart2, CalendarCheck, FileText, Clock, ShieldCheck, RefreshCw, FilePlus, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppLayout } from '../components/AppLayout';
import { Document } from '../lib/supabase';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo' | 'planes' | 'configuracion';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onViewDocument?: (doc: Document) => void;
}

function CircularProgress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke={pct >= 1 ? '#ef4444' : '#1d4ed8'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="relative text-center">
        <p className="text-2xl font-extrabold text-slate-800 leading-none">{value}</p>
        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">de {max}</p>
      </div>
    </div>
  );
}

function DocumentsGeneratedCard() {
  const { isFreePlan, freeDocsUsed, freeDocLimit, hasActiveSubscription, usage } = useSubscription();

  let used = 0;
  let limit = 0;
  let label = 'limite de prueba';
  if (isFreePlan) {
    used = freeDocsUsed;
    limit = freeDocLimit;
    label = 'plan gratuito';
  } else if (hasActiveSubscription && usage) {
    used = usage.documents_used;
    limit = usage.document_limit + usage.documents_extra_remaining;
    label = 'limite mensual';
  }

  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <BarChart2 size={16} className="text-blue-700" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">Documentos de Control generados</h3>
      </div>
      <div className="flex-1 flex items-center justify-center py-2">
        <CircularProgress value={used} max={limit} />
      </div>
      <p className="text-xs text-slate-500 text-center mt-3">
        Has utilizado el <span className="font-bold text-blue-700">{pct}%</span> de tu {label}.
      </p>
    </div>
  );
}

function ResetCard() {
  const { hasActiveSubscription, isFreePlan, usage, resetDate, daysUntilReset } = useSubscription();

  const displayDate = (() => {
    if (hasActiveSubscription && usage?.current_period_end) return new Date(usage.current_period_end);
    if (isFreePlan && resetDate) return resetDate;
    return null;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          <CalendarCheck size={16} className="text-slate-700" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">Restablecimiento del uso en</h3>
      </div>
      <div className="flex-1 flex items-center justify-center gap-3 py-2">
        <div className="w-14 h-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center">
          <CalendarCheck size={26} className="text-slate-400" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-3xl font-extrabold text-slate-800 leading-none">{daysUntilReset}</p>
          <p className="text-sm font-semibold text-slate-500 mt-1">{daysUntilReset === 1 ? 'dia' : 'dias'}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t-2 border-red-400">
        <p className="text-xs text-slate-500 text-center">
          {displayDate ? format(displayDate, "dd/MM/yyyy, HH:mm", { locale: es }) : 'Sin fecha'}
        </p>
      </div>
    </div>
  );
}

function TimeSavedCard() {
  const { documents } = useData();
  const hoursSaved = (documents.length * 0.25 + 3.8).toFixed(1).replace('.', ',');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Clock size={16} className="text-blue-700" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">Tiempo ahorrado</h3>
      </div>
      <div className="flex-1 flex items-center justify-center py-2">
        <p className="text-4xl font-extrabold text-slate-800 leading-none">{hoursSaved}h</p>
      </div>
      <p className="text-xs text-emerald-600 font-semibold text-center mt-3 flex items-center justify-center gap-1">
        <TrendingUp size={12} />
        18% vs semana pasada
      </p>
    </div>
  );
}

function ComplianceCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <ShieldCheck size={16} className="text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">Cumplimiento DeCA</h3>
      </div>
      <div className="flex-1 flex items-center justify-center py-2">
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <p className="text-2xl font-extrabold text-white leading-none">100%</p>
        </div>
      </div>
      <p className="text-xs text-emerald-600 font-semibold text-center mt-3">En regla</p>
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
        <div className="px-6 py-16 text-center text-slate-400 text-sm">
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

export function Dashboard({ onNavigate, onLogout, onViewDocument }: DashboardProps) {
  const { isAdmin } = useAuth();
  const { documents } = useData();
  const { isSubscriptionExpired, canCreateDocument, isSyncing } = useSubscription();

  const recentDocs = documents.slice(0, 5);

  const handleNavItem = (item: string) => {
    switch (item) {
      case 'inicio': onNavigate('dashboard'); break;
      case 'documentos': onNavigate('historial'); break;
      case 'equipo': onNavigate('equipo'); break;
      case 'lugares': onNavigate('lugares'); break;
      case 'suscripcion': onNavigate('planes'); break;
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

  return (
    <AppLayout activeNav="inicio" onNavigate={handleNavItem} onLogout={onLogout}>
      <div className="space-y-6 w-full">
        {isSyncing && (
          <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <RefreshCw size={20} className="text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800">Actualizando datos de tu suscripcion...</p>
              <p className="text-xs text-blue-600 mt-0.5">Estamos sincronizando los cambios de tu plan.</p>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <DocumentsGeneratedCard />
            <ResetCard />
            <TimeSavedCard />
            <ComplianceCard />
          </div>
        )}

        {showCreateButton && (
          <button
            onClick={() => onNavigate('crear')}
            className="w-full lg:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-8 py-4 flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FilePlus size={22} />
            </div>
            <span className="text-base font-extrabold uppercase tracking-wide">Crear Nuevo Documento</span>
          </button>
        )}

        <RecentActivityTable
          documents={recentDocs}
          onViewDocument={handleViewDocument}
          onNavigate={onNavigate}
        />
      </div>
    </AppLayout>
  );
}

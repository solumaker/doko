import { BarChart2, CalendarCheck, FilePlus, CheckCircle, FileText, Clock, RefreshCw } from 'lucide-react';
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
  const { usage, isFreePlan, freeDocsUsed, freeDocLimit, hasActiveSubscription, isSyncing } = useSubscription();

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

  if (isFreePlan) {
    const pct = freeDocLimit > 0 ? Math.round((freeDocsUsed / freeDocLimit) * 100) : 0;
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 self-start mb-4">
          <BarChart2 size={18} className="text-blue-700" />
          <h3 className="text-base font-bold text-slate-800">Documentos generados (Plan Gratuito)</h3>
        </div>
        <CircularProgress value={freeDocsUsed} max={freeDocLimit} />
        <p className="text-sm text-slate-600 text-center mt-4">
          Has utilizado el{' '}
          <span className="font-bold text-blue-700">{pct}%</span>{' '}
          de tu Plan Gratuito.
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
      <p className="text-sm text-slate-400">Sin datos disponibles.</p>
    </div>
  );
}

function RenewalCard() {
  const { usage, hasActiveSubscription, isFreePlan, isSyncing, resetDate, daysUntilReset } = useSubscription();

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

  const displayDate = (() => {
    if (hasActiveSubscription && usage?.current_period_end) return new Date(usage.current_period_end);
    if (isFreePlan && resetDate) return resetDate;
    return null;
  })();

  const title = isCanceling
    ? 'Fin de Suscripcion'
    : isFreePlan
    ? 'Reinicio de documentos'
    : 'Proxima Renovacion';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        {isCanceling ? (
          <Clock size={18} className="text-red-500" />
        ) : (
          <CalendarCheck size={18} className="text-emerald-600" />
        )}
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
      </div>

      {displayDate ? (
        <div className={`flex-1 flex flex-col items-center justify-center rounded-xl p-6 mb-4 ${isCanceling ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className={`text-4xl font-extrabold leading-none ${isCanceling ? 'text-red-700' : 'text-blue-800'}`}>
            {format(displayDate, "dd 'de' MMMM", { locale: es })}
          </p>
          <p className={`text-xl font-bold mt-2 ${isCanceling ? 'text-red-600' : 'text-slate-700'}`}>{format(displayDate, 'yyyy')}</p>
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
      ) : hasActiveSubscription ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle size={18} className="text-emerald-500" />
          <span>Tu plan se renovara automaticamente</span>
        </div>
      ) : isFreePlan ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle size={18} className="text-emerald-500" />
          <span>Tus documentos se reestablecen en {daysUntilReset} {daysUntilReset === 1 ? 'dia' : 'dias'}</span>
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
      </div>
    </AppLayout>
  );
}

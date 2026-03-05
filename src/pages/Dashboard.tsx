import { MapPin, Clock, FileText, Users, CreditCard, FilePlus, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSubscription, TRIAL_DOC_LIMIT } from '../context/SubscriptionContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppLayout } from '../components/AppLayout';
import { Document } from '../lib/supabase';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo' | 'planes';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onViewDocument?: (doc: Document) => void;
}

function TrialBanner({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { usage, isTrialActive, isTrialExpired, hasActiveSubscription, trialDaysLeft, trialDocsUsed, trialDocsLeft } = useSubscription();

  if (isTrialActive) {
    const trialEndDate = usage?.trial_ends_at
      ? format(new Date(usage.trial_ends_at), 'dd/MM/yyyy')
      : null;
    const docsPct = Math.min(100, Math.round((trialDocsUsed / TRIAL_DOC_LIMIT) * 100));
    const docsBarColor = docsPct >= 80 ? 'bg-red-400' : docsPct >= 60 ? 'bg-amber-400' : 'bg-white/60';

    return (
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">Prueba gratuita</p>
            <p className="text-emerald-100 text-sm mt-0.5">
              Te quedan <span className="font-bold text-white">{trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}</span> o <span className="font-bold text-white">{trialDocsLeft} documentos</span>
            </p>
            {trialEndDate && (
              <p className="text-emerald-200 text-xs mt-1">Vence el {trialEndDate}</p>
            )}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-emerald-100 mb-1">
                <span>Documentos usados</span>
                <span className="font-bold text-white">{trialDocsUsed} / {TRIAL_DOC_LIMIT}</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${docsBarColor}`} style={{ width: `${docsPct}%` }} />
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('planes')}
            className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-bold active:bg-white/30 transition-colors shrink-0"
          >
            Elegir plan
          </button>
        </div>
      </div>
    );
  }

  if (isTrialExpired && !hasActiveSubscription) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">Prueba finalizada</p>
            <p className="text-red-100 text-sm mt-0.5">Has alcanzado el limite de tu prueba gratuita</p>
          </div>
          <button
            onClick={() => onNavigate('planes')}
            className="bg-white text-red-600 px-4 py-2 rounded-xl text-sm font-bold active:bg-red-50 transition-colors shrink-0"
          >
            Elegir plan
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function QuickAccessCard({ icon: Icon, label, description, onClick }: {
  icon: typeof MapPin;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-5 flex flex-col items-center lg:items-start gap-3 border border-slate-200/80 hover:border-blue-200 hover:shadow-md transition-all duration-200 active:scale-[0.98] group"
    >
      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
        <Icon size={22} className="text-blue-600" />
      </div>
      <div className="text-center lg:text-left">
        <h3 className="text-sm font-bold text-slate-800">{label}</h3>
        <p className="text-xs text-slate-400 mt-0.5 hidden lg:block">{description}</p>
      </div>
    </button>
  );
}

function RecentActivity({ documents, onViewDocument }: { documents: Document[]; onViewDocument: (doc: Document) => void }) {
  if (documents.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">Actividad Reciente</h3>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1fr_140px_120px_60px] gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Documento</span>
          <span>Fecha</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>
        {documents.map((doc) => {
          const originLabel = doc.content.origin?.poblacion || doc.content.origin?.name || doc.content.origin?.city || '';
          const destLabel = doc.content.destination?.poblacion || doc.content.destination?.name || doc.content.destination?.city || '';
          const hasPdf = !!doc.pdf_url;

          return (
            <button
              key={doc.id}
              onClick={() => onViewDocument(doc)}
              className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0 lg:grid lg:grid-cols-[1fr_140px_120px_60px] lg:gap-4 lg:items-center">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {originLabel} → {destLabel}
                </p>
                <p className="text-xs text-slate-400 lg:text-sm mt-0.5 lg:mt-0">
                  {format(new Date(doc.created_at), "d MMM, HH:mm", { locale: es })}
                </p>
                <div className="mt-1 lg:mt-0">
                  <span className={`inline-flex text-[10px] lg:text-xs font-bold px-2.5 py-1 rounded-full ${
                    hasPdf ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {hasPdf ? 'COMPLETADO' : 'PENDIENTE'}
                  </span>
                </div>
                <span className="hidden lg:block text-slate-300 text-lg">...</span>
              </div>
            </button>
          );
        })}
      </div>
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
      case 'perfil': onNavigate('planes'); break;
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
        {isAdmin && <TrialBanner onNavigate={onNavigate} />}

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

        <div>
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid size={18} className="text-slate-400" />
            <h3 className="text-base font-bold text-slate-800">Accesos Rapidos</h3>
          </div>

          <div className="lg:hidden space-y-3">
            <QuickAccessCard icon={MapPin} label="MIS LUGARES" description="" onClick={() => onNavigate('lugares')} />
            <QuickAccessCard icon={Clock} label="HISTORIAL" description="" onClick={() => onNavigate('historial')} />
            {isAdmin && <QuickAccessCard icon={Users} label="MI EQUIPO" description="" onClick={() => onNavigate('equipo')} />}
            {isAdmin && <QuickAccessCard icon={CreditCard} label="SUSCRIPCION" description="" onClick={() => onNavigate('planes')} />}
          </div>

          <div className="hidden lg:grid lg:grid-cols-4 gap-4">
            <QuickAccessCard icon={MapPin} label="Mis Lugares" description="Gestionar ubicaciones y puntos de interes" onClick={() => onNavigate('lugares')} />
            <QuickAccessCard icon={Clock} label="Historial" description="Ver documentos y actividades recientes" onClick={() => onNavigate('historial')} />
            {isAdmin && <QuickAccessCard icon={Users} label="Mi Equipo" description="Colaborar con miembros y permisos" onClick={() => onNavigate('equipo')} />}
            {isAdmin && <QuickAccessCard icon={CreditCard} label="Suscripcion" description="Ver plan actual y facturacion mensual" onClick={() => onNavigate('planes')} />}
          </div>
        </div>

        <RecentActivity documents={recentDocs} onViewDocument={handleViewDocument} />
      </div>
    </AppLayout>
  );
}

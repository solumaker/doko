import { MapPin, Clock, FileText, LogOut, Users, CreditCard, ArrowUpCircle, Package, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useSubscription, TRIAL_DOC_LIMIT } from '../context/SubscriptionContext';
import { PLAN_CONFIG } from '../lib/supabase';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo' | 'planes';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

function SubscriptionBanner({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const {
    usage,
    isTrialActive,
    isTrialExpired,
    hasActiveSubscription,
    trialDaysLeft,
    trialDocsUsed,
    trialDocsLeft,
    openCustomerPortal,
    purchaseDocumentPack,
  } = useSubscription();

  if (isTrialActive) {
    const trialEndDate = usage?.trial_ends_at
      ? format(new Date(usage.trial_ends_at), 'dd/MM/yyyy')
      : null;
    const docsPct = Math.min(100, Math.round((trialDocsUsed / TRIAL_DOC_LIMIT) * 100));
    const docsBarColor = docsPct >= 80 ? 'bg-red-300' : docsPct >= 60 ? 'bg-yellow-300' : 'bg-white/60';

    return (
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">Prueba gratuita</p>
            <p className="text-green-100 text-sm mt-0.5">
              Tu prueba termina cuando pasen <span className="font-bold text-white">{trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}</span> o uses <span className="font-bold text-white">{trialDocsLeft} {trialDocsLeft === 1 ? 'documento' : 'documentos'}</span> mas
            </p>
            {trialEndDate && (
              <p className="text-green-200 text-xs mt-1">Vence el {trialEndDate}</p>
            )}
            <div className="mt-2.5">
              <div className="flex justify-between text-xs text-green-100 mb-1">
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
            className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold active:bg-white/30 transition-colors shrink-0 mt-0.5"
          >
            Elegir plan
          </button>
        </div>
      </div>
    );
  }

  if (isTrialExpired && !hasActiveSubscription) {
    return (
      <div className="bg-red-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">Prueba finalizada</p>
            <p className="text-red-100 text-sm mt-0.5">Has alcanzado el limite de tu prueba gratuita</p>
          </div>
          <button
            onClick={() => onNavigate('planes')}
            className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold active:bg-red-50 transition-colors shrink-0"
          >
            Elegir plan
          </button>
        </div>
      </div>
    );
  }

  if (hasActiveSubscription && usage) {
    const plan = usage.plan ? PLAN_CONFIG[usage.plan] : null;
    const totalAvailable = usage.document_limit + usage.documents_extra_remaining;
    const usagePercent = totalAvailable > 0 ? Math.min(100, (usage.documents_used / totalAvailable) * 100) : 0;
    const barColor = usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-green-500';

    return (
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900">Plan {plan?.name}</span>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Activo</span>
          </div>
          <button
            onClick={openCustomerPortal}
            className="text-slate-400 active:text-slate-600"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-600">Documentos este mes</span>
              <span className="text-sm font-bold text-slate-900">{usage.documents_used} / {usage.document_limit}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usagePercent}%` }} />
            </div>
            {usage.documents_extra_remaining > 0 && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                +{usage.documents_extra_remaining} documentos extra disponibles
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Usuarios</span>
            <span className="font-bold text-slate-900">{usage.users_count} / {usage.user_limit}</span>
          </div>

          {usage.current_period_end && (
            <p className="text-xs text-slate-400">
              Se renueva el {format(new Date(usage.current_period_end), 'dd/MM/yyyy')}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={purchaseDocumentPack}
              className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-slate-200 transition-colors"
            >
              <Package size={14} />
              +10 docs
            </button>
            <button
              onClick={() => onNavigate('planes')}
              className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-slate-200 transition-colors"
            >
              <ArrowUpCircle size={14} />
              Cambiar plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function Dashboard({ onNavigate, onLogout }: DashboardProps) {
  const { profile, company, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-600 text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-base">Bienvenido,</p>
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Usuario'}</h1>
          </div>
          <button
            onClick={onLogout}
            className="p-3 bg-blue-700 rounded-xl active:bg-blue-800"
          >
            <LogOut size={28} />
          </button>
        </div>
        <p className="text-blue-100 mt-2 text-base">{company?.name || 'Empresa'}</p>
      </header>

      {isAdmin && <SubscriptionBanner onNavigate={onNavigate} />}

      <main className="flex-1 px-4 py-6">
        <button
          onClick={() => onNavigate('crear')}
          className="w-full bg-green-600 text-white rounded-xl py-8 px-6 mb-6 active:bg-green-700 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-center gap-4">
            <FileText size={48} strokeWidth={2.5} />
            <span className="text-2xl font-bold">CREAR NUEVO DOCUMENTO</span>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('lugares')}
            className="bg-white rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-3 active:bg-slate-50 transition-colors shadow-lg border-2 border-slate-200"
          >
            <MapPin size={64} className="text-blue-600" strokeWidth={1.5} />
            <h3 className="text-lg font-bold text-slate-900">Mis Lugares</h3>
          </button>

          <button
            onClick={() => onNavigate('historial')}
            className="bg-white rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-3 active:bg-slate-50 transition-colors shadow-lg border-2 border-slate-200"
          >
            <Clock size={64} className="text-blue-600" strokeWidth={1.5} />
            <h3 className="text-lg font-bold text-slate-900">Historial</h3>
          </button>

          {isAdmin && (
            <button
              onClick={() => onNavigate('equipo')}
              className="bg-white rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-3 active:bg-slate-50 transition-colors shadow-lg border-2 border-slate-200"
            >
              <Users size={64} className="text-blue-600" strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-slate-900">Mi Equipo</h3>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

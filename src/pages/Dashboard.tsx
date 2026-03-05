import { MapPin, Clock, FileText, LogOut, Users, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription, TRIAL_DOC_LIMIT } from '../context/SubscriptionContext';
import { format } from 'date-fns';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo' | 'planes';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

function TrialBanner({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { usage, isTrialActive, isTrialExpired, hasActiveSubscription, trialDaysLeft, trialDocsUsed, trialDocsLeft } = useSubscription();

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

  return null;
}

export function Dashboard({ onNavigate, onLogout }: DashboardProps) {
  const { profile, company, isAdmin } = useAuth();
  const { hasActiveSubscription } = useSubscription();

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

      {isAdmin && <TrialBanner onNavigate={onNavigate} />}

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

          {isAdmin && hasActiveSubscription && (
            <button
              onClick={() => onNavigate('planes')}
              className="bg-white rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-3 active:bg-slate-50 transition-colors shadow-lg border-2 border-blue-200"
            >
              <CreditCard size={64} className="text-blue-600" strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-slate-900">Mi Suscripcion</h3>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

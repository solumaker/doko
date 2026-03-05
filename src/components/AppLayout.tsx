import { ReactNode } from 'react';
import { Home, FolderOpen, Users, MapPin, LogOut, HelpCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { PLAN_CONFIG } from '../lib/supabase';

type NavItem = 'inicio' | 'documentos' | 'equipo' | 'lugares';

interface AppLayoutProps {
  children: ReactNode;
  activeNav?: NavItem;
  onNavigate?: (item: NavItem) => void;
  onLogout: () => void;
  pageTitle?: string;
  onBack?: () => void;
}

const navItems: { id: NavItem; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen },
  { id: 'equipo', label: 'Equipo', icon: Users },
  { id: 'lugares', label: 'Lugares', icon: MapPin },
];

const pageTitleMap: Record<NavItem, string> = {
  inicio: 'Panel de Control',
  documentos: 'Documentos',
  equipo: 'Equipo',
  lugares: 'Lugares',
};

export function AppLayout({ children, activeNav = 'inicio', onNavigate, onLogout, pageTitle, onBack }: AppLayoutProps) {
  const { profile } = useAuth();
  const { usage, hasActiveSubscription } = useSubscription();

  const planLabel = hasActiveSubscription && usage?.plan
    ? `Plan ${PLAN_CONFIG[usage.plan]?.name ?? usage.plan}`
    : 'Prueba gratuita';

  const displayTitle = pageTitle ?? pageTitleMap[activeNav];

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col bg-white border-r border-slate-200 z-30">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-10 w-auto object-contain" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate?.(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200 transition-colors">
            <HelpCircle size={18} />
            AYUDA
          </button>
        </div>
      </aside>

      <div className="hidden lg:block lg:pl-60">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-800">{displayTitle}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-slate-400">{planLabel}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center hover:from-red-100 hover:to-red-200 transition-all group"
                title="Cerrar sesion"
              >
                <LogOut size={18} className="text-slate-600 group-hover:text-red-600 transition-colors" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-8 py-6">
          {children}
        </main>

        <footer className="px-8 py-4 text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} DOKO - Gestion Inteligente de Documentos. Todos los derechos reservados.
          </p>
        </footer>
      </div>

      <div className="lg:hidden">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack ? (
                <button
                  onClick={onBack}
                  className="p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={22} />
                </button>
              ) : (
                <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-8 w-auto object-contain" />
              )}
              <div>
                {!onBack && <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Panel Principal</p>}
                <p className="text-base font-bold text-slate-800 leading-tight">
                  {onBack ? displayTitle : (profile?.full_name || 'Usuario')}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Cerrar sesion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="px-4 py-5 pb-28">
          {children}
        </main>

        {!onBack && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeNav === id;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate?.(id)}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

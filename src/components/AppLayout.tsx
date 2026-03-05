import { ReactNode } from 'react';
import { Home, FolderOpen, Users, User, LogOut, HelpCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { PLAN_CONFIG } from '../lib/supabase';

type NavItem = 'inicio' | 'documentos' | 'equipo' | 'perfil';

interface AppLayoutProps {
  children: ReactNode;
  activeNav?: NavItem;
  onNavigate?: (item: NavItem) => void;
  onLogout: () => void;
}

const navItems: { id: NavItem; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen },
  { id: 'equipo', label: 'Equipo', icon: Users },
  { id: 'perfil', label: 'Perfil', icon: User },
];

export function AppLayout({ children, activeNav = 'inicio', onNavigate, onLogout }: AppLayoutProps) {
  const { profile } = useAuth();
  const { usage, hasActiveSubscription } = useSubscription();

  const planLabel = hasActiveSubscription && usage?.plan
    ? `Plan ${PLAN_CONFIG[usage.plan]?.name ?? usage.plan}`
    : 'Prueba gratuita';

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col bg-white border-r border-slate-200 z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-blue-600" />
          </div>
          <span className="text-xl font-extrabold text-blue-700 tracking-tight">DOKO</span>
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
            <h2 className="text-lg font-bold text-slate-800">Panel de Control</h2>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-slate-400">{planLabel}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                <User size={18} className="text-slate-600" />
              </div>
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
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Panel Principal</p>
                <p className="text-base font-bold text-slate-800 leading-tight">{profile?.full_name || 'Usuario'}</p>
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

        <main className="px-4 py-5 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}

import { ReactNode } from 'react';
import { Home, FolderOpen, Users, MapPin, LogOut, Settings, ArrowLeft, CreditCard, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { PLAN_CONFIG } from '../lib/supabase';

type NavItem = 'inicio' | 'documentos' | 'equipo' | 'lugares' | 'suscripcion' | 'configuracion';

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
  { id: 'suscripcion', label: 'Suscripcion', icon: CreditCard },
];

const pageTitleMap: Record<NavItem, string> = {
  inicio: 'Panel de Control',
  documentos: 'Documentos',
  equipo: 'Equipo',
  lugares: 'Lugares',
  suscripcion: 'Suscripcion',
  configuracion: 'Configuracion',
};

export function AppLayout({ children, activeNav = 'inicio', onNavigate, onLogout, pageTitle, onBack }: AppLayoutProps) {
  const { profile, company } = useAuth();
  const { usage, hasActiveSubscription, isSubscriptionExpired, isFreePlan } = useSubscription();

  const planLabel = (() => {
    if (hasActiveSubscription && usage?.plan) {
      const name = PLAN_CONFIG[usage.plan]?.name ?? usage.plan;
      if (usage.cancel_at_period_end) return `Plan ${name} (cancelado)`;
      return `Plan ${name}`;
    }
    if (isSubscriptionExpired) return 'Suscripcion expirada';
    if (isFreePlan) return 'Plan gratuito';
    return 'Plan gratuito';
  })();

  const displayTitle = pageTitle ?? pageTitleMap[activeNav];
  const companyDisplay = company?.name || profile?.full_name || 'Usuario';

  const SidebarButton = ({ id, label, Icon }: { id: NavItem; label: string; Icon: typeof Home }) => {
    const active = activeNav === id;
    return (
      <button
        onClick={() => onNavigate?.(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
          active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="hidden lg:flex min-h-screen">
        <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200/80 flex flex-col z-30">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Truck size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-8 w-auto object-contain" />
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
            {navItems.map(({ id, label, icon }) => (
              <SidebarButton key={id} id={id} label={label} Icon={icon} />
            ))}
          </nav>

          {profile?.role === 'admin' && (
            <div className="px-3 py-4 border-t border-slate-100">
              <SidebarButton id="configuracion" label="Configuracion" Icon={Settings} />
            </div>
          )}
        </aside>

        <div className="flex-1 ml-64 min-h-screen flex flex-col">
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 shadow-sm">
            <div className="w-full px-8 py-4 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 min-w-0">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h1 className="text-xl font-bold text-slate-900 truncate">{displayTitle}</h1>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{companyDisplay}</p>
                  <p className="text-xs text-slate-400 italic mt-0.5">{planLabel}</p>
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

          <main className="flex-1 px-8 py-6">
            {children}
          </main>

          <footer className="px-8 py-4 text-center">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} DOKO - Gestion Inteligente de Documentos. Todos los derechos reservados.
            </p>
          </footer>
        </div>
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
                  {onBack ? displayTitle : companyDisplay}
                </p>
                {!onBack && <p className="text-[11px] text-slate-400 italic mt-0.5">{planLabel}</p>}
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
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-1 py-2 flex items-center justify-around">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeNav === id;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate?.(id)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors ${
                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[9px] font-semibold">{label}</span>
                </button>
              );
            })}
            {profile?.role === 'admin' && (
              <button
                onClick={() => onNavigate?.('configuracion')}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors ${
                  activeNav === 'configuracion' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Settings size={20} strokeWidth={activeNav === 'configuracion' ? 2.5 : 2} />
                <span className="text-[9px] font-semibold">Config.</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

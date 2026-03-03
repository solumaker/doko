import { MapPin, Truck, Clock, FileText, LogOut, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Screen = 'dashboard' | 'lugares' | 'vehiculos' | 'historial' | 'crear' | 'documento' | 'equipo';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
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

      <div className="bg-green-600 text-white text-center py-2 px-4">
        <p className="text-base font-semibold">Prueba gratis 7 dias activa</p>
      </div>

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

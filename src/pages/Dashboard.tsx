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
    <div className="min-h-screen bg-slate-100 flex flex-col pb-24">
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

        <div className="space-y-4">
          <button
            onClick={() => onNavigate('lugares')}
            className="w-full bg-white rounded-xl py-5 px-6 flex items-center gap-4 active:bg-slate-50 transition-colors shadow border-2 border-slate-200"
          >
            <div className="bg-blue-100 p-3 rounded-xl">
              <MapPin size={32} className="text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-xl font-bold text-slate-900">Mis Lugares</h3>
              <p className="text-slate-600 text-base">
                Origenes y destinos guardados
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('vehiculos')}
            className="w-full bg-white rounded-xl py-5 px-6 flex items-center gap-4 active:bg-slate-50 transition-colors shadow border-2 border-slate-200"
          >
            <div className="bg-blue-100 p-3 rounded-xl">
              <Truck size={32} className="text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-xl font-bold text-slate-900">Mis Vehiculos</h3>
              <p className="text-slate-600 text-base">
                Camiones y remolques registrados
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('historial')}
            className="w-full bg-white rounded-xl py-5 px-6 flex items-center gap-4 active:bg-slate-50 transition-colors shadow border-2 border-slate-200"
          >
            <div className="bg-blue-100 p-3 rounded-xl">
              <Clock size={32} className="text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-xl font-bold text-slate-900">Historial</h3>
              <p className="text-slate-600 text-base">
                Documentos anteriores
              </p>
            </div>
          </button>

          {isAdmin && (
            <button
              onClick={() => onNavigate('equipo')}
              className="w-full bg-white rounded-xl py-5 px-6 flex items-center gap-4 active:bg-slate-50 transition-colors shadow border-2 border-slate-200"
            >
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users size={32} className="text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-xl font-bold text-slate-900">Mi Equipo</h3>
                <p className="text-slate-600 text-base">
                  Gestionar conductores
                </p>
              </div>
            </button>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 px-2 py-3 flex justify-around">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex flex-col items-center p-2 text-blue-600"
        >
          <FileText size={28} />
          <span className="text-sm font-semibold mt-1">Inicio</span>
        </button>
        <button
          onClick={() => onNavigate('lugares')}
          className="flex flex-col items-center p-2 text-slate-500"
        >
          <MapPin size={28} />
          <span className="text-sm font-medium mt-1">Lugares</span>
        </button>
        <button
          onClick={() => onNavigate('vehiculos')}
          className="flex flex-col items-center p-2 text-slate-500"
        >
          <Truck size={28} />
          <span className="text-sm font-medium mt-1">Vehiculos</span>
        </button>
        <button
          onClick={() => onNavigate('historial')}
          className="flex flex-col items-center p-2 text-slate-500"
        >
          <Clock size={28} />
          <span className="text-sm font-medium mt-1">Historial</span>
        </button>
      </nav>
    </div>
  );
}

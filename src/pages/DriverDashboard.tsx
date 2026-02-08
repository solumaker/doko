import { FileText, LogOut, Clock, Loader2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Document } from '../lib/supabase';

interface DriverDashboardProps {
  onCreateDocument: () => void;
  onViewDocument: (doc: Document) => void;
  onLogout: () => void;
}

export function DriverDashboard({ onCreateDocument, onViewDocument, onLogout }: DriverDashboardProps) {
  const { profile, company } = useAuth();
  const { documents, loadingDocuments } = useData();

  const recentDocs = documents.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-600 text-white px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Conductor'}</h1>
            <p className="text-blue-200 text-base mt-1">{company?.name || ''}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-3 bg-blue-700 rounded-xl active:bg-blue-800"
            title="Cerrar sesion"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">
        <button
          onClick={onCreateDocument}
          className="w-full bg-green-600 text-white rounded-2xl py-7 px-6 mb-6 active:bg-green-700 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-center gap-4">
            <FileText size={44} strokeWidth={2.5} />
            <span className="text-2xl font-bold">NUEVO DOCUMENTO</span>
          </div>
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-slate-500" />
          <h2 className="text-lg font-bold text-slate-700">Documentos recientes</h2>
        </div>

        {loadingDocuments ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={40} className="animate-spin text-blue-600" />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={56} className="text-slate-300 mx-auto mb-3" />
            <p className="text-lg text-slate-500">No hay documentos todavia</p>
            <p className="text-base text-slate-400 mt-1">
              Crea tu primer documento de control
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onViewDocument(doc)}
                className="w-full bg-white rounded-xl p-4 shadow border border-slate-200 flex items-center gap-4 active:bg-slate-50 transition-colors text-left"
              >
                <div className="bg-blue-100 p-2.5 rounded-lg shrink-0">
                  <FileText size={22} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-900 truncate">
                    {doc.content.origin?.name} → {doc.content.destination?.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {format(new Date(doc.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

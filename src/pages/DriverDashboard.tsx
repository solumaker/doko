import { useState } from 'react';
import { FileText, LogOut, Clock, Loader2, ChevronRight, AlertTriangle, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Document } from '../lib/supabase';
import { DocumentLimitModal } from '../components/DocumentLimitModal';

interface DriverDashboardProps {
  onCreateDocument: () => void;
  onViewDocument: (doc: Document) => void;
  onLogout: () => void;
}

export function DriverDashboard({ onCreateDocument, onViewDocument, onLogout }: DriverDashboardProps) {
  const { profile, company } = useAuth();
  const { documents, loadingDocuments } = useData();
  const { canCreateDocument } = useSubscription();
  const [showLimitModal, setShowLimitModal] = useState(false);

  const recentDocs = documents.slice(0, 10);
  const limitReached = !canCreateDocument();

  const handleCreateDocument = () => {
    if (limitReached) {
      setShowLimitModal(true);
      return;
    }
    onCreateDocument();
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <header className="bg-white border-b border-slate-200 px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{profile?.full_name || 'Conductor'}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{company?.name || ''}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
            title="Cerrar sesion"
          >
            <LogOut size={22} className="text-slate-600" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">
        <button
          onClick={handleCreateDocument}
          className={`w-full rounded-2xl py-6 px-6 mb-6 transition-colors shadow-md ${
            limitReached
              ? 'bg-slate-400 text-white'
              : 'bg-emerald-500 text-white active:bg-emerald-600'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            {limitReached ? (
              <>
                <AlertTriangle size={32} strokeWidth={2.5} />
                <div className="text-left">
                  <span className="text-xl font-bold block">Nuevo Documento</span>
                  <span className="text-sm opacity-90">Limite alcanzado</span>
                </div>
              </>
            ) : (
              <>
                <FilePlus size={32} strokeWidth={2.5} />
                <span className="text-xl font-bold">Nuevo Documento</span>
              </>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold text-slate-700">Documentos recientes</h2>
        </div>

        {loadingDocuments ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={40} className="animate-spin text-blue-600" />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={56} className="text-slate-300 mx-auto mb-3" />
            <p className="text-base text-slate-500 font-medium">No hay documentos todavia</p>
            <p className="text-sm text-slate-400 mt-1">
              Crea tu primer documento de control
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onViewDocument(doc)}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4 active:bg-slate-50 transition-colors text-left"
              >
                <div className="bg-blue-50 p-2.5 rounded-full shrink-0">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {doc.content.origin?.poblacion || doc.content.origin?.name || doc.content.origin?.city} → {doc.content.destination?.poblacion || doc.content.destination?.name || doc.content.destination?.city}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(doc.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </main>

      {showLimitModal && (
        <DocumentLimitModal
          isAdmin={false}
          onClose={() => setShowLimitModal(false)}
        />
      )}
    </div>
  );
}

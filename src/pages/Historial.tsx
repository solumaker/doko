import { ArrowLeft, FileText, MapPin, Truck, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { Document } from '../lib/supabase';

interface HistorialProps {
  onBack: () => void;
  onViewDocument: (document: Document) => void;
}

export function Historial({ onBack, onViewDocument }: HistorialProps) {
  const { documents, loadingDocuments } = useData();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold">Historial</h1>
      </header>

      <div className="p-4">
        {loadingDocuments ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onViewDocument(doc)}
                className="w-full bg-white rounded-xl p-5 shadow border-2 border-slate-200 text-left active:bg-slate-50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <FileText size={24} className="text-green-600" />
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={18} />
                    <span className="text-base font-medium">
                      {format(new Date(doc.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-1.5 rounded-lg mt-0.5">
                      <MapPin size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Origen</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {doc.content.origin.poblacion || doc.content.origin.name || doc.content.origin.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-1.5 rounded-lg mt-0.5">
                      <MapPin size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Destino</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {doc.content.destination.poblacion || doc.content.destination.name || doc.content.destination.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-1.5 rounded-lg mt-0.5">
                      <Truck size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Vehiculo</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {doc.content.vehicle.tractor_plate}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-slate-600">
                    <span className="font-semibold">{doc.content.cargo.description}</span>
                    {' - '}
                    {doc.content.cargo.weight_kg.toLocaleString()} kg
                  </p>
                </div>
              </button>
            ))}

            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText size={64} className="text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500">No hay documentos</p>
                <p className="text-base text-slate-400 mt-2">
                  Los documentos generados apareceran aqui
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

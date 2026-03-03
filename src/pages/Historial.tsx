import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, MapPin, Truck, Calendar, Loader2, Users, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase, Document, Profile } from '../lib/supabase';

interface HistorialProps {
  onBack: () => void;
  onViewDocument: (document: Document) => void;
}

interface DriverWithHidden extends Profile {
  hiddenDocIds: string[];
}

export function Historial({ onBack, onViewDocument }: HistorialProps) {
  const { documents, allDocuments, hideDocumentForProfile, showDocumentForProfile, loadingDocuments } = useData();
  const { profile, isAdmin } = useAuth();

  const [adminView, setAdminView] = useState<'my' | 'all' | 'manage'>('my');
  const [drivers, setDrivers] = useState<DriverWithHidden[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithHidden | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    if (isAdmin && adminView === 'manage') {
      fetchDriversWithHidden();
    }
  }, [isAdmin, adminView]);

  const fetchDriversWithHidden = async () => {
    if (!profile?.company_id) return;
    setLoadingDrivers(true);

    const { data: members } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('role', 'driver')
      .order('full_name');

    const { data: allHidden } = await supabase
      .from('document_visibility')
      .select('document_id, profile_id');

    const hiddenMap = new Map<string, string[]>();
    (allHidden || []).forEach((r: { document_id: string; profile_id: string }) => {
      const existing = hiddenMap.get(r.profile_id) || [];
      existing.push(r.document_id);
      hiddenMap.set(r.profile_id, existing);
    });

    const result: DriverWithHidden[] = (members || []).map((m: Profile) => ({
      ...m,
      hiddenDocIds: hiddenMap.get(m.id) || [],
    }));

    setDrivers(result);
    if (result.length > 0 && !selectedDriver) setSelectedDriver(result[0]);
    setLoadingDrivers(false);
  };

  const handleToggleVisibility = async (docId: string, driverId: string, currentlyHidden: boolean) => {
    if (currentlyHidden) {
      await showDocumentForProfile(docId, driverId);
    } else {
      await hideDocumentForProfile(docId, driverId);
    }
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const hiddenDocIds = currentlyHidden
          ? d.hiddenDocIds.filter((id) => id !== docId)
          : [...d.hiddenDocIds, docId];
        return { ...d, hiddenDocIds };
      })
    );
    if (selectedDriver?.id === driverId) {
      setSelectedDriver((prev) =>
        prev ? {
          ...prev,
          hiddenDocIds: currentlyHidden
            ? prev.hiddenDocIds.filter((id) => id !== docId)
            : [...prev.hiddenDocIds, docId],
        } : prev
      );
    }
  };

  const displayedDocs = isAdmin && adminView === 'all' ? allDocuments : documents;

  const renderDocCard = (doc: Document, actions?: React.ReactNode) => (
    <div key={doc.id} className="bg-white rounded-xl shadow border-2 border-slate-200 overflow-hidden">
      <button
        onClick={() => onViewDocument(doc)}
        className="w-full p-5 text-left active:bg-slate-50"
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
          {doc.driver_name && (
            <span className="ml-auto text-sm text-slate-400 font-medium truncate max-w-[120px]">{doc.driver_name}</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-1.5 rounded-lg mt-0.5"><MapPin size={18} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Origen</p>
              <p className="text-base font-semibold text-slate-900">
                {doc.content.origin.poblacion || doc.content.origin.name || doc.content.origin.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-1.5 rounded-lg mt-0.5"><MapPin size={18} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Destino</p>
              <p className="text-base font-semibold text-slate-900">
                {doc.content.destination.poblacion || doc.content.destination.name || doc.content.destination.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-slate-100 p-1.5 rounded-lg mt-0.5"><Truck size={18} className="text-slate-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Vehiculo</p>
              <p className="text-base font-semibold text-slate-900">{doc.content.vehicle.tractor_plate}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-slate-600">
            <span className="font-semibold">{doc.content.cargo.description}</span>
            {' - '}
            {doc.content.cargo.weight_kg.toLocaleString()} kg
          </p>
        </div>
      </button>
      {actions && <div className="border-t border-slate-200 px-4 py-2">{actions}</div>}
    </div>
  );

  const renderManageView = () => {
    if (loadingDrivers) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-blue-600" />
        </div>
      );
    }

    if (drivers.length === 0) {
      return (
        <div className="text-center py-12">
          <Users size={64} className="text-slate-300 mx-auto mb-4" />
          <p className="text-xl text-slate-500">No hay conductores</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm text-blue-800 font-medium">Selecciona un conductor para gestionar qué documentos puede ver en su Historial.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {drivers.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDriver(d)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-colors ${
                selectedDriver?.id === d.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 active:bg-slate-50'
              }`}
            >
              {d.full_name}
            </button>
          ))}
        </div>

        {selectedDriver && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-lg">{selectedDriver.full_name}</h3>
            {allDocuments.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay documentos</p>
            ) : (
              allDocuments.map((doc) => {
                const isHidden = selectedDriver.hiddenDocIds.includes(doc.id);
                return renderDocCard(
                  doc,
                  <button
                    onClick={() => handleToggleVisibility(doc.id, selectedDriver.id, isHidden)}
                    className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isHidden
                        ? 'text-red-600 bg-red-50 active:bg-red-100'
                        : 'text-green-700 bg-green-50 active:bg-green-100'
                    }`}
                  >
                    {isHidden ? <><EyeOff size={15} /> Oculto para este conductor</> : <><Eye size={15} /> Visible para este conductor</>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold">Historial</h1>
      </header>

      {isAdmin && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
          {(['my', 'all', 'manage'] as const).map((v) => {
            const labels = { my: 'Mis documentos', all: 'Todos', manage: <span className="flex items-center gap-1"><Users size={15} />Gestionar visibilidad</span> };
            return (
              <button
                key={v}
                onClick={() => setAdminView(v)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  adminView === v ? 'bg-blue-600 text-white' : 'text-slate-600 active:bg-slate-100'
                }`}
              >
                {labels[v]}
              </button>
            );
          })}
        </div>
      )}

      <div className="p-4">
        {adminView === 'manage' && isAdmin ? (
          renderManageView()
        ) : loadingDocuments ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {displayedDocs.map((doc) => renderDocCard(doc))}
            {displayedDocs.length === 0 && (
              <div className="text-center py-12">
                <FileText size={64} className="text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500">No hay documentos</p>
                <p className="text-base text-slate-400 mt-2">Los documentos generados apareceran aqui</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

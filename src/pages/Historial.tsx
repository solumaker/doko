import { useState, useEffect } from 'react';
import { FileText, MapPin, Truck, Calendar, Loader2, Users, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase, Document, Profile } from '../lib/supabase';
import { AppLayout } from '../components/AppLayout';

interface HistorialProps {
  onBack: () => void;
  onViewDocument: (document: Document) => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

interface DriverWithHidden extends Profile {
  hiddenDocIds: string[];
}

export function Historial({ onBack, onViewDocument, onLogout, onNavigate }: HistorialProps) {
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

  const handleNavItem = (item: string) => {
    onNavigate(item);
  };

  const renderDocCard = (doc: Document, actions?: React.ReactNode) => (
    <div key={doc.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-sm transition-all">
      <button
        onClick={() => onViewDocument(doc)}
        className="w-full p-4 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <div className="bg-emerald-50 p-1.5 rounded-lg">
            <FileText size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar size={13} />
            <span className="text-xs font-medium">
              {format(new Date(doc.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>
          {doc.driver_name && (
            <span className="ml-auto text-xs text-slate-400 font-medium truncate max-w-[120px]">{doc.driver_name}</span>
          )}
        </div>

        <div className="hidden lg:grid lg:grid-cols-3 gap-4 mb-2">
          <div className="flex items-start gap-2">
            <div className="bg-blue-50 p-1 rounded-lg mt-0.5 shrink-0">
              <MapPin size={13} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origen</p>
              <p className="text-sm font-semibold text-slate-900">
                {doc.content.origin.poblacion || doc.content.origin.name || doc.content.origin.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-emerald-50 p-1 rounded-lg mt-0.5 shrink-0">
              <MapPin size={13} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destino</p>
              <p className="text-sm font-semibold text-slate-900">
                {doc.content.destination.poblacion || doc.content.destination.name || doc.content.destination.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-slate-50 p-1 rounded-lg mt-0.5 shrink-0">
              <Truck size={13} className="text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Matricula</p>
              <p className="text-sm font-semibold text-slate-900">{doc.content.vehicle.tractor_plate}</p>
            </div>
          </div>
        </div>

        <div className="lg:hidden space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="bg-blue-50 p-1 rounded-lg mt-0.5">
              <MapPin size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Origen</p>
              <p className="text-sm font-semibold text-slate-900">
                {doc.content.origin.poblacion || doc.content.origin.name || doc.content.origin.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="bg-emerald-50 p-1 rounded-lg mt-0.5">
              <MapPin size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Destino</p>
              <p className="text-sm font-semibold text-slate-900">
                {doc.content.destination.poblacion || doc.content.destination.name || doc.content.destination.city}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="bg-slate-50 p-1 rounded-lg mt-0.5">
              <Truck size={14} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vehiculo</p>
              <p className="text-sm font-semibold text-slate-900">{doc.content.vehicle.tractor_plate}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-slate-700 text-sm">
            <span className="font-semibold">{doc.content.cargo.description}</span>
            {' - '}
            {doc.content.cargo.weight_kg.toLocaleString()} kg
          </p>
        </div>
      </button>
      {actions && <div className="border-t border-slate-100 px-4 py-2.5">{actions}</div>}
    </div>
  );

  const renderManageView = () => {
    if (loadingDrivers) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
      );
    }

    if (drivers.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-600">No hay conductores</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5">
          <p className="text-xs font-medium text-blue-800">Selecciona un conductor para gestionar que documentos puede ver en su historial.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {drivers.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDriver(d)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                selectedDriver?.id === d.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {d.full_name}
            </button>
          ))}
        </div>

        {selectedDriver && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-base">{selectedDriver.full_name}</h3>
            {allDocuments.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">No hay documentos</p>
            ) : (
              allDocuments.map((doc) => {
                const isHidden = selectedDriver.hiddenDocIds.includes(doc.id);
                return renderDocCard(
                  doc,
                  <button
                    onClick={() => handleToggleVisibility(doc.id, selectedDriver.id, isHidden)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isHidden
                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {isHidden ? <><EyeOff size={14} /> Oculto para este conductor</> : <><Eye size={14} /> Visible para este conductor</>}
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
    <AppLayout
      activeNav="documentos"
      onNavigate={handleNavItem}
      onLogout={onLogout}
    >
      <div className="max-w-5xl space-y-5">
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 flex gap-1">
            {(['my', 'all', 'manage'] as const).map((v) => {
              const labels: Record<string, React.ReactNode> = {
                my: 'Mis documentos',
                all: 'Todos',
                manage: <span className="flex items-center gap-1.5"><Users size={14} />Visibilidad</span>,
              };
              return (
                <button
                  key={v}
                  onClick={() => setAdminView(v)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors flex-1 justify-center ${
                    adminView === v
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {labels[v]}
                </button>
              );
            })}
          </div>
        )}

        {adminView === 'manage' && isAdmin ? (
          renderManageView()
        ) : loadingDocuments ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={36} className="animate-spin text-blue-600" />
          </div>
        ) : displayedDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-600">No hay documentos</p>
            <p className="text-sm text-slate-400 mt-1">Los documentos generados apareceran aqui</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Fecha</span>
                <span>Cargador</span>
                <span>Origen</span>
                <span>Destino</span>
                <span>Conductor</span>
                <span>Matricula</span>
              </div>
              {displayedDocs.map((doc) => {
                const shipperName = doc.content.contractual_shipper?.nombre || doc.content.company?.name || '-';
                const originCity = doc.content.origin?.poblacion || doc.content.origin?.city || doc.content.origin?.empresa || '-';
                const destCity = doc.content.destination?.poblacion || doc.content.destination?.city || doc.content.destination?.empresa || '-';
                const driverName = doc.content.driver?.name || doc.driver_name || '-';
                const plate = doc.content.vehicle?.tractor_plate || '-';

                return (
                  <button
                    key={doc.id}
                    onClick={() => onViewDocument(doc)}
                    className="w-full text-left border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="grid grid-cols-[160px_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 items-center">
                      <span className="text-sm text-slate-500">
                        {format(new Date(doc.created_at), "d MMM, HH:mm", { locale: es })}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{shipperName}</span>
                      <span className="text-sm text-slate-600 truncate">{originCity}</span>
                      <span className="text-sm text-slate-600 truncate">{destCity}</span>
                      <span className="text-sm text-slate-600 truncate">{driverName}</span>
                      <span className="text-sm text-slate-600">{plate}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:hidden space-y-3">
              {displayedDocs.map((doc) => renderDocCard(doc))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

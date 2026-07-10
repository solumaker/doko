import { useState } from 'react';
import { FileText, MapPin, Truck, Calendar, Loader2, Search, Building2, X, Plus, UploadCloud, FolderOpen } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Document } from '../lib/supabase';
import { AppLayout } from '../components/AppLayout';

interface HistorialProps {
  onBack: () => void;
  onViewDocument: (document: Document) => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

export function Historial({ onBack, onViewDocument, onLogout, onNavigate }: HistorialProps) {
  const { documents: allDocuments, loadingDocuments } = useData();
  const { canCreateDocument, isSubscriptionExpired, isFreePlan } = useSubscription();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const documents = isFreePlan
    ? allDocuments.filter((doc) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 15);
        return new Date(doc.created_at) >= cutoff;
      })
    : allDocuments;

  const filteredDocs = documents.filter((doc) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const shipper = (doc.content.contractual_shipper?.nombre || doc.content.company?.name || '').toLowerCase();
      const origin = (doc.content.origin?.poblacion || doc.content.origin?.city || doc.content.origin?.empresa || '').toLowerCase();
      const dest = (doc.content.destination?.poblacion || doc.content.destination?.city || doc.content.destination?.empresa || '').toLowerCase();
      const driver = (doc.content.driver?.name || doc.driver_name || '').toLowerCase();
      const plate = (doc.content.vehicle?.tractor_plate || '').toLowerCase();
      if (!shipper.includes(q) && !origin.includes(q) && !dest.includes(q) && !driver.includes(q) && !plate.includes(q)) {
        return false;
      }
    }
    if (dateFrom) {
      const fromDate = startOfDay(parseISO(dateFrom));
      if (isBefore(new Date(doc.created_at), fromDate)) return false;
    }
    if (dateTo) {
      const toDate = endOfDay(parseISO(dateTo));
      if (isAfter(new Date(doc.created_at), toDate)) return false;
    }
    return true;
  });

  const showCreateButton = canCreateDocument() && !isSubscriptionExpired;

  const handleNavItem = (item: string) => {
    onNavigate(item);
  };

  const renderDocCard = (doc: Document) => (
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

        <div className="space-y-2">
          {(doc.content.contractual_shipper?.nombre || doc.content.company?.name) && (
            <div className="flex items-start gap-2.5">
              <div className="bg-amber-50 p-1 rounded-lg mt-0.5">
                <Building2 size={14} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cargador</p>
                <p className="text-sm font-semibold text-slate-900">
                  {doc.content.contractual_shipper?.nombre || doc.content.company?.name}
                </p>
              </div>
            </div>
          )}
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
    </div>
  );

  return (
    <AppLayout
      activeNav="documentos"
      onNavigate={handleNavItem}
      onLogout={onLogout}
    >
      <div className="w-full space-y-5">
        {isFreePlan && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
            En el plan gratuito el historial solo muestra los documentos de los ultimos 15 dias. Actualiza tu plan para acceder a todo el historial.
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 lg:p-5">
          {/* Desktop layout */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_auto_auto_auto] lg:gap-4 lg:items-end">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por matricula, conductor, cliente, origen o destino..."
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44 py-3 px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44 py-3 px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
            </div>

            {showCreateButton && (
              <button
                onClick={() => onNavigate('crear')}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm shadow-emerald-500/20 whitespace-nowrap"
              >
                <Plus size={18} strokeWidth={2.5} />
                Crear documento
              </button>
            )}
          </div>

          {/* Mobile layout */}
          <div className="lg:hidden flex flex-col gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por matricula, conductor, cliente, origen o destino..."
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            {showCreateButton && (
              <button
                onClick={() => onNavigate('crear')}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
              >
                <Plus size={18} strokeWidth={2.5} />
                Crear documento
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        {loadingDocuments ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={36} className="animate-spin text-blue-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 py-16 lg:py-24 px-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-24 bg-blue-50 rounded-2xl flex items-end justify-center pb-3">
                  <FolderOpen size={48} className="text-blue-200" strokeWidth={1.5} />
                </div>
              </div>
              <div className="absolute top-2 right-2 w-14 h-16 bg-white border border-blue-100 rounded-lg flex items-center justify-center shadow-sm rotate-3">
                <FileText size={22} className="text-blue-300" strokeWidth={1.5} />
              </div>
              <div className="absolute top-4 left-3 w-12 h-14 bg-white border border-blue-100 rounded-lg flex items-center justify-center shadow-sm -rotate-6">
                <FileText size={18} className="text-blue-200" strokeWidth={1.5} />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Todavia no has creado ningun documento de control
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
              Cuando generes tus primeros documentos, apareceran aqui ordenados y listos para consultar.
            </p>

            {showCreateButton && (
              <button
                onClick={() => onNavigate('crear')}
                className="inline-flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus size={20} strokeWidth={2.5} />
                Crear documento
              </button>
            )}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 py-16 lg:py-20 text-center px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-600">Sin resultados</p>
            <p className="text-sm text-slate-400 mt-1">Ningun documento coincide con tu busqueda</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Fecha</span>
                <span>Cargador</span>
                <span>Origen</span>
                <span>Destino</span>
                <span>Conductor</span>
                <span>Matricula</span>
              </div>
              {filteredDocs.map((doc) => {
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

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {filteredDocs.map((doc) => renderDocCard(doc))}
            </div>
          </>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Documento de control</h4>
              <p className="text-sm text-slate-500 mt-0.5">Crea documentos en menos de 1 minuto.</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <UploadCloud size={22} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Archivo automatico</h4>
              <p className="text-sm text-slate-500 mt-0.5">Cada documento queda guardado por viaje, vehiculo y cliente.</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Search size={22} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Busqueda rapida</h4>
              <p className="text-sm text-slate-500 mt-0.5">Encuentra cualquier documento en segundos.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Truck,
  Package,
  Calendar,
  Check,
  Loader2,
  Clock,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Document, DocumentContent, ShipperHistory, Location } from '../lib/supabase';
import { MonthCalendar } from '../components/MonthCalendar';
import { DocumentLimitModal } from '../components/DocumentLimitModal';

interface CrearDocumentoProps {
  onBack: () => void;
  onComplete: (document: Document) => void;
  onNavigatePlanes?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface ShipperForm {
  nombre: string;
  nif: string;
  domicilio: string;
  poblacion: string;
}

interface OriginForm {
  empresa: string;
  domicilio: string;
  poblacion: string;
}

interface DestinationForm {
  empresa: string;
  domicilio: string;
  poblacion: string;
}

interface VehicleForm {
  tractor_plate: string;
  trailer_plate_1: string;
  trailer_plate_2: string;
}

interface CargoForm {
  description: string;
  weight_kg: number;
}

const inputClass =
  'w-full p-3.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-slate-900 placeholder:text-slate-400 transition-all';

function DateDropdown({ selected, onChange, label }: { selected: Date; onChange: (d: Date) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-slate-900 bg-white active:bg-slate-50 transition-all"
      >
        <span className="flex items-center gap-3">
          <Calendar size={20} className="text-blue-700 flex-shrink-0" />
          <span className="font-medium">{format(selected, "d 'de' MMMM, yyyy", { locale: es })}</span>
        </span>
        <ChevronDown size={20} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-3">
            <MonthCalendar selected={selected} onChange={(d) => { onChange(d); setOpen(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LocationAutocomplete({
  value,
  onChange,
  locations,
  placeholder,
}: {
  value: string;
  onChange: (val: string, loc?: Location) => void;
  locations: Location[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (v.trim().length >= 1) {
      const q = v.toLowerCase();
      const matches = locations.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q)
      );
      setSuggestions(matches.slice(0, 5));
      setOpen(matches.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (value.trim().length >= 1) setOpen(suggestions.length > 0); }}
        className={inputClass}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(loc.name, loc); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-3 transition-colors"
            >
              <div className="bg-blue-50 p-1.5 rounded-lg flex-shrink-0">
                <MapPin size={16} className="text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 text-sm truncate">{loc.name}</p>
                <p className="text-xs text-slate-500 truncate">{loc.address}, {loc.city}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CrearDocumento({ onBack, onComplete, onNavigatePlanes }: CrearDocumentoProps) {
  const { addDocument, shipperHistory, locations } = useData();
  const { isAdmin } = useAuth();
  const { canCreateDocument, purchaseDocumentPack } = useSubscription();

  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [shipper, setShipper] = useState<ShipperForm>({ nombre: '', nif: '', domicilio: '', poblacion: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ShipperHistory[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [originSameAsShipper, setOriginSameAsShipper] = useState(false);
  const [origin, setOrigin] = useState<OriginForm>({ empresa: '', domicilio: '', poblacion: '' });

  const [destination, setDestination] = useState<DestinationForm>({ empresa: '', domicilio: '', poblacion: '' });
  const [vehicle, setVehicle] = useState<VehicleForm>({ tractor_plate: '', trailer_plate_1: '', trailer_plate_2: '' });
  const [cargo, setCargo] = useState<CargoForm>({ description: '', weight_kg: 0 });
  const [departureDate, setDepartureDate] = useState(new Date());
  const [hasUnloadingDate, setHasUnloadingDate] = useState(false);
  const [unloadingDate, setUnloadingDate] = useState(new Date());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShipperNombreChange = (value: string) => {
    setShipper((s) => ({ ...s, nombre: value }));
    if (value.trim().length >= 1) {
      const q = value.toLowerCase();
      const historyMatches = shipperHistory.filter(
        (h) =>
          h.nombre.toLowerCase().includes(q) ||
          h.nif.toLowerCase().includes(q) ||
          h.poblacion.toLowerCase().includes(q)
      );
      const locationMatches = locations
        .filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q) ||
            l.address.toLowerCase().includes(q)
        )
        .filter((l) => !historyMatches.some((h) => h.nombre.toLowerCase() === l.name.toLowerCase()))
        .map((l) => ({
          id: `loc-${l.id}`,
          nombre: l.name,
          nif: l.nif || '',
          domicilio: l.address,
          poblacion: l.city,
          company_id: '',
          created_at: '',
        } as ShipperHistory));
      const combined = [...historyMatches, ...locationMatches].slice(0, 6);
      setSuggestions(combined);
      setShowSuggestions(combined.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const applyShipperSuggestion = (h: ShipperHistory) => {
    setShipper({ nombre: h.nombre, nif: h.nif, domicilio: h.domicilio, poblacion: h.poblacion });
    setShowSuggestions(false);
  };

  const applyOriginLocation = (locName: string, loc?: Location) => {
    if (loc) {
      setOrigin({
        empresa: loc.name,
        domicilio: loc.address,
        poblacion: loc.city,
      });
    } else {
      setOrigin((o) => ({ ...o, empresa: locName }));
    }
  };

  const applyDestinationLocation = (locName: string, loc?: Location) => {
    if (loc) {
      setDestination({
        empresa: loc.name,
        domicilio: loc.address,
        poblacion: loc.city,
      });
    } else {
      setDestination((d) => ({ ...d, empresa: locName }));
    }
  };

  const effectiveOrigin: OriginForm = originSameAsShipper
    ? { empresa: shipper.nombre, domicilio: shipper.domicilio, poblacion: shipper.poblacion }
    : origin;

  const canProceed = () => {
    switch (step) {
      case 1:
        return (
          shipper.nombre.trim() !== '' &&
          shipper.nif.trim() !== '' &&
          shipper.domicilio.trim() !== '' &&
          shipper.poblacion.trim() !== '' &&
          effectiveOrigin.domicilio.trim() !== '' &&
          effectiveOrigin.poblacion.trim() !== ''
        );
      case 2:
        return destination.domicilio.trim() !== '' && destination.poblacion.trim() !== '';
      case 3:
        return vehicle.tractor_plate.trim() !== '';
      case 4:
        return cargo.description.trim() !== '' && cargo.weight_kg > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => { if (step < 5) setStep((step + 1) as Step); };
  const handleBack = () => { if (step > 1) setStep((step - 1) as Step); else onBack(); };

  const handleGenerate = async () => {
    if (!canCreateDocument()) {
      setShowLimitModal(true);
      return;
    }
    setGenerating(true);
    const content: DocumentContent = {
      contractual_shipper: {
        nombre: shipper.nombre,
        nif: shipper.nif,
        domicilio: shipper.domicilio,
        poblacion: shipper.poblacion,
      },
      origin: {
        empresa: effectiveOrigin.empresa || undefined,
        domicilio: effectiveOrigin.domicilio,
        poblacion: effectiveOrigin.poblacion,
      },
      destination: {
        empresa: destination.empresa || undefined,
        domicilio: destination.domicilio,
        poblacion: destination.poblacion,
      },
      vehicle: {
        tractor_plate: vehicle.tractor_plate,
        trailer_plate_1: vehicle.trailer_plate_1 || undefined,
        trailer_plate_2: vehicle.trailer_plate_2 || undefined,
      },
      cargo: {
        description: cargo.description,
        weight_kg: cargo.weight_kg,
      },
      unloading_date: hasUnloadingDate ? unloadingDate.toISOString() : undefined,
      company: { name: '', cif: '', address: '', city: '', province: '', postal_code: '', phone: '' },
    };
    const newDoc = await addDocument(content, departureDate);
    setGenerating(false);
    if (newDoc) onComplete(newDoc);
  };

  const stepTitles = ['Cargador y Origen', 'Destino', 'Vehiculo', 'Carga y Fechas', 'Confirmar'];

  const renderProgressBar = () => {
    const progress = (step / 5) * 100;
    return (
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:mb-6">
        <div className="md:max-w-4xl md:mx-auto md:px-4">
          <div className="md:bg-white md:rounded-2xl md:border md:border-slate-200/80 md:shadow-sm md:px-6 md:py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Progreso de Creacion</span>
              <span className="text-sm font-medium text-slate-600">Paso {step} de 5</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-700 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">CARGADOR CONTRACTUAL</h2>
          <p className="text-sm text-slate-500">Ingresa los datos del cargador contractual</p>
        </div>

        <div className="space-y-4">
          <div className="relative" ref={suggestionsRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de empresa</label>
            <input
              type="text"
              value={shipper.nombre}
              onChange={(e) => handleShipperNombreChange(e.target.value)}
              onFocus={() => { if (shipper.nombre.trim().length >= 1) setShowSuggestions(suggestions.length > 0); }}
              className={inputClass}
              placeholder="Buscar o escribir nombre"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyShipperSuggestion(h); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-3 transition-colors"
                  >
                    <div className="bg-blue-50 p-1.5 rounded-lg flex-shrink-0">
                      <Building2 size={16} className="text-blue-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">{h.nombre}</p>
                      <p className="text-xs text-slate-500 truncate">{h.nif} · {h.poblacion}</p>
                    </div>
                    <ChevronDown size={16} className="text-slate-400 flex-shrink-0 -rotate-90" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">NIF</label>
            <input
              type="text"
              value={shipper.nif}
              onChange={(e) => setShipper({ ...shipper, nif: e.target.value })}
              className={inputClass}
              placeholder="NIF de la empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Domicilio</label>
            <input
              type="text"
              value={shipper.domicilio}
              onChange={(e) => setShipper({ ...shipper, domicilio: e.target.value })}
              className={inputClass}
              placeholder="Direccion completa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Poblacion</label>
            <input
              type="text"
              value={shipper.poblacion}
              onChange={(e) => setShipper({ ...shipper, poblacion: e.target.value })}
              className={inputClass}
              placeholder="Ciudad o poblacion"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">ORIGEN</h2>
          <p className="text-sm text-slate-500">Lugar donde se realiza la carga</p>
        </div>

        <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${originSameAsShipper ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
            onClick={() => setOriginSameAsShipper(!originSameAsShipper)}
          >
            {originSameAsShipper && <Check size={16} className="text-white" />}
          </div>
          <span className="text-sm text-slate-700 font-medium" onClick={() => setOriginSameAsShipper(!originSameAsShipper)}>
            El Origen es igual que el Cargador contractual
          </span>
        </label>

        {originSameAsShipper ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">Empresa:</span> {shipper.nombre || '—'}</p>
            <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">Domicilio:</span> {shipper.domicilio || '—'}</p>
            <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">Poblacion:</span> {shipper.poblacion || '—'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de empresa</label>
              <LocationAutocomplete
                value={origin.empresa}
                onChange={applyOriginLocation}
                locations={locations}
                placeholder="Buscar en Mis Lugares..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Domicilio</label>
              <input
                type="text"
                value={origin.domicilio}
                onChange={(e) => setOrigin({ ...origin, domicilio: e.target.value })}
                className={inputClass}
                placeholder="Direccion completa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Poblacion</label>
              <input
                type="text"
                value={origin.poblacion}
                onChange={(e) => setOrigin({ ...origin, poblacion: e.target.value })}
                className={inputClass}
                placeholder="Ciudad o poblacion"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-4 md:p-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">DESTINO</h2>
          <p className="text-sm text-slate-500">Lugar donde se realiza la entrega</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de empresa</label>
            <LocationAutocomplete
              value={destination.empresa}
              onChange={applyDestinationLocation}
              locations={locations}
              placeholder="Buscar en Mis Lugares..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Domicilio</label>
            <input
              type="text"
              value={destination.domicilio}
              onChange={(e) => setDestination({ ...destination, domicilio: e.target.value })}
              className={inputClass}
              placeholder="Direccion completa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Poblacion</label>
            <input
              type="text"
              value={destination.poblacion}
              onChange={(e) => setDestination({ ...destination, poblacion: e.target.value })}
              className={inputClass}
              placeholder="Ciudad o poblacion"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="p-4 md:p-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">VEHICULO</h2>
          <p className="text-sm text-slate-500">Matriculas del vehiculo de transporte</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Matricula de la Cabeza Tractora *</label>
            <input
              type="text"
              value={vehicle.tractor_plate}
              onChange={(e) => setVehicle({ ...vehicle, tractor_plate: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="Ej: 1234 ABC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Matricula del Remolque 1</label>
            <input
              type="text"
              value={vehicle.trailer_plate_1}
              onChange={(e) => setVehicle({ ...vehicle, trailer_plate_1: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Matricula del Remolque 2</label>
            <input
              type="text"
              value={vehicle.trailer_plate_2}
              onChange={(e) => setVehicle({ ...vehicle, trailer_plate_2: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">DATOS DE LA CARGA</h2>
          <p className="text-sm text-slate-500">Descripcion y peso de la mercancia</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripcion de la mercancia *</label>
            <input
              type="text"
              value={cargo.description}
              onChange={(e) => setCargo({ ...cargo, description: e.target.value })}
              className={inputClass}
              placeholder="Ej: Piezas de automovil, alimentacion..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Peso total (kg) *</label>
            <input
              type="number"
              value={cargo.weight_kg || ''}
              onChange={(e) => setCargo({ ...cargo, weight_kg: parseInt(e.target.value) || 0 })}
              className={inputClass}
              placeholder="Peso en kilogramos"
              min="1"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">FECHA DE SALIDA</h2>
          <p className="text-sm text-slate-500">Fecha de inicio del transporte</p>
        </div>

        <DateDropdown selected={departureDate} onChange={setDepartureDate} label="Fecha de salida" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">FECHA DE DESCARGA</h2>
          <p className="text-sm text-slate-500">Fecha estimada de entrega (opcional)</p>
        </div>

        <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${hasUnloadingDate ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}
            onClick={() => setHasUnloadingDate(!hasUnloadingDate)}
          >
            {hasUnloadingDate && <Check size={16} className="text-white" />}
          </div>
          <span className="text-sm text-slate-700 font-medium" onClick={() => setHasUnloadingDate(!hasUnloadingDate)}>
            Incluir fecha de descarga
          </span>
        </label>

        {hasUnloadingDate && (
          <DateDropdown selected={unloadingDate} onChange={setUnloadingDate} label="Fecha de descarga" />
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="p-4 md:p-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">RESUMEN DEL DOCUMENTO</h2>
          <p className="text-sm text-slate-500">Revisa toda la informacion antes de continuar</p>
        </div>

        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Building2 size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cargador Contractual</span>
            </div>
            <p className="text-lg font-bold text-slate-900">{shipper.nombre}</p>
            <p className="text-sm text-slate-600">NIF: {shipper.nif}</p>
            <p className="text-sm text-slate-600">{shipper.domicilio}, {shipper.poblacion}</p>
          </div>

          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <MapPin size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Origen</span>
            </div>
            {effectiveOrigin.empresa && <p className="text-lg font-bold text-slate-900">{effectiveOrigin.empresa}</p>}
            <p className="text-sm text-slate-700">{effectiveOrigin.domicilio}</p>
            <p className="text-sm text-slate-600">{effectiveOrigin.poblacion}</p>
          </div>

          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <MapPin size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Destino</span>
            </div>
            {destination.empresa && <p className="text-lg font-bold text-slate-900">{destination.empresa}</p>}
            <p className="text-sm text-slate-700">{destination.domicilio}</p>
            <p className="text-sm text-slate-600">{destination.poblacion}</p>
          </div>

          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Truck size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vehiculo</span>
            </div>
            <p className="text-sm text-slate-900"><span className="font-semibold">Tractora:</span> <span className="font-mono">{vehicle.tractor_plate}</span></p>
            {vehicle.trailer_plate_1 && <p className="text-sm text-slate-900"><span className="font-semibold">Remolque 1:</span> <span className="font-mono">{vehicle.trailer_plate_1}</span></p>}
            {vehicle.trailer_plate_2 && <p className="text-sm text-slate-900"><span className="font-semibold">Remolque 2:</span> <span className="font-mono">{vehicle.trailer_plate_2}</span></p>}
          </div>

          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Package size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Carga</span>
            </div>
            <p className="text-lg font-bold text-slate-900">{cargo.description}</p>
            <p className="text-sm text-slate-600">{cargo.weight_kg.toLocaleString()} kg</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Calendar size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fechas</span>
            </div>
            <p className="text-sm text-slate-700">Salida: <span className="font-semibold">{format(departureDate, "d/MM/yyyy", { locale: es })}</span></p>
            {hasUnloadingDate && <p className="text-sm text-slate-700">Descarga: <span className="font-semibold">{format(unloadingDate, "d/MM/yyyy", { locale: es })}</span></p>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-4 flex items-center gap-4 md:hidden">
        <button onClick={handleBack} className="p-1 text-slate-700 hover:text-slate-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 text-center pr-10">Crear Documento</h1>
      </header>

      {/* Desktop Header - Centered */}
      <div className="hidden md:block">
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors">
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Volver</span>
            </button>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Crear Documento</h1>
            <p className="text-slate-500">Paso {step}: {stepTitles[step - 1]}</p>
          </div>
        </div>
      </div>

      {renderProgressBar()}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-32 md:pb-8">
        <div className="md:max-w-4xl md:mx-auto">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200/80 md:hidden">
        {step < 5 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
          >
            SIGUIENTE
            <ArrowRight size={24} />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={generating}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:bg-emerald-400 shadow-sm"
          >
            {generating ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Check size={24} />
                CREAR DOCUMENTO
              </>
            )}
          </button>
        )}
      </div>

      {/* Desktop Bottom Navigation */}
      <div className="hidden md:block">
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3 text-slate-700 hover:text-slate-900 font-medium transition-colors"
                >
                  <ArrowLeft size={20} />
                  ATRAS
                </button>
              )}

              <div className="flex-1" />

              {step < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  SIGUIENTE
                  <ArrowRight size={20} />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={generating}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:bg-emerald-400 shadow-sm"
                >
                  {generating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      CREAR DOCUMENTO
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-800 px-6 py-4 flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl">
                <FileText size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmar documento</h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Revisa el resumen antes de generar el documento oficial.</p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 text-sm">
                <div className="px-4 py-3 flex gap-3">
                  <Building2 size={16} className="text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Cargador</p>
                    <p className="font-semibold text-slate-900">{shipper.nombre}</p>
                    <p className="text-slate-600">{shipper.poblacion}</p>
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  <MapPin size={16} className="text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Origen</p>
                    <p className="font-semibold text-slate-900">{effectiveOrigin.empresa || effectiveOrigin.domicilio}</p>
                    <p className="text-slate-600">{effectiveOrigin.poblacion}</p>
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  <MapPin size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Destino</p>
                    <p className="font-semibold text-slate-900">{destination.empresa || destination.domicilio}</p>
                    <p className="text-slate-600">{destination.poblacion}</p>
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  <Truck size={16} className="text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Vehiculo</p>
                    <p className="font-semibold text-slate-900 font-mono">{vehicle.tractor_plate}</p>
                    {vehicle.trailer_plate_1 && <p className="text-slate-600 font-mono">R1: {vehicle.trailer_plate_1}</p>}
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  <Package size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Carga</p>
                    <p className="font-semibold text-slate-900">{cargo.description}</p>
                    <p className="text-slate-600">{cargo.weight_kg.toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  <Calendar size={16} className="text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Salida</p>
                    <p className="font-semibold text-slate-900">{format(departureDate, "d/MM/yyyy", { locale: es })}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleGenerate();
                  }}
                  disabled={generating}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:bg-emerald-400"
                >
                  {generating ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Generar
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all"
                >
                  Revisar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <DocumentLimitModal
          isAdmin={isAdmin}
          onClose={() => setShowLimitModal(false)}
          onBuyPack={() => { setShowLimitModal(false); purchaseDocumentPack(); }}
          onUpgradePlan={() => { setShowLimitModal(false); onNavigatePlanes?.(); }}
        />
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronDown,
  FileText,
  User,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase, Document, DocumentContent, DocumentFieldChange, PartyHistory, PartyType, Profile, VehicleHistory } from '../lib/supabase';
import { MonthCalendar } from '../components/MonthCalendar';
import { DocumentLimitModal } from '../components/DocumentLimitModal';

interface CrearDocumentoProps {
  onBack: () => void;
  onComplete: (document: Document) => void;
  onNavigatePlanes?: () => void;
  editingDocument?: Document;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type ActingAs = 'transportista' | 'cargador';

interface PartyForm {
  nombre: string;
  domicilio: string;
  postal_code: string;
  poblacion: string;
  nif: string;
}

interface VehicleForm {
  tractor_plate: string;
  trailer_plate_1: string;
  trailer_plate_2: string;
  special_authorization: string;
}

interface CargoForm {
  description: string;
  weight_kg: number;
  weight_unit: string;
}

const WEIGHT_UNITS = [
  { value: 'kilogramos', label: 'kilogramos', short: 'kg' },
  { value: 'toneladas', label: 'toneladas', short: 'tn' },
  { value: 'metros cubicos', label: 'metros cubicos', short: 'm3' },
  { value: 'litros', label: 'litros', short: 'L' },
  { value: 'unidades', label: 'unidades', short: 'u' },
];

const emptyParty: PartyForm = { nombre: '', domicilio: '', postal_code: '', poblacion: '', nif: '' };

const inputClass =
  'w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none text-slate-900 placeholder:text-slate-400 transition-all bg-white';

const sectionTitle = 'text-2xl font-extrabold text-slate-900 tracking-tight';
const sectionSubtitle = 'text-sm text-slate-500 mt-1';
const fieldLabel = 'flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 mb-1.5';

function FieldLabel({ text, required }: { text: string; required: boolean }) {
  return (
    <label className={fieldLabel}>
      <span>{text}</span>
      {required ? (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Obligatorio
        </span>
      ) : (
        <span className="text-xs font-medium text-slate-400 normal-case">(opcional, puedes dejarlo en blanco)</span>
      )}
    </label>
  );
}

function RequiredFieldsLegend() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
      <AlertCircle size={20} className="text-blue-700 shrink-0 mt-0.5" />
      <p className="text-sm text-blue-900 leading-relaxed">
        Los campos con la etiqueta roja <span className="font-extrabold">OBLIGATORIO</span> son imprescindibles para poder crear el documento.
        Los que dicen <span className="font-semibold">(opcional)</span> puedes dejarlos en blanco sin problema.
      </p>
    </div>
  );
}

function RecentChips<T>({
  items,
  renderLabel,
  onSelect,
}: {
  items: T[];
  renderLabel: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
        <Clock size={13} />
        Usado en un documento anterior · toca para rellenar (opcional)
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(item)}
            className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-semibold text-slate-700 transition-colors"
          >
            {renderLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBadge({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <span className="inline-block bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded-full">
      Paso {step} de {totalSteps}
    </span>
  );
}

function ProgressBars({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className={`grid gap-2 mt-4 mb-6`} style={{ gridTemplateColumns: `repeat(${totalSteps}, 1fr)` }}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-blue-700' : 'bg-slate-200'}`}
        />
      ))}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        {checked && <Check size={16} className="text-white" strokeWidth={3} />}
      </button>
      <span className="text-sm text-slate-700 font-medium" onClick={() => onChange(!checked)}>
        {label}
      </span>
    </label>
  );
}

function DateDropdown({ selected, onChange }: { selected: Date; onChange: (d: Date) => void }) {
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
        className="w-full flex items-center justify-between px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none text-slate-900 bg-white hover:bg-slate-50 transition-all"
      >
        <span className="flex items-center gap-3">
          <Calendar size={18} className="text-blue-700 shrink-0" />
          <span className="font-bold text-sm">{format(selected, "d 'de' MMMM, yyyy", { locale: es })}</span>
        </span>
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
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

function PartyFields({
  data,
  onChange,
  showNombre = true,
  nombreLabel = 'Nombre de empresa',
  nombreRequired = true,
  nifRequired = true,
}: {
  data: PartyForm;
  onChange: (next: PartyForm) => void;
  showNombre?: boolean;
  nombreLabel?: string;
  nombreRequired?: boolean;
  nifRequired?: boolean;
}) {
  return (
    <div className="space-y-5">
      {showNombre && (
        <div>
          <FieldLabel text={nombreLabel} required={nombreRequired} />
          <input
            type="text"
            value={data.nombre}
            onChange={(e) => onChange({ ...data, nombre: e.target.value })}
            className={inputClass}
            placeholder="Ingrese el nombre de la empresa"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <FieldLabel text="Domicilio" required />
          <input
            type="text"
            value={data.domicilio}
            onChange={(e) => onChange({ ...data, domicilio: e.target.value })}
            className={inputClass}
            placeholder="Ingrese el domicilio"
          />
        </div>
        <div>
          <FieldLabel text="Codigo Postal" required />
          <input
            type="text"
            value={data.postal_code}
            onChange={(e) => onChange({ ...data, postal_code: e.target.value })}
            className={inputClass}
            placeholder="Ingresa el codigo postal"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <FieldLabel text="Poblacion" required />
          <input
            type="text"
            value={data.poblacion}
            onChange={(e) => onChange({ ...data, poblacion: e.target.value })}
            className={inputClass}
            placeholder="Ingrese la poblacion"
          />
        </div>
        <div>
          <FieldLabel text="NIF" required={nifRequired} />
          <input
            type="text"
            value={data.nif}
            onChange={(e) => onChange({ ...data, nif: e.target.value })}
            className={inputClass}
            placeholder="Ingresa el NIF"
          />
        </div>
      </div>
    </div>
  );
}

export function CrearDocumento({ onBack, onComplete, onNavigatePlanes, editingDocument }: CrearDocumentoProps) {
  const { addDocument, amendDocument, partyHistory, vehicleHistory } = useData();
  const { isAdmin, profile, company, isCargador } = useAuth();
  const { canCreateDocument, purchaseDocumentPack } = useSubscription();

  const isEditMode = !!editingDocument;
  const totalSteps: number = isEditMode ? 6 : 5;

  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [actingAs, setActingAs] = useState<ActingAs>(isCargador ? 'cargador' : 'transportista');

  const [counterparty, setCounterparty] = useState<PartyForm>(emptyParty);
  const [originSameAsShipper, setOriginSameAsShipper] = useState(false);
  const [destinationSameAsShipper, setDestinationSameAsShipper] = useState(false);
  const [origin, setOrigin] = useState<PartyForm>(emptyParty);
  const [destination, setDestination] = useState<PartyForm>(emptyParty);
  const [vehicle, setVehicle] = useState<VehicleForm>({ tractor_plate: '', trailer_plate_1: '', trailer_plate_2: '', special_authorization: '' });
  const [cargo, setCargo] = useState<CargoForm>({ description: '', weight_kg: 0, weight_unit: 'kilogramos' });
  const [departureDate, setDepartureDate] = useState(new Date());
  const [hasUnloadingDate, setHasUnloadingDate] = useState(false);
  const [unloadingDate, setUnloadingDate] = useState(new Date());
  const [observations, setObservations] = useState('');
  const [modifyReason, setModifyReason] = useState('');

  const [companyDrivers, setCompanyDrivers] = useState<Profile[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  // Pre-fill form from editing document
  useEffect(() => {
    if (!editingDocument) return;
    const c = editingDocument.content;

    setActingAs(c.acting_as || (isCargador ? 'cargador' : 'transportista'));

    // Determine counterparty
    const acting = c.acting_as || (isCargador ? 'cargador' : 'transportista');
    if (acting === 'transportista' && c.contractual_shipper) {
      setCounterparty({
        nombre: c.contractual_shipper.nombre || '',
        domicilio: c.contractual_shipper.domicilio || '',
        postal_code: c.contractual_shipper.postal_code || '',
        poblacion: c.contractual_shipper.poblacion || '',
        nif: c.contractual_shipper.nif || '',
      });
    } else if (acting === 'cargador' && c.transportista_efectivo) {
      setCounterparty({
        nombre: c.transportista_efectivo.nombre || '',
        domicilio: c.transportista_efectivo.domicilio || '',
        postal_code: c.transportista_efectivo.postal_code || '',
        poblacion: c.transportista_efectivo.poblacion || '',
        nif: c.transportista_efectivo.nif || '',
      });
    }

    // Origin
    setOrigin({
      nombre: c.origin.empresa || '',
      domicilio: c.origin.domicilio || c.origin.address || '',
      postal_code: c.origin.postal_code || '',
      poblacion: c.origin.poblacion || c.origin.city || '',
      nif: c.origin.nif || '',
    });

    // Destination
    setDestination({
      nombre: c.destination.empresa || '',
      domicilio: c.destination.domicilio || c.destination.address || '',
      postal_code: c.destination.postal_code || '',
      poblacion: c.destination.poblacion || c.destination.city || '',
      nif: c.destination.nif || '',
    });

    // Vehicle
    setVehicle({
      tractor_plate: c.vehicle.tractor_plate || '',
      trailer_plate_1: c.vehicle.trailer_plate_1 || c.vehicle.trailer_plate || '',
      trailer_plate_2: c.vehicle.trailer_plate_2 || '',
      special_authorization: c.vehicle.special_authorization || '',
    });

    // Cargo
    setCargo({
      description: c.cargo.description || '',
      weight_kg: c.cargo.weight_kg || 0,
      weight_unit: c.cargo.weight_unit || 'kilogramos',
    });

    // Dates
    if (editingDocument.departure_date) {
      const d = new Date(editingDocument.departure_date);
      if (!isNaN(d.getTime())) setDepartureDate(d);
    }
    if (c.unloading_date) {
      setHasUnloadingDate(true);
      const d = new Date(c.unloading_date);
      if (!isNaN(d.getTime())) setUnloadingDate(d);
    }

    // Observations
    setObservations(c.observations || '');
  }, [editingDocument, isCargador]);

  // Pre-select driver after companyDrivers are loaded
  useEffect(() => {
    if (!editingDocument || !companyDrivers.length) return;
    const driverName = editingDocument.content.driver?.name || editingDocument.driver_name;
    if (driverName) {
      const match = companyDrivers.find((d) => d.full_name === driverName);
      if (match) setSelectedDriverId(match.id);
    }
  }, [editingDocument, companyDrivers]);

  useEffect(() => {
    if (!isAdmin || !profile?.company_id) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('full_name')
      .then(({ data }) => {
        if (data) setCompanyDrivers(data);
      });
  }, [isAdmin, profile?.company_id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(e.target as Node))
        setDriverDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedDriver = companyDrivers.find((d) => d.id === selectedDriverId);
  const filteredDrivers = driverSearch.trim()
    ? companyDrivers.filter((d) =>
        d.full_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        (d.dni && d.dni.toLowerCase().includes(driverSearch.toLowerCase()))
      )
    : companyDrivers;

  const counterpartyLabel = actingAs === 'transportista' ? 'CARGADOR CONTRACTUAL' : 'TRANSPORTISTA EFECTIVO';
  const counterpartySubtitle = actingAs === 'transportista' ? 'Ingresa los datos del cargador contractual' : 'Ingresa los datos del transportista efectivo';

  const ownParty: PartyForm = useMemo(() => ({
    nombre: company?.name || '',
    domicilio: company?.address || '',
    postal_code: company?.postal_code || '',
    poblacion: company?.city || '',
    nif: company?.cif || '',
  }), [company]);

  const cargadorContractual: PartyForm = actingAs === 'cargador' ? ownParty : counterparty;
  const transportistaEfectivo: PartyForm = actingAs === 'transportista' ? ownParty : counterparty;

  const effectiveOrigin: PartyForm = originSameAsShipper ? cargadorContractual : origin;
  const effectiveDestination: PartyForm = destinationSameAsShipper ? cargadorContractual : destination;

  const validParty = (p: PartyForm) =>
    p.domicilio.trim() !== '' && p.postal_code.trim() !== '' && p.poblacion.trim() !== '';

  const counterpartyType: PartyType = actingAs === 'transportista' ? 'contractual_shipper' : 'transportista_efectivo';
  const partySuggestions = (type: PartyType, limit = 5): PartyHistory[] =>
    partyHistory.filter((p) => p.party_type === type).slice(0, limit);
  const partyHistoryToForm = (p: PartyHistory): PartyForm => ({
    nombre: p.nombre,
    domicilio: p.domicilio,
    postal_code: p.postal_code,
    poblacion: p.poblacion,
    nif: p.nif,
  });
  const partySuggestionLabel = (p: PartyHistory) => `${p.nombre || p.domicilio} — ${p.poblacion}`;

  const vehicleSuggestions: VehicleHistory[] = vehicleHistory.slice(0, 5);
  const vehicleSuggestionLabel = (v: VehicleHistory) =>
    v.trailer_plate_1 ? `${v.tractor_plate} + ${v.trailer_plate_1}` : v.tractor_plate;

  const canProceed = () => {
    switch (step) {
      case 1:
        return (
          counterparty.nombre.trim() !== '' &&
          counterparty.domicilio.trim() !== '' &&
          counterparty.postal_code.trim() !== '' &&
          counterparty.poblacion.trim() !== '' &&
          counterparty.nif.trim() !== ''
        );
      case 2:
        return validParty(effectiveOrigin) && validParty(effectiveDestination);
      case 3:
        return (
          vehicle.tractor_plate.trim() !== '' &&
          cargo.description.trim() !== '' &&
          cargo.weight_kg > 0 &&
          (!isAdmin || selectedDriverId !== '')
        );
      case 4:
        return true;
      case 5:
        return isEditMode ? modifyReason.trim() !== '' : true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const lastStep = isEditMode ? 6 : 5;
  const handleNext = () => { if (step < lastStep && canProceed()) setStep((step + 1) as Step); };
  const handleBack = () => { if (step > 1) setStep((step - 1) as Step); else onBack(); };

  const buildContent = (): DocumentContent => ({
    acting_as: actingAs,
    contractual_shipper: {
      nombre: cargadorContractual.nombre,
      nif: cargadorContractual.nif,
      domicilio: cargadorContractual.domicilio,
      poblacion: cargadorContractual.poblacion,
      postal_code: cargadorContractual.postal_code,
    },
    transportista_efectivo: {
      nombre: transportistaEfectivo.nombre,
      nif: transportistaEfectivo.nif,
      domicilio: transportistaEfectivo.domicilio,
      poblacion: transportistaEfectivo.poblacion,
      postal_code: transportistaEfectivo.postal_code,
    },
    origin: {
      empresa: effectiveOrigin.nombre || undefined,
      domicilio: effectiveOrigin.domicilio,
      poblacion: effectiveOrigin.poblacion,
      postal_code: effectiveOrigin.postal_code,
      nif: effectiveOrigin.nif || undefined,
    },
    destination: {
      empresa: effectiveDestination.nombre || undefined,
      domicilio: effectiveDestination.domicilio,
      poblacion: effectiveDestination.poblacion,
      postal_code: effectiveDestination.postal_code,
      nif: effectiveDestination.nif || undefined,
    },
    vehicle: {
      tractor_plate: vehicle.tractor_plate,
      trailer_plate_1: vehicle.trailer_plate_1 || undefined,
      trailer_plate_2: vehicle.trailer_plate_2 || undefined,
      special_authorization: vehicle.special_authorization || undefined,
    },
    cargo: {
      description: cargo.description,
      weight_kg: cargo.weight_kg,
      weight_unit: cargo.weight_unit,
    },
    observations: observations.trim() || undefined,
    unloading_date: hasUnloadingDate ? format(unloadingDate, 'yyyy-MM-dd') : undefined,
    company: { name: '', cif: '', address: '', city: '', province: '', postal_code: '', phone: '' },
  });

  const computeChanges = (): DocumentFieldChange[] => {
    if (!editingDocument) return [];
    const old = editingDocument.content;
    const changes: DocumentFieldChange[] = [];

    const cmpField = (label: string, field: string, oldVal: string, newVal: string) => {
      if ((oldVal || '') !== (newVal || '')) {
        changes.push({ field, label, old_value: oldVal || '', new_value: newVal || '' });
      }
    };

    // Counterparty
    const oldCounterparty = actingAs === 'transportista' ? old.contractual_shipper : old.transportista_efectivo;
    const counterpartyTitle = actingAs === 'transportista' ? 'Cargador' : 'Transportista efectivo';
    cmpField(`${counterpartyTitle} (nombre)`, 'counterparty.nombre', oldCounterparty?.nombre || '', counterparty.nombre);
    cmpField(`${counterpartyTitle} (NIF)`, 'counterparty.nif', oldCounterparty?.nif || '', counterparty.nif);
    cmpField(`${counterpartyTitle} (domicilio)`, 'counterparty.domicilio', oldCounterparty?.domicilio || '', counterparty.domicilio);
    cmpField(`${counterpartyTitle} (poblacion)`, 'counterparty.poblacion', oldCounterparty?.poblacion || '', counterparty.poblacion);
    cmpField(`${counterpartyTitle} (C.P.)`, 'counterparty.postal_code', oldCounterparty?.postal_code || '', counterparty.postal_code);

    // Origin
    const oldOrigin = old.origin;
    cmpField('Origen (empresa)', 'origin.empresa', oldOrigin.empresa || '', effectiveOrigin.nombre);
    cmpField('Origen (domicilio)', 'origin.domicilio', oldOrigin.domicilio || oldOrigin.address || '', effectiveOrigin.domicilio);
    cmpField('Origen (poblacion)', 'origin.poblacion', oldOrigin.poblacion || oldOrigin.city || '', effectiveOrigin.poblacion);
    cmpField('Origen (C.P.)', 'origin.postal_code', oldOrigin.postal_code || '', effectiveOrigin.postal_code);
    cmpField('Origen (NIF)', 'origin.nif', oldOrigin.nif || '', effectiveOrigin.nif);

    // Destination
    const oldDest = old.destination;
    cmpField('Destino (empresa)', 'destination.empresa', oldDest.empresa || '', effectiveDestination.nombre);
    cmpField('Destino (domicilio)', 'destination.domicilio', oldDest.domicilio || oldDest.address || '', effectiveDestination.domicilio);
    cmpField('Destino (poblacion)', 'destination.poblacion', oldDest.poblacion || oldDest.city || '', effectiveDestination.poblacion);
    cmpField('Destino (C.P.)', 'destination.postal_code', oldDest.postal_code || '', effectiveDestination.postal_code);
    cmpField('Destino (NIF)', 'destination.nif', oldDest.nif || '', effectiveDestination.nif);

    // Vehicle
    cmpField('Matricula tractora', 'vehicle.tractor_plate', old.vehicle.tractor_plate || '', vehicle.tractor_plate);
    cmpField('Remolque 1', 'vehicle.trailer_plate_1', old.vehicle.trailer_plate_1 || old.vehicle.trailer_plate || '', vehicle.trailer_plate_1);
    cmpField('Remolque 2', 'vehicle.trailer_plate_2', old.vehicle.trailer_plate_2 || '', vehicle.trailer_plate_2);
    cmpField('Autorizacion especial', 'vehicle.special_authorization', old.vehicle.special_authorization || '', vehicle.special_authorization);

    // Cargo
    cmpField('Mercancia', 'cargo.description', old.cargo.description || '', cargo.description);
    cmpField('Peso bruto', 'cargo.weight_kg', String(old.cargo.weight_kg || ''), String(cargo.weight_kg));
    cmpField('Unidad de peso', 'cargo.weight_unit', old.cargo.weight_unit || 'kilogramos', cargo.weight_unit);

    // Driver
    const oldDriverName = old.driver?.name || '';
    const oldDriverDni = old.driver?.dni || '';
    const newDriverName = isAdmin && selectedDriver ? selectedDriver.full_name : (old.driver?.name || '');
    const newDriverDni = isAdmin && selectedDriver ? (selectedDriver.dni || '') : (old.driver?.dni || '');
    cmpField('Conductor', 'driver.name', oldDriverName, newDriverName);
    cmpField('DNI conductor', 'driver.dni', oldDriverDni, newDriverDni);

    // Dates
    const oldDeparture = editingDocument.departure_date ? format(new Date(editingDocument.departure_date), 'yyyy-MM-dd') : '';
    const newDeparture = format(departureDate, 'yyyy-MM-dd');
    cmpField('Fecha de inicio', 'departure_date', oldDeparture, newDeparture);

    const oldUnloading = old.unloading_date ? old.unloading_date.substring(0, 10) : '';
    const newUnloading = hasUnloadingDate ? format(unloadingDate, 'yyyy-MM-dd') : '';
    cmpField('Fecha de descarga', 'unloading_date', oldUnloading, newUnloading);

    // Observations
    cmpField('Observaciones', 'observations', old.observations || '', observations.trim());

    return changes;
  };

  const handleGenerate = async () => {
    if (isEditMode) {
      setGenerating(true);
      const changes = computeChanges();
      if (changes.length === 0) {
        setGenerating(false);
        return;
      }
      const newContent = buildContent();
      const updatedDoc = await amendDocument(editingDocument!.id, modifyReason.trim(), changes, newContent);
      setGenerating(false);
      if (updatedDoc) onComplete(updatedDoc);
      return;
    }

    if (!canCreateDocument()) {
      setShowLimitModal(true);
      return;
    }
    setGenerating(true);

    const content = buildContent();
    const driverOverride = isAdmin && selectedDriver
      ? { name: selectedDriver.full_name, email: selectedDriver.email, dni: selectedDriver.dni || undefined }
      : undefined;
    const creatorId = isAdmin && selectedDriver ? selectedDriver.id : undefined;
    const newDoc = await addDocument(content, departureDate, driverOverride, creatorId);
    setGenerating(false);
    if (newDoc) onComplete(newDoc);
  };

  const renderRoleSelector = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className={sectionTitle}>Situacion profesional</h2>
      <p className={sectionSubtitle}>Selecciona una opcion para continuar</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <button
          type="button"
          onClick={() => setActingAs('transportista')}
          className={`relative text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
            actingAs === 'transportista'
              ? 'border-blue-600 bg-blue-50/40'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
            actingAs === 'transportista' ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <Truck size={24} className={actingAs === 'transportista' ? 'text-blue-700' : 'text-slate-500'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900">Transportista</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              Genero el documento como transportista
            </p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            actingAs === 'transportista' ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
          }`}>
            {actingAs === 'transportista' && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActingAs('cargador')}
          className={`relative text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
            actingAs === 'cargador'
              ? 'border-blue-600 bg-blue-50/40'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
            actingAs === 'cargador' ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <Building2 size={24} className={actingAs === 'cargador' ? 'text-blue-700' : 'text-slate-500'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900">Cargador</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              Genero el documento como cargador
            </p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            actingAs === 'cargador' ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
          }`}>
            {actingAs === 'cargador' && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      {!isEditMode && <RequiredFieldsLegend />}

      {renderRoleSelector()}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <StepBadge step={1} totalSteps={totalSteps} />
        <ProgressBars step={step} totalSteps={totalSteps} />

        <div className="mb-6">
          <h2 className={sectionTitle}>{counterpartyLabel}</h2>
          <p className={sectionSubtitle}>{counterpartySubtitle}</p>
        </div>

        {!isEditMode && (
          <RecentChips
            items={partySuggestions(counterpartyType)}
            renderLabel={partySuggestionLabel}
            onSelect={(p) => setCounterparty(partyHistoryToForm(p))}
          />
        )}

        <PartyFields data={counterparty} onChange={setCounterparty} />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <StepBadge step={2} totalSteps={totalSteps} />
      <ProgressBars step={step} totalSteps={totalSteps} />

      <div className="mb-4">
        <h2 className={sectionTitle}>ORIGEN</h2>
        <p className={sectionSubtitle}>Lugar donde se realiza la carga</p>
      </div>

      <div className="mb-5">
        <Checkbox
          checked={originSameAsShipper}
          onChange={setOriginSameAsShipper}
          label="El origen es igual que el cargador contractual"
        />
      </div>

      {!originSameAsShipper ? (
        <>
          {!isEditMode && (
            <RecentChips
              items={partySuggestions('origin')}
              renderLabel={partySuggestionLabel}
              onSelect={(p) => setOrigin(partyHistoryToForm(p))}
            />
          )}
          <PartyFields data={origin} onChange={setOrigin} nombreRequired={false} nifRequired={false} />
        </>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 text-sm text-slate-700">
          <p className="font-bold text-slate-900">{cargadorContractual.nombre || '\u2014'}</p>
          <p>{cargadorContractual.nif || '\u2014'}</p>
          <p>{cargadorContractual.domicilio || '\u2014'}</p>
          <p>{cargadorContractual.postal_code} {cargadorContractual.poblacion}</p>
        </div>
      )}

      <hr className="my-7 border-slate-200" />

      <div className="mb-4">
        <h2 className={sectionTitle}>DESTINO</h2>
        <p className={sectionSubtitle}>Lugar donde se realiza la descarga</p>
      </div>

      <div className="mb-5">
        <Checkbox
          checked={destinationSameAsShipper}
          onChange={setDestinationSameAsShipper}
          label="El destino es igual que el cargador contractual"
        />
      </div>

      {!destinationSameAsShipper ? (
        <>
          {!isEditMode && (
            <RecentChips
              items={partySuggestions('destination')}
              renderLabel={partySuggestionLabel}
              onSelect={(p) => setDestination(partyHistoryToForm(p))}
            />
          )}
          <PartyFields data={destination} onChange={setDestination} nombreRequired={false} nifRequired={false} />
        </>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 text-sm text-slate-700">
          <p className="font-bold text-slate-900">{cargadorContractual.nombre || '\u2014'}</p>
          <p>{cargadorContractual.nif || '\u2014'}</p>
          <p>{cargadorContractual.domicilio || '\u2014'}</p>
          <p>{cargadorContractual.postal_code} {cargadorContractual.poblacion}</p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <StepBadge step={3} totalSteps={totalSteps} />
      <ProgressBars step={step} totalSteps={totalSteps} />

      <div className="mb-5">
        <h2 className={sectionTitle}>VEHICULO</h2>
        <p className={sectionSubtitle}>Matriculas de los vehiculos de transporte</p>
      </div>

      <div className="space-y-5">
        {!isEditMode && (
          <RecentChips
            items={vehicleSuggestions}
            renderLabel={vehicleSuggestionLabel}
            onSelect={(v) =>
              setVehicle({
                ...vehicle,
                tractor_plate: v.tractor_plate,
                trailer_plate_1: v.trailer_plate_1,
                trailer_plate_2: v.trailer_plate_2,
              })
            }
          />
        )}

        <div>
          <FieldLabel text="Matricula de la cabeza tractora" required />
          <input
            type="text"
            value={vehicle.tractor_plate}
            onChange={(e) => setVehicle({ ...vehicle, tractor_plate: e.target.value.toUpperCase() })}
            className={inputClass}
            placeholder="Ej: 1234ABC"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel text="Matricula del remolque" required={false} />
            <input
              type="text"
              value={vehicle.trailer_plate_1}
              onChange={(e) => setVehicle({ ...vehicle, trailer_plate_1: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>
          <div>
            <FieldLabel text="Matricula del remolque 2" required={false} />
            <input
              type="text"
              value={vehicle.trailer_plate_2}
              onChange={(e) => setVehicle({ ...vehicle, trailer_plate_2: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="relative" ref={driverDropdownRef}>
            <FieldLabel text="Conductor" required />
            <button
              type="button"
              onClick={() => { setDriverDropdownOpen(!driverDropdownOpen); setDriverSearch(''); }}
              className="w-full flex items-center justify-between px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none text-slate-900 bg-white hover:bg-slate-50 transition-all"
            >
              <span className="flex items-center gap-3 min-w-0">
                <User size={18} className="text-blue-700 shrink-0" />
                {selectedDriver ? (
                  <span className="font-bold truncate text-sm">
                    {selectedDriver.full_name}
                    {selectedDriver.dni && <span className="text-slate-400 ml-2 font-normal">({selectedDriver.dni})</span>}
                  </span>
                ) : (
                  <span className="text-slate-400 text-sm">Seleccionar conductor</span>
                )}
              </span>
              <ChevronDown size={18} className={`text-slate-500 transition-transform shrink-0 ${driverDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {driverDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                    placeholder="Buscar conductor..."
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredDrivers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</p>
                  ) : (
                    filteredDrivers.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedDriverId(d.id);
                          setDriverDropdownOpen(false);
                          setDriverSearch('');
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-3 transition-colors ${selectedDriverId === d.id ? 'bg-blue-50' : ''}`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${d.role === 'admin' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                          <User size={16} className={d.role === 'admin' ? 'text-amber-600' : 'text-blue-700'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-sm truncate">{d.full_name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {d.role === 'admin' ? 'Admin' : 'Conductor'}
                            {d.dni && ` \u00B7 ${d.dni}`}
                          </p>
                        </div>
                        {selectedDriverId === d.id && <Check size={16} className="text-blue-600 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="my-7 border-slate-200" />

      <div className="mb-5">
        <h2 className={sectionTitle}>MERCANCIA</h2>
        <p className={sectionSubtitle}>Descripcion y peso de la mercancia</p>
      </div>

      <div className="space-y-5">
        <div>
          <FieldLabel text="Descripcion de la mercancia" required />
          <input
            type="text"
            value={cargo.description}
            onChange={(e) => setCargo({ ...cargo, description: e.target.value })}
            className={inputClass}
            placeholder="Ej: Piezas de automovil, alimentacion ..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel text="Peso de la mercancia" required />
            <input
              type="number"
              value={cargo.weight_kg || ''}
              onChange={(e) => setCargo({ ...cargo, weight_kg: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              placeholder="Peso o magnitud de la mercancia"
              min="0"
              step="any"
            />
          </div>
          <div>
            <FieldLabel text="Reflejado en" required />
            <div className="relative">
              <select
                value={cargo.weight_unit}
                onChange={(e) => setCargo({ ...cargo, weight_unit: e.target.value })}
                className={`${inputClass} appearance-none pr-10 cursor-pointer`}
              >
                {WEIGHT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel text="Autorizacion especial de circulacion" required={false} />
          <input
            type="text"
            value={vehicle.special_authorization}
            onChange={(e) => setVehicle({ ...vehicle, special_authorization: e.target.value })}
            className={inputClass}
            placeholder="Opcional"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <StepBadge step={4} totalSteps={totalSteps} />
      <ProgressBars step={step} totalSteps={totalSteps} />

      <div className="mb-4">
        <h2 className={sectionTitle}>FECHA DE INICIO</h2>
        <p className={sectionSubtitle}>Fecha de realizacion del transporte</p>
      </div>

      <DateDropdown selected={departureDate} onChange={setDepartureDate} />

      <hr className="my-7 border-slate-200" />

      <div className="mb-4">
        <h2 className={sectionTitle}>FECHA DE DESCARGA</h2>
        <p className={sectionSubtitle}>Fecha estimada de entrega (opcional)</p>
      </div>

      <div className="mb-4">
        <Checkbox
          checked={hasUnloadingDate}
          onChange={setHasUnloadingDate}
          label="Incluir fecha de descarga"
        />
      </div>

      {hasUnloadingDate && <DateDropdown selected={unloadingDate} onChange={setUnloadingDate} />}

      <hr className="my-7 border-slate-200" />

      <div className="mb-4">
        <h2 className={sectionTitle}>OBSERVACIONES</h2>
        <p className="text-xs font-medium text-slate-400 mt-1">(opcional, puedes dejarlo en blanco)</p>
      </div>

      <textarea
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        className={`${inputClass} min-h-[140px] resize-y`}
        placeholder="Notas adicionales sobre el transporte"
      />
    </div>
  );

  const SummaryParty = ({ icon: Icon, iconColor, title, party }: { icon: typeof Building2; iconColor: string; title: string; party: PartyForm }) => (
    <div>
      <div className={`flex items-center gap-2 mb-2 ${iconColor}`}>
        <Icon size={18} />
        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900">{title}</span>
      </div>
      <div className="text-sm text-slate-700 space-y-0.5 leading-relaxed">
        <p>{party.nombre || '\u2014'}</p>
        <p>{party.nif || '\u2014'}</p>
        <p>{party.domicilio || '\u2014'}</p>
        <p>{party.postal_code}</p>
        <p>{party.poblacion}</p>
      </div>
    </div>
  );

  const renderStep5 = () => {
    if (isEditMode) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <StepBadge step={5} totalSteps={totalSteps} />
          <ProgressBars step={step} totalSteps={totalSteps} />

          <div className="mb-6">
            <h2 className={sectionTitle}>MOTIVO DEL CAMBIO</h2>
            <p className={sectionSubtitle}>Indica el motivo de la modificacion del documento. Este motivo quedara registrado en el historial.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Informacion importante</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Los datos anteriores se conservaran en el historial del documento. El PDF se regenerara automaticamente con los nuevos datos y el registro de modificaciones.
                </p>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel text="Motivo de la modificacion" required />
            <textarea
              value={modifyReason}
              onChange={(e) => setModifyReason(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="Ej: Cambio de destino por solicitud del cliente, correccion de peso tras verificacion en bascula..."
            />
          </div>
        </div>
      );
    }

    return renderSummary(5);
  };

  const renderStep6 = () => (
    <div className="space-y-6">
      {renderSummary(6)}

      <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-amber-600">
          <AlertCircle size={18} />
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900">MOTIVO DEL CAMBIO</span>
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{modifyReason}</p>
      </div>
    </div>
  );

  const renderSummary = (stepNum: number) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <StepBadge step={stepNum} totalSteps={totalSteps} />
      <ProgressBars step={step} totalSteps={totalSteps} />

      <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-7">RESUMEN DEL DOCUMENTO</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-6">
        <SummaryParty icon={Building2} iconColor="text-slate-700" title="CARGADOR CONTRACTUAL" party={cargadorContractual} />
        <SummaryParty icon={Truck} iconColor="text-blue-700" title="TRANSPORTISTA EFECTIVO" party={transportistaEfectivo} />
      </div>

      <hr className="border-slate-200 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-6">
        <SummaryParty icon={MapPin} iconColor="text-blue-700" title="ORIGEN" party={effectiveOrigin} />
        <SummaryParty icon={MapPin} iconColor="text-emerald-600" title="DESTINO" party={effectiveDestination} />
      </div>

      <hr className="border-slate-200 mb-6" />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-slate-700">
          <Truck size={18} />
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900">VEHICULO</span>
        </div>
        <div className="text-sm text-slate-700 space-y-0.5">
          <p>Matricula cabeza tractora: <span className="font-mono">{vehicle.tractor_plate}</span></p>
          {vehicle.trailer_plate_1 && <p>Matricula remolque: <span className="font-mono">{vehicle.trailer_plate_1}</span></p>}
          {vehicle.trailer_plate_2 && <p>Matricula remolque 2: <span className="font-mono">{vehicle.trailer_plate_2}</span></p>}
        </div>
      </div>

      <hr className="border-slate-200 mb-6" />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-amber-600">
          <Package size={18} />
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900">MERCANCIA</span>
        </div>
        <div className="text-sm text-slate-700 space-y-0.5">
          <p>{cargo.description}</p>
          <p>Peso bruto: {cargo.weight_kg.toLocaleString()} {WEIGHT_UNITS.find((u) => u.value === cargo.weight_unit)?.short || cargo.weight_unit}</p>
          <p>{vehicle.special_authorization ? `Autorizacion especial: ${vehicle.special_authorization}` : 'No requiere autorizacion especial de circulacion'}</p>
        </div>
      </div>

      <hr className="border-slate-200 mb-6" />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-slate-700">
          <Calendar size={18} />
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900">FECHAS</span>
        </div>
        <div className="text-sm text-slate-700 space-y-0.5">
          <p>Fecha de inicio: {format(departureDate, 'dd/MM/yyyy')}</p>
          {hasUnloadingDate && <p>Fecha de descarga: {format(unloadingDate, 'dd/MM/yyyy')}</p>}
        </div>
      </div>

      {observations.trim() && (
        <>
          <hr className="border-slate-200 mb-6" />
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-700">
              <FileText size={18} />
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900">OBSERVACIONES</span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{observations}</p>
          </div>
        </>
      )}
    </div>
  );

  const pageTitle = isEditMode ? 'Modificar documento' : 'Nuevo documento de Control';

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-white border-b border-slate-200/80 px-4 py-4 flex items-center gap-4 md:hidden">
        <button onClick={handleBack} className="p-1 text-slate-700 hover:text-slate-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex-1 text-center pr-10">{pageTitle}</h1>
      </header>

      <div className="w-full px-4 pt-6 md:pt-10 pb-32">
        <div className="hidden md:flex items-center gap-3 mb-6">
          <button onClick={handleBack} className="p-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{pageTitle}</h1>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && isEditMode && renderStep6()}

        {step < lastStep && !canProceed() && (
          <p className="flex items-center justify-end gap-1.5 text-xs font-semibold text-red-600 mt-3">
            <AlertCircle size={14} />
            Completa los campos marcados como &quot;Obligatorio&quot; para poder continuar
          </p>
        )}

        <div className="flex items-center justify-end gap-3 mt-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-700 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
          )}

          {step < lastStep ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all text-sm"
            >
              Siguiente
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl transition-all disabled:bg-slate-300 disabled:text-slate-500 text-sm ${
                isEditMode ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300' : 'bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isEditMode ? 'Guardando...' : 'Generando...'}
                </>
              ) : (
                <>
                  {isEditMode ? 'GUARDAR MODIFICACION' : 'CREAR DOCUMENTO'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showLimitModal && (
        <DocumentLimitModal
          isAdmin={isAdmin}
          onClose={() => setShowLimitModal(false)}
          onBuyPack={(qty) => { setShowLimitModal(false); purchaseDocumentPack(qty); }}
          onUpgradePlan={() => { setShowLimitModal(false); onNavigatePlanes?.(); }}
        />
      )}
    </div>
  );
}

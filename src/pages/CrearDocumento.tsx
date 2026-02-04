import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Truck,
  Package,
  Calendar,
  Check,
  Plus,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { Location, Vehicle, Document, DocumentContent } from '../lib/supabase';

interface CrearDocumentoProps {
  onBack: () => void;
  onComplete: (document: Document) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface NewLocationForm {
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  contact_name: string;
  phone: string;
}

const emptyLocationForm: NewLocationForm = {
  name: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  contact_name: '',
  phone: '',
};

export function CrearDocumento({ onBack, onComplete }: CrearDocumentoProps) {
  const { locations, vehicles, addLocation, addDocument } = useData();

  const [step, setStep] = useState<Step>(1);
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [cargo, setCargo] = useState({
    description: '',
    packages: 1,
    weight_kg: 0,
  });
  const [departureDate, setDepartureDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);

  const [showOriginSelector, setShowOriginSelector] = useState(false);
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [showNewOriginForm, setShowNewOriginForm] = useState(false);
  const [showNewDestinationForm, setShowNewDestinationForm] = useState(false);
  const [newOriginForm, setNewOriginForm] = useState<NewLocationForm>(emptyLocationForm);
  const [newDestinationForm, setNewDestinationForm] = useState<NewLocationForm>(emptyLocationForm);
  const [savingLocation, setSavingLocation] = useState(false);

  const canProceed = () => {
    switch (step) {
      case 1:
        return origin !== null && destination !== null;
      case 2:
        return selectedVehicle !== null;
      case 3:
        return cargo.description.trim() !== '' && cargo.weight_kg > 0;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      onBack();
    }
  };

  const handleGenerate = async () => {
    if (!origin || !destination || !selectedVehicle) return;

    setGenerating(true);

    const content: DocumentContent = {
      origin: {
        name: origin.name,
        address: origin.address,
        city: origin.city,
        province: origin.province,
        postal_code: origin.postal_code,
        contact_name: origin.contact_name,
        phone: origin.phone,
      },
      destination: {
        name: destination.name,
        address: destination.address,
        city: destination.city,
        province: destination.province,
        postal_code: destination.postal_code,
        contact_name: destination.contact_name,
        phone: destination.phone,
      },
      vehicle: {
        tractor_plate: selectedVehicle.tractor_plate,
        trailer_plate: selectedVehicle.trailer_plate,
        alias: selectedVehicle.alias,
      },
      cargo,
      company: {
        name: '',
        cif: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        phone: '',
      },
    };

    const newDoc = await addDocument(content, departureDate);
    setGenerating(false);

    if (newDoc) {
      onComplete(newDoc);
    }
  };

  const handleAddNewOrigin = async () => {
    setSavingLocation(true);
    const newLoc = await addLocation(newOriginForm);
    setSavingLocation(false);
    if (newLoc) {
      setOrigin(newLoc);
      setNewOriginForm(emptyLocationForm);
      setShowNewOriginForm(false);
    }
  };

  const handleAddNewDestination = async () => {
    setSavingLocation(true);
    const newLoc = await addLocation(newDestinationForm);
    setSavingLocation(false);
    if (newLoc) {
      setDestination(newLoc);
      setNewDestinationForm(emptyLocationForm);
      setShowNewDestinationForm(false);
    }
  };

  const stepTitles = [
    'Origen y Destino',
    'Vehiculo',
    'Carga',
    'Fecha',
    'Confirmar',
  ];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-4 px-4 bg-white border-b border-slate-200">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              s < step
                ? 'bg-green-600 text-white'
                : s === step
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {s < step ? <Check size={20} /> : s}
          </div>
          {s < 5 && (
            <div
              className={`w-6 h-1 ${
                s < step ? 'bg-green-600' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderLocationSelector = (
    type: 'origin' | 'destination',
    show: boolean,
    setShow: (show: boolean) => void,
    selected: Location | null,
    setSelected: (loc: Location) => void,
    showNewForm: boolean,
    setShowNewForm: (show: boolean) => void,
    newForm: NewLocationForm,
    setNewForm: (form: NewLocationForm) => void,
    handleAddNew: () => void
  ) => {
    if (showNewForm) {
      return (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Nuevo {type === 'origin' ? 'Origen' : 'Destino'}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              placeholder="Nombre (alias)"
              disabled={savingLocation}
            />
            <input
              type="text"
              value={newForm.address}
              onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              placeholder="Direccion"
              disabled={savingLocation}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newForm.city}
                onChange={(e) => setNewForm({ ...newForm, city: e.target.value })}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                placeholder="Poblacion"
                disabled={savingLocation}
              />
              <input
                type="text"
                value={newForm.postal_code}
                onChange={(e) => setNewForm({ ...newForm, postal_code: e.target.value })}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                placeholder="CP"
                disabled={savingLocation}
              />
            </div>
            <input
              type="text"
              value={newForm.province}
              onChange={(e) => setNewForm({ ...newForm, province: e.target.value })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              placeholder="Provincia"
              disabled={savingLocation}
            />
            <input
              type="text"
              value={newForm.contact_name}
              onChange={(e) => setNewForm({ ...newForm, contact_name: e.target.value })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              placeholder="Contacto (opcional)"
              disabled={savingLocation}
            />
            <input
              type="tel"
              value={newForm.phone}
              onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
              placeholder="Telefono (opcional)"
              disabled={savingLocation}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddNew}
              disabled={!newForm.name || !newForm.address || !newForm.city || savingLocation}
              className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold text-lg disabled:bg-slate-300 disabled:text-slate-500 flex items-center justify-center gap-2"
            >
              {savingLocation ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                'GUARDAR'
              )}
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewForm(emptyLocationForm);
              }}
              disabled={savingLocation}
              className="flex-1 bg-slate-200 text-slate-800 py-4 rounded-xl font-bold text-lg"
            >
              CANCELAR
            </button>
          </div>
        </div>
      );
    }

    if (show) {
      return (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => {
                  setSelected(loc);
                  setShow(false);
                }}
                className="w-full p-4 text-left border-b border-slate-100 active:bg-slate-50 last:border-b-0"
              >
                <p className="text-lg font-bold text-slate-900">{loc.name}</p>
                <p className="text-base text-slate-600">
                  {loc.city}, {loc.province}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full p-4 bg-slate-50 flex items-center justify-center gap-2 text-blue-600 font-bold text-lg border-t-2 border-slate-200"
          >
            <Plus size={24} />
            Agregar nuevo lugar
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setShow(true)}
        className="w-full p-4 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-between text-left"
      >
        {selected ? (
          <div>
            <p className="text-lg font-bold text-slate-900">{selected.name}</p>
            <p className="text-base text-slate-600">
              {selected.city}, {selected.province}
            </p>
          </div>
        ) : (
          <p className="text-lg text-slate-400">Seleccionar...</p>
        )}
        <ChevronDown size={28} className="text-slate-400" />
      </button>
    );
  };

  const renderStep1 = () => (
    <div className="p-4 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <MapPin size={24} className="text-blue-600" />
          </div>
          <label className="text-xl font-bold text-slate-900">ORIGEN</label>
        </div>
        {renderLocationSelector(
          'origin',
          showOriginSelector,
          setShowOriginSelector,
          origin,
          setOrigin,
          showNewOriginForm,
          setShowNewOriginForm,
          newOriginForm,
          setNewOriginForm,
          handleAddNewOrigin
        )}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <MapPin size={24} className="text-green-600" />
          </div>
          <label className="text-xl font-bold text-slate-900">DESTINO</label>
        </div>
        {renderLocationSelector(
          'destination',
          showDestinationSelector,
          setShowDestinationSelector,
          destination,
          setDestination,
          showNewDestinationForm,
          setShowNewDestinationForm,
          newDestinationForm,
          setNewDestinationForm,
          handleAddNewDestination
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Truck size={24} className="text-blue-600" />
        </div>
        <label className="text-xl font-bold text-slate-900">VEHICULO</label>
      </div>

      {showVehicleSelector ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {vehicles.map((veh) => (
              <button
                key={veh.id}
                onClick={() => {
                  setSelectedVehicle(veh);
                  setShowVehicleSelector(false);
                }}
                className="w-full p-4 text-left border-b border-slate-100 active:bg-slate-50 last:border-b-0"
              >
                <p className="text-lg font-bold text-slate-900">
                  {veh.alias || 'Sin alias'}
                </p>
                <p className="text-base text-slate-600">
                  Tractora: {veh.tractor_plate}
                  {veh.trailer_plate && ` | Remolque: ${veh.trailer_plate}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowVehicleSelector(true)}
          className="w-full p-4 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-between text-left"
        >
          {selectedVehicle ? (
            <div>
              <p className="text-lg font-bold text-slate-900">
                {selectedVehicle.alias || selectedVehicle.tractor_plate}
              </p>
              <p className="text-base text-slate-600">
                Tractora: {selectedVehicle.tractor_plate}
                {selectedVehicle.trailer_plate &&
                  ` | Remolque: ${selectedVehicle.trailer_plate}`}
              </p>
            </div>
          ) : (
            <p className="text-lg text-slate-400">Seleccionar vehiculo...</p>
          )}
          <ChevronDown size={28} className="text-slate-400" />
        </button>
      )}

      {vehicles.length === 0 && (
        <p className="text-center text-slate-500 mt-4 text-base">
          No hay vehiculos registrados. Anade uno desde "Mis Vehiculos".
        </p>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Package size={24} className="text-blue-600" />
        </div>
        <label className="text-xl font-bold text-slate-900">
          DATOS DE LA CARGA
        </label>
      </div>

      <div>
        <label className="block text-lg font-semibold text-slate-900 mb-2">
          Descripcion de la mercancia
        </label>
        <input
          type="text"
          value={cargo.description}
          onChange={(e) =>
            setCargo({ ...cargo, description: e.target.value })
          }
          className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
          placeholder="Ej: Piezas de automovil, alimentacion..."
        />
      </div>

      <div>
        <label className="block text-lg font-semibold text-slate-900 mb-2">
          Numero de bultos
        </label>
        <input
          type="number"
          value={cargo.packages}
          onChange={(e) =>
            setCargo({ ...cargo, packages: parseInt(e.target.value) || 0 })
          }
          className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
          placeholder="1"
          min="1"
        />
      </div>

      <div>
        <label className="block text-lg font-semibold text-slate-900 mb-2">
          Peso total (kg)
        </label>
        <input
          type="number"
          value={cargo.weight_kg || ''}
          onChange={(e) =>
            setCargo({ ...cargo, weight_kg: parseInt(e.target.value) || 0 })
          }
          className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
          placeholder="Peso en kilogramos"
          min="1"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Calendar size={24} className="text-blue-600" />
        </div>
        <label className="text-xl font-bold text-slate-900">
          FECHA DE SALIDA
        </label>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
        <input
          type="datetime-local"
          value={format(departureDate, "yyyy-MM-dd'T'HH:mm")}
          onChange={(e) => setDepartureDate(new Date(e.target.value))}
          className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
        />
        <p className="text-slate-600 mt-3 text-base">
          Fecha seleccionada:{' '}
          <span className="font-semibold text-slate-900">
            {format(departureDate, "EEEE d 'de' MMMM, yyyy 'a las' HH:mm", {
              locale: es,
            })}
          </span>
        </p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="p-4">
      <div className="bg-white rounded-xl border-2 border-slate-200 p-5 space-y-4">
        <h3 className="text-xl font-bold text-slate-900 text-center mb-4">
          RESUMEN DEL DOCUMENTO
        </h3>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <MapPin size={20} />
            <span className="font-semibold">Origen</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{origin?.name}</p>
          <p className="text-base text-slate-600">
            {origin?.address}, {origin?.city}
          </p>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <MapPin size={20} />
            <span className="font-semibold">Destino</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{destination?.name}</p>
          <p className="text-base text-slate-600">
            {destination?.address}, {destination?.city}
          </p>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Truck size={20} />
            <span className="font-semibold">Vehiculo</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {selectedVehicle?.alias || selectedVehicle?.tractor_plate}
          </p>
          <p className="text-base text-slate-600">
            Matricula: {selectedVehicle?.tractor_plate}
            {selectedVehicle?.trailer_plate &&
              ` | Remolque: ${selectedVehicle.trailer_plate}`}
          </p>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Package size={20} />
            <span className="font-semibold">Carga</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{cargo.description}</p>
          <p className="text-base text-slate-600">
            {cargo.packages} bultos | {cargo.weight_kg.toLocaleString()} kg
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Calendar size={20} />
            <span className="font-semibold">Fecha de salida</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {format(departureDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
          <p className="text-base text-slate-600">
            {format(departureDate, 'HH:mm')} horas
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={handleBack} className="p-2">
          <ArrowLeft size={32} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Crear Documento</h1>
          <p className="text-blue-100 text-base">
            Paso {step}: {stepTitles[step - 1]}
          </p>
        </div>
      </header>

      {renderStepIndicator()}

      <div className="flex-1">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      <div className="p-4 bg-white border-t-2 border-slate-200">
        {step < 5 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full bg-blue-600 text-white text-xl font-bold py-5 rounded-xl flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:text-slate-500 active:bg-blue-700"
          >
            SIGUIENTE
            <ArrowRight size={28} />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-xl flex items-center justify-center gap-3 active:bg-green-700 disabled:bg-green-400"
          >
            {generating ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Check size={28} />
                GENERAR DOCUMENTO
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { Document, DocumentContent } from '../lib/supabase';
import { MonthCalendar } from '../components/MonthCalendar';

interface CrearDocumentoProps {
  onBack: () => void;
  onComplete: (document: Document) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface ShipperForm {
  nombre: string;
  nif: string;
  domicilio: string;
  poblacion: string;
}

interface OriginForm {
  domicilio: string;
  poblacion: string;
}

interface DestinationForm {
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
  'w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 placeholder:text-slate-400';

export function CrearDocumento({ onBack, onComplete }: CrearDocumentoProps) {
  const { addDocument } = useData();

  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);

  const [shipper, setShipper] = useState<ShipperForm>({
    nombre: '',
    nif: '',
    domicilio: '',
    poblacion: '',
  });
  const [originSameAsShipper, setOriginSameAsShipper] = useState(false);
  const [origin, setOrigin] = useState<OriginForm>({
    domicilio: '',
    poblacion: '',
  });

  const [destination, setDestination] = useState<DestinationForm>({
    domicilio: '',
    poblacion: '',
  });

  const [vehicle, setVehicle] = useState<VehicleForm>({
    tractor_plate: '',
    trailer_plate_1: '',
    trailer_plate_2: '',
  });

  const [cargo, setCargo] = useState<CargoForm>({
    description: '',
    weight_kg: 0,
  });
  const [departureDate, setDepartureDate] = useState(new Date());

  const effectiveOrigin: OriginForm = originSameAsShipper
    ? { domicilio: shipper.domicilio, poblacion: shipper.poblacion }
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
        return (
          destination.domicilio.trim() !== '' &&
          destination.poblacion.trim() !== ''
        );
      case 3:
        return (
          vehicle.tractor_plate.trim() !== '' &&
          vehicle.trailer_plate_1.trim() !== ''
        );
      case 4:
        return cargo.description.trim() !== '' && cargo.weight_kg > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
    else onBack();
  };

  const handleGenerate = async () => {
    setGenerating(true);

    const content: DocumentContent = {
      contractual_shipper: {
        nombre: shipper.nombre,
        nif: shipper.nif,
        domicilio: shipper.domicilio,
        poblacion: shipper.poblacion,
      },
      origin: {
        domicilio: effectiveOrigin.domicilio,
        poblacion: effectiveOrigin.poblacion,
      },
      destination: {
        domicilio: destination.domicilio,
        poblacion: destination.poblacion,
      },
      vehicle: {
        tractor_plate: vehicle.tractor_plate,
        trailer_plate_1: vehicle.trailer_plate_1,
        trailer_plate_2: vehicle.trailer_plate_2 || undefined,
      },
      cargo: {
        description: cargo.description,
        weight_kg: cargo.weight_kg,
      },
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

    if (newDoc) onComplete(newDoc);
  };

  const stepTitles = [
    'Cargador y Origen',
    'Destino',
    'Vehiculo',
    'Carga y Fecha',
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

  const renderStep1 = () => (
    <div className="p-4 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building2 size={24} className="text-blue-600" />
          </div>
          <label className="text-xl font-bold text-slate-900">
            CARGADOR CONTRACTUAL
          </label>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={shipper.nombre}
            onChange={(e) => setShipper({ ...shipper, nombre: e.target.value })}
            className={inputClass}
            placeholder="Nombre"
          />
          <input
            type="text"
            value={shipper.nif}
            onChange={(e) => setShipper({ ...shipper, nif: e.target.value })}
            className={inputClass}
            placeholder="NIF"
          />
          <input
            type="text"
            value={shipper.domicilio}
            onChange={(e) =>
              setShipper({ ...shipper, domicilio: e.target.value })
            }
            className={inputClass}
            placeholder="Domicilio"
          />
          <input
            type="text"
            value={shipper.poblacion}
            onChange={(e) =>
              setShipper({ ...shipper, poblacion: e.target.value })
            }
            className={inputClass}
            placeholder="Poblacion"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <MapPin size={24} className="text-blue-600" />
          </div>
          <label className="text-xl font-bold text-slate-900">ORIGEN</label>
        </div>

        <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
          <div
            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${
              originSameAsShipper
                ? 'bg-blue-600 border-blue-600'
                : 'border-slate-400 bg-white'
            }`}
            onClick={() => setOriginSameAsShipper(!originSameAsShipper)}
          >
            {originSameAsShipper && <Check size={18} className="text-white" />}
          </div>
          <span
            className="text-base text-slate-700 font-medium"
            onClick={() => setOriginSameAsShipper(!originSameAsShipper)}
          >
            El Origen es igual que el Cargador contractual
          </span>
        </label>

        {originSameAsShipper ? (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
            <p className="text-base text-slate-600">
              <span className="font-semibold text-slate-800">Domicilio:</span>{' '}
              {shipper.domicilio || '—'}
            </p>
            <p className="text-base text-slate-600 mt-1">
              <span className="font-semibold text-slate-800">Poblacion:</span>{' '}
              {shipper.poblacion || '—'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={origin.domicilio}
              onChange={(e) =>
                setOrigin({ ...origin, domicilio: e.target.value })
              }
              className={inputClass}
              placeholder="Domicilio"
            />
            <input
              type="text"
              value={origin.poblacion}
              onChange={(e) =>
                setOrigin({ ...origin, poblacion: e.target.value })
              }
              className={inputClass}
              placeholder="Poblacion"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-green-100 p-2 rounded-lg">
          <MapPin size={24} className="text-green-600" />
        </div>
        <label className="text-xl font-bold text-slate-900">DESTINO</label>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          value={destination.domicilio}
          onChange={(e) =>
            setDestination({ ...destination, domicilio: e.target.value })
          }
          className={inputClass}
          placeholder="Domicilio"
        />
        <input
          type="text"
          value={destination.poblacion}
          onChange={(e) =>
            setDestination({ ...destination, poblacion: e.target.value })
          }
          className={inputClass}
          placeholder="Poblacion"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Truck size={24} className="text-blue-600" />
        </div>
        <label className="text-xl font-bold text-slate-900">VEHICULO</label>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-1.5">
            Matricula de la Cabeza Tractora *
          </label>
          <input
            type="text"
            value={vehicle.tractor_plate}
            onChange={(e) =>
              setVehicle({
                ...vehicle,
                tractor_plate: e.target.value.toUpperCase(),
              })
            }
            className={inputClass}
            placeholder="Ej: 1234 ABC"
          />
        </div>
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-1.5">
            Matricula del Remolque 1 *
          </label>
          <input
            type="text"
            value={vehicle.trailer_plate_1}
            onChange={(e) =>
              setVehicle({
                ...vehicle,
                trailer_plate_1: e.target.value.toUpperCase(),
              })
            }
            className={inputClass}
            placeholder="Ej: R-5678 XYZ"
          />
        </div>
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-1.5">
            Matricula del Remolque 2
          </label>
          <input
            type="text"
            value={vehicle.trailer_plate_2}
            onChange={(e) =>
              setVehicle({
                ...vehicle,
                trailer_plate_2: e.target.value.toUpperCase(),
              })
            }
            className={inputClass}
            placeholder="Opcional"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="p-4 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Package size={24} className="text-amber-600" />
          </div>
          <label className="text-xl font-bold text-slate-900">
            DATOS DE LA CARGA
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-1.5">
              Descripcion de la mercancia *
            </label>
            <input
              type="text"
              value={cargo.description}
              onChange={(e) =>
                setCargo({ ...cargo, description: e.target.value })
              }
              className={inputClass}
              placeholder="Ej: Piezas de automovil, alimentacion..."
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-1.5">
              Peso total (kg) *
            </label>
            <input
              type="number"
              value={cargo.weight_kg || ''}
              onChange={(e) =>
                setCargo({ ...cargo, weight_kg: parseInt(e.target.value) || 0 })
              }
              className={inputClass}
              placeholder="Peso en kilogramos"
              min="1"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Calendar size={24} className="text-blue-600" />
          </div>
          <label className="text-xl font-bold text-slate-900">
            FECHA DE SALIDA
          </label>
        </div>
        <MonthCalendar selected={departureDate} onChange={setDepartureDate} />
        <p className="text-slate-600 mt-3 text-base text-center">
          Fecha seleccionada:{' '}
          <span className="font-semibold text-slate-900">
            {format(departureDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
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
            <Building2 size={20} />
            <span className="font-semibold">Cargador Contractual</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{shipper.nombre}</p>
          <p className="text-base text-slate-600">NIF: {shipper.nif}</p>
          <p className="text-base text-slate-600">
            {shipper.domicilio}, {shipper.poblacion}
          </p>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <MapPin size={20} />
            <span className="font-semibold">Origen</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {effectiveOrigin.domicilio}
          </p>
          <p className="text-base text-slate-600">
            {effectiveOrigin.poblacion}
          </p>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <MapPin size={20} />
            <span className="font-semibold">Destino</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {destination.domicilio}
          </p>
          <p className="text-base text-slate-600">{destination.poblacion}</p>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Truck size={20} />
            <span className="font-semibold">Vehiculo</span>
          </div>
          <p className="text-base text-slate-900">
            <span className="font-semibold">Tractora:</span>{' '}
            <span className="font-mono">{vehicle.tractor_plate}</span>
          </p>
          <p className="text-base text-slate-900">
            <span className="font-semibold">Remolque 1:</span>{' '}
            <span className="font-mono">{vehicle.trailer_plate_1}</span>
          </p>
          {vehicle.trailer_plate_2 && (
            <p className="text-base text-slate-900">
              <span className="font-semibold">Remolque 2:</span>{' '}
              <span className="font-mono">{vehicle.trailer_plate_2}</span>
            </p>
          )}
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Package size={20} />
            <span className="font-semibold">Carga</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {cargo.description}
          </p>
          <p className="text-base text-slate-600">
            {cargo.weight_kg.toLocaleString()} kg
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

      <div className="flex-1 overflow-y-auto pb-24">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-slate-200">
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

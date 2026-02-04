import { useState } from 'react';
import { ArrowLeft, Plus, Truck, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Vehicle } from '../lib/supabase';

interface VehiculosProps {
  onBack: () => void;
}

type View = 'list' | 'form';

export function Vehiculos({ onBack }: VehiculosProps) {
  const { vehicles, loadingVehicles, addVehicle, updateVehicle, deleteVehicle } = useData();
  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tractor_plate: '',
    trailer_plate: '',
    alias: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      tractor_plate: '',
      trailer_plate: '',
      alias: '',
    });
    setEditingId(null);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      tractor_plate: vehicle.tractor_plate,
      trailer_plate: vehicle.trailer_plate,
      alias: vehicle.alias,
    });
    setEditingId(vehicle.id);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await updateVehicle(editingId, formData);
    } else {
      await addVehicle(formData);
    }

    setSaving(false);
    resetForm();
    setView('list');
  };

  const handleDelete = async (id: string) => {
    await deleteVehicle(id);
    setDeleteConfirm(null);
  };

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              resetForm();
              setView('list');
            }}
            className="p-2"
          >
            <ArrowLeft size={32} />
          </button>
          <h1 className="text-2xl font-bold">
            {editingId ? 'Editar Vehiculo' : 'Agregar Vehiculo'}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Alias del Vehiculo
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) =>
                setFormData({ ...formData, alias: e.target.value })
              }
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="Ej: Camion Grande, El Azul..."
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Matricula Cabeza Tractora *
            </label>
            <input
              type="text"
              value={formData.tractor_plate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tractor_plate: e.target.value.toUpperCase(),
                })
              }
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 uppercase"
              placeholder="1234 ABC"
              required
              disabled={saving}
            />
            <p className="text-slate-500 text-base mt-2">
              Matricula de la cabeza tractora del camion
            </p>
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Matricula Remolque (Opcional)
            </label>
            <input
              type="text"
              value={formData.trailer_plate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  trailer_plate: e.target.value.toUpperCase(),
                })
              }
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 uppercase"
              placeholder="R-5678 DEF"
              disabled={saving}
            />
            <p className="text-slate-500 text-base mt-2">
              Dejalo vacio si no tiene remolque
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-xl active:bg-green-700 transition-colors mt-6 disabled:bg-green-400 flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                Guardando...
              </>
            ) : editingId ? (
              'GUARDAR CAMBIOS'
            ) : (
              'GUARDAR VEHICULO'
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-2xl font-bold">Mis Vehiculos</h1>
      </header>

      <div className="p-4">
        <button
          onClick={() => setView('form')}
          className="w-full bg-green-600 text-white rounded-xl py-5 px-6 mb-6 flex items-center justify-center gap-3 active:bg-green-700 transition-colors shadow"
        >
          <Plus size={32} strokeWidth={2.5} />
          <span className="text-xl font-bold">AGREGAR VEHICULO</span>
        </button>

        {loadingVehicles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-xl p-5 shadow border-2 border-slate-200"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Truck size={28} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900">
                      {vehicle.alias || 'Sin alias'}
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div className="bg-slate-100 px-4 py-2 rounded-lg inline-block">
                        <span className="text-slate-600 text-base">Tractora: </span>
                        <span className="text-slate-900 font-bold text-lg">
                          {vehicle.tractor_plate}
                        </span>
                      </div>
                      {vehicle.trailer_plate && (
                        <div className="bg-slate-100 px-4 py-2 rounded-lg inline-block ml-2">
                          <span className="text-slate-600 text-base">
                            Remolque:{' '}
                          </span>
                          <span className="text-slate-900 font-bold text-lg">
                            {vehicle.trailer_plate}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {deleteConfirm === vehicle.id ? (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <p className="text-lg font-semibold text-red-800 mb-3">
                      ¿Eliminar este vehiculo?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-lg active:bg-red-700"
                      >
                        SI, ELIMINAR
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-xl font-bold text-lg active:bg-slate-300"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-blue-200"
                    >
                      <Pencil size={22} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(vehicle.id)}
                      className="flex-1 bg-red-100 text-red-700 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-red-200"
                    >
                      <Trash2 size={22} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}

            {vehicles.length === 0 && (
              <div className="text-center py-12">
                <Truck size={64} className="text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500">No hay vehiculos guardados</p>
                <p className="text-base text-slate-400 mt-2">
                  Pulsa el boton verde para agregar uno
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

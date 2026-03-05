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
      <div className="min-h-screen bg-[#f0f4f8]">
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              resetForm();
              setView('list');
            }}
            className="p-2 -ml-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-800">
            {editingId ? 'Editar Vehiculo' : 'Agregar Vehiculo'}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Alias del Vehiculo
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) =>
                setFormData({ ...formData, alias: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="Ej: Camion Grande, El Azul..."
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
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
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900 uppercase"
              placeholder="1234 ABC"
              required
              disabled={saving}
            />
            <p className="text-slate-500 text-xs mt-1.5">
              Matricula de la cabeza tractora del camion
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
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
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900 uppercase"
              placeholder="R-5678 DEF"
              disabled={saving}
            />
            <p className="text-slate-500 text-xs mt-1.5">
              Dejalo vacio si no tiene remolque
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold py-4 rounded-xl transition-colors mt-6 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando...
              </>
            ) : editingId ? (
              'Guardar Cambios'
            ) : (
              'Guardar Vehiculo'
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-700 hover:text-slate-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Mis Vehiculos</h1>
      </header>

      <div className="p-4">
        <button
          onClick={() => setView('form')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-4 px-6 mb-6 flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          <Plus size={24} strokeWidth={2.5} />
          <span className="text-base font-semibold">Agregar Vehiculo</span>
        </button>

        {loadingVehicles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={40} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2.5 rounded-full">
                    <Truck size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">
                      {vehicle.alias || 'Sin alias'}
                    </h3>
                    <div className="mt-2 space-y-1.5">
                      <div className="inline-flex items-center bg-slate-50 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-600 text-xs mr-1.5">Tractora:</span>
                        <span className="text-slate-900 font-semibold text-sm">
                          {vehicle.tractor_plate}
                        </span>
                      </div>
                      {vehicle.trailer_plate && (
                        <div className="inline-flex items-center bg-slate-50 px-3 py-1.5 rounded-lg ml-2">
                          <span className="text-slate-600 text-xs mr-1.5">Remolque:</span>
                          <span className="text-slate-900 font-semibold text-sm">
                            {vehicle.trailer_plate}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {deleteConfirm === vehicle.id ? (
                  <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-3">
                      ¿Eliminar este vehiculo?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
                      >
                        Si, Eliminar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(vehicle.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}

            {vehicles.length === 0 && (
              <div className="text-center py-16">
                <Truck size={56} className="text-slate-300 mx-auto mb-4" />
                <p className="text-base font-medium text-slate-500">No hay vehiculos guardados</p>
                <p className="text-sm text-slate-400 mt-1">
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

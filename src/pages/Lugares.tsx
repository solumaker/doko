import { useState } from 'react';
import { ArrowLeft, Plus, MapPin, Phone, User, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Location } from '../lib/supabase';

interface LugaresProps {
  onBack: () => void;
}

type View = 'list' | 'form';

export function Lugares({ onBack }: LugaresProps) {
  const { locations, loadingLocations, addLocation, updateLocation, deleteLocation } = useData();
  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    contact_name: '',
    phone: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      nif: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      contact_name: '',
      phone: '',
    });
    setEditingId(null);
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      nif: location.nif || '',
      address: location.address,
      city: location.city,
      province: location.province,
      postal_code: location.postal_code,
      contact_name: location.contact_name,
      phone: location.phone,
    });
    setEditingId(location.id);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await updateLocation(editingId, formData);
    } else {
      await addLocation(formData);
    }

    setSaving(false);
    resetForm();
    setView('list');
  };

  const handleDelete = async (id: string) => {
    await deleteLocation(id);
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
            {editingId ? 'Editar Lugar' : 'Agregar Lugar'}
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre de empresa
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="Ej: Railsider S.L."
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              DNI / NIF
            </label>
            <input
              type="text"
              value={formData.nif}
              onChange={(e) =>
                setFormData({ ...formData, nif: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="Ej: B12345678"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Direccion
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="Calle, numero, nave..."
              required
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Poblacion
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                placeholder="Ciudad"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CP
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) =>
                  setFormData({ ...formData, postal_code: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                placeholder="28001"
                required
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Provincia
            </label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) =>
                setFormData({ ...formData, province: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="Madrid, Barcelona..."
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre de Contacto
            </label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="Persona de contacto"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Telefono Movil
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
              placeholder="+34 600 000 000"
              disabled={saving}
            />
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
              'Guardar Lugar'
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
        <h1 className="text-lg font-bold text-slate-800">Mis Lugares</h1>
      </header>

      <div className="p-4">
        <button
          onClick={() => setView('form')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-4 px-6 mb-6 flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          <Plus size={24} strokeWidth={2.5} />
          <span className="text-base font-semibold">Agregar Lugar</span>
        </button>

        {loadingLocations ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={40} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2.5 rounded-full">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {location.name}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {location.address}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {location.postal_code} {location.city}, {location.province}
                    </p>
                    {location.contact_name && (
                      <div className="flex items-center gap-2 mt-2 text-slate-600">
                        <User size={16} />
                        <span className="text-sm">{location.contact_name}</span>
                      </div>
                    )}
                    {location.phone && (
                      <div className="flex items-center gap-2 mt-1 text-slate-600">
                        <Phone size={16} />
                        <span className="text-sm">{location.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {deleteConfirm === location.id ? (
                  <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-3">
                      ¿Eliminar este lugar?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(location.id)}
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
                      onClick={() => handleEdit(location)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(location.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}

            {locations.length === 0 && (
              <div className="text-center py-16">
                <MapPin size={56} className="text-slate-300 mx-auto mb-4" />
                <p className="text-base font-medium text-slate-500">No hay lugares guardados</p>
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

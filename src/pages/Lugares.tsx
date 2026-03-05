import { useState } from 'react';
import { Plus, MapPin, Phone, User, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Location } from '../lib/supabase';
import { AppLayout } from '../components/AppLayout';

interface LugaresProps {
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

type View = 'list' | 'form';

const inputClass = 'w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900';

export function Lugares({ onBack, onLogout, onNavigate }: LugaresProps) {
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
    setFormData({ name: '', nif: '', address: '', city: '', province: '', postal_code: '', contact_name: '', phone: '' });
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

  const handleNavItem = (item: string) => {
    onNavigate(item);
  };

  if (view === 'form') {
    return (
      <AppLayout
        activeNav="lugares"
        onNavigate={handleNavItem}
        onLogout={onLogout}
        pageTitle={editingId ? 'Editar Lugar' : 'Agregar Lugar'}
        onBack={() => { resetForm(); setView('list'); }}
      >
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de empresa</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Railsider S.L."
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">DNI / NIF</label>
                <input
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: B12345678"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Direccion</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  placeholder="Calle, numero, nave..."
                  required
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Poblacion</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={inputClass}
                    placeholder="Ciudad"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CP</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className={inputClass}
                    placeholder="28001"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Provincia</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className={inputClass}
                  placeholder="Madrid, Barcelona..."
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de Contacto</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className={inputClass}
                  placeholder="Persona de contacto"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Telefono Movil</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+34 600 000 000"
                  disabled={saving}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold py-4 rounded-xl transition-colors mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={20} className="animate-spin" />Guardando...</>
                ) : editingId ? 'Guardar Cambios' : 'Guardar Lugar'}
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeNav="lugares" onNavigate={handleNavItem} onLogout={onLogout}>
      <div className="max-w-3xl space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Lugares guardados</h3>
            <p className="text-sm text-slate-500 mt-0.5">Origenes y destinos frecuentes de tus transportes</p>
          </div>
          <button
            onClick={() => setView('form')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 px-5 flex items-center justify-center gap-2.5 transition-colors shadow-sm shadow-emerald-500/20 shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="text-sm font-bold">Agregar Lugar</span>
          </button>
        </div>

        {loadingLocations ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={36} className="animate-spin text-blue-600" />
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-600">No hay lugares guardados</p>
            <p className="text-sm text-slate-400 mt-1">Agrega origenes y destinos frecuentes para agilizar la creacion de documentos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">{location.name}</h3>
                        {location.nif && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{location.nif}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEdit(location)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-200/50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(location.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200/50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <p className="text-sm truncate">{location.address}, {location.postal_code} {location.city}, {location.province}</p>
                      </div>
                      {location.contact_name && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span className="text-sm">{location.contact_name}</span>
                        </div>
                      )}
                      {location.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span className="text-sm">{location.phone}</span>
                        </div>
                      )}
                    </div>

                    {deleteConfirm === location.id && (
                      <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-sm font-semibold text-red-800 mb-3">¿Eliminar este lugar?</p>
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
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

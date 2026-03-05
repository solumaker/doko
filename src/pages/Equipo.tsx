import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Users,
  User,
  Loader2,
  Shield,
  Copy,
  Share2,
  Key,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase, callEdgeFunction, Profile, DriverCompanyLink, PLAN_CONFIG } from '../lib/supabase';

type View = 'list' | 'form' | 'created';

interface DriverWithLink extends Profile {
  link?: DriverCompanyLink;
}

interface EquipoProps {
  onBack: () => void;
  onGoToPlanes?: () => void;
}

export function Equipo({ onBack, onGoToPlanes }: EquipoProps) {
  const { profile, isAdmin } = useAuth();
  const { usage, hasActiveSubscription } = useSubscription();
  const [view, setView] = useState<View>('list');
  const [drivers, setDrivers] = useState<DriverWithLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changingPin, setChangingPin] = useState<string | null>(null);
  const [newPinDigits, setNewPinDigits] = useState(['', '', '', '']);
  const [copied, setCopied] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{ name: string; url: string } | null>(null);

  const [editingDriver, setEditingDriver] = useState<DriverWithLink | null>(null);
  const [editName, setEditName] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DriverWithLink | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    pin: ['', '', '', ''],
  });

  const buildDriverUrl = (accessToken: string) => {
    return `${window.location.origin}?token=${accessToken}`;
  };

  const fetchDrivers = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    const { data: members } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    const { data: links } = await supabase
      .from('driver_company_links')
      .select('*')
      .eq('company_id', profile.company_id);

    const linkMap = new Map<string, DriverCompanyLink>();
    (links || []).forEach((l: DriverCompanyLink) => linkMap.set(l.driver_id, l));

    const merged: DriverWithLink[] = (members || []).map((m: Profile) => ({
      ...m,
      link: linkMap.get(m.id),
    }));

    setDrivers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, [profile?.company_id]);

  const resetForm = () => {
    setFormData({ fullName: '', dni: '', pin: ['', '', '', ''] });
    setError('');
    setSuccess('');
  };

  const handlePinInput = (pinArray: string[], index: number, value: string, setter: (arr: string[]) => void) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...pinArray];
    next[index] = value;
    setter(next);

    if (value && index < 3) {
      const prefix = setter === setFormPinDigits ? 'form' : 'change';
      const nextInput = document.getElementById(`pin-${prefix}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const setFormPinDigits = (arr: string[]) => {
    setFormData({ ...formData, pin: arr });
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Introduce el nombre del conductor');
      return;
    }

    const pin = formData.pin.join('');
    if (pin.length !== 4) {
      setError('Introduce un PIN de 4 digitos');
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Sesion expirada');
      setSaving(false);
      return;
    }

    const { data: result, ok } = await callEdgeFunction('driver-auth', {
      action: 'create',
      full_name: formData.fullName.trim(),
      dni: formData.dni.trim() || undefined,
      pin,
    }, session.access_token);

    setSaving(false);

    if (!ok || result.error) {
      setError(result.error || 'Error al crear conductor');
      return;
    }

    const driverUrl = buildDriverUrl(result.access_token);
    setCreatedLink({ name: formData.fullName.trim(), url: driverUrl });
    resetForm();
    fetchDrivers();
    setView('created');
  };

  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setEditError('');

    if (!editName.trim()) {
      setEditError('El nombre no puede estar vacio');
      return;
    }

    setEditSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim(), dni: editDni.trim() || null })
      .eq('id', editingDriver.id);

    setEditSaving(false);

    if (err) {
      setEditError('Error al guardar los cambios');
      return;
    }

    setEditingDriver(null);
    setSuccess('Conductor actualizado correctamente');
    setTimeout(() => setSuccess(''), 2500);
    fetchDrivers();
  };

  const handleDeleteDriver = async () => {
    if (!deleteTarget) return;
    setDeleteConfirming(true);

    if (deleteTarget.link) {
      await supabase
        .from('driver_company_links')
        .delete()
        .eq('id', deleteTarget.link.id);
    }

    await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteTarget.id);

    setDeleteConfirming(false);
    setDeleteTarget(null);
    setSuccess('Conductor eliminado');
    setTimeout(() => setSuccess(''), 2500);
    fetchDrivers();
  };

  const handleChangePin = async (linkId: string) => {
    const pin = newPinDigits.join('');
    if (pin.length !== 4) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: result, ok } = await callEdgeFunction('driver-auth', {
      action: 'change_pin',
      link_id: linkId,
      new_pin: pin,
    }, session.access_token);

    if (ok && result.success) {
      setSuccess('PIN cambiado correctamente');
      setTimeout(() => setSuccess(''), 2000);
    }
    setChangingPin(null);
    setNewPinDigits(['', '', '', '']);
  };

  const handleToggleAccess = async (linkId: string, currentlyActive: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await callEdgeFunction('driver-auth', {
      action: 'toggle_access',
      link_id: linkId,
      is_active: !currentlyActive,
    }, session.access_token);

    fetchDrivers();
  };

  const handleCopyLink = async (accessToken: string, driverId: string) => {
    const url = buildDriverUrl(accessToken);
    await navigator.clipboard.writeText(url);
    setCopied(driverId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShareWhatsApp = (accessToken: string, driverName: string) => {
    const url = buildDriverUrl(accessToken);
    const text = `Hola ${driverName}, este es tu enlace para acceder a DOKO: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2">
            <ArrowLeft size={32} />
          </button>
          <h1 className="text-2xl font-bold">Mi Equipo</h1>
        </header>
        <div className="p-6 text-center">
          <Shield size={64} className="text-slate-300 mx-auto mb-4" />
          <p className="text-xl text-slate-700 font-semibold">Acceso restringido</p>
          <p className="text-base text-slate-500 mt-2">
            Solo los administradores pueden gestionar el equipo
          </p>
        </div>
      </div>
    );
  }

  if (view === 'created' && createdLink) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              setCreatedLink(null);
              setView('list');
            }}
            className="p-2"
          >
            <ArrowLeft size={32} />
          </button>
          <h1 className="text-2xl font-bold">Conductor creado</h1>
        </header>

        <div className="p-4 space-y-5">
          <div className="bg-green-100 border-2 border-green-400 rounded-xl p-4 text-center">
            <Check size={40} className="text-green-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-green-800">
              {createdLink.name} ha sido agregado
            </p>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-5">
            <p className="text-lg font-semibold text-slate-900 mb-4 text-center">
              Enlace de acceso del conductor
            </p>

            <div className="flex justify-center mb-5">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <QRCode value={createdLink.url} size={180} />
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-3 mb-4">
              <p className="text-sm text-slate-600 break-all font-mono">{createdLink.url}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdLink.url);
                  setCopied('created');
                  setTimeout(() => setCopied(null), 2000);
                }}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-blue-700"
              >
                {copied === 'created' ? (
                  <>
                    <Check size={22} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={22} />
                    Copiar enlace
                  </>
                )}
              </button>

              <button
                onClick={() => handleShareWhatsApp(
                  createdLink.url.split('token=')[1],
                  createdLink.name
                )}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-green-700"
              >
                <Share2 size={22} />
                Compartir por WhatsApp
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setCreatedLink(null);
              setView('list');
            }}
            className="w-full bg-slate-200 text-slate-800 py-4 rounded-xl font-bold text-lg active:bg-slate-300"
          >
            Volver al equipo
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Agregar Conductor</h1>
        </header>

        <form onSubmit={handleAddDriver} className="p-4 space-y-5">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-base">
              Al crear el conductor se generara un enlace unico. Compartelo por WhatsApp
              para que pueda acceder con su PIN.
            </p>
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="Nombre del conductor"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              DNI / NIE <span className="text-slate-400 font-normal text-base">(opcional)</span>
            </label>
            <input
              type="text"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value.toUpperCase() })}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="Ej: 12345678A"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              PIN de acceso (4 digitos)
            </label>
            <div className="flex gap-3 justify-center">
              {formData.pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-form-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinInput(formData.pin, i, e.target.value, setFormPinDigits)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      const prev = document.getElementById(`pin-form-${i - 1}`);
                      prev?.focus();
                    }
                  }}
                  className="w-16 h-20 text-center text-3xl font-bold border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                  disabled={saving}
                />
              ))}
            </div>
            <p className="text-slate-500 text-base mt-2 text-center">
              El conductor usara este PIN para acceder
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-xl active:bg-green-700 transition-colors mt-4 disabled:bg-green-400 flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                Creando...
              </>
            ) : (
              'CREAR CONDUCTOR'
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
        <h1 className="text-2xl font-bold">Mi Equipo</h1>
      </header>

      {editingDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Editar conductor</h2>
              <button onClick={() => setEditingDriver(null)} className="p-2 text-slate-400 active:text-slate-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditDriver} className="space-y-4">
              {editError && (
                <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl text-base">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-base font-semibold text-slate-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3.5 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                  disabled={editSaving}
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-slate-700 mb-1.5">
                  DNI / NIE <span className="text-slate-400 font-normal text-sm">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={editDni}
                  onChange={(e) => setEditDni(e.target.value.toUpperCase())}
                  className="w-full p-3.5 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                  placeholder="Ej: 12345678A"
                  disabled={editSaving}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:bg-blue-300 active:bg-blue-700"
                >
                  {editSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="flex-1 bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-base active:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-red-100 rounded-xl shrink-0">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Eliminar conductor</h2>
                <p className="text-slate-600 text-base">
                  Vas a eliminar a <span className="font-semibold text-slate-900">{deleteTarget.full_name}</span>. Esta accion no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteDriver}
                disabled={deleteConfirming}
                className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:bg-red-300 active:bg-red-700"
              >
                {deleteConfirming ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                Eliminar
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteConfirming}
                className="flex-1 bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-base active:bg-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {success && (
          <div className="bg-green-100 border-2 border-green-500 text-green-700 px-4 py-3 rounded-xl text-lg mb-4">
            {success}
          </div>
        )}

        {(() => {
          const currentDriverCount = drivers.length;
          const planLimit = hasActiveSubscription && usage?.plan ? PLAN_CONFIG[usage.plan]?.user_limit ?? null : null;
          const atLimit = planLimit !== null && currentDriverCount >= planLimit;

          if (atLimit) {
            return (
              <div className="mb-6 space-y-3">
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-red-800 mb-0.5">Limite de conductores alcanzado</p>
                    <p className="text-sm text-red-700">
                      Tu plan <span className="font-bold">{PLAN_CONFIG[usage!.plan!].name}</span> permite hasta{' '}
                      <span className="font-bold">{planLimit} {planLimit === 1 ? 'usuario' : 'usuarios'}</span>.
                      Para agregar mas conductores, actualiza tu plan.
                    </p>
                    {onGoToPlanes && (
                      <button
                        onClick={onGoToPlanes}
                        className="mt-2.5 text-sm font-semibold text-red-700 underline underline-offset-2"
                      >
                        Ver planes disponibles
                      </button>
                    )}
                  </div>
                </div>
                <button
                  disabled
                  className="w-full bg-slate-200 text-slate-400 rounded-xl py-5 px-6 flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <Plus size={32} strokeWidth={2.5} />
                  <span className="text-xl font-bold">AGREGAR CONDUCTOR</span>
                </button>
              </div>
            );
          }

          return (
            <button
              onClick={() => setView('form')}
              className="w-full bg-green-600 text-white rounded-xl py-5 px-6 mb-6 flex items-center justify-center gap-3 active:bg-green-700 transition-colors shadow"
            >
              <Plus size={32} strokeWidth={2.5} />
              <span className="text-xl font-bold">AGREGAR CONDUCTOR</span>
            </button>
          );
        })()}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {drivers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl p-5 shadow border-2 border-slate-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${member.role === 'admin' ? 'bg-blue-100' : member.link?.is_active === false ? 'bg-red-100' : 'bg-slate-100'}`}>
                    {member.role === 'admin' ? (
                      <Shield size={28} className="text-blue-600" />
                    ) : (
                      <User size={28} className={member.link?.is_active === false ? 'text-red-400' : 'text-slate-600'} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-slate-900 truncate">
                        {member.full_name}
                      </h3>
                      {member.role === 'admin' && (
                        <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-2 py-1 rounded">
                          Admin
                        </span>
                      )}
                      {member.link?.is_active === false && (
                        <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                      {member.role === 'admin' ? 'Administrador' : 'Conductor'}
                      {member.dni ? ` · ${member.dni}` : ''}
                    </p>
                  </div>
                  {member.role === 'driver' && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingDriver(member);
                          setEditName(member.full_name);
                          setEditDni(member.dni || '');
                          setEditError('');
                        }}
                        className="p-2.5 bg-slate-100 text-slate-600 rounded-xl active:bg-slate-200 border border-slate-200"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(member)}
                        className="p-2.5 bg-red-50 text-red-600 rounded-xl active:bg-red-100 border border-red-200"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {member.role === 'driver' && member.link && (
                  <div className="mt-4 space-y-2">
                    {changingPin === member.link.id ? (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-base font-semibold text-slate-900 mb-3">Nuevo PIN</p>
                        <div className="flex gap-2 justify-center mb-3">
                          {newPinDigits.map((digit, i) => (
                            <input
                              key={i}
                              id={`pin-change-${i}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handlePinInput(newPinDigits, i, e.target.value, setNewPinDigits)}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !digit && i > 0) {
                                  const prev = document.getElementById(`pin-change-${i - 1}`);
                                  prev?.focus();
                                }
                              }}
                              className="w-14 h-16 text-center text-2xl font-bold border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleChangePin(member.link!.id)}
                            disabled={newPinDigits.join('').length !== 4}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-base disabled:bg-slate-300 flex items-center justify-center gap-1"
                          >
                            <Check size={18} />
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setChangingPin(null);
                              setNewPinDigits(['', '', '', '']);
                            }}
                            className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-1"
                          >
                            <X size={18} />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCopyLink(member.link!.access_token, member.id)}
                          className="flex-1 min-w-[120px] bg-blue-50 text-blue-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:bg-blue-100 border border-blue-200"
                        >
                          {copied === member.id ? <Check size={16} /> : <Copy size={16} />}
                          {copied === member.id ? 'Copiado' : 'Copiar enlace'}
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(member.link!.access_token, member.full_name)}
                          className="flex-1 min-w-[120px] bg-green-50 text-green-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:bg-green-100 border border-green-200"
                        >
                          <Share2 size={16} />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            setChangingPin(member.link!.id);
                            setNewPinDigits(['', '', '', '']);
                          }}
                          className="flex-1 min-w-[120px] bg-amber-50 text-amber-700 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:bg-amber-100 border border-amber-200"
                        >
                          <Key size={16} />
                          Cambiar PIN
                        </button>
                        <button
                          onClick={() => handleToggleAccess(member.link!.id, member.link!.is_active)}
                          className={`flex-1 min-w-[120px] py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 border ${
                            member.link.is_active
                              ? 'bg-red-50 text-red-700 active:bg-red-100 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 active:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {member.link.is_active ? (
                            <>
                              <ToggleRight size={16} />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={16} />
                              Activar
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {drivers.length === 0 && (
              <div className="text-center py-12">
                <Users size={64} className="text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500">No hay miembros en el equipo</p>
                <p className="text-base text-slate-400 mt-2">
                  Agrega conductores para que puedan crear documentos
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

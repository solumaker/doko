import { useState, useEffect } from 'react';
import {
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
  UserPlus,
  Mail,
  Lock,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import { supabase, callEdgeFunction, Profile, DriverCompanyLink } from '../lib/supabase';
import { AppLayout } from '../components/AppLayout';

type View = 'list' | 'form-driver' | 'form-admin' | 'created';
type Tab = 'conductores' | 'admins';

interface DriverWithLink extends Profile {
  link?: DriverCompanyLink;
}

interface EquipoProps {
  onBack: () => void;
  onGoToPlanes?: () => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

export function Equipo({ onBack, onGoToPlanes, onLogout, onNavigate }: EquipoProps) {
  const { profile, isAdmin, signOut, isCargador } = useAuth();
  const [view, setView] = useState<View>('list');
  const [activeTab, setActiveTab] = useState<Tab>('conductores');
  const [members, setMembers] = useState<DriverWithLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changingPin, setChangingPin] = useState<string | null>(null);
  const [newPinDigits, setNewPinDigits] = useState(['', '', '', '']);
  const [copied, setCopied] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{ name: string; url: string } | null>(null);

  const [editingMember, setEditingMember] = useState<DriverWithLink | null>(null);
  const [editName, setEditName] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DriverWithLink | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const [driverForm, setDriverForm] = useState({
    fullName: '',
    dni: '',
    pin: ['', '', '', ''],
  });

  const [adminForm, setAdminForm] = useState({
    fullName: '',
    email: '',
    password: '',
    dni: '',
  });
  const [showDuplicateEmailModal, setShowDuplicateEmailModal] = useState(false);

  const buildDriverUrl = (accessToken: string) => {
    return `${window.location.origin}?token=${accessToken}`;
  };

  const fetchMembers = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    const { data: profileRows } = await supabase
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

    const merged: DriverWithLink[] = (profileRows || []).map((m: Profile) => ({
      ...m,
      link: linkMap.get(m.id),
    }));

    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [profile?.company_id]);

  const drivers = members.filter((m) => m.role === 'driver');
  const admins = members.filter((m) => m.role === 'admin');

  const resetDriverForm = () => {
    setDriverForm({ fullName: '', dni: '', pin: ['', '', '', ''] });
    setError('');
  };

  const resetAdminForm = () => {
    setAdminForm({ fullName: '', email: '', password: '', dni: '' });
    setError('');
  };

  const handlePinInput = (
    pinArray: string[],
    index: number,
    value: string,
    setter: (arr: string[]) => void,
    prefix: string
  ) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...pinArray];
    next[index] = value;
    setter(next);
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${prefix}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!driverForm.fullName.trim()) {
      setError('Introduce el nombre del conductor');
      return;
    }

    if (!driverForm.dni.trim()) {
      setError('El DNI / NIE es obligatorio para el acceso del conductor');
      return;
    }

    const pin = driverForm.pin.join('');
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
      full_name: driverForm.fullName.trim(),
      dni: driverForm.dni.trim() || undefined,
      pin,
    }, session.access_token);

    setSaving(false);

    if (!ok || result.error) {
      setError(result.error || 'Error al crear conductor');
      return;
    }

    const driverUrl = buildDriverUrl(result.access_token);
    setCreatedLink({ name: driverForm.fullName.trim(), url: driverUrl });
    resetDriverForm();
    fetchMembers();
    setView('created');
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminForm.fullName.trim()) {
      setError('Introduce el nombre del administrador');
      return;
    }
    if (!adminForm.email.trim()) {
      setError('Introduce el email del administrador');
      return;
    }
    if (adminForm.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
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
      action: 'create_admin',
      full_name: adminForm.fullName.trim(),
      email: adminForm.email.trim().toLowerCase(),
      password: adminForm.password,
      dni: adminForm.dni.trim() || undefined,
    }, session.access_token);

    setSaving(false);

    if (!ok || result.error) {
      if (result.error === 'EMAIL_ALREADY_EXISTS') {
        setShowDuplicateEmailModal(true);
      } else {
        setError(result.error || 'Error al crear administrador');
      }
      return;
    }

    resetAdminForm();
    fetchMembers();
    setSuccess('Administrador creado correctamente');
    setTimeout(() => setSuccess(''), 3000);
    setView('list');
    setActiveTab('admins');
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditError('');

    if (!editName.trim()) {
      setEditError('El nombre no puede estar vacio');
      return;
    }

    setEditSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim(), dni: editDni.trim() || null })
      .eq('id', editingMember.id);

    setEditSaving(false);

    if (err) {
      setEditError('Error al guardar los cambios');
      return;
    }

    setEditingMember(null);
    const label = editingMember.role === 'admin' ? 'Administrador' : 'Conductor';
    setSuccess(`${label} actualizado correctamente`);
    setTimeout(() => setSuccess(''), 2500);
    fetchMembers();
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleteConfirming(true);

    const isSelf = deleteTarget.id === profile?.id;

    if (deleteTarget.role === 'driver') {
      if (deleteTarget.link) {
        await supabase
          .from('driver_company_links')
          .delete()
          .eq('id', deleteTarget.link.id);
      }
      await supabase.from('profiles').delete().eq('id', deleteTarget.id);
      setDeleteConfirming(false);
      setDeleteTarget(null);
      setSuccess('Conductor eliminado');
      setTimeout(() => setSuccess(''), 2500);
      fetchMembers();
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDeleteConfirming(false);
        return;
      }
      const { ok } = await callEdgeFunction('driver-auth', {
        action: 'delete_admin',
        profile_id: deleteTarget.id,
      }, session.access_token);

      setDeleteConfirming(false);
      setDeleteTarget(null);

      if (ok) {
        if (isSelf) {
          await signOut();
        } else {
          setSuccess('Administrador eliminado');
          setTimeout(() => setSuccess(''), 2500);
          fetchMembers();
        }
      } else {
        setError('Error al eliminar administrador');
        setTimeout(() => setError(''), 3000);
      }
    }
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

    fetchMembers();
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

  const handleNavItem = (item: string) => {
    onNavigate(item);
  };

  if (!isAdmin) {
    return (
      <AppLayout activeNav="equipo" onNavigate={handleNavItem} onLogout={onLogout}>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">Acceso restringido</p>
            <p className="text-sm text-slate-500 mt-1">Solo los administradores pueden gestionar el equipo</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (view === 'created' && createdLink) {
    return (
      <AppLayout activeNav="equipo" onNavigate={handleNavItem} onLogout={onLogout} pageTitle="Conductor creado" onBack={() => { setCreatedLink(null); setView('list'); }}>
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-emerald-800">{createdLink.name} ha sido agregado</p>
            <p className="text-sm text-emerald-700 mt-1">Comparte el enlace de acceso con el conductor</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <p className="text-sm font-bold text-slate-800 mb-4 text-center">Enlace de acceso del conductor</p>
            <div className="flex justify-center mb-5">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <QRCode value={createdLink.url} size={180} />
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-600 break-all font-mono">{createdLink.url}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdLink.url);
                  setCopied('created');
                  setTimeout(() => setCopied(null), 2000);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {copied === 'created' ? <><Check size={18} />Copiado</> : <><Copy size={18} />Copiar enlace</>}
              </button>
              <button
                onClick={() => handleShareWhatsApp(
                  createdLink.url.split('token=')[1],
                  createdLink.name
                )}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 size={18} />
                Compartir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (view === 'form-driver') {
    return (
      <AppLayout activeNav="equipo" onNavigate={handleNavItem} onLogout={onLogout} pageTitle={isCargador ? 'Agregar Transportista' : 'Agregar Conductor'} onBack={() => { resetDriverForm(); setView('list'); }}>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <form onSubmit={handleAddDriver} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200/80 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5">
                <p className="text-blue-800 text-xs font-medium">
                  {isCargador ? (
                    <>El transportista iniciara sesion en <span className="font-bold">{window.location.origin}/conductor</span> con su NIF y PIN. El transportista podra cambiar su PIN en cualquier momento.</>
                  ) : (
                    <>El conductor iniciara sesion en <span className="font-bold">{window.location.origin}/conductor</span> con su DNI y PIN. El conductor podra cambiar su PIN en cualquier momento.</>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={driverForm.fullName}
                  onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                  placeholder={isCargador ? 'Nombre del transportista' : 'Nombre del conductor'}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isCargador ? 'NIF' : 'DNI / NIE'}
                </label>
                <input
                  type="text"
                  value={driverForm.dni}
                  onChange={(e) => setDriverForm({ ...driverForm, dni: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                  placeholder="Ej: 12345678A"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">PIN inicial (4 digitos)</label>
                <div className="flex gap-3 justify-center">
                  {driverForm.pin.map((digit, i) => (
                    <input
                      key={i}
                      id={`pin-form-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinInput(driverForm.pin, i, e.target.value, (arr) => setDriverForm({ ...driverForm, pin: arr }), 'form')}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && i > 0) {
                          const prev = document.getElementById(`pin-form-${i - 1}`);
                          prev?.focus();
                        }
                      }}
                      className="w-14 h-16 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      disabled={saving}
                    />
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2 text-center">{isCargador ? 'El transportista podra cambiar este PIN despues' : 'El conductor podra cambiar este PIN despues'}</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={20} className="animate-spin" />Creando...</> : (isCargador ? 'Crear Transportista' : 'Crear Conductor')}
              </button>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (view === 'form-admin') {
    return (
      <AppLayout activeNav="equipo" onNavigate={handleNavItem} onLogout={onLogout} pageTitle="Agregar Administrador" onBack={() => { resetAdminForm(); setView('list'); }}>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <form onSubmit={handleAddAdmin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200/80 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5">
                <p className="text-blue-800 text-xs font-medium">
                  El nuevo administrador podra iniciar sesion con el email y la contraseña que establezcas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                  placeholder="Nombre del administrador"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5"><Mail size={14} />Email</span>
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                  placeholder="correo@ejemplo.com"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5"><Lock size={14} />Contraseña temporal</span>
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                  placeholder="Minimo 6 caracteres"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  DNI / NIE <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={adminForm.dni}
                  onChange={(e) => setAdminForm({ ...adminForm, dni: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900"
                  placeholder="Ej: 12345678A"
                  disabled={saving}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={20} className="animate-spin" />Creando...</> : 'Crear Administrador'}
              </button>
            </form>
          </div>
        </div>

        {showDuplicateEmailModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">Correo ya registrado</h3>
                  <p className="text-sm text-slate-600">
                    El correo <span className="font-semibold text-slate-800">{adminForm.email}</span> ya esta registrado en el sistema. Por favor, utiliza una direccion de correo diferente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDuplicateEmailModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
              >
                Entendido, usar otro correo
              </button>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  const currentList = activeTab === 'conductores' ? drivers : admins;

  return (
    <AppLayout activeNav="equipo" onNavigate={handleNavItem} onLogout={onLogout}>
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">
                {editingMember.role === 'admin' ? 'Editar administrador' : 'Editar conductor'}
              </h2>
              <button onClick={() => setEditingMember(null)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditMember} className="space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200/80 text-red-700 px-3 py-2.5 rounded-xl text-xs font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  disabled={editSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  DNI / NIE <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={editDni}
                  onChange={(e) => setEditDni(e.target.value.toUpperCase())}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  placeholder="Ej: 12345678A"
                  disabled={editSaving}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors"
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
            <div className="flex items-start gap-3 mb-5">
              <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  {deleteTarget.role === 'admin' ? 'Eliminar administrador' : 'Eliminar conductor'}
                </h2>
                <p className="text-slate-600 text-sm">
                  Vas a eliminar a <span className="font-semibold text-slate-900">{deleteTarget.full_name}</span>.
                  {deleteTarget.id === profile?.id && (
                    <span className="text-red-600 font-medium"> Esto cerrara tu sesion inmediatamente.</span>
                  )}
                  {' '}Esta accion no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeleteMember}
                disabled={deleteConfirming}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {deleteConfirming ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Eliminar
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteConfirming}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl space-y-5">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
            {success}
          </div>
        )}
        {error && !saving && (
          <div className="bg-red-50 border border-red-200/80 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Miembros del equipo</h3>
            <p className="text-sm text-slate-500 mt-0.5">{isCargador ? 'Gestiona transportistas y administradores' : 'Gestiona conductores y administradores'}</p>
          </div>
          <button
            onClick={() => activeTab === 'conductores' ? setView('form-driver') : setView('form-admin')}
            className={`rounded-xl py-3 px-5 flex items-center justify-center gap-2.5 transition-colors shadow-sm shrink-0 ${
              activeTab === 'conductores'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
          >
            <UserPlus size={18} strokeWidth={2.5} />
            <span className="text-sm font-bold">
              {activeTab === 'conductores' ? (isCargador ? 'Agregar Transportista' : 'Agregar Conductor') : 'Agregar Admin'}
            </span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('conductores')}
              className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'conductores'
                  ? 'text-slate-900 border-b-2 border-slate-800 bg-slate-50/60'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <User size={16} />
              {isCargador ? 'Transportistas' : 'Conductores'}
              {drivers.length > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'conductores' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                  {drivers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'admins'
                  ? 'text-slate-900 border-b-2 border-slate-800 bg-slate-50/60'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shield size={16} />
              Administradores
              {admins.length > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'admins' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                  {admins.length}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={36} className="animate-spin text-blue-600" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                {activeTab === 'conductores' ? <Users size={24} className="text-slate-400" /> : <Shield size={24} className="text-slate-400" />}
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {activeTab === 'conductores' ? (isCargador ? 'No hay transportistas' : 'No hay conductores') : 'No hay administradores adicionales'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'conductores'
                  ? (isCargador ? 'Agrega transportistas para autocompletar sus datos al crear documentos' : 'Agrega conductores para que puedan crear documentos')
                  : 'Puedes agregar otros administradores para tu empresa'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentList.map((member) => (
                <div key={member.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      member.role === 'admin'
                        ? 'bg-blue-50'
                        : member.link?.is_active === false
                          ? 'bg-red-50'
                          : 'bg-slate-50'
                    }`}>
                      {member.role === 'admin' ? (
                        <Shield size={20} className="text-blue-600" />
                      ) : (
                        <User size={20} className={member.link?.is_active === false ? 'text-red-400' : 'text-slate-500'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-slate-900 truncate">{member.full_name}</h3>
                        {member.role === 'admin' && (
                          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-lg">Admin</span>
                        )}
                        {member.id === profile?.id && (
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-lg">Tu cuenta</span>
                        )}
                        {member.link?.is_active === false && (
                          <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-lg">Inactivo</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {member.role === 'admin' ? member.email : 'Conductor'}
                        {member.dni ? ` · DNI: ${member.dni}` : ''}
                      </p>
                    </div>

                    {member.role === 'admin' ? (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditName(member.full_name);
                            setEditDni(member.dni || '');
                            setEditError('');
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-200/50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200/50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditName(member.full_name);
                            setEditDni(member.dni || '');
                            setEditError('');
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-200/50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200/50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {member.role === 'driver' && member.link && (
                    <div className="mt-3 space-y-2">
                      {changingPin === member.link.id ? (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <p className="text-sm font-semibold text-slate-900 mb-2.5">Nuevo PIN</p>
                          <div className="flex gap-2 justify-center mb-3">
                            {newPinDigits.map((digit, i) => (
                              <input
                                key={i}
                                id={`pin-change-${i}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handlePinInput(newPinDigits, i, e.target.value, setNewPinDigits, 'change')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && !digit && i > 0) {
                                    const prev = document.getElementById(`pin-change-${i - 1}`);
                                    prev?.focus();
                                  }
                                }}
                                className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleChangePin(member.link!.id)}
                              disabled={newPinDigits.join('').length !== 4}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-xs disabled:opacity-30 flex items-center justify-center gap-1 transition-colors"
                            >
                              <Check size={14} />Guardar
                            </button>
                            <button
                              onClick={() => { setChangingPin(null); setNewPinDigits(['', '', '', '']); }}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                              <X size={14} />Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleCopyLink(member.link!.access_token, member.id)}
                            className="flex-1 min-w-[110px] bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 border border-blue-200/50 transition-colors"
                          >
                            {copied === member.id ? <Check size={14} /> : <Copy size={14} />}
                            {copied === member.id ? 'Copiado' : 'Copiar enlace'}
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(member.link!.access_token, member.full_name)}
                            className="flex-1 min-w-[110px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 border border-emerald-200/50 transition-colors"
                          >
                            <Share2 size={14} />WhatsApp
                          </button>
                          <button
                            onClick={() => { setChangingPin(member.link!.id); setNewPinDigits(['', '', '', '']); }}
                            className="flex-1 min-w-[110px] bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 border border-amber-200/50 transition-colors"
                          >
                            <Key size={14} />Cambiar PIN
                          </button>
                          <button
                            onClick={() => handleToggleAccess(member.link!.id, member.link!.is_active)}
                            className={`flex-1 min-w-[110px] py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 border transition-colors ${
                              member.link.is_active
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200/50'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/50'
                            }`}
                          >
                            {member.link.is_active
                              ? <><ToggleRight size={14} />Desactivar</>
                              : <><ToggleLeft size={14} />Activar</>
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

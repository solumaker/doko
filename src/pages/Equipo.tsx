import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Users, User, Trash2, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Profile } from '../lib/supabase';

interface EquipoProps {
  onBack: () => void;
}

type View = 'list' | 'form';

export function Equipo({ onBack }: EquipoProps) {
  const { profile, isAdmin } = useAuth();
  const [view, setView] = useState<View>('list');
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const fetchTeamMembers = async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching team:', fetchError);
    } else {
      setTeamMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [profile?.company_id]);

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setError('');
    setSuccess('');
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.fullName.trim()) {
      setError('Por favor, introduce el nombre del conductor');
      return;
    }
    if (!formData.email.trim()) {
      setError('Por favor, introduce el correo electronico');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    if (!profile?.company_id) {
      setError('Error: No se encontro la empresa');
      return;
    }

    setSaving(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
      },
    });

    if (authError) {
      setSaving(false);
      if (authError.message.includes('already registered')) {
        setError('Este correo electronico ya esta registrado');
      } else {
        setError(authError.message);
      }
      return;
    }

    if (!authData.user) {
      setSaving(false);
      setError('Error al crear el usuario');
      return;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'add_driver_to_company',
      {
        p_user_id: authData.user.id,
        p_full_name: formData.fullName,
        p_email: formData.email,
      }
    );

    setSaving(false);

    if (rpcError) {
      setError('Error al agregar conductor: ' + rpcError.message);
      return;
    }

    if (rpcData && rpcData.error) {
      setError(rpcData.error);
      return;
    }

    setSuccess('Conductor agregado correctamente');
    resetForm();
    fetchTeamMembers();
    setTimeout(() => {
      setView('list');
      setSuccess('');
    }, 1500);
  };

  const handleDeleteDriver = async (driverId: string) => {
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', driverId);

    if (deleteError) {
      setError('Error al eliminar el conductor');
      return;
    }

    setDeleteConfirm(null);
    fetchTeamMembers();
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

        <form onSubmit={handleAddDriver} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border-2 border-green-500 text-green-700 px-4 py-3 rounded-xl text-lg">
              {success}
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-blue-800 text-base">
              El conductor podra iniciar sesion con estos datos y acceder a los vehiculos y lugares de tu empresa.
            </p>
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="Nombre del conductor"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Correo electronico *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="conductor@email.com"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Contrasena inicial *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 pr-14"
                placeholder="Minimo 6 caracteres"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500"
              >
                {showPassword ? <EyeOff size={28} /> : <Eye size={28} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Confirmar contrasena *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="Confirma la contrasena"
                disabled={saving}
              />
            </div>
            <p className="text-slate-500 text-base mt-2">
              El conductor podra cambiar su contrasena despues de iniciar sesion
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
            ) : (
              'AGREGAR CONDUCTOR'
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

      <div className="p-4">
        <button
          onClick={() => setView('form')}
          className="w-full bg-green-600 text-white rounded-xl py-5 px-6 mb-6 flex items-center justify-center gap-3 active:bg-green-700 transition-colors shadow"
        >
          <Plus size={32} strokeWidth={2.5} />
          <span className="text-xl font-bold">AGREGAR CONDUCTOR</span>
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl p-5 shadow border-2 border-slate-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${member.role === 'admin' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    {member.role === 'admin' ? (
                      <Shield size={28} className="text-blue-600" />
                    ) : (
                      <User size={28} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 truncate">
                        {member.full_name}
                      </h3>
                      {member.role === 'admin' && (
                        <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-2 py-1 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-base mt-1">{member.email}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {member.role === 'admin' ? 'Administrador' : 'Conductor'}
                    </p>
                  </div>
                </div>

                {member.role === 'driver' && member.id !== profile?.id && (
                  <>
                    {deleteConfirm === member.id ? (
                      <div className="mt-4 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                        <p className="text-lg font-semibold text-red-800 mb-3">
                          ¿Eliminar este conductor?
                        </p>
                        <p className="text-base text-red-600 mb-3">
                          El conductor ya no podra acceder a la aplicacion.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDeleteDriver(member.id)}
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
                      <div className="mt-4">
                        <button
                          onClick={() => setDeleteConfirm(member.id)}
                          className="w-full bg-red-100 text-red-700 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-red-200"
                        >
                          <Trash2 size={22} />
                          Eliminar acceso
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {teamMembers.length === 0 && (
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

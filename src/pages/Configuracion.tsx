import { useState } from 'react';
import { Building2, Lock, Clock, Save, CheckCircle, AlertCircle, ChevronRight, Infinity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';

interface ConfiguracionProps {
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

type Section = 'cargador' | 'password' | 'visibilidad';

export function Configuracion({ onBack, onLogout, onNavigate }: ConfiguracionProps) {
  const { company, updateCompany, updatePassword } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('cargador');

  const [cargadorForm, setCargadorForm] = useState({
    nombre: company?.name || '',
    nif: company?.cif || '',
    domicilio: company?.address || '',
    poblacion: company?.city || '',
  });
  const [cargadorSaving, setCargadorSaving] = useState(false);
  const [cargadorStatus, setCargadorStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cargadorError, setCargadorError] = useState('');

  const [passForm, setPassForm] = useState({ nueva: '', confirmar: '' });
  const [passSaving, setPassSaving] = useState(false);
  const [passStatus, setPassStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passError, setPassError] = useState('');

  const [sinLimite, setSinLimite] = useState(company?.driver_doc_visibility_days == null);
  const [diasValue, setDiasValue] = useState<string>(
    company?.driver_doc_visibility_days != null ? String(company.driver_doc_visibility_days) : '30'
  );
  const [diasSaving, setDiasSaving] = useState(false);
  const [diasStatus, setDiasStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [diasError, setDiasError] = useState('');

  const handleSaveCargador = async () => {
    setCargadorSaving(true);
    setCargadorStatus('idle');
    const { error } = await updateCompany({
      name: cargadorForm.nombre.trim(),
      cif: cargadorForm.nif.trim(),
      address: cargadorForm.domicilio.trim(),
      city: cargadorForm.poblacion.trim(),
    });
    setCargadorSaving(false);
    if (error) {
      setCargadorError(error);
      setCargadorStatus('error');
    } else {
      setCargadorStatus('success');
      setTimeout(() => setCargadorStatus('idle'), 3000);
    }
  };

  const handleSavePassword = async () => {
    setPassError('');
    if (passForm.nueva.length < 6) {
      setPassError('La contrasena debe tener al menos 6 caracteres.');
      setPassStatus('error');
      return;
    }
    if (passForm.nueva !== passForm.confirmar) {
      setPassError('Las contrasenas no coinciden.');
      setPassStatus('error');
      return;
    }
    setPassSaving(true);
    setPassStatus('idle');
    const { error } = await updatePassword(passForm.nueva);
    setPassSaving(false);
    if (error) {
      setPassError(error);
      setPassStatus('error');
    } else {
      setPassForm({ nueva: '', confirmar: '' });
      setPassStatus('success');
      setTimeout(() => setPassStatus('idle'), 3000);
    }
  };

  const handleSaveDias = async () => {
    setDiasError('');
    let days: number | null = null;
    if (!sinLimite) {
      const parsed = parseInt(diasValue, 10);
      if (isNaN(parsed) || parsed < 1) {
        setDiasError('Introduce un numero de dias valido (minimo 1).');
        setDiasStatus('error');
        return;
      }
      days = parsed;
    }
    setDiasSaving(true);
    setDiasStatus('idle');
    const { error } = await updateCompany({ driver_doc_visibility_days: days });
    setDiasSaving(false);
    if (error) {
      setDiasError(error);
      setDiasStatus('error');
    } else {
      setDiasStatus('success');
      setTimeout(() => setDiasStatus('idle'), 3000);
    }
  };

  const sections: { id: Section; label: string; icon: typeof Building2; desc: string }[] = [
    { id: 'cargador', label: 'Datos de mi empresa', icon: Building2, desc: 'Datos de mi empresa' },
    { id: 'password', label: 'Cambiar contrasena', icon: Lock, desc: 'Actualiza tu acceso' },
    { id: 'visibilidad', label: 'Visibilidad de documentos', icon: Clock, desc: 'Control de acceso para conductores' },
  ];

  return (
    <AppLayout
      activeNav="inicio"
      onNavigate={onNavigate}
      onLogout={onLogout}
      pageTitle="Configuracion"
    >
      <div className="w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-60 shrink-0">
            <nav className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              {sections.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors border-b border-slate-100 last:border-b-0 ${
                    activeSection === id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${activeSection === id ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Icon size={16} className={activeSection === id ? 'text-blue-600' : 'text-slate-500'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold leading-tight ${activeSection === id ? 'text-blue-700' : 'text-slate-800'}`}>{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
                  </div>
                  <ChevronRight size={14} className={activeSection === id ? 'text-blue-400' : 'text-slate-300'} />
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {activeSection === 'cargador' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Datos de mi empresa</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Datos de tu empresa. Estos datos aparecen en todos los documentos de transporte generados.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre / Razon social</label>
                    <input
                      type="text"
                      value={cargadorForm.nombre}
                      onChange={(e) => setCargadorForm((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Empresa S.L."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">NIF / CIF</label>
                    <input
                      type="text"
                      value={cargadorForm.nif}
                      onChange={(e) => setCargadorForm((p) => ({ ...p, nif: e.target.value }))}
                      placeholder="B12345678"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Domicilio</label>
                    <input
                      type="text"
                      value={cargadorForm.domicilio}
                      onChange={(e) => setCargadorForm((p) => ({ ...p, domicilio: e.target.value }))}
                      placeholder="Calle Mayor 1, 2o A"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Poblacion</label>
                    <input
                      type="text"
                      value={cargadorForm.poblacion}
                      onChange={(e) => setCargadorForm((p) => ({ ...p, poblacion: e.target.value }))}
                      placeholder="Madrid"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {cargadorStatus === 'success' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-700">Datos guardados correctamente.</p>
                  </div>
                )}
                {cargadorStatus === 'error' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <p className="text-sm font-medium text-red-700">{cargadorError}</p>
                  </div>
                )}

                <button
                  onClick={handleSaveCargador}
                  disabled={cargadorSaving}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Save size={16} />
                  {cargadorSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            )}

            {activeSection === 'password' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Cambiar contrasena</h2>
                  <p className="text-sm text-slate-500 mt-1">Actualiza la contrasena de acceso a tu cuenta.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nueva contrasena</label>
                    <input
                      type="password"
                      value={passForm.nueva}
                      onChange={(e) => setPassForm((p) => ({ ...p, nueva: e.target.value }))}
                      placeholder="Minimo 6 caracteres"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar contrasena</label>
                    <input
                      type="password"
                      value={passForm.confirmar}
                      onChange={(e) => setPassForm((p) => ({ ...p, confirmar: e.target.value }))}
                      placeholder="Repite la nueva contrasena"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                {passStatus === 'success' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-700">Contrasena actualizada correctamente.</p>
                  </div>
                )}
                {passStatus === 'error' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <p className="text-sm font-medium text-red-700">{passError}</p>
                  </div>
                )}

                <button
                  onClick={handleSavePassword}
                  disabled={passSaving}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Save size={16} />
                  {passSaving ? 'Guardando...' : 'Cambiar contrasena'}
                </button>
              </div>
            )}

            {activeSection === 'visibilidad' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Visibilidad de documentos para conductores</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Controla cuantos dias atras pueden ver sus documentos los conductores. Si un documento supera el limite de dias establecido, dejara de aparecer en su historial aunque no este oculto manualmente.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setSinLimite(true)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                        sinLimite
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Infinity size={16} />
                      Sin limite
                    </button>
                    <button
                      onClick={() => setSinLimite(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                        !sinLimite
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Clock size={16} />
                      Limitar por dias
                    </button>
                  </div>

                  {!sinLimite && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Numero de dias visibles
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          value={diasValue}
                          onChange={(e) => setDiasValue(e.target.value)}
                          className="w-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <span className="text-sm text-slate-500 font-medium">dias desde la creacion del documento</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Los conductores solo veran documentos creados en los ultimos {diasValue || '?'} dias.
                      </p>
                    </div>
                  )}

                  {sinLimite && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200/80 rounded-xl">
                      <Infinity size={16} className="text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-800 font-medium">
                        Los conductores podran ver todos sus documentos sin limite de tiempo, salvo los que esten ocultos manualmente desde la seccion Documentos.
                      </p>
                    </div>
                  )}
                </div>

                {diasStatus === 'success' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-700">Configuracion guardada correctamente.</p>
                  </div>
                )}
                {diasStatus === 'error' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <p className="text-sm font-medium text-red-700">{diasError}</p>
                  </div>
                )}

                <button
                  onClick={handleSaveDias}
                  disabled={diasSaving}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Save size={16} />
                  {diasSaving ? 'Guardando...' : 'Guardar configuracion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Loader2, Building2, User, Briefcase, Truck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CompanyRole } from '../lib/supabase';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

type Step = 1 | 2 | 3;

const inputClass = 'w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 text-slate-900';

export function Register({ onNavigateToLogin }: RegisterProps) {
  const { signUp } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    companyName: string;
    companyCif: string;
    companyAddress: string;
    companyCity: string;
    companyProvince: string;
    companyPostalCode: string;
    companyPhone: string;
    companyRole: CompanyRole | '';
  }>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    companyCif: '',
    companyAddress: '',
    companyCity: '',
    companyProvince: '',
    companyPostalCode: '',
    companyPhone: '',
    companyRole: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      setError('Por favor, introduce tu nombre completo');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Por favor, introduce tu correo electronico');
      return false;
    }
    if (!formData.password) {
      setError('Por favor, introduce una contrasena');
      return false;
    }
    if (formData.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.companyName.trim()) {
      setError('Por favor, introduce el nombre de la empresa');
      return false;
    }
    if (!formData.companyCif.trim()) {
      setError('Por favor, introduce el CIF de la empresa');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.companyRole) {
      setError('Por favor, selecciona tu situacion profesional');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep3()) return;

    setLoading(true);
    const { error: signUpError } = await signUp({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      companyName: formData.companyName,
      companyCif: formData.companyCif,
      companyAddress: formData.companyAddress,
      companyCity: formData.companyCity,
      companyProvince: formData.companyProvince,
      companyPostalCode: formData.companyPostalCode,
      companyPhone: formData.companyPhone,
      companyRole: formData.companyRole as CompanyRole,
    });
    setLoading(false);

    if (signUpError) {
      if (signUpError.includes('already registered')) {
        setError('Este correo electronico ya esta registrado');
      } else {
        setError(signUpError);
      }
    }
  };

  const stepLabels = ['Tus datos', 'Datos de empresa', 'Situacion profesional'];

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={step === 1 ? onNavigateToLogin : handleBack}
              className="self-start mb-4 p-2 text-slate-600 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft size={24} />
            </button>

            <a href="https://documentocontroltransporte.com" className="focus:outline-none">
              <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-12 w-auto object-contain mb-1 cursor-pointer" />
            </a>
            <h2 className="text-lg font-bold text-slate-900 mt-4">Crear Cuenta</h2>
            <p className="text-slate-600 text-sm text-center">
              Paso {step} de 3: {stepLabels[step - 1]}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <User size={16} />
            </div>
            <div className={`w-8 h-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <Building2 size={16} />
            </div>
            <div className={`w-8 h-1 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <Briefcase size={16} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className={inputClass}
                  placeholder="Juan Garcia Lopez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electronico *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={inputClass}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contrasena *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`${inputClass} pr-12`}
                    placeholder="Minimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar contrasena *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className={inputClass}
                  placeholder="Repite la contrasena"
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors">
                SIGUIENTE
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className={inputClass}
                  placeholder="Transportes Garcia S.L."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">CIF *</label>
                <input
                  type="text"
                  value={formData.companyCif}
                  onChange={(e) => updateField('companyCif', e.target.value.toUpperCase())}
                  className={`${inputClass} uppercase`}
                  placeholder="B12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Direccion</label>
                <input
                  type="text"
                  value={formData.companyAddress}
                  onChange={(e) => updateField('companyAddress', e.target.value)}
                  className={inputClass}
                  placeholder="Calle, numero, nave..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Poblacion</label>
                  <input
                    type="text"
                    value={formData.companyCity}
                    onChange={(e) => updateField('companyCity', e.target.value)}
                    className={inputClass}
                    placeholder="Ciudad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">CP</label>
                  <input
                    type="text"
                    value={formData.companyPostalCode}
                    onChange={(e) => updateField('companyPostalCode', e.target.value)}
                    className={inputClass}
                    placeholder="28001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Provincia</label>
                <input
                  type="text"
                  value={formData.companyProvince}
                  onChange={(e) => updateField('companyProvince', e.target.value)}
                  className={inputClass}
                  placeholder="Madrid"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefono</label>
                <input
                  type="tel"
                  value={formData.companyPhone}
                  onChange={(e) => updateField('companyPhone', e.target.value)}
                  className={inputClass}
                  placeholder="+34 912 345 678"
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors">
                SIGUIENTE
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-600 text-center mb-2">
                Selecciona el rol que mejor describe tu actividad
              </p>

              <button
                type="button"
                onClick={() => updateField('companyRole', 'transportista')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all flex items-start gap-4 ${
                  formData.companyRole === 'transportista'
                    ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                disabled={loading}
              >
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  formData.companyRole === 'transportista' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Truck size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">Transportista efectivo</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Ejecutas materialmente el transporte. Anades conductores que acceden a la app con DNI y PIN.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateField('companyRole', 'cargador')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all flex items-start gap-4 ${
                  formData.companyRole === 'cargador'
                    ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                disabled={loading}
              >
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  formData.companyRole === 'cargador' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Package size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">Cargador contractual</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Contratas el transporte con el transportista efectivo. Anades transportistas que acceden con NIF y PIN.
                  </p>
                </div>
              </button>

              <button
                type="submit"
                disabled={loading || !formData.companyRole}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'CREAR MI CUENTA'
                )}
              </button>
            </form>
          )}

          <p className="text-center text-slate-600 mt-6 text-sm">
            ¿Ya tienes cuenta?{' '}
            <button onClick={onNavigateToLogin} className="text-blue-600 hover:text-blue-700 font-semibold">
              Inicia sesion
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

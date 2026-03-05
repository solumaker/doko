import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Loader2, Building2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

type Step = 1 | 2;

export function Register({ onNavigateToLogin }: RegisterProps) {
  const { signUp } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
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

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) return;

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

            <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-12 w-auto object-contain mb-1" />
            <h2 className="text-lg font-bold text-slate-900 mt-4">Crear Cuenta</h2>
            <p className="text-slate-600 text-sm text-center">
              Paso {step} de 2: {step === 1 ? 'Tus datos' : 'Datos de empresa'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <User size={16} />
            </div>
            <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Building2 size={16} />
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="Juan Garcia Lopez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correo electronico *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contrasena *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 pr-12"
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmar contrasena *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="Repite la contrasena"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                SIGUIENTE
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre de la empresa *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="Transportes Garcia S.L."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  CIF *
                </label>
                <input
                  type="text"
                  value={formData.companyCif}
                  onChange={(e) => updateField('companyCif', e.target.value.toUpperCase())}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 uppercase"
                  placeholder="B12345678"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Direccion
                </label>
                <input
                  type="text"
                  value={formData.companyAddress}
                  onChange={(e) => updateField('companyAddress', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="Calle, numero, nave..."
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Poblacion
                  </label>
                  <input
                    type="text"
                    value={formData.companyCity}
                    onChange={(e) => updateField('companyCity', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                    placeholder="Ciudad"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    CP
                  </label>
                  <input
                    type="text"
                    value={formData.companyPostalCode}
                    onChange={(e) => updateField('companyPostalCode', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                    placeholder="28001"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Provincia
                </label>
                <input
                  type="text"
                  value={formData.companyProvince}
                  onChange={(e) => updateField('companyProvince', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="Madrid"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.companyPhone}
                  onChange={(e) => updateField('companyPhone', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                  placeholder="+34 912 345 678"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

import { useState } from 'react';
import { Truck, Eye, EyeOff, ArrowLeft, Loader2, Building2, User } from 'lucide-react';
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
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button
          onClick={step === 1 ? onNavigateToLogin : handleBack}
          className="p-2"
        >
          <ArrowLeft size={32} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Crear Cuenta</h1>
          <p className="text-blue-100 text-base">
            Paso {step} de 2: {step === 1 ? 'Tus datos' : 'Datos de empresa'}
          </p>
        </div>
      </header>

      <div className="flex items-center justify-center gap-2 py-4 px-4 bg-slate-100 border-b border-slate-200">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}
        >
          <User size={20} />
        </div>
        <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}
        >
          <Building2 size={20} />
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-lg mb-6">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-xl">
                <User size={28} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tus datos personales</h2>
                <p className="text-slate-600">Informacion del administrador</p>
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="Juan Garcia Lopez"
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Correo electronico *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Contrasena *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 pr-14"
                  placeholder="Minimo 6 caracteres"
                  autoComplete="new-password"
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
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="Repite la contrasena"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white text-xl font-bold py-5 rounded-xl active:bg-blue-700 transition-colors mt-6"
            >
              SIGUIENTE
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Building2 size={28} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Datos de la empresa</h2>
                <p className="text-slate-600">Informacion fiscal y de contacto</p>
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Nombre de la empresa *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="Transportes Garcia S.L."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                CIF *
              </label>
              <input
                type="text"
                value={formData.companyCif}
                onChange={(e) => updateField('companyCif', e.target.value.toUpperCase())}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 uppercase"
                placeholder="B12345678"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Direccion
              </label>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => updateField('companyAddress', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="Calle, numero, nave..."
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-semibold text-slate-900 mb-2">
                  Poblacion
                </label>
                <input
                  type="text"
                  value={formData.companyCity}
                  onChange={(e) => updateField('companyCity', e.target.value)}
                  className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                  placeholder="Ciudad"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-slate-900 mb-2">
                  CP
                </label>
                <input
                  type="text"
                  value={formData.companyPostalCode}
                  onChange={(e) => updateField('companyPostalCode', e.target.value)}
                  className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                  placeholder="28001"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Provincia
              </label>
              <input
                type="text"
                value={formData.companyProvince}
                onChange={(e) => updateField('companyProvince', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="Madrid"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-slate-900 mb-2">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.companyPhone}
                onChange={(e) => updateField('companyPhone', e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
                placeholder="+34 912 345 678"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-xl active:bg-green-700 transition-colors mt-6 disabled:bg-green-400 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={28} className="animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <Truck size={28} />
                  CREAR MI CUENTA
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-slate-500 mt-8 text-base">
          ¿Ya tienes cuenta?{' '}
          <button onClick={onNavigateToLogin} className="text-blue-600 font-semibold">
            Inicia sesion
          </button>
        </p>
      </div>
    </div>
  );
}

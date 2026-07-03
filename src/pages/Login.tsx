import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToDriverLogin?: () => void;
}

export function Login({ onNavigateToRegister, onNavigateToForgotPassword, onNavigateToDriverLogin }: LoginProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, rellena todos los campos');
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      if (signInError.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos');
      } else {
        setError(signInError);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <a
          href="https://www.documentocontroltransporte.com/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Volver
        </a>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <div className="flex flex-col items-center mb-8">
            <a href="https://documentocontroltransporte.com" className="focus:outline-none">
              <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-16 w-auto object-contain mb-2 cursor-pointer" />
            </a>
            <p className="text-slate-500 text-sm mt-1 text-center">
              Tu documento de control digital
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Contrasena
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400 pr-12"
                  placeholder="Tu contrasena"
                  autoComplete="current-password"
                  disabled={loading}
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                ¿Olvidaste tu contrasena?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'ENTRAR'
              )}
            </button>
          </form>

          <p className="text-center text-slate-600 mt-6 text-sm">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Registrate aqui
            </button>
          </p>

          {onNavigateToDriverLogin && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={onNavigateToDriverLogin}
                className="w-full text-center text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                Soy conductor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

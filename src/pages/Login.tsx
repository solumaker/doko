import { useState } from 'react';
import { Truck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

export function Login({ onNavigateToRegister, onNavigateToForgotPassword }: LoginProps) {
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
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-green-600 text-white text-center py-3 px-4">
        <p className="text-lg font-bold">Prueba gratis 7 dias activa</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4">
            <Truck size={56} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">DOKO</h1>
          <p className="text-slate-600 text-lg mt-2 text-center">
            Tu documento de control digital
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-lg">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-lg font-semibold text-slate-900 mb-2"
            >
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-lg font-semibold text-slate-900 mb-2"
            >
              Contrasena
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900 pr-14"
                placeholder="Tu contrasena"
                autoComplete="current-password"
                disabled={loading}
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

          <button
            type="button"
            onClick={onNavigateToForgotPassword}
            className="text-blue-600 font-semibold text-base"
          >
            ¿Olvidaste tu contrasena?
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-xl font-bold py-5 rounded-xl active:bg-blue-700 transition-colors mt-6 disabled:bg-blue-400 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'ENTRAR'
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 mt-8 text-base">
          ¿No tienes cuenta?{' '}
          <button
            onClick={onNavigateToRegister}
            className="text-blue-600 font-semibold"
          >
            Registrate aqui
          </button>
        </p>
      </div>
    </div>
  );
}

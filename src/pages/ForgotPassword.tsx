import { useState } from 'react';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
  onNavigateToLanding: () => void;
}

export function ForgotPassword({ onNavigateToLogin, onNavigateToLanding }: ForgotPasswordProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor, introduce tu correo electronico');
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email);
    setLoading(false);

    if (resetError) {
      setError(resetError);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
            <button
              onClick={onNavigateToLogin}
              className="mb-6 p-2 text-slate-600 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="bg-green-50 p-5 rounded-full mb-4">
                <CheckCircle size={48} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                Correo enviado
              </h2>
              <p className="text-sm text-slate-600 mb-2">
                Hemos enviado un enlace de recuperacion a{' '}
                <span className="font-semibold text-slate-900">{email}</span>
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contrasena.
              </p>
              <button
                onClick={onNavigateToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                VOLVER A INICIAR SESION
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <button
            onClick={onNavigateToLogin}
            className="mb-6 p-2 text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col items-center mb-8">
            <button onClick={onNavigateToLanding} className="focus:outline-none">
              <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-12 w-auto object-contain mb-4 cursor-pointer" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 text-center">
              ¿Olvidaste tu contrasena?
            </h2>
            <p className="text-slate-600 text-sm mt-2 text-center">
              Te enviaremos un enlace para restablecerla
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-400"
                placeholder="tu@email.com"
                autoComplete="email"
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
                  Enviando...
                </>
              ) : (
                'ENVIAR ENLACE'
              )}
            </button>
          </form>

          <p className="text-center text-slate-600 mt-6 text-sm">
            ¿Recordaste tu contrasena?{' '}
            <button onClick={onNavigateToLogin} className="text-blue-600 hover:text-blue-700 font-semibold">
              Volver a iniciar sesion
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

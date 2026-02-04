import { useState } from 'react';
import { Truck, ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
}

export function ForgotPassword({ onNavigateToLogin }: ForgotPasswordProps) {
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
      <div className="min-h-screen bg-white flex flex-col">
        <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
          <button onClick={onNavigateToLogin} className="p-2">
            <ArrowLeft size={32} />
          </button>
          <h1 className="text-xl font-bold">Recuperar Contrasena</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="bg-green-100 p-6 rounded-full mb-6">
            <CheckCircle size={64} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">
            Correo enviado
          </h2>
          <p className="text-lg text-slate-600 text-center mb-8">
            Hemos enviado un enlace de recuperacion a{' '}
            <span className="font-semibold text-slate-900">{email}</span>
          </p>
          <p className="text-base text-slate-500 text-center mb-8">
            Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contrasena.
          </p>
          <button
            onClick={onNavigateToLogin}
            className="w-full bg-blue-600 text-white text-xl font-bold py-5 rounded-xl active:bg-blue-700"
          >
            VOLVER A INICIAR SESION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-4">
        <button onClick={onNavigateToLogin} className="p-2">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-xl font-bold">Recuperar Contrasena</h1>
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-100 p-4 rounded-2xl mb-4">
            <Mail size={56} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            ¿Olvidaste tu contrasena?
          </h2>
          <p className="text-slate-600 text-lg mt-2 text-center">
            Te enviaremos un enlace para restablecerla
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl text-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">
              Correo electronico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none text-slate-900"
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-xl font-bold py-5 rounded-xl active:bg-blue-700 transition-colors mt-6 disabled:bg-blue-400 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                Enviando...
              </>
            ) : (
              'ENVIAR ENLACE'
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 mt-8 text-base">
          ¿Recordaste tu contrasena?{' '}
          <button onClick={onNavigateToLogin} className="text-blue-600 font-semibold">
            Volver a iniciar sesion
          </button>
        </p>
      </div>
    </div>
  );
}

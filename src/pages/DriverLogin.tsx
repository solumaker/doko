import { useState, useCallback, useRef } from 'react';
import { Loader2, Delete, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DriverLoginProps {
  onNavigateToLogin: () => void;
}

export function DriverLogin({ onNavigateToLogin }: DriverLoginProps) {
  const { driverLoginByDni } = useAuth();
  const [dni, setDni] = useState('');
  const [step, setStep] = useState<'dni' | 'pin'>('dni');
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const autoSubmitRef = useRef(false);

  const handleDniSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = dni.trim();
    if (!trimmed) {
      setError('Introduce tu DNI / NIE');
      return;
    }
    setStep('pin');
  };

  const handleSubmit = useCallback(async (pin: string) => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    setLoading(true);
    setError('');

    const result = await driverLoginByDni(dni.trim(), pin);

    if (result.error) {
      setError(result.error);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits(['', '', '', '']);
        autoSubmitRef.current = false;
      }, 600);
      setLoading(false);
    }
  }, [dni, driverLoginByDni]);

  const handleDigitPress = useCallback((digit: string) => {
    if (loading) return;
    setError('');

    setDigits(prev => {
      const next = [...prev];
      const emptyIdx = next.findIndex(d => d === '');
      if (emptyIdx === -1) return prev;
      next[emptyIdx] = digit;

      if (emptyIdx === 3) {
        const pin = next.join('');
        setTimeout(() => handleSubmit(pin), 150);
      }

      return next;
    });
  }, [loading, handleSubmit]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setError('');
    setDigits(prev => {
      const next = [...prev];
      const lastFilledIdx = next.map((d, i) => d !== '' ? i : -1).filter(i => i !== -1).pop();
      if (lastFilledIdx !== undefined && lastFilledIdx >= 0) {
        next[lastFilledIdx] = '';
      }
      return next;
    });
  }, [loading]);

  const handleBackToLogin = () => {
    onNavigateToLogin();
  };

  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          <div className="mb-4 bg-white rounded-2xl p-3">
            <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-12 w-auto object-contain" />
          </div>

          <p className="text-blue-300 text-lg font-medium mb-1">
            Acceso Conductor
          </p>
          <p className="text-slate-400 text-base mb-6">
            DNI: {dni.trim().toUpperCase()}
          </p>

          <p className="text-slate-300 text-lg mb-5">Introduce tu PIN</p>

          <div
            className={`flex gap-4 mb-4 transition-transform ${
              shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
            }`}
          >
            {digits.map((digit, i) => (
              <div
                key={i}
                className={`w-16 h-20 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-colors ${
                  digit
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : error
                    ? 'bg-red-600/10 border-red-500'
                    : 'bg-slate-800 border-slate-600 text-slate-500'
                }`}
              >
                {digit ? '\u2022' : ''}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-base font-medium mb-2">{error}</p>
          )}

          {loading && (
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={20} className="animate-spin text-blue-400" />
              <span className="text-blue-300 text-base">Verificando...</span>
            </div>
          )}

          <button
            onClick={() => {
              setStep('dni');
              setDigits(['', '', '', '']);
              setError('');
              autoSubmitRef.current = false;
            }}
            className="mt-4 text-slate-500 hover:text-slate-300 text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={16} />
            Cambiar DNI
          </button>
        </div>

        <div className="px-6 pb-8">
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 max-w-xs mx-auto">
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleDigitPress(num)}
                  disabled={loading}
                  className="h-16 rounded-xl bg-slate-700/50 text-white text-2xl font-bold active:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600/50"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handleDigitPress('0')}
                disabled={loading}
                className="h-16 rounded-xl bg-slate-700/50 text-white text-2xl font-bold active:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600/50"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="h-16 rounded-xl bg-slate-700/50 text-slate-400 flex items-center justify-center active:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600/50"
              >
                <Delete size={28} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 bg-white rounded-2xl p-3">
            <img src="/DOKO_LOGO.jpeg" alt="DOKO" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-white text-xl font-bold">Acceso Conductor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Introduce tu DNI para continuar
          </p>
        </div>

        <form onSubmit={handleDniSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              value={dni}
              onChange={(e) => {
                setDni(e.target.value.toUpperCase());
                setError('');
              }}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-lg text-white text-center font-semibold tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
              placeholder="DNI / NIE"
              autoComplete="off"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors text-lg"
          >
            Continuar
          </button>
        </form>

        <button
          onClick={handleBackToLogin}
          className="w-full mt-6 text-slate-500 hover:text-slate-300 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={16} />
          Acceso para empresas
        </button>
      </div>
    </div>
  );
}

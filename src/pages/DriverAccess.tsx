import { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, Loader2, Delete, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/supabase';

interface DriverAccessProps {
  accessToken: string;
  onSuccess: () => void;
}

interface LinkInfo {
  driver_name: string;
  company_name: string;
  is_active: boolean;
}

export function DriverAccess({ accessToken, onSuccess }: DriverAccessProps) {
  const { driverLogin } = useAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [linkError, setLinkError] = useState('');
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data, ok } = await callEdgeFunction('driver-auth', {
          action: 'info',
          access_token: accessToken,
        });
        if (!ok || data.error) {
          setLinkError(data.error || 'Enlace no valido');
        } else if (!data.is_active) {
          setLinkError('Este enlace ha sido desactivado. Contacta con tu empresa.');
        } else {
          setLinkInfo(data);
        }
      } catch {
        setLinkError('Error de conexion');
      }
      setLoadingInfo(false);
    };
    fetchInfo();
  }, [accessToken]);

  const handleSubmit = useCallback(async (pin: string) => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    setLoading(true);
    setError('');

    const result = await driverLogin(accessToken, pin);

    if (result.error) {
      setError(result.error);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits(['', '', '', '']);
        autoSubmitRef.current = false;
      }, 600);
      setLoading(false);
    } else {
      onSuccess();
    }
  }, [accessToken, driverLogin, onSuccess]);

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

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <AlertCircle size={56} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Enlace no disponible</h2>
          <p className="text-red-300 text-lg">{linkError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div className="bg-blue-600 p-3 rounded-2xl mb-3">
          <Truck size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">DOKO</h1>
        <p className="text-blue-300 text-lg font-medium mb-1">
          {linkInfo?.company_name}
        </p>
        <p className="text-slate-400 text-base mb-6">
          Hola, {linkInfo?.driver_name}
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
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigitPress(num)}
              disabled={loading}
              className="h-16 rounded-xl bg-slate-800 text-white text-2xl font-bold active:bg-slate-700 transition-colors disabled:opacity-50 border border-slate-700"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigitPress('0')}
            disabled={loading}
            className="h-16 rounded-xl bg-slate-800 text-white text-2xl font-bold active:bg-slate-700 transition-colors disabled:opacity-50 border border-slate-700"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-16 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center active:bg-slate-700 transition-colors disabled:opacity-50 border border-slate-700"
          >
            <Delete size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}

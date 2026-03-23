import { useState, useRef } from 'react';
import { X, Loader2, Check, Delete } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChangePinModalProps {
  onClose: () => void;
}

type Step = 'current' | 'new' | 'success';

export function ChangePinModal({ onClose }: ChangePinModalProps) {
  const { driverChangePin } = useAuth();
  const [step, setStep] = useState<Step>('current');
  const [currentDigits, setCurrentDigits] = useState<string[]>(['', '', '', '']);
  const [newDigits, setNewDigits] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const autoSubmitRef = useRef(false);
  const currentDigitsRef = useRef<string[]>(['', '', '', '']);
  const newDigitsRef = useRef<string[]>(['', '', '', '']);

  const activeDigits = step === 'current' ? currentDigits : newDigits;
  const setActiveDigits = step === 'current' ? setCurrentDigits : setNewDigits;
  const activeRef = step === 'current' ? currentDigitsRef : newDigitsRef;

  const handleSubmitPin = async (currentPin: string, newPin: string) => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    setLoading(true);
    setError('');

    const result = await driverChangePin(currentPin, newPin);

    if (result.error) {
      setError(result.error);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        if (result.error?.includes('actual')) {
          setCurrentDigits(['', '', '', '']);
          setNewDigits(['', '', '', '']);
          currentDigitsRef.current = ['', '', '', ''];
          newDigitsRef.current = ['', '', '', ''];
          setStep('current');
        } else {
          setNewDigits(['', '', '', '']);
          newDigitsRef.current = ['', '', '', ''];
        }
        autoSubmitRef.current = false;
      }, 600);
      setLoading(false);
    } else {
      setStep('success');
      setLoading(false);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (loading) return;
    setError('');

    setActiveDigits(prev => {
      const next = [...prev];
      const emptyIdx = next.findIndex(d => d === '');
      if (emptyIdx === -1) return prev;
      next[emptyIdx] = digit;
      activeRef.current = next;

      if (emptyIdx === 3) {
        if (step === 'current') {
          setTimeout(() => setStep('new'), 200);
        } else {
          const cp = currentDigitsRef.current.join('');
          const np = next.join('');
          setTimeout(() => handleSubmitPin(cp, np), 200);
        }
      }

      return next;
    });
  };

  const handleDelete = () => {
    if (loading) return;
    setError('');
    setActiveDigits(prev => {
      const next = [...prev];
      const lastFilledIdx = next.map((d, i) => d !== '' ? i : -1).filter(i => i !== -1).pop();
      if (lastFilledIdx !== undefined && lastFilledIdx >= 0) {
        next[lastFilledIdx] = '';
      }
      activeRef.current = next;
      return next;
    });
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">PIN actualizado</h3>
          <p className="text-sm text-slate-500 mb-5">Tu nuevo PIN ya esta activo</p>
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-700 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-slate-900 w-full max-w-sm sm:rounded-2xl rounded-t-2xl pb-8 pt-5 px-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">
            {step === 'current' ? 'PIN actual' : 'Nuevo PIN'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-5 text-center">
          {step === 'current'
            ? 'Introduce tu PIN actual'
            : 'Introduce tu nuevo PIN de 4 digitos'}
        </p>

        <div
          className={`flex gap-4 justify-center mb-4 transition-transform ${
            shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
          }`}
        >
          {activeDigits.map((digit, i) => (
            <div
              key={i}
              className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                digit
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : error
                  ? 'bg-red-600/10 border-red-500'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {digit ? '\u2022' : ''}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium mb-3 text-center">{error}</p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 size={18} className="animate-spin text-blue-400" />
            <span className="text-blue-300 text-sm">Guardando...</span>
          </div>
        )}

        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 max-w-[280px] mx-auto">
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleDigitPress(num)}
                disabled={loading}
                className="h-14 rounded-xl bg-slate-700/50 text-white text-xl font-bold active:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600/50"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleDigitPress('0')}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-700/50 text-white text-xl font-bold active:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600/50"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-700/50 text-slate-400 flex items-center justify-center active:bg-slate-600 transition-colors disabled:opacity-50 border border-slate-600/50"
            >
              <Delete size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

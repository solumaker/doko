import { useState, useEffect } from 'react';
import { Smartphone, Check, Copy, Share2 } from 'lucide-react';

type ButtonState = 'idle' | 'shared' | 'copied';

export function SaveAccessButton() {
  const [state, setState] = useState<ButtonState>('idle');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(touch || mobile);
  }, []);

  const getFullUrl = () => {
    const token = localStorage.getItem('doko_driver_token');
    if (!token) return null;
    return `${window.location.origin}?token=${token}`;
  };

  const handleSave = async () => {
    const url = getFullUrl();
    if (!url) return;

    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: 'DOKO - Mi Acceso',
          text: 'Mi acceso directo a DOKO',
          url,
        });
        setState('shared');
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
        await fallbackCopy(url);
      }
    } else {
      await fallbackCopy(url);
    }
  };

  const fallbackCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      const input = document.createElement('input');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setState('copied');
    }
  };

  useEffect(() => {
    if (state !== 'idle') {
      const timer = setTimeout(() => setState('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const token = localStorage.getItem('doko_driver_token');
  if (!token) return null;

  return (
    <button
      onClick={handleSave}
      className={`w-full rounded-2xl py-4 px-5 mb-4 border transition-all duration-300 ${
        state === 'idle'
          ? 'bg-white border-slate-200 active:bg-blue-50'
          : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-colors duration-300 ${
          state === 'idle' ? 'bg-blue-50' : 'bg-emerald-100'
        }`}>
          {state === 'idle' ? (
            isMobile ? <Share2 size={20} className="text-blue-600" /> : <Copy size={20} className="text-blue-600" />
          ) : (
            <Check size={20} className="text-emerald-600" />
          )}
        </div>
        <div className="text-left flex-1">
          <span className={`text-sm font-semibold block transition-colors duration-300 ${
            state === 'idle' ? 'text-slate-800' : 'text-emerald-700'
          }`}>
            {state === 'idle'
              ? 'Guardar Acceso'
              : state === 'shared'
                ? 'Enlace compartido'
                : 'Enlace copiado'}
          </span>
          <span className={`text-xs transition-colors duration-300 ${
            state === 'idle' ? 'text-slate-400' : 'text-emerald-500'
          }`}>
            {state === 'idle'
              ? isMobile
                ? 'Crea un acceso directo en tu movil'
                : 'Copia tu enlace de acceso'
              : state === 'copied'
                ? 'Pega este enlace al crear un acceso directo'
                : 'Ya puedes acceder desde tu pantalla de inicio'}
          </span>
        </div>
        {state === 'idle' && (
          <Smartphone size={18} className="text-slate-300 shrink-0" />
        )}
      </div>
    </button>
  );
}

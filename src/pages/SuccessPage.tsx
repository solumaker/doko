import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  autonomo: 'Autónomo',
  pyme: 'Pyme',
  flotas: 'Flota',
  grandes_empresas: 'Grandes Empresas',
};

export function SuccessPage() {
  const { usage, loading } = useSubscription();
  const [dots, setDots] = useState('');

  // Animated dots while loading
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setDots(d => d.length < 3 ? d + '.' : ''), 400);
    return () => clearInterval(iv);
  }, [loading]);

  const planLabel = usage?.plan
    ? (PLAN_LABELS[usage.plan.toLowerCase()] ?? usage.plan)
    : null;

  const isOnePurchase = !usage?.plan || usage.is_trial_active;

  function goHome() {
    window.location.href = '/';
  }

  function goDashboard() {
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/10 border border-gray-100 overflow-hidden">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="p-8 text-center">
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-10" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isOnePurchase ? '¡Compra completada!' : '¡Suscripción activada!'}
            </h1>

            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              {isOnePurchase
                ? 'Tu paquete de documentos ha sido añadido a tu cuenta correctamente.'
                : 'Tu plan ha sido activado. Ya puedes empezar a generar documentos de control.'}
            </p>

            {/* Plan pill */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activando plan{dots}</span>
              </div>
            ) : planLabel && !isOnePurchase ? (
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <span>Plan {planLabel} activo</span>
              </div>
            ) : null}

            {/* Stats row */}
            {usage && !loading && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {isOnePurchase
                      ? usage.documents_extra_remaining
                      : usage.document_limit}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isOnePurchase ? 'Docs. disponibles' : 'Docs. por mes'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {usage.user_limit || '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Usuarios incluidos</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={goDashboard}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Ir al panel
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={goHome}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
                Nuevo documento
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Procesado de forma segura por Stripe · ¿Dudas?{' '}
          <a href="mailto:soporte@doko.app" className="underline hover:text-gray-600">
            soporte@doko.app
          </a>
        </p>
      </div>
    </div>
  );
}
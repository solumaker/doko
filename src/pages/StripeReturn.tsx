import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

interface StripeReturnProps {
  success: boolean;
  isPack: boolean;
  onContinue: () => void;
}

export function StripeReturn({ success, isPack, onContinue }: StripeReturnProps) {
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        refreshSubscription();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, refreshSubscription]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-sm w-full overflow-hidden animate-scaleIn">
        {success ? (
          <>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-10 text-center">
              <CheckCircle2 size={48} className="text-white mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white">
                {isPack ? 'Documentos adquiridos' : 'Suscripcion activada'}
              </h2>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-slate-600">
                {isPack
                  ? 'Se han anadido +10 documentos a tu saldo.'
                  : 'Tu plan ya esta activo. Puedes empezar a crear documentos.'}
              </p>
              <button
                onClick={onContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base active:bg-blue-700 transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-800 px-6 py-10 text-center">
              <XCircle size={48} className="text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white">Pago cancelado</h2>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-slate-600">
                No se ha realizado ningun cargo. Puedes intentarlo de nuevo cuando quieras.
              </p>
              <button
                onClick={onContinue}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold text-base active:bg-slate-900 transition-colors"
              >
                Volver
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

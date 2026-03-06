import { ShieldX, CreditCard, FileText } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  onSelectPlan: () => void;
  onViewHistory: () => void;
}

export function SubscriptionExpiredModal({ onSelectPlan, onViewHistory }: SubscriptionExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-scaleIn">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-8 text-center">
          <div className="bg-white/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Tu suscripcion ha finalizado
          </h2>
          <p className="text-slate-300 text-sm">
            Tu plan ha expirado. Para seguir usando DOKO, elige un nuevo plan.
          </p>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600 text-center mb-4">
            Puedes seguir consultando tu historial de documentos generados.
          </p>

          <button
            onClick={onSelectPlan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-3 active:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <CreditCard size={20} />
            Elegir un plan
          </button>

          <button
            onClick={onViewHistory}
            className="w-full text-slate-500 py-2.5 text-sm font-medium flex items-center justify-center gap-2 active:text-slate-700 transition-colors"
          >
            <FileText size={16} />
            Ver historial de documentos generados
          </button>
        </div>
      </div>
    </div>
  );
}

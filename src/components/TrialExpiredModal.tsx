import { Clock, CreditCard, FileText } from 'lucide-react';
import { TRIAL_DOC_LIMIT } from '../context/SubscriptionContext';

interface TrialExpiredModalProps {
  onSelectPlan: () => void;
  onViewHistory: () => void;
}

export function TrialExpiredModal({ onSelectPlan, onViewHistory }: TrialExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-scaleIn">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-8 text-center">
          <div className="bg-white/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Tu prueba gratuita ha finalizado
          </h2>
          <p className="text-slate-300 text-sm">
            La prueba incluye 7 dias o {TRIAL_DOC_LIMIT} documentos, lo que ocurra primero
          </p>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600 text-center mb-4">
            Para seguir creando documentos de control, elige un plan que se adapte a tu negocio.
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

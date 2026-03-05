import { Clock, CreditCard, FileText, Users } from 'lucide-react';
import { TRIAL_DOC_LIMIT } from '../context/SubscriptionContext';

interface TrialExpiredModalProps {
  onSelectPlan: () => void;
  onViewHistory: () => void;
  onManageUsers: () => void;
  hasDrivers: boolean;
}

export function TrialExpiredModal({ onSelectPlan, onViewHistory, onManageUsers, hasDrivers }: TrialExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-8 text-center">
          <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Tu prueba gratuita ha finalizado
          </h2>
          <p className="text-slate-300 text-base">
            La prueba incluye 7 dias o {TRIAL_DOC_LIMIT} documentos, lo que ocurra primero
          </p>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-base text-slate-600 text-center mb-4">
            Para seguir creando documentos de control, elige un plan que se adapte a tu negocio.
          </p>

          <button
            onClick={onSelectPlan}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <CreditCard size={22} />
            Elegir un plan
          </button>

          {hasDrivers && (
            <button
              onClick={onManageUsers}
              className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 active:bg-slate-200 transition-colors"
            >
              <Users size={18} />
              Gestionar usuarios
            </button>
          )}

          <button
            onClick={onViewHistory}
            className="w-full text-slate-500 py-3 text-base font-medium flex items-center justify-center gap-2 active:text-slate-700 transition-colors"
          >
            <FileText size={18} />
            Ver historial de documentos generados
          </button>
        </div>
      </div>
    </div>
  );
}

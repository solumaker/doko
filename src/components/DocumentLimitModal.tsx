import { AlertTriangle, CreditCard, ArrowUpCircle, X } from 'lucide-react';

interface DocumentLimitModalProps {
  isAdmin: boolean;
  onClose: () => void;
  onBuyPack?: () => void;
  onUpgradePlan?: () => void;
}

export function DocumentLimitModal({ isAdmin, onClose, onBuyPack, onUpgradePlan }: DocumentLimitModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-scaleIn">
        <div className="bg-amber-500 px-6 py-6 text-center relative">
          {isAdmin && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 active:text-white"
            >
              <X size={20} />
            </button>
          )}
          <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Limite de documentos alcanzado
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {isAdmin ? (
            <>
              <p className="text-sm text-slate-600 text-center">
                Has utilizado todos los documentos disponibles en tu plan este mes.
              </p>

              <button
                onClick={onBuyPack}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-3 active:bg-blue-700 transition-colors"
              >
                <CreditCard size={18} />
                Comprar +10 documentos
              </button>

              <button
                onClick={onUpgradePlan}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:bg-slate-200 transition-colors"
              >
                <ArrowUpCircle size={18} />
                Mejorar mi plan
              </button>

              <button
                onClick={onClose}
                className="w-full text-slate-400 py-2 text-xs font-medium active:text-slate-600"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 text-center">
                Contacta con tu administrador para ampliar el limite de documentos.
              </p>

              <button
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold text-base active:bg-slate-900 transition-colors"
              >
                Entendido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

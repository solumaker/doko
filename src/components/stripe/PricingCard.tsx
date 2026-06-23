import React, { useState } from 'react';
import { Check, Loader2, Zap } from 'lucide-react';
import { StripeProduct } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';

interface PricingCardProps {
  product: StripeProduct;
  highlighted?: boolean;
  currentPlan?: string | null;
  badge?: string;
}

export function PricingCard({ product, highlighted, currentPlan, badge }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentPlan =
    currentPlan?.toLowerCase() === product.name.toLowerCase() ||
    currentPlan === product.id;

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      await createCheckoutSession({ priceId: product.priceId, mode: product.mode });
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  const features = getFeatures(product);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
        highlighted
          ? 'border-blue-500 bg-blue-600 text-white shadow-2xl shadow-blue-500/25 scale-[1.02]'
          : 'border-gray-200 bg-white text-gray-900 shadow-sm hover:shadow-md'
      }`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            {badge}
          </span>
        </div>
      )}

      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {highlighted && <Zap className="w-4 h-4 text-yellow-300" />}
          <h3 className={`text-lg font-semibold ${highlighted ? 'text-white' : 'text-gray-900'}`}>
            {product.name}
          </h3>
        </div>
        <p className={`text-sm mb-4 ${highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
          {product.description}
        </p>

        <div className="flex items-baseline gap-1 mb-6">
          <span className={`text-4xl font-bold tracking-tight ${highlighted ? 'text-white' : 'text-gray-900'}`}>
            {product.currency}{product.price.toFixed(2).replace('.', ',')}
          </span>
          {product.mode === 'subscription' && (
            <span className={`text-sm ${highlighted ? 'text-blue-200' : 'text-gray-400'}`}>/mes</span>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-300 bg-red-500/20 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || isCurrentPlan}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            isCurrentPlan
              ? highlighted
                ? 'bg-white/20 text-white cursor-default'
                : 'bg-gray-100 text-gray-400 cursor-default'
              : highlighted
              ? 'bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-sm'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirigiendo…
            </>
          ) : isCurrentPlan ? (
            'Plan actual'
          ) : product.mode === 'payment' ? (
            'Comprar ahora'
          ) : (
            'Suscribirse'
          )}
        </button>
      </div>

      {features.length > 0 && (
        <div className={`px-6 pb-6 pt-2 border-t ${highlighted ? 'border-blue-500/50' : 'border-gray-100'}`}>
          <ul className="space-y-2.5 mt-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${highlighted ? 'text-blue-200' : 'text-blue-500'}`} />
                <span className={`text-sm ${highlighted ? 'text-blue-100' : 'text-gray-600'}`}>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getFeatures(product: StripeProduct): string[] {
  const name = product.name.toLowerCase();
  if (name.includes('flota')) {
    return ['2.500 documentos/mes', 'Usuarios ilimitados', 'Soporte prioritario por teléfono y correo', 'Panel de control avanzado'];
  }
  if (name.includes('pyme')) {
    return ['500 documentos/mes', 'Hasta 10 conductores', 'Soporte prioritario por correo', 'Historial completo'];
  }
  if (name.includes('autónomo') || name.includes('autonomo')) {
    return ['100 documentos/mes', 'Hasta 3 conductores', 'Soporte por correo', 'Historial completo'];
  }
  if (name === 'pro') {
    return ['Documentos ilimitados*', 'Hasta 5 conductores', 'Soporte prioritario', 'Acceso anticipado a nuevas funciones'];
  }
  if (name === 'básico' || name === 'basico') {
    return ['Documentos estándar', '1 conductor', 'Soporte por correo', 'Panel básico'];
  }
  if (name.toLowerCase().includes('paquete')) {
    return ['10 documentos adicionales', 'Sin caducidad', 'Uso inmediato'];
  }
  return [];
}
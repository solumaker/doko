import { supabase } from './supabase';

export interface CheckoutOptions {
  priceId: string;
  mode: 'payment' | 'subscription';
}

export async function createCheckoutSession({ priceId, mode }: CheckoutOptions): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      mode,
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/precios`,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al iniciar el pago');
  }

  const { url } = await response.json();

  if (!url) {
    throw new Error('No se recibió la URL de pago');
  }

  window.location.href = url;
}
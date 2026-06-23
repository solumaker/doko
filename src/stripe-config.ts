export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'payment' | 'subscription';
}

export const STRIPE_PRODUCTS = {
  BASICO: {
    id: 'prod_UkvWIR0eJwQdTL',
    priceId: 'price_1TlPfUBnbfHLJ2lEWjwGUBiK',
    name: 'Básico',
    description: 'Plan Básico de DOKO - documentos de control',
    price: 10.59,
    currency: '€',
    mode: 'subscription' as const,
  },
  PRO: {
    id: 'prod_UkwDIDCjanJlGu',
    priceId: 'price_1TlQLVBnbfHLJ2lECa1hzK42',
    name: 'Pro',
    description: 'Plan Pro de DOKO - documentos de control',
    price: 18.82,
    currency: '€',
    mode: 'subscription' as const,
  },
  AUTONOMO: {
    id: 'prod_U5qUjFnaaa0LT7',
    priceId: 'price_1T7ennBnbfHLJ2lEttin2U6U',
    name: 'Plan Autónomo',
    description: '100 documentos/mes + Soporte por correo.',
    price: 39.00,
    currency: '€',
    mode: 'subscription' as const,
  },
  PYME: {
    id: 'prod_U5SJoJ5JhhEGAH',
    priceId: 'price_1T7HOaBnbfHLJ2lE0ks9Mm3O',
    name: 'Plan Pyme',
    description: '500 documentos/mes + Soporte prioritario por correo.',
    price: 99.00,
    currency: '€',
    mode: 'subscription' as const,
  },
  FLOTA: {
    id: 'prod_U5qVuzeGRpJHeR',
    priceId: 'price_1T7eoABnbfHLJ2lEutKrGJVV',
    name: 'Plan Flota',
    description: '2.500 documentos/mes + Soporte prioritario por teléfono y correo.',
    price: 249.00,
    currency: '€',
    mode: 'subscription' as const,
  },
  PACK_10_DOCS: {
    id: 'prod_UkwxnsPstZZep3',
    priceId: 'price_1TlR3YBnbfHLJ2lEAFuhwkMf',
    name: 'Paquete de 10 documentos',
    description: 'Paquete de 10 documentos de control',
    price: 1.09,
    currency: '€',
    mode: 'payment' as const,
  },
  PACK_10_DOCS_LEGACY: {
    id: 'prod_U7e3emyar86aIJ',
    priceId: 'price_1T9OkzBnbfHLJ2lEJjnXnmiw',
    name: 'Paquete de 10 Documentos de Control',
    description: 'Paquete de 10 Documentos de Control',
    price: 5.00,
    currency: '€',
    mode: 'payment' as const,
  },
} as const;

export const SUBSCRIPTION_PLANS: StripeProduct[] = [
  STRIPE_PRODUCTS.BASICO,
  STRIPE_PRODUCTS.PRO,
  STRIPE_PRODUCTS.AUTONOMO,
  STRIPE_PRODUCTS.PYME,
  STRIPE_PRODUCTS.FLOTA,
];

export const EXTRA_PACKS: StripeProduct[] = [
  STRIPE_PRODUCTS.PACK_10_DOCS,
  STRIPE_PRODUCTS.PACK_10_DOCS_LEGACY,
];
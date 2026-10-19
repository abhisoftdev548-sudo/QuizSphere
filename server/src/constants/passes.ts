export const PASS_PRODUCTS = [
  { key: 'create', name: 'Create Pass', kind: 'create', price: 0, buybackPrice: 0, active: true },
  { key: 'vip', name: 'VIP Pass', kind: 'participation', price: 0, buybackPrice: 0, active: true },
  { key: 'pro', name: 'Pro Pass', kind: 'participation', price: 0, buybackPrice: 0, active: true },
  { key: 'legend', name: 'Legend Pass', kind: 'participation', price: 0, buybackPrice: 0, active: true },
  { key: 'premium', name: 'Premium Pass', kind: 'participation', price: 0, buybackPrice: 0, active: true },
] as const;

export type PassKey = typeof PASS_PRODUCTS[number]['key'];
export type PassProduct = { key: PassKey; name: string; kind: 'create' | 'participation'; price: number; buybackPrice: number; active: boolean };

export function passProductsOrDefault(value?: PassProduct[] | null): PassProduct[] {
  if (!value?.length) return PASS_PRODUCTS.map((item) => ({ ...item }));
  return value.map((product) => ({ ...product, buybackPrice: product.buybackPrice ?? 0 }));
}

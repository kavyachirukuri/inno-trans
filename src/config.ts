/** Change these to rebrand the whole demo. */
export const BRAND = {
  name: 'Rahi',
  tagline: 'Flights and stays, lowest fare first.',
  phone: '+91 80 4718 2026',
  email: 'care@rahi.travel',
  coupons: [
    { code: 'RAHIFLY', label: '10% off flights, up to ₹1,000', applies: 'flight', pct: 0.1, cap: 1000 },
    { code: 'RAHISTAY', label: '15% off hotels, up to ₹2,500', applies: 'hotel', pct: 0.15, cap: 2500 },
    { code: 'FIRSTTRIP', label: 'Flat ₹750 off your first booking', applies: 'any', flat: 750 },
  ] as { code: string; label: string; applies: 'flight' | 'hotel' | 'any'; pct?: number; cap?: number; flat?: number }[],
};

export function applyCoupon(codeIn: string, kind: 'flight' | 'hotel', amount: number) {
  const c = BRAND.coupons.find((x) => x.code === codeIn.trim().toUpperCase());
  if (!c) return { ok: false as const, msg: 'This code is not valid. Try one of the codes below.' };
  if (c.applies !== 'any' && c.applies !== kind) return { ok: false as const, msg: `${c.code} works on ${c.applies}s only.` };
  const off = c.flat ?? Math.min(c.cap ?? Infinity, Math.round(amount * (c.pct ?? 0)));
  return { ok: true as const, off, code: c.code, msg: `${c.code} applied. You save ₹${off.toLocaleString('en-IN')}.` };
}

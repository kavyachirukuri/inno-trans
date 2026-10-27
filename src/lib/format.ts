export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const isISO = (s: string | null | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function addDays(iso: string, n: number) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const todayISO = () => toISO(new Date());

export function daysBetween(a: string, b: string) {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 864e5);
}

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => fromISO(iso).toLocaleDateString('en-IN', o);

/** 5 Nov */
export const dShort = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' });
/** Thu */
export const dDay = (iso: string) => fmt(iso, { weekday: 'short' });
/** Thu, 5 Nov */
export const dMid = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
/** Thu, 5 Nov 2026 */
export const dLong = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
/** November 2026 */
export const dMonth = (d: Date) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

/** minutes from midnight -> 06:45 */
export function hm(min: number) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** 125 -> 2h 05m */
export function dur(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}

export const plural = (n: number, s: string, p = s + 's') => `${n} ${n === 1 ? s : p}`;

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export const cx = (...c: any[]) => c.filter(Boolean).join(' ');

export function slug(s: string) {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function code(prefix: string, len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = prefix;
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

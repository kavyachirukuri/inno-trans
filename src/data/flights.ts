import { airport } from './places';
import { rng, int, pick, between, chance } from '../lib/rand';
import { daysBetween, todayISO, fromISO } from '../lib/format';

export type Cabin = 'economy' | 'premium' | 'business';
export const CABINS: { key: Cabin; name: string }[] = [
  { key: 'economy', name: 'Economy' },
  { key: 'premium', name: 'Premium economy' },
  { key: 'business', name: 'Business' },
];
export const cabinName = (c: string) => CABINS.find((x) => x.key === c)?.name || 'Economy';

export type Flight = {
  id: string;
  idx: number;
  airline: string;
  number: string;
  from: string;
  to: string;
  date: string;
  dep: number; // minutes after local midnight
  arr: number; // local minutes, can be >= 1440 (next day)
  duration: number;
  stops: 0 | 1;
  via?: string;
  layover?: number;
  leg1?: number; // first segment duration when 1 stop
  price: number; // Saver adult fare
  seatsLeft?: number;
  aircraft: string;
  depTerminal: string;
  arrTerminal: string;
  cabin: Cabin;
  intl: boolean;
};

export type FareKey = 'saver' | 'flexi' | 'super';
export type FareType = {
  key: FareKey;
  name: string;
  mult: number;
  tag?: string;
  cabinBag: string;
  checkBag: (intl: boolean) => string;
  cancel: string;
  change: string;
  seat: string;
  meal: string;
  refundShare: number; // share of fare refunded on cancellation, for the demo
};

export const FARE_TYPES: FareType[] = [
  {
    key: 'saver', name: 'Saver', mult: 1, cabinBag: '7 kg', checkBag: (i) => (i ? '20 kg' : '15 kg'),
    cancel: 'Cancellation fee from ₹3,999', change: 'Date change from ₹2,999', seat: 'Seats chargeable', meal: 'Meals chargeable', refundShare: 0.3,
  },
  {
    key: 'flexi', name: 'Flexi', mult: 1.11, tag: 'Most picked', cabinBag: '7 kg', checkBag: (i) => (i ? '25 kg' : '15 kg'),
    cancel: 'Cancellation fee ₹1,499', change: 'Free date change, pay fare difference', seat: 'Free standard seat', meal: 'Free meal', refundShare: 0.72,
  },
  {
    key: 'super', name: 'Super Flexi', mult: 1.24, cabinBag: '7 kg', checkBag: (i) => (i ? '30 kg' : '20 kg'),
    cancel: 'Free cancellation up to 3 days before', change: 'Free date change', seat: 'Any seat, incl. extra legroom', meal: 'Free meal + priority check-in', refundShare: 0.95,
  },
];
export const fareType = (k: string) => FARE_TYPES.find((f) => f.key === k) || FARE_TYPES[0];
export const fareFor = (f: Flight, k: string) => Math.round(f.price * fareType(k).mult);

export const SPECIAL_FARES = [
  { key: 'student', name: 'Student', off: 0.08, note: 'Valid student ID needed at check-in. Extra 10 kg baggage on most airlines.' },
  { key: 'senior', name: 'Senior citizen', off: 0.1, note: 'For travellers aged 60+. Carry a government ID with date of birth.' },
  { key: 'armed', name: 'Armed forces', off: 0.1, note: 'Serving and retired personnel and their dependants. ID needed.' },
  { key: 'doctor', name: 'Doctors & nurses', off: 0.06, note: 'Medical registration ID needed at check-in.' },
];
export const specialFare = (k?: string | null) => SPECIAL_FARES.find((s) => s.key === k);

const HUBS = ['DEL', 'BOM', 'BLR', 'HYD'];
const MAJOR = new Set(['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'COK', 'GOI', 'GOX', 'AMD', 'PNQ', 'JAI']);
const HOME: Record<string, string> = { EK: 'DXB', SQ: 'SIN', TG: 'BKK', BA: 'LHR' };

export function distanceKm(a: string, b: string) {
  const A = airport(a), B = airport(b);
  const r = Math.PI / 180;
  const dLat = (B.lat - A.lat) * r, dLon = (B.lon - A.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const isIntl = (from: string, to: string) => airport(from).country !== 'India' || airport(to).country !== 'India';

function carriersFor(from: string, to: string) {
  if (!isIntl(from, to)) return ['6E', '6E', '6E', 'AI', 'AI', 'IX', 'QP', 'SG'];
  const far = airport(from).country !== 'India' ? from : to;
  switch (far) {
    case 'DXB': return ['EK', 'EK', '6E', 'AI', 'IX'];
    case 'SIN': return ['SQ', 'SQ', '6E', 'AI'];
    case 'BKK': return ['TG', '6E', '6E', 'AI'];
    case 'DPS': return ['SQ', '6E', 'AI'];
    case 'LHR': return ['BA', 'AI', 'AI', 'EK'];
    case 'MLE': return ['6E', 'AI', 'IX'];
    default: return ['AI', '6E'];
  }
}

const legMin = (km: number) => Math.round((28 + (km / 790) * 60) / 5) * 5;
const round5 = (n: number) => Math.round(n / 5) * 5;

function depMinute(r: () => number) {
  const x = r();
  const [a, b] = x < 0.22 ? [300, 480] : x < 0.52 ? [480, 720] : x < 0.7 ? [720, 1020] : x < 0.9 ? [1020, 1260] : [1260, 1435];
  return round5(between(r, a, b));
}

const cache = new Map<string, Flight[]>();

export function dateFactor(from: string, to: string, date: string) {
  const ahead = daysBetween(todayISO(), date);
  const d = fromISO(date).getDay();
  let f = ahead <= 2 ? 1.5 : ahead <= 6 ? 1.24 : ahead <= 13 ? 1.08 : ahead <= 35 ? 1 : 0.95;
  if (d === 5 || d === 0) f *= 1.1;
  f *= between(rng(`${from}${to}${date}`), 0.86, 1.14);
  return f;
}

export function getFlights(from: string, to: string, date: string, cabin: Cabin = 'economy'): Flight[] {
  const key = `${from}-${to}-${date}-${cabin}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(`${from}>${to}@${date}`);
  const intl = isIntl(from, to);
  const km = distanceKm(from, to);
  const carriers = carriersFor(from, to);
  const n = intl ? int(r, 7, 12) : int(r, 13, 20);
  const df = dateFactor(from, to, date);
  const cm = cabin === 'business' ? 3.3 : cabin === 'premium' ? 1.65 : 1;
  const base = intl ? 3800 + km * 4.1 : 1700 + km * 3.1;
  const airlineF: Record<string, number> = { '6E': 1, AI: 1.12, IX: 0.92, QP: 0.95, SG: 0.9, EK: 1.25, SQ: 1.3, TG: 1.1, BA: 1.35 };
  const tzShift = airport(to).tz - airport(from).tz;
  const out: Flight[] = [];
  for (let i = 0; i < n; i++) {
    const code = pick(r, carriers);
    const home = HOME[code];
    let nonstop: number;
    if (home) nonstop = home === from || home === to ? 0.92 : 0;
    else if (to === 'DPS' || from === 'DPS') nonstop = 0.12;
    else {
      const small = !MAJOR.has(from) || !MAJOR.has(to);
      const hub = HUBS.includes(from) || HUBS.includes(to);
      nonstop = hub ? (small ? 0.6 : 0.86) : small ? 0.15 : 0.45;
    }
    const direct = chance(r, nonstop);
    let duration: number, via: string | undefined, layover: number | undefined, leg1: number | undefined;
    if (direct) duration = legMin(km);
    else {
      via = home && home !== from && home !== to ? home : pick(r, HUBS.filter((h) => h !== from && h !== to));
      leg1 = legMin(distanceKm(from, via));
      layover = round5(between(r, 55, intl ? 260 : 320));
      duration = leg1 + layover + legMin(distanceKm(via, to));
    }
    const dep = depMinute(r);
    const arr = dep + duration + tzShift;
    const h = dep / 60;
    const tf = h < 8 ? 1.07 : h < 12 ? 1.05 : h < 17 ? 0.95 : h < 21 ? 1.1 : 0.88;
    const sf = direct ? 1 : intl ? 0.9 : 0.86;
    const price = Math.round(base * (airlineF[code] || 1) * tf * sf * df * cm * between(r, 0.92, 1.1));
    const aircraft = intl
      ? km > 4000 ? pick(r, ['Boeing 787-8', 'Airbus A350-900', 'Boeing 777-300ER']) : pick(r, ['Airbus A321neo', 'Boeing 737-8', 'Airbus A320neo'])
      : km < 600 ? pick(r, ['ATR 72-600', 'Airbus A320neo']) : pick(r, ['Airbus A320neo', 'Airbus A321neo', 'Boeing 737-8']);
    out.push({
      id: `${from}-${to}-${date}-${i}`, idx: i, airline: code, number: `${code} ${int(r, code.length === 2 && /\d/.test(code) ? 200 : 100, 2999)}`,
      from, to, date, dep, arr, duration, stops: direct ? 0 : 1, via, layover, leg1, price,
      seatsLeft: chance(r, 0.28) ? int(r, 2, 8) : undefined, aircraft,
      depTerminal: pick(r, ['T1', 'T2', 'T3']), arrTerminal: pick(r, ['T1', 'T2', 'T3']), cabin, intl,
    });
  }
  out.sort((a, b) => a.dep - b.dep);
  out.forEach((f, i) => { f.idx = i; f.id = `${from}-${to}-${date}-${i}`; });
  cache.set(key, out);
  return out;
}

export function minFare(from: string, to: string, date: string, cabin: Cabin = 'economy') {
  return Math.min(...getFlights(from, to, date, cabin).map((f) => f.price));
}

export const childFare = (adult: number) => Math.round(adult * 0.9);
export const infantFare = (intl: boolean) => (intl ? 4500 : 1500);

export const TIME_SLOTS = [
  { key: 'early', name: 'Before 6 AM', from: 0, to: 360, icon: 'moon' },
  { key: 'morning', name: '6 AM – 12 PM', from: 360, to: 720, icon: 'sunrise' },
  { key: 'afternoon', name: '12 PM – 6 PM', from: 720, to: 1080, icon: 'sun' },
  { key: 'night', name: 'After 6 PM', from: 1080, to: 1440, icon: 'sunset' },
];
export const slotOf = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return TIME_SLOTS.find((s) => m >= s.from && m < s.to)!.key;
};

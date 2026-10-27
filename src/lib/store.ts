import { useSyncExternalStore } from 'react';
import type { Flight, FareKey } from '../data/flights';

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage can be unavailable; the app keeps working in memory */
  }
}

export type Store<T> = {
  get: () => T;
  set: (v: T | ((s: T) => T)) => void;
  subscribe: (f: () => void) => () => void;
};

export function createStore<T>(key: string | null, initial: T): Store<T> {
  let state = key ? read(key, initial) : initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set: (v) => {
      state = typeof v === 'function' ? (v as (s: T) => T)(state) : v;
      if (key) write(key, state);
      subs.forEach((f) => f());
    },
    subscribe: (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}

export const useStore = <T,>(s: Store<T>) => useSyncExternalStore(s.subscribe, s.get, s.get);

/* ---------- User ---------- */
export type User = { name: string; phone: string; email?: string };
export const userStore = createStore<User | null>('rahi.user', null);

/* ---------- Trips ---------- */
export type Pax = { type: 'adult' | 'child' | 'infant'; title: string; first: string; last: string; dob?: string };
export type FlightLeg = { flight: Flight; fare: FareKey; seats: (string | null)[]; meals: (string | null)[] };
export type FlightTrip = {
  kind: 'flight';
  id: string;
  ref: string; // PNR
  createdAt: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  legs: FlightLeg[];
  pax: Pax[];
  contact: { phone: string; email: string };
  total: number;
  extraBags: number;
  insurance: boolean;
  zeroCancel: boolean;
  payMethod: string;
  refund?: number;
  sample?: boolean;
};
export type HotelTrip = {
  kind: 'hotel';
  id: string;
  ref: string;
  createdAt: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  hotelId: string;
  hotelName: string;
  cityId: string;
  image: string;
  checkin: string;
  checkout: string;
  roomName: string;
  planName: string;
  planKey: string;
  refundable: boolean;
  freeCancelDays?: number;
  rooms: { a: number; c: number }[];
  guest: { title: string; first: string; last: string; phone: string; email: string };
  requests: string[];
  total: number;
  paidNow: number;
  payMode: 'now' | 'hotel' | 'part';
  payMethod: string;
  refund?: number;
  sample?: boolean;
};
export type Trip = FlightTrip | HotelTrip;

export const tripsStore = createStore<Trip[]>('rahi.trips.v1', []);
export const addTrip = (t: Trip) => tripsStore.set((s) => [t, ...s]);
export const updateTrip = (id: string, patch: Partial<Trip>) =>
  tripsStore.set((s) => s.map((t) => (t.id === id ? ({ ...t, ...patch } as Trip) : t)));

/* ---------- Recent searches & wishlist ---------- */
export type Recent =
  | { kind: 'flight'; label: string; sub: string; url: string; at: number }
  | { kind: 'hotel'; label: string; sub: string; url: string; at: number };
export const recentStore = createStore<Recent[]>('rahi.recent', []);
export function pushRecent(r: Recent) {
  recentStore.set((s) => [r, ...s.filter((x) => x.url !== r.url)].slice(0, 6));
}
export const wishStore = createStore<string[]>('rahi.wish', []);
export const toggleWish = (id: string) =>
  wishStore.set((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

/* ---------- UI ---------- */
export type Toast = { id: number; text: string; tone?: 'ok' | 'info' | 'warn' };
export const toastStore = createStore<Toast[]>(null, []);
let tid = 0;
export function toast(text: string, tone: Toast['tone'] = 'ok') {
  const id = ++tid;
  toastStore.set((s) => [...s, { id, text, tone }]);
  setTimeout(() => toastStore.set((s) => s.filter((t) => t.id !== id)), 3600);
}
export const loginStore = createStore<{ open: boolean; then?: () => void }>(null, { open: false });
export const openLogin = (then?: () => void) => loginStore.set({ open: true, then });

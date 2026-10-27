/** Small deterministic random helpers so dummy data stays the same for the same search. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function rng(seed: number | string): Rng {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: Rng, a: number, b: number) => a + r() * (b - a);
export const int = (r: Rng, a: number, b: number) => Math.floor(between(r, a, b + 1));
export const pick = <T,>(r: Rng, arr: T[]) => arr[Math.floor(r() * arr.length)];
export const chance = (r: Rng, p: number) => r() < p;

export function shuffle<T>(r: Rng, arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(r: Rng, arr: T[], n: number) {
  return shuffle(r, arr).slice(0, n);
}

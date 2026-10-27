import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/** A tiny history router: enough for this demo, no dependency. */
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

if (typeof window !== 'undefined') window.addEventListener('popstate', emit);

export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  const current = location.pathname + location.search;
  if (to !== current || opts.replace) {
    history[opts.replace ? 'replaceState' : 'pushState'](null, '', to);
    emit();
  }
  if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export const back = (fallback = '/') => {
  if (history.length > 1) history.back();
  else navigate(fallback);
};

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
const snap = () => location.pathname + location.search;

export function useLocation() {
  const href = useSyncExternalStore(subscribe, snap, snap);
  const i = href.indexOf('?');
  const path = i < 0 ? href : href.slice(0, i);
  return { path, query: new URLSearchParams(i < 0 ? '' : href.slice(i)), href };
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.replace(/\/+$/, '').split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean };

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
    >
      {children}
    </a>
  );
}

export function qs(o: Record<string, any>) {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v));
  });
  return p.toString();
}

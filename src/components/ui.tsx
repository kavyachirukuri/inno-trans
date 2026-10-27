import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { photoUrl, AIRLINES } from '../data/places';
import { rng, pick, hash } from '../lib/rand';
import { cx } from '../lib/format';
import { useStore, toastStore } from '../lib/store';

export function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}
export const useMobile = () => useMedia('(max-width: 760px)');

function useLockScroll(on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.body.classList.add('noscroll');
    return () => document.body.classList.remove('noscroll');
  }, [on]);
}

/* ---------- Popover that turns into a bottom sheet on phones ---------- */
export function Pop({
  open, onClose, anchor, title, children, footer, className, align = 'left',
}: {
  open: boolean; onClose: () => void; anchor?: RefObject<HTMLElement | null>; title?: string;
  children: ReactNode; footer?: ReactNode; className?: string; align?: 'left' | 'right' | 'center';
}) {
  const mobile = useMobile();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.current?.contains(t)) return;
      close.current();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, anchor]);
  useLockScroll(open && mobile);
  if (!open) return null;
  if (mobile)
    return createPortal(
      <div className="sheet-wrap">
        <div className={cx('sheet', className)} ref={ref} role="dialog" aria-label={title}>
          <div className="sheet-head">
            <b>{title}</b>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </div>
      </div>,
      document.body,
    );
  return (
    <div ref={ref} className={cx('pop', `pop-${align}`, className)} role="dialog" aria-label={title}>
      {children}
      {footer && <div className="pop-foot">{footer}</div>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; className?: string }) {
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', wide && 'wide', className)} role="dialog" aria-modal="true">
        {title !== undefined && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Photo with a designed fallback ---------- */
function hills(r: () => number, base: number, amp: number) {
  let d = `M0 ${base}`;
  let x = 0;
  while (x < 400) {
    const nx = x + 60 + r() * 50;
    const cy = base - amp * (0.3 + r());
    d += ` Q${x + (nx - x) / 2} ${cy} ${nx} ${base + (r() - 0.5) * amp * 0.6}`;
    x = nx;
  }
  return d + ' L400 300 L0 300 Z';
}

export function PhotoArt({ seed, label }: { seed: string; label?: string }) {
  const r = rng(seed);
  const hue = pick(r, [350, 4, 214, 200, 24, 230]);
  const g = `pa${hash(seed)}`;
  const sx = 70 + r() * 260, sy = 70 + r() * 50;
  return (
    <svg className="photo-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 22% 90%)`} />
          <stop offset="1" stopColor={`hsl(${hue} 16% 74%)`} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${g})`} />
      <circle cx={sx} cy={sy} r="30" fill="hsl(354 76% 52%)" opacity="0.9" />
      <path d={hills(r, 175, 46)} fill={`hsl(${hue} 10% 58%)`} />
      <path d={hills(r, 212, 34)} fill={`hsl(${hue} 9% 40%)`} />
      <path d={hills(r, 248, 22)} fill={`hsl(${hue} 8% 24%)`} />
    </svg>
  );
}

export function Photo({ id, alt = '', w = 800, className, label, eager }: { id?: string; alt?: string; w?: number; className?: string; label?: string; eager?: boolean }) {
  const [state, setState] = useState<'load' | 'ok' | 'fail'>(id ? 'load' : 'fail');
  useEffect(() => setState(id ? 'load' : 'fail'), [id]);
  return (
    <div className={cx('photo', className, state)}>
      {state !== 'fail' && id && (
        <img src={photoUrl(id, w)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setState('ok')} onError={() => setState('fail')} />
      )}
      {state === 'fail' && <PhotoArt seed={id || alt || 'x'} label={label} />}
    </div>
  );
}

/* ---------- Small pieces ---------- */
export function Counter({ value, min = 0, max = 9, onChange, label, sub }: { value: number; min?: number; max?: number; onChange: (n: number) => void; label: string; sub?: string }) {
  return (
    <div className="counter">
      <div>
        <b>{label}</b>
        {sub && <span className="muted small">{sub}</span>}
      </div>
      <div className="counter-ctl">
        <button type="button" className="round" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}><Icon name="minus" size={16} /></button>
        <span className="num" aria-live="polite">{value}</span>
        <button type="button" className="round" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label}`}><Icon name="plus" size={16} /></button>
      </div>
    </div>
  );
}

export function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${n} star`}>
      {Array.from({ length: n }, (_, i) => <Icon key={i} name="star" size={size} stroke={0} style={{ fill: 'currentColor' }} />)}
    </span>
  );
}

export function RatingBadge({ score, word, count, compact }: { score: number; word?: string; count?: number; compact?: boolean }) {
  return (
    <span className={cx('rating', compact && 'compact')}>
      <span className="rbadge">{score.toFixed(1)}</span>
      {!compact && word && <b>{word}</b>}
      {count !== undefined && <span className="muted">{count.toLocaleString('en-IN')} reviews</span>}
    </span>
  );
}

export function AirlineLogo({ code, size = 36 }: { code: string; size?: number }) {
  const a = AIRLINES[code];
  const hue = a?.hue ?? 0;
  return (
    <span className="al-logo" style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 52% 42%), hsl(${hue} 58% 26%))`, fontSize: size * 0.36 }} aria-hidden="true">
      {code}
    </span>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={cx('logo', light && 'light')}>
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? '#fff' : 'var(--char)'} />
        <path d="M18 46V18h15a9 9 0 0 1 0 18H18" fill="none" stroke={light ? 'var(--char)' : '#fff'} strokeWidth="6" strokeLinejoin="round" />
        <path d="M33 36l12 10" stroke="var(--red)" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="logo-word">rahi<i>.</i></span>
    </span>
  );
}

export function Toaster() {
  const list = useStore(toastStore);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={cx('toast', t.tone)}>
          <Icon name={t.tone === 'warn' ? 'info' : 'checkCircle'} size={18} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = 'search', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ico"><Icon name={icon} size={26} /></span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="steps-bar">
      {steps.map((s, i) => (
        <li key={s} className={cx(i < current && 'done', i === current && 'now')}>
          <span className="dot">{i < current ? <Icon name="check" size={13} stroke={3} /> : i + 1}</span>
          <span className="lbl">{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** QR-like pattern drawn from a booking reference (decorative, not scannable) */
export function CodeArt({ value, size = 96 }: { value: string; size?: number }) {
  const r = rng(value);
  const n = 21;
  const cells: ReactNode[] = [];
  const finder = (x: number, y: number) => x < 7 && y < 7;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inF = finder(x, y) || finder(n - 1 - x, y) || finder(x, n - 1 - y);
      if (inF) continue;
      if (r() < 0.48) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  const F = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" />
      <rect x="1" y="1" width="5" height="5" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" />
    </g>
  );
  return (
    <svg className="codeart" width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} shapeRendering="crispEdges" aria-label={`Code for ${value}`}>
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />
      <g fill="#17181b">
        {cells}
        <F x={0} y={0} />
        <F x={n - 7} y={0} />
        <F x={0} y={n - 7} />
      </g>
    </svg>
  );
}

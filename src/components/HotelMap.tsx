import { useMemo } from 'react';
import { Icon } from './Icon';
import { Photo, RatingBadge } from './ui';
import { city as getCity } from '../data/places';
import type { Hotel } from '../data/hotels';
import { rng, between } from '../lib/rand';
import { cx, inr } from '../lib/format';
import { Link } from '../lib/router';

function roads(seed: string) {
  const r = rng(seed);
  const out: { d: string; major: boolean }[] = [];
  for (let i = 0; i < 4; i++) {
    const y = 12 + i * 24 + between(r, -6, 6);
    out.push({ d: `M-5 ${y} C30 ${y + between(r, -10, 10)} 60 ${y + between(r, -10, 10)} 105 ${y + between(r, -8, 8)}`, major: i === 1 });
  }
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 24 + between(r, -6, 6);
    out.push({ d: `M${x} -5 C${x + between(r, -10, 10)} 30 ${x + between(r, -10, 10)} 70 ${x + between(r, -8, 8)} 105`, major: i === 2 });
  }
  return out;
}

export type Pin = { h: Hotel; price: number };

export function HotelMap({ cityId, pins, active, onHover, onSelect, selected, stay, single, className }: {
  cityId: string; pins: Pin[]; active?: string | null; onHover?: (id: string | null) => void; onSelect?: (id: string | null) => void;
  selected?: string | null; stay?: string; single?: boolean; className?: string;
}) {
  const c = getCity(cityId);
  const rs = useMemo(() => roads(cityId), [cityId]);
  const sel = pins.find((p) => p.h.id === selected);
  return (
    <div className={cx('hmap', className)} onClick={() => onSelect?.(null)}>
      <svg className="hmap-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect width="100" height="100" className="m-land" />
        {rs.map((r, i) => <path key={i} d={r.d} className={r.major ? 'm-road major' : 'm-road'} vectorEffect="non-scaling-stroke" />)}
        {c.water.map((d, i) => <path key={`w${i}`} d={d} className="m-water" />)}
        {(c.rivers || []).map((d, i) => <path key={`r${i}`} d={d} className="m-river" vectorEffect="non-scaling-stroke" />)}
        {(c.islands || []).map((d, i) => <path key={`i${i}`} d={d} className="m-land" />)}
      </svg>
      {c.localities.map((l) => (
        <span key={l.name} className="m-area" style={{ left: `${l.x}%`, top: `${l.y}%` }}>{l.name}</span>
      ))}
      {c.landmarks.map((l) => (
        <span key={l.name} className="m-mark" style={{ left: `${l.x}%`, top: `${l.y}%` }} title={l.name}>
          <i /><span>{l.name}</span>
        </span>
      ))}
      {pins.map(({ h, price }) => (
        <button
          key={h.id}
          className={cx('m-pin', (active === h.id || selected === h.id) && 'on', single && 'single')}
          style={{ left: `${h.x}%`, top: `${h.y}%`, zIndex: active === h.id || selected === h.id ? 5 : 2 }}
          onMouseEnter={() => onHover?.(h.id)}
          onMouseLeave={() => onHover?.(null)}
          onClick={(e) => { e.stopPropagation(); onSelect?.(h.id); }}
          aria-label={`${h.name}, ${inr(price)} per night`}
        >
          {single ? <Icon name="bed" size={15} /> : inr(price)}
        </button>
      ))}
      {sel && stay !== undefined && (
        <Link className="m-card" to={`/hotels/${sel.h.id}?${stay}`} style={{ left: `${Math.min(70, Math.max(30, sel.h.x))}%`, top: `${sel.h.y > 55 ? sel.h.y - 4 : sel.h.y + 4}%`, transform: `translate(-50%, ${sel.h.y > 55 ? '-100%' : '0'})` }} onClick={(e) => e.stopPropagation()}>
          <Photo id={sel.h.images[0]} alt={sel.h.name} w={360} />
          <div>
            <b>{sel.h.name}</b>
            <span className="muted small">{sel.h.locality}</span>
            <div className="m-card-row"><RatingBadge score={sel.h.rating} compact /><b>{inr(sel.price)}</b></div>
          </div>
        </Link>
      )}
      <div className="m-scale" aria-hidden="true"><i /> {Math.round(c.spanKm / 4)} km</div>
    </div>
  );
}

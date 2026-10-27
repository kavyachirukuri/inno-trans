import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Empty, Pop, useMobile } from '../components/ui';
import { HotelCard, type Priced } from '../components/hotel';
import { HotelMap } from '../components/HotelMap';
import { HotelSearch, readHotelQuery, stayParams, guestLabel } from '../components/search';
import { city as getCity } from '../data/places';
import { AMENITIES, hotelsIn, nightly, taxFor, PROPERTY_TYPES, type AmenityKey, type Hotel } from '../data/hotels';
import { cx, dMid, daysBetween, inr, plural } from '../lib/format';

type HF = {
  price: [number, number] | null; stars: number[]; rating: number; types: string[]; amen: AmenityKey[]; areas: string[];
  freeCancel: boolean; breakfast: boolean; payAtHotel: boolean; couple: boolean;
};
const NOF: HF = { price: null, stars: [], rating: 0, types: [], amen: [], areas: [], freeCancel: false, breakfast: false, payAtHotel: false, couple: false };
type SortK = 'rec' | 'low' | 'high' | 'rating' | 'stars';
const tg = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);

export function priceHotel(h: Hotel, checkin: string, checkout: string, roomsN: number, f?: Pick<HF, 'freeCancel' | 'breakfast' | 'payAtHotel'>): Priced | null {
  let best: Priced | null = null;
  const nights = Math.max(1, daysBetween(checkin, checkout));
  h.rooms.forEach((room) => room.plans.forEach((plan) => {
    if (f?.freeCancel && !plan.refundable) return;
    if (f?.breakfast && !(plan.key === 'bb' || plan.key === 'hb')) return;
    if (f?.payAtHotel && !plan.payAtHotel) return;
    const perNight = nightly(h, plan.price, checkin, checkout);
    if (!best || perNight < best.perNight) {
      best = { h, room, plan, perNight, was: h.discount ? Math.round(perNight / (1 - h.discount) / 10) * 10 : 0, total: perNight * nights * roomsN, tax: taxFor(h, perNight) };
    }
  }));
  return best;
}

function Histogram({ values, lo, hi, range, onChange }: { values: number[]; lo: number; hi: number; range: [number, number]; onChange: (r: [number, number] | null) => void }) {
  const bins = 16;
  const step = (hi - lo) / bins || 1;
  const counts = Array.from({ length: bins }, (_, i) => values.filter((v) => v >= lo + i * step && (i === bins - 1 ? v <= hi : v < lo + (i + 1) * step)).length);
  const max = Math.max(1, ...counts);
  const set = (a: number, b: number) => onChange(a <= lo && b >= hi ? null : [Math.min(a, b), Math.max(a, b)]);
  return (
    <div className="histo">
      <div className="histo-bars" aria-hidden="true">
        {counts.map((c, i) => {
          const x0 = lo + i * step, x1 = x0 + step;
          return <i key={i} style={{ height: `${(c / max) * 100}%` }} className={cx(x1 > range[0] && x0 < range[1] && 'in')} />;
        })}
      </div>
      <div className="dual">
        <input type="range" min={lo} max={hi} step={100} value={range[0]} onChange={(e) => set(Number(e.target.value), range[1])} aria-label="Minimum price" />
        <input type="range" min={lo} max={hi} step={100} value={range[1]} onChange={(e) => set(range[0], Number(e.target.value))} aria-label="Maximum price" />
      </div>
      <div className="range-lbl"><b>{inr(range[0])}</b><b>{inr(range[1])}{range[1] >= hi ? '+' : ''}</b></div>
    </div>
  );
}

export default function HotelResults({ query }: { query: URLSearchParams }) {
  const q = readHotelQuery(query);
  const mobile = useMobile();
  const c = getCity(q.city);
  const nights = Math.max(1, daysBetween(q.checkin, q.checkout));
  const stay = stayParams(q);
  const key = query.toString();
  const [f, setF] = useState<HF>({ ...NOF, areas: q.loc ? [q.loc] : [] });
  const [sort, setSort] = useState<SortK>('rec');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setF({ ...NOF, areas: q.loc ? [q.loc] : [] }); setPicked(null); }, [q.city, q.loc]);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 550); return () => clearTimeout(t); }, [key]);

  const all = useMemo(() => hotelsIn(q.city).map((h) => priceHotel(h, q.checkin, q.checkout, q.rooms.length)).filter(Boolean) as Priced[], [q.city, q.checkin, q.checkout, q.rooms.length]);
  const prices = all.map((p) => p.perNight);
  const lo = Math.floor(Math.min(...prices) / 500) * 500, hi = Math.ceil(Math.max(...prices) / 500) * 500;
  const range: [number, number] = f.price || [lo, hi];

  const list = useMemo(() => {
    const xs = hotelsIn(q.city)
      .map((h) => priceHotel(h, q.checkin, q.checkout, q.rooms.length, f))
      .filter((p): p is Priced => !!p)
      .filter(({ h, perNight }) =>
        perNight >= range[0] && (range[1] >= hi || perNight <= range[1]) &&
        (!f.stars.length || f.stars.includes(h.stars)) && h.rating >= f.rating &&
        (!f.types.length || f.types.includes(h.type)) && f.amen.every((a) => h.amenities.includes(a)) &&
        (!f.areas.length || f.areas.includes(h.locality)) && (!f.couple || h.coupleFriendly));
    const rec = (p: Priced) => p.h.rating * 1.4 + p.h.stars * 0.6 - p.perNight / 9000 + (p.h.discount ? 0.4 : 0);
    return xs.sort((a, b) => sort === 'low' ? a.perNight - b.perNight : sort === 'high' ? b.perNight - a.perNight : sort === 'rating' ? b.h.rating - a.h.rating : sort === 'stars' ? b.h.stars - a.h.stars || b.h.rating - a.h.rating : rec(b) - rec(a));
  }, [q.city, q.checkin, q.checkout, q.rooms.length, f, sort, lo, hi]);

  const countActive = (f.price ? 1 : 0) + f.stars.length + (f.rating ? 1 : 0) + f.types.length + f.amen.length + f.areas.length + [f.freeCancel, f.breakfast, f.payAtHotel, f.couple].filter(Boolean).length;
  const types = PROPERTY_TYPES.filter((t) => all.some((p) => p.h.type === t));

  const quick = (
    <div className="quick chips">
      {([
        ['freeCancel', 'Free cancellation', 'check'],
        ['breakfast', 'Breakfast included', 'coffee'],
        ['payAtHotel', 'Pay at hotel', 'wallet'],
        ['couple', 'Couple friendly', 'heart'],
      ] as const).map(([k, n, ic]) => (
        <button key={k} className={cx('chip', f[k] && 'on')} onClick={() => setF({ ...f, [k]: !f[k] })} aria-pressed={f[k]}><Icon name={ic} size={14} /> {n}</button>
      ))}
      <button className={cx('chip', f.rating === 8 && 'on')} onClick={() => setF({ ...f, rating: f.rating === 8 ? 0 : 8 })}><Icon name="star" size={14} /> Rated 8+</button>
      <button className={cx('chip', f.amen.includes('pool') && 'on')} onClick={() => setF({ ...f, amen: tg(f.amen, 'pool') })}><Icon name="waves" size={14} /> Pool</button>
    </div>
  );

  const panel = (
    <div className="filters">
      <div className="filters-head"><b>Filters</b>{countActive > 0 && <button className="link-btn" onClick={() => setF(NOF)}>Clear all ({countActive})</button>}</div>
      <div className="fgroup">
        <h4>Price per night</h4>
        <Histogram values={all.map((p) => p.perNight)} lo={lo} hi={hi} range={range} onChange={(r) => setF({ ...f, price: r })} />
      </div>
      <div className="fgroup">
        <h4>Star rating</h4>
        <div className="chips">{[5, 4, 3].map((s) => <button key={s} className={cx('chip', f.stars.includes(s) && 'on')} onClick={() => setF({ ...f, stars: tg(f.stars, s) })}>{s} <Icon name="star" size={12} /></button>)}</div>
      </div>
      <div className="fgroup">
        <h4>Guest rating</h4>
        <div className="seg small block">
          {[[0, 'Any'], [7, '7+'], [8, '8+'], [9, '9+']].map(([v, n]) => <button key={v} className={cx(f.rating === v && 'on')} onClick={() => setF({ ...f, rating: v as number })}>{n}</button>)}
        </div>
      </div>
      <div className="fgroup">
        <h4>Area</h4>
        {c.localities.map((l) => {
          const n = all.filter((p) => p.h.locality === l.name).length;
          if (!n) return null;
          return (
            <label key={l.name} className="check"><input type="checkbox" checked={f.areas.includes(l.name)} onChange={() => setF({ ...f, areas: tg(f.areas, l.name) })} />
              <span>{l.name}</span><span className="muted small">{n}</span></label>
          );
        })}
      </div>
      <div className="fgroup">
        <h4>Property type</h4>
        {types.map((t) => (
          <label key={t} className="check"><input type="checkbox" checked={f.types.includes(t)} onChange={() => setF({ ...f, types: tg(f.types, t) })} />
            <span>{t}</span><span className="muted small">{all.filter((p) => p.h.type === t).length}</span></label>
        ))}
      </div>
      <div className="fgroup">
        <h4>Amenities</h4>
        {(['pool', 'spa', 'beach', 'gym', 'shuttle', 'parking', 'kids', 'ev'] as AmenityKey[]).filter((a) => all.some((p) => p.h.amenities.includes(a))).map((a) => (
          <label key={a} className="check"><input type="checkbox" checked={f.amen.includes(a)} onChange={() => setF({ ...f, amen: tg(f.amen, a) })} />
            <Icon name={AMENITIES[a].icon} size={15} /><span>{AMENITIES[a].name}</span></label>
        ))}
      </div>
    </div>
  );

  const pins = list.map((p) => ({ h: p.h, price: p.perNight }));

  return (
    <div className="results-page">
      <div className="sumbar">
        <div className="wrap sumbar-in">
          <div className="sum-route">
            <b>{q.loc ? `${q.loc}, ${c.name}` : `Stays in ${c.name}`}</b>
            <span className="muted small">{dMid(q.checkin)} – {dMid(q.checkout)} · {plural(nights, 'night')} · {guestLabel(q.rooms)}</span>
          </div>
          <div className="sum-actions">
            <div className="seg small" role="radiogroup" aria-label="View">
              <button role="radio" aria-checked={view === 'list'} className={cx(view === 'list' && 'on')} onClick={() => setView('list')}><Icon name="list" size={15} /> <span className="hide-sm">List</span></button>
              <button role="radio" aria-checked={view === 'map'} className={cx(view === 'map' && 'on')} onClick={() => setView('map')}><Icon name="map" size={15} /> <span className="hide-sm">Map</span></button>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setEdit(!edit)}><Icon name="edit" size={15} /> <span className="hide-sm">Modify</span></button>
          </div>
        </div>
        {edit && <div className="wrap sumbar-edit"><HotelSearch key={key} initial={q} compact onSearched={() => setEdit(false)} /></div>}
      </div>

      <div className={cx('wrap results', view === 'map' && 'with-map')}>
        {!mobile && view === 'list' && <aside className="rail">{panel}</aside>}
        <div className="rlist">
          {quick}
          <div className="rlist-bar">
            <span className="muted small">{loading ? 'Checking rates with hotels…' : `${plural(list.length, 'stay')} · prices per night for ${guestLabel(q.rooms).toLowerCase()}`}</span>
            <label className="sort-sel"><span className="muted small">Sort</span>
              <select id="hotel-sort" value={sort} onChange={(e) => setSort(e.target.value as SortK)}>
                <option value="rec">Recommended</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Guest rating</option>
                <option value="stars">Star rating</option>
              </select>
            </label>
          </div>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => <div key={i} className="hcard sk-card" aria-hidden="true"><div className="sk hk-img" /><div className="hk-body"><div className="sk" style={{ height: 18, width: '60%' }} /><div className="sk" style={{ height: 14, width: '40%' }} /><div className="sk" style={{ height: 14, width: '70%' }} /></div></div>)
          ) : list.length ? (
            list.map((p) => <HotelCard key={p.h.id} p={p} nights={nights} rooms={q.rooms.length} stay={stay} active={hover === p.h.id || picked === p.h.id} onHover={setHover} compact={view === 'map'} />)
          ) : (
            <Empty icon="bed" title="No stays match these filters">
              <p className="muted">{plural(all.length, 'stay')} in {c.name} for your dates. Loosen a filter to see more.</p>
              <button className="btn btn-red" onClick={() => setF(NOF)}>Clear filters</button>
            </Empty>
          )}
        </div>
        {view === 'map' && !mobile && (
          <div className="map-col"><HotelMap cityId={q.city} pins={pins} active={hover} onHover={setHover} selected={picked} onSelect={setPicked} stay={stay} /></div>
        )}
      </div>

      {mobile && view === 'map' && (
        <div className="map-full">
          <HotelMap cityId={q.city} pins={pins} active={hover} selected={picked} onSelect={setPicked} stay={stay} />
          <button className="btn btn-dark map-close" onClick={() => setView('list')}><Icon name="list" size={16} /> List</button>
        </div>
      )}

      {mobile && (
        <>
          {view === 'list' && <button className="fab" onClick={() => setSheet(true)}><Icon name="sliders" size={17} /> Filters{countActive ? ` (${countActive})` : ''}</button>}
          <Pop open={sheet} onClose={() => setSheet(false)} title="Filter stays" footer={<button className="btn btn-red btn-block" onClick={() => setSheet(false)}>Show {plural(list.length, 'stay')}</button>}>
            {panel}
          </Pop>
        </>
      )}
    </div>
  );
}

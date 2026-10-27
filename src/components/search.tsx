import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Pop, Counter, useMobile } from './ui';
import { Calendar, defaultDepart } from './Calendar';
import { AIRPORTS, airport, hasAirport, city as getCity, hasCity } from '../data/places';
import { CABINS, SPECIAL_FARES, minFare, cabinName, type Cabin } from '../data/flights';
import { hotelSuggestions, hotel as getHotel, type HotelSuggestion } from '../data/hotels';
import { addDays, cx, dDay, dShort, daysBetween, isISO, todayISO, plural } from '../lib/format';
import { navigate, qs } from '../lib/router';
import { pushRecent } from '../lib/store';

/* ================= Shared field ================= */
function Field({ label, value, sub, icon, active, onClick, children, className, placeholder }: {
  label: string; value?: ReactNode; sub?: ReactNode; icon?: string; active?: boolean; onClick: () => void;
  children?: ReactNode; className?: string; placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className={cx('sf', active && 'on', className)}>
      <button type="button" className="sf-btn" onClick={onClick} aria-expanded={active}>
        <span className="sf-label">{icon && <Icon name={icon} size={14} />}{label}</span>
        {value ? <span className="sf-value">{value}</span> : <span className="sf-value ph">{placeholder}</span>}
        {sub && <span className="sf-sub">{sub}</span>}
      </button>
      {children}
    </div>
  );
}

/* ================= Flights ================= */
export type FlightQuery = {
  trip: 'oneway' | 'round'; from: string; to: string; date: string; ret: string | null;
  ad: number; ch: number; inf: number; cabin: Cabin; sp: string | null;
};

export function readFlightQuery(q: URLSearchParams): FlightQuery {
  const date = isISO(q.get('date')) && q.get('date')! >= todayISO() ? q.get('date')! : defaultDepart();
  const ret = isISO(q.get('ret')) && q.get('ret')! >= date ? q.get('ret') : null;
  const num = (k: string, d: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, Number(q.get(k) ?? d) || d));
  const ad = num('ad', 1, 1, 9);
  return {
    trip: ret ? 'round' : 'oneway',
    from: hasAirport(q.get('from')) ? q.get('from')! : 'DEL',
    to: hasAirport(q.get('to')) ? q.get('to')! : 'GOX',
    date, ret, ad, ch: num('ch', 0, 0, 6), inf: Math.min(ad, num('inf', 0, 0, 6)),
    cabin: (['economy', 'premium', 'business'].includes(q.get('cabin') || '') ? q.get('cabin') : 'economy') as Cabin,
    sp: SPECIAL_FARES.some((s) => s.key === q.get('sp')) ? q.get('sp') : null,
  };
}

export const flightUrl = (f: FlightQuery) =>
  '/flights?' + qs({ from: f.from, to: f.to, date: f.date, ret: f.trip === 'round' ? f.ret : '', ad: f.ad, ch: f.ch || '', inf: f.inf || '', cabin: f.cabin !== 'economy' ? f.cabin : '', sp: f.sp || '' });

function AirportList({ onPick, exclude }: { onPick: (code: string) => void; exclude?: string }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = AIRPORTS.filter((a) => a.code !== exclude);
    if (!s) return all.filter((a) => a.popular);
    return all
      .map((a) => {
        const sc = a.code.toLowerCase() === s ? 0 : a.city.toLowerCase().startsWith(s) ? 1 : a.code.toLowerCase().startsWith(s) ? 2 : (a.name + a.city + a.country).toLowerCase().includes(s) ? 3 : 9;
        return { a, sc };
      })
      .filter((x) => x.sc < 9)
      .sort((x, y) => x.sc - y.sc)
      .map((x) => x.a);
  }, [q, exclude]);
  useEffect(() => setI(0), [q]);
  return (
    <div className="ac">
      <div className="ac-input">
        <Icon name="search" size={16} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="City or airport, e.g. Goa or BOM"
          aria-label="Search airports"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(list.length - 1, v + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
            if (e.key === 'Enter' && list[i]) { e.preventDefault(); onPick(list[i].code); }
          }}
        />
      </div>
      <div className="ac-head">{q ? `${list.length} match${list.length === 1 ? '' : 'es'}` : 'Popular airports'}</div>
      <ul className="ac-list" role="listbox">
        {list.map((a, k) => (
          <li key={a.code}>
            <button type="button" className={cx('ac-item', k === i && 'hl')} onMouseEnter={() => setI(k)} onClick={() => onPick(a.code)}>
              <span className="ac-ico"><Icon name="plane" size={16} /></span>
              <span className="ac-main"><b>{a.city}, {a.country}</b><span className="muted small">{a.name}</span></span>
              <span className="ac-code">{a.code}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="ac-none">No airport matches “{q}”. Try a city name.</li>}
      </ul>
    </div>
  );
}

type FField = 'from' | 'to' | 'date' | 'ret' | 'pax' | null;

export function FlightSearch({ initial, onSearched, compact }: { initial?: Partial<FlightQuery>; onSearched?: () => void; compact?: boolean }) {
  const [s, setS] = useState<FlightQuery>(() => ({
    trip: 'oneway', from: 'DEL', to: 'GOX', date: defaultDepart(), ret: null, ad: 1, ch: 0, inf: 0, cabin: 'economy', sp: null, ...initial,
  }));
  const [active, setActive] = useState<FField>(null);
  const [err, setErr] = useState('');
  const [spin, setSpin] = useState(0);
  const mobile = useMobile();
  const set = (p: Partial<FlightQuery>) => { setErr(''); setS((v) => ({ ...v, ...p })); };
  const close = useCallback(() => setActive(null), []);
  const A = airport(s.from), B = airport(s.to);
  const fare = useCallback((iso: string) => (s.from !== s.to ? minFare(s.from, s.to, iso, s.cabin) : null), [s.from, s.to, s.cabin]);
  const fareBack = useCallback((iso: string) => (s.from !== s.to ? minFare(s.to, s.from, iso, s.cabin) : null), [s.from, s.to, s.cabin]);
  const pax = s.ad + s.ch + s.inf;

  const submit = () => {
    if (s.from === s.to) { setErr('Departure and destination are the same. Pick a different city.'); return; }
    if (s.trip === 'round' && !s.ret) { setActive('ret'); return; }
    const url = flightUrl(s);
    pushRecent({ kind: 'flight', label: `${A.city} → ${B.city}`, sub: `${dShort(s.date)}${s.trip === 'round' && s.ret ? ` – ${dShort(s.ret)}` : ''} · ${plural(pax, 'traveller')}`, url, at: Date.now() });
    setActive(null);
    onSearched?.();
    navigate(url);
  };

  return (
    <form className={cx('console', compact && 'compact')} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="console-top">
        <div className="seg" role="radiogroup" aria-label="Trip type">
          {(['oneway', 'round'] as const).map((t) => (
            <button type="button" key={t} role="radio" aria-checked={s.trip === t} className={cx(s.trip === t && 'on')}
              onClick={() => set({ trip: t, ret: t === 'round' ? s.ret || addDays(s.date, 3) : null })}>
              {t === 'oneway' ? 'One way' : 'Round trip'}
            </button>
          ))}
        </div>
        <span className="console-note"><Icon name="shieldCheck" size={15} /> Zero convenience fee on every booking</span>
      </div>

      <div className="console-fields fl">
        <Field label="From" icon="plane" value={A.city} sub={<><b className="mono">{A.code}</b> {A.name}</>} active={active === 'from'} onClick={() => setActive(active === 'from' ? null : 'from')} className="f-from">
          <Pop open={active === 'from'} onClose={close} title="Flying from" className="pop-ac">
            <AirportList exclude={s.to} onPick={(c) => { set({ from: c }); setActive('to'); }} />
          </Pop>
        </Field>
        <button type="button" className="swap" aria-label="Swap cities" style={{ rotate: `${spin}deg` }} onClick={() => { setSpin((x) => x + 180); set({ from: s.to, to: s.from }); }}>
          <Icon name="swap" size={18} />
        </button>
        <Field label="To" icon="pin" value={B.city} sub={<><b className="mono">{B.code}</b> {B.name}</>} active={active === 'to'} onClick={() => setActive(active === 'to' ? null : 'to')} className="f-to">
          <Pop open={active === 'to'} onClose={close} title="Flying to" className="pop-ac">
            <AirportList exclude={s.from} onPick={(c) => { set({ to: c }); setActive('date'); }} />
          </Pop>
        </Field>
        <Field label="Departure" icon="calendar" value={<>{dShort(s.date)} <small>{dDay(s.date)}</small></>} sub={`From ${fare(s.date) ? '₹' + fare(s.date)!.toLocaleString('en-IN') : '—'}`} active={active === 'date'} onClick={() => setActive(active === 'date' ? null : 'date')} className="f-date">
          <Pop open={active === 'date'} onClose={close} title="Departure date" className="pop-cal" align="center">
            <Calendar mode="single" start={s.date} months={mobile ? 1 : 2} fare={fare}
              onPick={(d) => {
                set({ date: d, ret: s.ret && s.ret < d ? addDays(d, 2) : s.ret });
                setActive(s.trip === 'round' ? 'ret' : null);
              }} />
          </Pop>
        </Field>
        <Field label="Return" icon="calendar" value={s.trip === 'round' && s.ret ? <>{dShort(s.ret)} <small>{dDay(s.ret)}</small></> : undefined} placeholder="Add return"
          sub={s.trip === 'round' && s.ret ? `${daysBetween(s.date, s.ret)} days trip` : 'Save more on round trips'}
          active={active === 'ret'} onClick={() => { if (s.trip !== 'round') set({ trip: 'round', ret: s.ret || addDays(s.date, 3) }); setActive(active === 'ret' ? null : 'ret'); }} className="f-ret">
          {s.trip === 'round' && s.ret && (
            <button type="button" className="sf-clear" aria-label="Remove return" onClick={(e) => { e.stopPropagation(); set({ trip: 'oneway', ret: null }); }}><Icon name="x" size={14} /></button>
          )}
          <Pop open={active === 'ret'} onClose={close} title="Return date" className="pop-cal" align="center">
            <Calendar mode="single" start={s.ret || s.date} min={s.date} months={mobile ? 1 : 2} fare={fareBack}
              onPick={(d) => { set({ ret: d, trip: 'round' }); setActive(null); }} />
          </Pop>
        </Field>
        <Field label="Travellers & class" icon="users" value={plural(pax, 'traveller')} sub={cabinName(s.cabin)} active={active === 'pax'} onClick={() => setActive(active === 'pax' ? null : 'pax')} className="f-pax">
          <Pop open={active === 'pax'} onClose={close} title="Travellers & class" align="right" className="pop-pax"
            footer={<button type="button" className="btn btn-red" onClick={close}>Done</button>}>
            <Counter label="Adults" sub="12 years and above" value={s.ad} min={1} max={9 - s.ch} onChange={(v) => set({ ad: v, inf: Math.min(s.inf, v) })} />
            <Counter label="Children" sub="2 to 12 years" value={s.ch} min={0} max={9 - s.ad} onChange={(v) => set({ ch: v })} />
            <Counter label="Infants" sub="Under 2 years, on lap" value={s.inf} min={0} max={s.ad} onChange={(v) => set({ inf: v })} />
            <div className="pax-cabin">
              <span className="eyebrow">Cabin</span>
              <div className="chips">
                {CABINS.map((c) => (
                  <button type="button" key={c.key} className={cx('chip', s.cabin === c.key && 'on')} onClick={() => set({ cabin: c.key })}>{c.name}</button>
                ))}
              </div>
            </div>
          </Pop>
        </Field>
        <div className="console-stub">
          <button type="submit" className="btn btn-red btn-search"><Icon name="search" size={18} stroke={2.4} /> <span>Search flights</span></button>
        </div>
      </div>
      {err && <div className="console-err" role="alert"><Icon name="info" size={16} /> {err}</div>}
      {!compact && (
        <div className="console-bottom">
          <span className="eyebrow">Special fares</span>
          <div className="chips">
            {SPECIAL_FARES.map((f) => (
              <button type="button" key={f.key} className={cx('chip', s.sp === f.key && 'on')} onClick={() => set({ sp: s.sp === f.key ? null : f.key })} aria-pressed={s.sp === f.key}>
                {s.sp === f.key && <Icon name="check" size={14} stroke={2.6} />} {f.name}
                <span className="chip-off">−{Math.round(f.off * 100)}%</span>
              </button>
            ))}
          </div>
          {s.sp && <p className="sp-note"><Icon name="info" size={14} /> {SPECIAL_FARES.find((f) => f.key === s.sp)!.note}</p>}
        </div>
      )}
    </form>
  );
}

/* ================= Hotels ================= */
export type RoomQ = { a: number; ages: number[] };
export type HotelQuery = { city: string; loc: string | null; hotelId: string | null; checkin: string; checkout: string; rooms: RoomQ[] };

export const roomsToParam = (rooms: RoomQ[]) => rooms.map((r) => [r.a, ...r.ages].join('-')).join(',');
export function parseRooms(s: string | null): RoomQ[] {
  if (!s) return [{ a: 2, ages: [] }];
  const out = s.split(',').map((p) => {
    const [a, ...ages] = p.split('-').map((x) => Number(x));
    return { a: Math.max(1, Math.min(4, a || 2)), ages: ages.filter((x) => x >= 0 && x <= 17).slice(0, 3) };
  });
  return out.slice(0, 6).length ? out.slice(0, 6) : [{ a: 2, ages: [] }];
}
export const guestCount = (rooms: RoomQ[]) => rooms.reduce((n, r) => n + r.a + r.ages.length, 0);
export const guestLabel = (rooms: RoomQ[]) => `${plural(rooms.length, 'room')} · ${plural(guestCount(rooms), 'guest')}`;

export function readHotelQuery(q: URLSearchParams): HotelQuery {
  const checkin = isISO(q.get('in')) && q.get('in')! >= todayISO() ? q.get('in')! : addDays(todayISO(), 10);
  const out = isISO(q.get('out')) && q.get('out')! > checkin ? q.get('out')! : addDays(checkin, 2);
  return {
    city: hasCity(q.get('city')) ? q.get('city')! : 'goa',
    loc: q.get('loc'), hotelId: null, checkin, checkout: daysBetween(checkin, out) > 30 ? addDays(checkin, 30) : out,
    rooms: parseRooms(q.get('rooms')),
  };
}
export const stayParams = (h: Pick<HotelQuery, 'checkin' | 'checkout' | 'rooms'>) => qs({ in: h.checkin, out: h.checkout, rooms: roomsToParam(h.rooms) });
export const hotelUrl = (h: HotelQuery) => '/hotels?' + qs({ city: h.city, loc: h.loc || '', in: h.checkin, out: h.checkout, rooms: roomsToParam(h.rooms) });

function DestList({ onPick }: { onPick: (s: HotelSuggestion) => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const list = useMemo(() => hotelSuggestions(q), [q]);
  useEffect(() => setI(0), [q]);
  const ico = { city: 'building', area: 'pin', hotel: 'bed' } as const;
  return (
    <div className="ac">
      <div className="ac-input">
        <Icon name="search" size={16} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="City, area or hotel name" aria-label="Search destinations"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(list.length - 1, v + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
            if (e.key === 'Enter' && list[i]) { e.preventDefault(); onPick(list[i]); }
          }} />
      </div>
      <div className="ac-head">{q ? 'Matches' : 'Popular destinations'}</div>
      <ul className="ac-list">
        {list.map((x, k) => (
          <li key={x.kind + x.id}>
            <button type="button" className={cx('ac-item', k === i && 'hl')} onMouseEnter={() => setI(k)} onClick={() => onPick(x)}>
              <span className="ac-ico"><Icon name={ico[x.kind]} size={16} /></span>
              <span className="ac-main"><b>{x.label}</b><span className="muted small">{x.sub}</span></span>
              <span className="ac-kind">{x.kind === 'city' ? 'City' : x.kind === 'area' ? 'Area' : 'Hotel'}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="ac-none">Nothing matches “{q}”. Try Goa, Jaipur or Dubai.</li>}
      </ul>
    </div>
  );
}

export function GuestsEditor({ rooms, onChange }: { rooms: RoomQ[]; onChange: (r: RoomQ[]) => void }) {
  const upd = (i: number, p: Partial<RoomQ>) => onChange(rooms.map((r, k) => (k === i ? { ...r, ...p } : r)));
  return (
    <div className="guests">
      {rooms.map((r, i) => (
        <div className="guest-room" key={i}>
          <div className="guest-room-head">
            <b>Room {i + 1}</b>
            {rooms.length > 1 && <button type="button" className="link-btn" onClick={() => onChange(rooms.filter((_, k) => k !== i))}>Remove</button>}
          </div>
          <Counter label="Adults" sub="13 years and above" value={r.a} min={1} max={4} onChange={(v) => upd(i, { a: v })} />
          <Counter label="Children" sub="0 to 12 years" value={r.ages.length} min={0} max={3}
            onChange={(v) => upd(i, { ages: v > r.ages.length ? [...r.ages, 6] : r.ages.slice(0, v) })} />
          {r.ages.length > 0 && (
            <div className="ages">
              {r.ages.map((age, k) => (
                <label key={k} className="age">
                  <span className="small muted">Child {k + 1} age</span>
                  <select value={age} onChange={(e) => upd(i, { ages: r.ages.map((x, j) => (j === k ? Number(e.target.value) : x)) })}>
                    {Array.from({ length: 13 }, (_, n) => <option key={n} value={n}>{n === 0 ? 'Under 1' : `${n} yr${n > 1 ? 's' : ''}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      {rooms.length < 6 && (
        <button type="button" className="btn btn-ghost add-room" onClick={() => onChange([...rooms, { a: 2, ages: [] }])}><Icon name="plus" size={16} /> Add another room</button>
      )}
    </div>
  );
}

type HField = 'dest' | 'in' | 'out' | 'guests' | null;

export function HotelSearch({ initial, onSearched, compact }: { initial?: Partial<HotelQuery>; onSearched?: () => void; compact?: boolean }) {
  const [s, setS] = useState<HotelQuery>(() => ({
    city: 'goa', loc: null, hotelId: null, checkin: addDays(todayISO(), 10), checkout: addDays(todayISO(), 12), rooms: [{ a: 2, ages: [] }], ...initial,
  }));
  const [active, setActive] = useState<HField>(null);
  const mobile = useMobile();
  const close = useCallback(() => setActive(null), []);
  const set = (p: Partial<HotelQuery>) => setS((v) => ({ ...v, ...p }));
  const c = getCity(s.city);
  const h = s.hotelId ? getHotel(s.hotelId) : null;
  const nights = daysBetween(s.checkin, s.checkout);

  const submit = () => {
    const url = h ? `/hotels/${h.id}?${stayParams(s)}` : hotelUrl(s);
    pushRecent({ kind: 'hotel', label: h ? h.name : s.loc ? `${s.loc}, ${c.name}` : c.name, sub: `${dShort(s.checkin)} – ${dShort(s.checkout)} · ${guestLabel(s.rooms)}`, url, at: Date.now() });
    setActive(null);
    onSearched?.();
    navigate(url);
  };

  const pickRange = (a: string, b: string | null) => {
    if (b) { set({ checkin: a, checkout: b }); setActive('guests'); }
    else { set({ checkin: a, checkout: addDays(a, Math.max(1, nights)) }); setActive('out'); }
  };

  return (
    <form className={cx('console', compact && 'compact')} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {!compact && (
        <div className="console-top">
          <span className="console-title">Hotels, villas, homestays and heritage stays</span>
          <span className="console-note"><Icon name="shieldCheck" size={15} /> Free cancellation on most rooms</span>
        </div>
      )}
      <div className="console-fields ht">
        <Field label="Destination, area or hotel" icon="pin" value={h ? h.name : s.loc || c.name} sub={h ? `${h.locality}, ${getCity(h.city).name}` : s.loc ? c.name : `${c.country} · ${c.blurb}`} active={active === 'dest'} onClick={() => setActive(active === 'dest' ? null : 'dest')} className="f-dest">
          <Pop open={active === 'dest'} onClose={close} title="Where to?" className="pop-ac">
            <DestList onPick={(x) => {
              set({ city: x.cityId, loc: x.kind === 'area' ? x.loc! : null, hotelId: x.kind === 'hotel' ? x.id : null });
              setActive('in');
            }} />
          </Pop>
        </Field>
        <Field label="Check-in" icon="calendar" value={<>{dShort(s.checkin)} <small>{dDay(s.checkin)}</small></>} sub="From 2:00 PM" active={active === 'in'} onClick={() => setActive(active === 'in' ? null : 'in')} className="f-in">
          <Pop open={active === 'in'} onClose={close} title="Check-in date" className="pop-cal" align="center">
            <Calendar mode="range" start={s.checkin} end={s.checkout} phase="start" months={mobile ? 1 : 2} onPick={pickRange} />
          </Pop>
        </Field>
        <Field label="Check-out" icon="calendar" value={<>{dShort(s.checkout)} <small>{dDay(s.checkout)}</small></>} sub={plural(nights, 'night')} active={active === 'out'} onClick={() => setActive(active === 'out' ? null : 'out')} className="f-out">
          <Pop open={active === 'out'} onClose={close} title="Check-out date" className="pop-cal" align="center">
            <Calendar mode="range" start={s.checkin} end={s.checkout} phase="end" months={mobile ? 1 : 2} onPick={pickRange} />
          </Pop>
        </Field>
        <Field label="Rooms & guests" icon="users" value={plural(guestCount(s.rooms), 'guest')} sub={plural(s.rooms.length, 'room')} active={active === 'guests'} onClick={() => setActive(active === 'guests' ? null : 'guests')} className="f-guests">
          <Pop open={active === 'guests'} onClose={close} title="Rooms & guests" align="right" className="pop-pax"
            footer={<button type="button" className="btn btn-red" onClick={close}>Done</button>}>
            <GuestsEditor rooms={s.rooms} onChange={(rooms) => set({ rooms })} />
          </Pop>
        </Field>
        <div className="console-stub">
          <button type="submit" className="btn btn-red btn-search"><Icon name="search" size={18} stroke={2.4} /> <span>{h ? 'See rooms' : 'Search hotels'}</span></button>
        </div>
      </div>
    </form>
  );
}

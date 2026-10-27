import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { AirlineLogo, Empty, Pop, useMobile } from '../components/ui';
import { AirlineName, FlightTimes, Segments } from '../components/flight';
import { FlightSearch, readFlightQuery, flightUrl } from '../components/search';
import { airport, AIRLINES } from '../data/places';
import { FARE_TYPES, getFlights, minFare, specialFare, slotOf, TIME_SLOTS, cabinName, type Flight, type FareKey } from '../data/flights';
import { addDays, cx, dDay, dMid, dShort, dur, hm, inr, plural, todayISO } from '../lib/format';
import { navigate, qs } from '../lib/router';
import { toast } from '../lib/store';

type Sort = 'best' | 'cheap' | 'fast' | 'early';
type Filters = { stops: number[]; airlines: string[]; dep: string[]; arr: string[]; max: number | null };
const NOF: Filters = { stops: [], airlines: [], dep: [], arr: [], max: null };
type Pick = { f: Flight; fare: FareKey; price: number };

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function DateStrip({ from, to, date, min, cabin, off, onPick }: { from: string; to: string; date: string; min: string; cabin: any; off: number; onPick: (d: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const start = [addDays(date, -7), min].sort().reverse()[0];
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(start, i)).map((d) => ({ d, p: Math.round(minFare(from, to, d, cabin) * (1 - off)) })), [from, to, start, cabin, off]);
  const low = Math.min(...days.map((x) => x.p));
  useEffect(() => {
    const el = ref.current?.querySelector('.ds-day.on') as HTMLElement | null;
    if (el && ref.current) ref.current.scrollLeft = el.offsetLeft - ref.current.clientWidth / 2 + el.clientWidth / 2;
  }, [date]);
  const scroll = (dx: number) => ref.current?.scrollBy({ left: dx, behavior: 'smooth' });
  return (
    <div className="dstrip">
      <button className="ds-arrow" onClick={() => scroll(-360)} aria-label="Earlier dates"><Icon name="chevL" /></button>
      <div className="ds-days" ref={ref}>
        {days.map((x) => (
          <button key={x.d} className={cx('ds-day', x.d === date && 'on', x.p === low && 'low')} onClick={() => onPick(x.d)}>
            <span className="small">{dMid(x.d)}</span>
            <b>{inr(x.p)}</b>
          </button>
        ))}
      </div>
      <button className="ds-arrow" onClick={() => scroll(360)} aria-label="Later dates"><Icon name="chevR" /></button>
    </div>
  );
}

function FilterPanel({ flights, price, f, setF, count }: { flights: Flight[]; price: (x: Flight) => number; f: Filters; setF: (x: Filters) => void; count: number }) {
  const minOf = (xs: Flight[]) => (xs.length ? inr(Math.min(...xs.map(price))) : '—');
  const prices = flights.map(price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const airlines = Array.from(new Set(flights.map((x) => x.airline)));
  const active = f.stops.length + f.airlines.length + f.dep.length + f.arr.length + (f.max ? 1 : 0);
  return (
    <div className="filters">
      <div className="filters-head">
        <b>Filters</b>
        {active > 0 && <button className="link-btn" onClick={() => setF(NOF)}>Clear all ({active})</button>}
      </div>
      <div className="fgroup">
        <h4>Stops</h4>
        {[0, 1].map((s) => {
          const xs = flights.filter((x) => x.stops === s);
          if (!xs.length) return null;
          return (
            <label key={s} className="check">
              <input type="checkbox" checked={f.stops.includes(s)} onChange={() => setF({ ...f, stops: toggle(f.stops, s) })} />
              <span>{s === 0 ? 'Non-stop' : '1 stop'}</span><span className="muted small">{minOf(xs)}</span>
            </label>
          );
        })}
      </div>
      {(['dep', 'arr'] as const).map((k) => (
        <div className="fgroup" key={k}>
          <h4>{k === 'dep' ? `Departure from ${airport(flights[0]?.from || 'DEL').city}` : `Arrival in ${airport(flights[0]?.to || 'DEL').city}`}</h4>
          <div className="slots">
            {TIME_SLOTS.map((s) => {
              const xs = flights.filter((x) => slotOf(k === 'dep' ? x.dep : x.arr) === s.key);
              return (
                <button key={s.key} disabled={!xs.length} className={cx('slot', f[k].includes(s.key) && 'on')} onClick={() => setF({ ...f, [k]: toggle(f[k], s.key) })} aria-pressed={f[k].includes(s.key)}>
                  <Icon name={s.icon} size={18} />
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="fgroup">
        <h4>Airlines</h4>
        {airlines.map((a) => {
          const xs = flights.filter((x) => x.airline === a);
          return (
            <label key={a} className="check">
              <input type="checkbox" checked={f.airlines.includes(a)} onChange={() => setF({ ...f, airlines: toggle(f.airlines, a) })} />
              <AirlineLogo code={a} size={22} />
              <span>{AIRLINES[a]?.name} <span className="muted small">({xs.length})</span></span>
              <span className="muted small">{minOf(xs)}</span>
            </label>
          );
        })}
      </div>
      <div className="fgroup">
        <h4>Max price per adult</h4>
        <input type="range" className="range" min={lo} max={hi} step={50} value={f.max ?? hi} onChange={(e) => setF({ ...f, max: Number(e.target.value) >= hi ? null : Number(e.target.value) })} aria-label="Maximum price" />
        <div className="range-lbl"><span>{inr(lo)}</span><b>{inr(f.max ?? hi)}</b></div>
      </div>
      <p className="muted small">{plural(count, 'flight')} match your filters.</p>
    </div>
  );
}

function FareCards({ f, base, selected, onPick }: { f: Flight; base: number; selected?: FareKey; onPick: (k: FareKey, price: number) => void }) {
  return (
    <div className="fares">
      {FARE_TYPES.map((t) => {
        const p = Math.round(base * t.mult);
        return (
          <div key={t.key} className={cx('fare', t.key === 'flexi' && 'featured', selected === t.key && 'on')}>
            {t.tag && <span className="fare-tag">{t.tag}</span>}
            <div className="fare-head"><b>{t.name}</b><span className="fare-price">{inr(p)}</span></div>
            <ul>
              <li><Icon name="bag" size={15} /> Cabin {t.cabinBag} · Check-in {t.checkBag(f.intl)}</li>
              <li><Icon name="xCircle" size={15} /> {t.cancel}</li>
              <li><Icon name="calendar" size={15} /> {t.change}</li>
              <li><Icon name="seat" size={15} /> {t.seat}</li>
              <li><Icon name="utensils" size={15} /> {t.meal}</li>
            </ul>
            <button className={cx('btn btn-block', t.key === 'flexi' ? 'btn-red' : 'btn-outline')} onClick={() => onPick(t.key, p)}>
              {selected === t.key ? 'Selected' : `Select ${t.name}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FlightCard({ f, price, badges, open, onToggle, selected, onPick }: { f: Flight; price: number; badges: string[]; open: boolean; onToggle: () => void; selected?: FareKey; onPick: (k: FareKey, p: number) => void }) {
  const [tab, setTab] = useState<'fares' | 'details'>('fares');
  return (
    <article className={cx('fcard', open && 'open', selected && 'picked')}>
      {badges.length > 0 && <div className="fbadges">{badges.map((b) => <span key={b} className={cx('fbadge', b === 'Cheapest' && 'red')}>{b}</span>)}</div>}
      <div className="fcard-main" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())} aria-expanded={open}>
        <AirlineName f={f} />
        <FlightTimes f={f} />
        <div className="fcard-price">
          <b>{inr(price)}</b>
          <span className="muted small">per adult</span>
          {f.seatsLeft && <span className="seats-left">{f.seatsLeft} seats left</span>}
        </div>
        <button className="btn btn-outline btn-sm fcard-cta" tabIndex={-1}>{open ? 'Hide fares' : selected ? 'Change fare' : 'View fares'} <Icon name={open ? 'up' : 'down'} size={15} /></button>
      </div>
      {open && (
        <div className="fcard-more">
          <div className="tabs-mini">
            <button className={cx(tab === 'fares' && 'on')} onClick={() => setTab('fares')}>Fare options</button>
            <button className={cx(tab === 'details' && 'on')} onClick={() => setTab('details')}>Flight details</button>
          </div>
          {tab === 'fares' ? <FareCards f={f} base={price} selected={selected} onPick={onPick} /> : <Segments f={f} />}
        </div>
      )}
    </article>
  );
}

function Skeleton() {
  return (
    <div className="fcard sk-card" aria-hidden="true">
      <div className="fcard-main">
        <div className="sk" style={{ width: 130, height: 36 }} />
        <div className="sk" style={{ height: 36 }} />
        <div className="sk" style={{ width: 90, height: 36 }} />
      </div>
    </div>
  );
}

export default function FlightResults({ query }: { query: URLSearchParams }) {
  const q = readFlightQuery(query);
  const mobile = useMobile();
  const sp = specialFare(q.sp);
  const off = sp?.off || 0;
  const outKey = [q.from, q.to, q.date, q.cabin, q.sp, q.ad, q.ch, q.inf, q.trip].join('|');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'out' | 'ret'>('out');
  const [sel, setSel] = useState<{ out?: Pick; ret?: Pick }>({});
  const [filters, setFilters] = useState<Filters>(NOF);
  const [sort, setSort] = useState<Sort>('best');
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [tracking, setTracking] = useState(false);

  useEffect(() => { setStep('out'); setSel({}); setFilters(NOF); setOpenId(null); }, [outKey]);
  useEffect(() => { setSel((s) => ({ out: s.out })); }, [q.ret]);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, [outKey, q.ret, step]);
  useEffect(() => { setFilters(NOF); setOpenId(null); }, [step]);

  const legFrom = step === 'out' ? q.from : q.to;
  const legTo = step === 'out' ? q.to : q.from;
  const legDate = step === 'out' ? q.date : q.ret || q.date;
  const flights = getFlights(legFrom, legTo, legDate, q.cabin);
  const price = (f: Flight) => Math.round(f.price * (1 - off));

  const list = useMemo(() => {
    const xs = flights.filter((f) =>
      (!filters.stops.length || filters.stops.includes(f.stops)) &&
      (!filters.airlines.length || filters.airlines.includes(f.airline)) &&
      (!filters.dep.length || filters.dep.includes(slotOf(f.dep))) &&
      (!filters.arr.length || filters.arr.includes(slotOf(f.arr))) &&
      (!filters.max || price(f) <= filters.max));
    const pMin = Math.min(...xs.map(price)), pMax = Math.max(...xs.map(price));
    const dMin = Math.min(...xs.map((f) => f.duration)), dMax = Math.max(...xs.map((f) => f.duration));
    const score = (f: Flight) => 0.62 * ((price(f) - pMin) / Math.max(1, pMax - pMin)) + 0.38 * ((f.duration - dMin) / Math.max(1, dMax - dMin));
    const sorted = [...xs].sort((a, b) =>
      sort === 'cheap' ? price(a) - price(b) : sort === 'fast' ? a.duration - b.duration : sort === 'early' ? a.dep - b.dep : score(a) - score(b));
    return { xs: sorted, score };
  }, [flights, filters, sort, off]);

  const cheapest = list.xs.length ? list.xs.reduce((a, b) => (price(b) < price(a) ? b : a)) : null;
  const fastest = list.xs.length ? list.xs.reduce((a, b) => (b.duration < a.duration ? b : a)) : null;
  const best = list.xs.length ? list.xs.reduce((a, b) => (list.score(b) < list.score(a) ? b : a)) : null;
  const earliest = list.xs.length ? list.xs.reduce((a, b) => (b.dep < a.dep ? b : a)) : null;

  const tabs: { key: Sort; name: string; f: Flight | null }[] = [
    { key: 'best', name: 'Best value', f: best },
    { key: 'cheap', name: 'Cheapest', f: cheapest },
    { key: 'fast', name: 'Fastest', f: fastest },
    { key: 'early', name: 'Earliest', f: earliest },
  ];

  const pax = q.ad + q.ch + q.inf;
  const bookUrl = (o: Pick, r?: Pick) =>
    '/flights/book?' + qs({ from: q.from, to: q.to, date: q.date, ret: q.trip === 'round' ? q.ret : '', ad: q.ad, ch: q.ch || '', inf: q.inf || '', cabin: q.cabin !== 'economy' ? q.cabin : '', sp: q.sp || '', o: o.f.idx, of: o.fare, r: r ? r.f.idx : '', rf: r ? r.fare : '' });

  const pickFare = (f: Flight, fare: FareKey, p: number) => {
    const pk = { f, fare, price: p };
    if (q.trip === 'oneway') return navigate(bookUrl(pk));
    if (step === 'out') {
      setSel({ out: pk, ret: sel.ret });
      setStep('ret');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(`Departure picked. Now choose your return from ${airport(q.to).city}.`, 'info');
    } else {
      setSel({ ...sel, ret: pk });
      setOpenId(null);
    }
  };

  const setDate = (d: string) => {
    if (step === 'out') navigate(flightUrl({ ...q, date: d, ret: q.ret && q.ret < d ? addDays(d, 3) : q.ret }), { replace: true, keepScroll: true });
    else navigate(flightUrl({ ...q, ret: d }), { replace: true, keepScroll: true });
  };

  const A = airport(q.from), B = airport(q.to);
  const filterPanel = <FilterPanel flights={flights} price={price} f={filters} setF={setFilters} count={list.xs.length} />;

  return (
    <div className="results-page">
      <div className="sumbar">
        <div className="wrap sumbar-in">
          <div className="sum-route">
            <b>{A.city} <Icon name={q.trip === 'round' ? 'swap' : 'right'} size={16} /> {B.city}</b>
            <span className="muted small">{dMid(q.date)}{q.trip === 'round' && q.ret ? ` – ${dMid(q.ret)}` : ''} · {plural(pax, 'traveller')} · {cabinName(q.cabin)}{sp ? ` · ${sp.name} fare` : ''}</span>
          </div>
          <div className="sum-actions">
            <button className={cx('btn btn-sm', tracking ? 'btn-dark' : 'btn-ghost')} onClick={() => { setTracking(!tracking); toast(tracking ? 'Price alert removed.' : `We will tell you when ${A.city} → ${B.city} fares drop.`, 'info'); }}>
              <Icon name="bellRing" size={15} /> <span className="hide-sm">{tracking ? 'Tracking prices' : 'Track prices'}</span>
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => setEdit(!edit)}><Icon name="edit" size={15} /> <span className="hide-sm">Modify</span></button>
          </div>
        </div>
        {edit && <div className="wrap sumbar-edit"><FlightSearch key={outKey + q.ret} initial={q} compact onSearched={() => setEdit(false)} /></div>}
      </div>

      <div className="wrap">
        {q.trip === 'round' && (
          <div className="legtabs">
            <button className={cx('legtab', step === 'out' && 'on', sel.out && 'done')} onClick={() => setStep('out')}>
              <span className="legtab-n">1</span>
              <span><b>{A.city} → {B.city}</b><span className="small muted">{dMid(q.date)}{sel.out ? ` · ${sel.out.f.number} · ${inr(sel.out.price)}` : ''}</span></span>
            </button>
            <button className={cx('legtab', step === 'ret' && 'on', sel.ret && 'done')} onClick={() => sel.out && setStep('ret')} disabled={!sel.out}>
              <span className="legtab-n">2</span>
              <span><b>{B.city} → {A.city}</b><span className="small muted">{dMid(q.ret!)}{sel.ret ? ` · ${sel.ret.f.number} · ${inr(sel.ret.price)}` : ''}</span></span>
            </button>
          </div>
        )}

        <DateStrip from={legFrom} to={legTo} date={legDate} min={step === 'ret' ? q.date : todayISO()} cabin={q.cabin} off={off} onPick={setDate} />

        <div className="results">
          {!mobile && <aside className="rail">{filterPanel}</aside>}
          <div className="rlist">
            {sp && <div className="note-bar"><Icon name="info" size={16} /> {sp.name} fares applied: {Math.round(sp.off * 100)}% off the base fare. {sp.note}</div>}
            <div className="sorttabs" role="tablist">
              {tabs.map((t) => (
                <button key={t.key} role="tab" aria-selected={sort === t.key} className={cx(sort === t.key && 'on')} onClick={() => setSort(t.key)}>
                  <span>{t.name}</span>
                  {t.f && <b>{inr(price(t.f))}</b>}
                  {t.f && <span className="small muted">{t.key === 'early' ? hm(t.f.dep) : dur(t.f.duration)}</span>}
                </button>
              ))}
            </div>
            <div className="rlist-meta muted small">
              <span>{loading ? 'Checking fares with airlines…' : `${plural(list.xs.length, 'flight')} · ${dMid(legDate)} · prices include taxes`}</span>
              <span className="hide-sm"><Icon name="shieldCheck" size={14} /> No convenience fee</span>
            </div>
            {loading ? (
              <>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} />)}</>
            ) : list.xs.length ? (
              list.xs.map((f) => {
                const badges: string[] = [];
                if (f === cheapest) badges.push('Cheapest');
                if (f === fastest) badges.push('Fastest');
                if (f === best && f !== cheapest) badges.push('Best value');
                const chosen = step === 'out' ? sel.out : sel.ret;
                return (
                  <FlightCard key={f.id} f={f} price={price(f)} badges={badges} open={openId === f.id} onToggle={() => setOpenId(openId === f.id ? null : f.id)}
                    selected={chosen?.f.id === f.id ? chosen.fare : undefined} onPick={(k, p) => pickFare(f, k, p)} />
                );
              })
            ) : (
              <Empty icon="filter" title="No flights match these filters">
                <p className="muted">Try removing a filter or two. There are {plural(flights.length, 'flight')} on this date.</p>
                <button className="btn btn-red" onClick={() => setFilters(NOF)}>Clear filters</button>
              </Empty>
            )}
          </div>
        </div>
      </div>

      {mobile && (
        <>
          <button className={cx('fab', q.trip === 'round' && sel.out && 'up')} onClick={() => setSheet(true)}><Icon name="sliders" size={17} /> Filter & sort</button>
          <Pop open={sheet} onClose={() => setSheet(false)} title="Filter flights" footer={<button className="btn btn-red btn-block" onClick={() => setSheet(false)}>Show {plural(list.xs.length, 'flight')}</button>}>
            {filterPanel}
          </Pop>
        </>
      )}

      {q.trip === 'round' && sel.out && (
        <div className="rtbar">
          <div className="wrap rtbar-in">
            {[sel.out, sel.ret].map((p, i) => (
              <div className="rt-pick" key={i}>
                <span className="eyebrow">{i === 0 ? 'Departure' : 'Return'}</span>
                {p ? (
                  <span className="rt-f"><AirlineLogo code={p.f.airline} size={26} /><b>{hm(p.f.dep)} → {hm(p.f.arr)}</b><span className="muted small">{p.f.number}</span></span>
                ) : <span className="muted">Choose a return flight</span>}
              </div>
            ))}
            <div className="rt-total">
              <span className="muted small">Per adult</span>
              <b>{inr(sel.out.price + (sel.ret?.price || 0))}</b>
            </div>
            <button className="btn btn-red" disabled={!sel.ret} onClick={() => sel.ret && navigate(bookUrl(sel.out!, sel.ret))}>Continue <Icon name="right" size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Photo, RatingBadge, Stars } from '../components/ui';
import { SplitFlap } from '../components/SplitFlap';
import { FlightSearch, HotelSearch, stayParams } from '../components/search';
import { DESTINATIONS, airport, city as getCity } from '../data/places';
import { minFare } from '../data/flights';
import { HOTELS, cheapestPlan, hotelsIn, ratingWord } from '../data/hotels';
import { addDays, cx, dShort, inr, todayISO } from '../lib/format';
import { Link, navigate, qs } from '../lib/router';
import { useStore, recentStore, toast } from '../lib/store';
import { BRAND } from '../config';

const BOARD = [
  { word: 'Goa', code: 'GOX', city: 'goa' },
  { word: 'Dubai', code: 'DXB', city: 'dubai' },
  { word: 'Jaipur', code: 'JAI', city: 'jaipur' },
  { word: 'Singapore', code: 'SIN', city: 'singapore' },
  { word: 'Udaipur', code: 'UDR', city: 'udaipur' },
  { word: 'Bali', code: 'DPS', city: null },
  { word: 'Leh', code: 'IXL', city: null },
];
const ORIGINS = ['DEL', 'BOM', 'BLR'];

function cheapestIn(from: string, to: string, days = 30) {
  const start = addDays(todayISO(), 3);
  const series = Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i);
    return { d, p: minFare(from, to, d) };
  });
  const best = series.reduce((a, b) => (b.p < a.p ? b : a));
  return { series, best };
}

function Spark({ series, best }: { series: { d: string; p: number }[]; best: { d: string; p: number } }) {
  const w = 220, h = 46;
  const ps = series.map((s) => s.p);
  const lo = Math.min(...ps), hi = Math.max(...ps);
  const X = (i: number) => (i / (series.length - 1)) * w;
  const Y = (p: number) => h - 6 - ((p - lo) / Math.max(1, hi - lo)) * (h - 12);
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(s.p).toFixed(1)}`).join(' ');
  const bi = series.findIndex((s) => s.d === best.d);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${w} ${h} L0 ${h} Z`} className="spark-area" />
      <path d={line} className="spark-line" />
      <circle cx={X(bi)} cy={Y(best.p)} r="4" className="spark-dot" />
    </svg>
  );
}

export default function Home({ query }: { query: URLSearchParams }) {
  const tab = query.get('tab') === 'hotels' ? 'hotels' : 'flights';
  const [bi, setBi] = useState(0);
  const [origin, setOrigin] = useState('DEL');
  const recents = useStore(recentStore);

  useEffect(() => {
    const id = setInterval(() => setBi((i) => (i + 1) % BOARD.length), 3400);
    return () => clearInterval(id);
  }, []);

  const b = BOARD[bi];
  const heroFare = useMemo(() => cheapestIn('DEL', b.code, 21).best, [b.code]);

  const routes = useMemo(
    () => ['GOX', 'DXB', 'JAI', 'SIN', 'UDR', 'BLR', 'BOM', 'DEL'].filter((c) => c !== origin && !(origin === 'BOM' && c === 'BOM')).slice(0, 6).map((to) => ({ to, ...cheapestIn(origin, to) })),
    [origin],
  );

  const topStays = useMemo(() => [...HOTELS].filter((h) => h.rating >= 9).sort((a, b) => b.rating - a.rating).slice(0, 8), []);
  const stay = stayParams({ checkin: addDays(todayISO(), 10), checkout: addDays(todayISO(), 12), rooms: [{ a: 2, ages: [] }] });

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast(`Copied ${code}. Paste it at checkout.`); }
    catch { toast(`Your code is ${code}. Enter it at checkout.`, 'info'); }
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <svg className="hero-arc" viewBox="0 0 1200 420" preserveAspectRatio="none">
            <path d="M-40 380 C 260 60, 820 40, 1240 260" />
          </svg>
        </div>
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="eyebrow light">Now boarding · from Delhi</span>
            <h1 className="hero-h">
              <span>Next stop</span>
              <SplitFlap word={b.word} />
            </h1>
            <div className="hero-meta">
              <span className="mono">DEL → {b.code}</span>
              <span>Fares from <b>{inr(heroFare.p)}</b> on {dShort(heroFare.d)}</span>
              <Link className="hero-go" to={`/flights?${qs({ from: 'DEL', to: b.code, date: heroFare.d })}`}>See flights <Icon name="right" size={16} /></Link>
              {b.city && <Link className="hero-go ghost" to={`/hotels?city=${b.city}&${stay}`}>Stays in {b.word}</Link>}
            </div>
          </div>
        </div>
      </section>

      <section className="wrap console-wrap">
        <div className="console-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'flights'} className={cx(tab === 'flights' && 'on')} onClick={() => navigate('/', { replace: true, keepScroll: true })}>
            <Icon name="plane" size={20} /> Flights
          </button>
          <button role="tab" aria-selected={tab === 'hotels'} className={cx(tab === 'hotels' && 'on')} onClick={() => navigate('/?tab=hotels', { replace: true, keepScroll: true })}>
            <Icon name="bed" size={20} /> Hotels
          </button>
        </div>
        {tab === 'flights' ? <FlightSearch key="f" /> : <HotelSearch key="h" />}
      </section>

      {recents.length > 0 && (
        <section className="wrap sec sec-tight">
          <div className="sec-head"><h2 className="h3">Pick up where you left off</h2>
            <button className="link-btn" onClick={() => recentStore.set([])}>Clear</button></div>
          <div className="recents">
            {recents.map((r) => (
              <Link key={r.url} to={r.url} className="recent">
                <span className="recent-ico"><Icon name={r.kind === 'flight' ? 'plane' : 'bed'} size={18} /></span>
                <span><b>{r.label}</b><span className="muted small">{r.sub}</span></span>
                <Icon name="chevR" size={16} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wrap sec" id="offers">
        <div className="sec-head">
          <div><span className="eyebrow">Offers</span><h2>Codes that work today</h2></div>
        </div>
        <div className="offers">
          {BRAND.coupons.map((c, i) => (
            <article key={c.code} className={cx('offer', i === 0 && 'feat')}>
              <span className="offer-kind">{c.applies === 'any' ? 'Flights & hotels' : c.applies === 'flight' ? 'Flights' : 'Hotels'}</span>
              <h3>{c.label}</h3>
              <p className="muted small">{c.applies === 'hotel' ? 'On stays of 2 nights or more.' : c.applies === 'flight' ? 'Domestic and international, all airlines.' : 'For new accounts. One use per traveller.'}</p>
              <div className="offer-code">
                <span className="mono">{c.code}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => copy(c.code)}><Icon name="copy" size={15} /> Copy</button>
              </div>
            </article>
          ))}
          <article className="offer dark">
            <span className="offer-kind">Always on</span>
            <h3>Zero convenience fee</h3>
            <p className="small">The price you see on the results page is the price you pay. No surprise fees at checkout.</p>
            <div className="offer-code"><Icon name="shieldCheck" size={18} /> On every booking</div>
          </article>
        </div>
      </section>

      <section className="wrap sec">
        <div className="sec-head">
          <div><span className="eyebrow">Fare tracker</span><h2>Cheapest days to fly in the next 30 days</h2></div>
          <div className="seg small" role="radiogroup" aria-label="Flying from">
            {ORIGINS.map((o) => (
              <button key={o} role="radio" aria-checked={origin === o} className={cx(origin === o && 'on')} onClick={() => setOrigin(o)}>{airport(o).city}</button>
            ))}
          </div>
        </div>
        <div className="routes">
          {routes.map((r) => (
            <Link key={r.to} className="route" to={`/flights?${qs({ from: origin, to: r.to, date: r.best.d })}`}>
              <div className="route-top">
                <span className="mono">{origin}</span><Icon name="plane" size={14} /><span className="mono">{r.to}</span>
              </div>
              <b className="route-city">{airport(r.to).city}</b>
              <Spark series={r.series} best={r.best} />
              <div className="route-foot">
                <span className="muted small">Lowest on {dShort(r.best.d)}</span>
                <b className="route-price">{inr(r.best.p)}</b>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap sec">
        <div className="sec-head"><div><span className="eyebrow">Destinations</span><h2>Where people are going this season</h2></div></div>
        <div className="dests">
          {DESTINATIONS.slice(0, 5).map((d, i) => {
            const c = d.id !== 'bali' ? getCity(d.id) : null;
            const stayFrom = c ? Math.min(...hotelsIn(c.id).map((h) => cheapestPlan(h).plan.price)) : null;
            const fly = cheapestIn('DEL', d.airport, 20).best;
            return (
              <article key={d.id} className={cx('dest', i === 0 && 'big')}>
                <Photo id={d.image} alt={d.label} w={i === 0 ? 1100 : 700} />
                <div className="dest-shade" />
                <div className="dest-info">
                  <span className="dest-note">{d.note}</span>
                  <h3>{d.label}</h3>
                  <div className="dest-links">
                    <Link to={`/flights?${qs({ from: 'DEL', to: d.airport, date: fly.d })}`}><Icon name="plane" size={14} /> from {inr(fly.p)}</Link>
                    {c && stayFrom && <Link to={`/hotels?city=${c.id}&${stay}`}><Icon name="bed" size={14} /> from {inr(stayFrom)}/night</Link>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="wrap sec">
        <div className="sec-head"><div><span className="eyebrow">Rated 9+ by guests</span><h2>Stays people keep coming back to</h2></div>
          <Link to={`/hotels?city=goa&${stay}`} className="link-btn">See all stays <Icon name="right" size={15} /></Link></div>
        <div className="hstrip">
          {topStays.map((h) => {
            const cp = cheapestPlan(h);
            return (
              <Link key={h.id} to={`/hotels/${h.id}?${stay}`} className="hmini">
                <Photo id={h.images[0]} alt={h.name} w={500} label={getCity(h.city).name} />
                <div className="hmini-body">
                  <span className="muted small">{h.locality}, {getCity(h.city).name}</span>
                  <b>{h.name}</b>
                  <div className="hmini-row"><Stars n={h.stars} /><RatingBadge score={h.rating} word={ratingWord(h.rating)} compact /></div>
                  <span className="hmini-price"><b>{inr(cp.plan.price)}</b> <span className="muted small">per night</span></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="wrap sec why">
        {[
          ['shieldCheck', 'Zero convenience fee', 'What you see on results is what you pay.'],
          ['trend', 'Lowest fare first', 'Every airline and hotel supplier compared in one search.'],
          ['refresh', 'Quick refunds', 'Cancel in two taps. Refunds start the same day.'],
          ['headset', 'People, not bots', `Real agents on ${BRAND.phone}, day and night.`],
        ].map(([ic, t, d]) => (
          <div key={t} className="why-item">
            <span className="why-ico"><Icon name={ic} size={22} /></span>
            <div><b>{t}</b><p className="muted small">{d}</p></div>
          </div>
        ))}
      </section>
    </div>
  );
}

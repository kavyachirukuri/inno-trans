import { Icon } from './Icon';
import { AirlineLogo } from './ui';
import { airport, AIRLINES } from '../data/places';
import { distanceKm, type Flight } from '../data/flights';
import { dMid, dur, hm, addDays, cx } from '../lib/format';

export const dayShift = (min: number) => Math.floor(min / 1440);

export function RouteLine({ f, light }: { f: Flight; light?: boolean }) {
  return (
    <div className={cx('rline', light && 'light')}>
      <span className="rline-dur">{dur(f.duration)}</span>
      <span className="rline-track">
        <i className="rl-dot" />
        {f.stops === 1 && <i className="rl-stop" title={`Stop in ${airport(f.via!).city}`} />}
        <i className="rl-plane"><Icon name="plane" size={14} /></i>
      </span>
      <span className={cx('rline-stops', f.stops === 0 && 'ns')}>{f.stops === 0 ? 'Non-stop' : `1 stop · ${f.via}`}</span>
    </div>
  );
}

export function FlightTimes({ f, compact }: { f: Flight; compact?: boolean }) {
  const shift = dayShift(f.arr);
  return (
    <div className={cx('ftimes', compact && 'compact')}>
      <div className="ft-end">
        <b className="ft-time">{hm(f.dep)}</b>
        <span className="ft-code">{f.from}</span>
        {!compact && <span className="ft-city muted small">{airport(f.from).city}</span>}
      </div>
      <RouteLine f={f} />
      <div className="ft-end r">
        <b className="ft-time">{hm(f.arr)}{shift > 0 && <sup className="plus">+{shift}</sup>}</b>
        <span className="ft-code">{f.to}</span>
        {!compact && <span className="ft-city muted small">{airport(f.to).city}</span>}
      </div>
    </div>
  );
}

export function AirlineName({ f }: { f: Flight }) {
  return (
    <div className="al">
      <AirlineLogo code={f.airline} />
      <div>
        <b>{AIRLINES[f.airline]?.name}</b>
        <span className="muted small mono">{f.number}</span>
      </div>
    </div>
  );
}

export function Segments({ f }: { f: Flight }) {
  const A = airport(f.from), B = airport(f.to);
  const legs: { from: string; to: string; dep: number; arr: number; mins: number; date: string; arrDate: string; term1: string; term2: string }[] = [];
  if (f.stops === 0) {
    legs.push({ from: f.from, to: f.to, dep: f.dep, arr: f.arr, mins: f.duration, date: f.date, arrDate: addDays(f.date, dayShift(f.arr)), term1: f.depTerminal, term2: f.arrTerminal });
  } else {
    const V = airport(f.via!);
    const l1 = f.leg1!;
    const vArr = f.dep + l1 + (V.tz - A.tz);
    const vDep = vArr + f.layover!;
    legs.push({ from: f.from, to: f.via!, dep: f.dep, arr: vArr, mins: l1, date: f.date, arrDate: addDays(f.date, dayShift(vArr)), term1: f.depTerminal, term2: 'T2' });
    legs.push({ from: f.via!, to: f.to, dep: vDep, arr: f.arr, mins: f.duration - l1 - f.layover!, date: addDays(f.date, dayShift(vDep)), arrDate: addDays(f.date, dayShift(f.arr)), term1: 'T2', term2: f.arrTerminal });
  }
  return (
    <div className="segs">
      {legs.map((l, i) => (
        <div key={i}>
          {i === 1 && (
            <div className="layover"><Icon name="clock" size={15} /> {dur(f.layover!)} layover in {airport(f.via!).city} · change of plane, same airline{f.intl ? ' · transit visa may be needed' : ''}</div>
          )}
          <div className="seg-row">
            <div className="seg-times">
              <div><b>{hm(l.dep)}</b><span className="muted small">{dMid(l.date)}</span></div>
              <div className="seg-dur"><span>{dur(l.mins)}</span></div>
              <div><b>{hm(l.arr)}</b><span className="muted small">{dMid(l.arrDate)}</span></div>
            </div>
            <div className="seg-line" aria-hidden="true"><i /><span /><i /></div>
            <div className="seg-places">
              <div><b>{airport(l.from).city} ({l.from})</b><span className="muted small">{airport(l.from).name} · {l.term1}</span></div>
              <div className="seg-meta muted small"><Icon name="plane" size={13} /> {f.number} · {f.aircraft} · {Math.round(distanceKm(l.from, l.to)).toLocaleString('en-IN')} km</div>
              <div><b>{airport(l.to).city} ({l.to})</b><span className="muted small">{airport(l.to).name} · {l.term2}</span></div>
            </div>
          </div>
        </div>
      ))}
      <p className="muted tiny">Times are local. Arrive at the airport {f.intl ? '3 hours' : '2 hours'} before departure. {B.country !== 'India' && f.intl ? `Check visa rules for ${B.country}.` : ''}</p>
    </div>
  );
}

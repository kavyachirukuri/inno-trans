import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { addDays, cx, dMonth, fromISO, inr, toISO, todayISO } from '../lib/format';

const HOLIDAYS: Record<string, string> = {
  '01-01': 'New Year', '01-26': 'Republic Day', '08-15': 'Independence Day', '10-02': 'Gandhi Jayanti', '12-25': 'Christmas',
  '2026-11-08': 'Diwali', '2026-11-24': 'Guru Nanak Jayanti', '2027-03-22': 'Holi', '2027-03-21': 'Eid al-Fitr',
};
const holiday = (iso: string) => HOLIDAYS[iso] || HOLIDAYS[iso.slice(5)];

type Props = {
  mode: 'single' | 'range';
  start: string | null;
  end?: string | null;
  min?: string;
  onPick: (start: string, end: string | null) => void;
  fare?: (iso: string) => number | null;
  months?: number;
  phase?: 'start' | 'end'; // which end of a range the next click sets
};

export function Calendar({ mode, start, end, min = todayISO(), onPick, fare, months = 2, phase: phase0 = 'start' }: Props) {
  const base = fromISO(start || min);
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const [hover, setHover] = useState<string | null>(null);
  const [phase, setPhase] = useState<'start' | 'end'>(phase0);
  const minD = fromISO(min);
  const maxView = new Date(minD.getFullYear(), minD.getMonth() + 11, 1);
  const canPrev = view > new Date(minD.getFullYear(), minD.getMonth(), 1);
  const canNext = new Date(view.getFullYear(), view.getMonth() + months - 1, 1) < maxView;

  const monthsList = useMemo(
    () => Array.from({ length: months }, (_, i) => new Date(view.getFullYear(), view.getMonth() + i, 1)),
    [view, months],
  );

  const fares = useMemo(() => {
    if (!fare) return null;
    const m: Record<string, number | null> = {};
    monthsList.forEach((mo) => {
      const days = new Date(mo.getFullYear(), mo.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const iso = toISO(new Date(mo.getFullYear(), mo.getMonth(), d));
        if (iso >= min) m[iso] = fare(iso);
      }
    });
    const vals = Object.values(m).filter((v): v is number => v != null).sort((a, b) => a - b);
    const low = vals[Math.floor(vals.length * 0.25)] ?? 0;
    return { m, low };
  }, [fare, monthsList, min]);

  const click = (iso: string) => {
    if (mode === 'single') return onPick(iso, null);
    if (phase === 'end' && start && iso > start) {
      setPhase('start');
      return onPick(start, iso);
    }
    setPhase('end');
    onPick(iso, null);
  };

  const preview = mode === 'range' && phase === 'end' && start && hover && hover > start ? hover : null;
  const rangeEnd = preview || (end && start && end > start ? end : null);

  return (
    <div className="cal">
      <div className="cal-nav">
        <button type="button" className="icon-btn" disabled={!canPrev} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} aria-label="Previous month"><Icon name="chevL" /></button>
        <button type="button" className="icon-btn" disabled={!canNext} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Next month"><Icon name="chevR" /></button>
      </div>
      <div className="cal-months">
        {monthsList.map((mo) => {
          const first = mo.getDay();
          const days = new Date(mo.getFullYear(), mo.getMonth() + 1, 0).getDate();
          return (
            <div key={mo.toISOString()} className="cal-month">
              <div className="cal-title">{dMonth(mo)}</div>
              <div className="cal-grid cal-wk">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="cal-grid" onMouseLeave={() => setHover(null)}>
                {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const iso = toISO(new Date(mo.getFullYear(), mo.getMonth(), i + 1));
                  const off = iso < min;
                  const isStart = iso === start;
                  const isEnd = iso === rangeEnd;
                  const inRange = mode === 'range' && start && rangeEnd && iso > start && iso < rangeEnd;
                  const f = fares?.m[iso];
                  const h = holiday(iso);
                  return (
                    <button
                      type="button"
                      key={iso}
                      disabled={off}
                      className={cx('day', isStart && 'sel start', isEnd && 'sel end', inRange && 'mid', iso === todayISO() && 'today', f != null && fares && f <= fares.low && 'cheap')}
                      onClick={() => click(iso)}
                      onMouseEnter={() => setHover(iso)}
                      title={h ? h : undefined}
                      aria-label={`${fromISO(iso).toDateString()}${f ? `, from ${inr(f)}` : ''}${h ? `, ${h}` : ''}`}
                    >
                      <span className="dn">{i + 1}</span>
                      {f != null && !off && <span className="df">{f >= 10000 ? `₹${(f / 1000).toFixed(1)}k` : inr(f)}</span>}
                      {h && !off && <i className="hol" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        {fare && <span><i className="lg-cheap" /> Lowest fares</span>}
        <span><i className="lg-hol" /> Public holiday</span>
        {mode === 'range' && start && rangeEnd && (
          <span className="nights">{Math.round((fromISO(rangeEnd).getTime() - fromISO(start).getTime()) / 864e5)} nights</span>
        )}
        {mode === 'range' && <span className="cal-hint">{phase === 'start' ? 'Pick check-in date' : 'Now pick check-out'}</span>}
      </div>
    </div>
  );
}

export const defaultDepart = () => addDays(todayISO(), 7);

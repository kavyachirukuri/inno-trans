import { Fragment, useMemo } from 'react';
import { rng } from '../lib/rand';
import { cx, inr } from '../lib/format';
import type { Flight, FareKey } from '../data/flights';

type Layout = { groups: string[][]; rows: [number, number]; exits: number[]; front: number[] };

function layoutFor(aircraft: string): Layout {
  if (aircraft.startsWith('ATR')) return { groups: [['A', 'C'], ['D', 'F']], rows: [1, 18], exits: [], front: [1, 2] };
  if (/787|A350|777/.test(aircraft)) return { groups: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'K']], rows: [20, 44], exits: [31], front: [20, 21] };
  if (aircraft.includes('A321')) return { groups: [['A', 'B', 'C'], ['D', 'E', 'F']], rows: [1, 36], exits: [12, 26], front: [1, 2, 3] };
  return { groups: [['A', 'B', 'C'], ['D', 'E', 'F']], rows: [1, 31], exits: [12, 13], front: [1, 2, 3] };
}

export type SeatInfo = { id: string; price: number; kind: 'xl' | 'front' | 'window' | 'aisle' | 'middle' | 'free'; taken: boolean };

export function seatInfo(f: Flight, fare: FareKey, id: string): SeatInfo {
  const L = layoutFor(f.aircraft);
  const row = parseInt(id, 10);
  const letter = id.replace(/\d+/g, '');
  const all = L.groups.flat();
  const edge = letter === all[0] || letter === all[all.length - 1];
  const aisle = L.groups.some((g, gi) => (gi > 0 && g[0] === letter) || (gi < L.groups.length - 1 && g[g.length - 1] === letter));
  let kind: SeatInfo['kind'] = edge ? 'window' : aisle ? 'aisle' : 'middle';
  let price = edge ? 349 : aisle ? 299 : 149;
  if (L.front.includes(row)) { kind = 'front'; price = 899; }
  if (L.exits.includes(row)) { kind = 'xl'; price = 699; }
  if (row >= L.rows[1] - 6 && kind === 'middle') { kind = 'free'; price = 0; }
  if (fare === 'super') price = 0;
  if (fare === 'flexi' && kind !== 'xl' && kind !== 'front') price = 0;
  const r = rng(`${f.id}:${id}`);
  const taken = r() < (kind === 'free' ? 0.65 : kind === 'front' || kind === 'xl' ? 0.35 : 0.45);
  return { id, price, kind, taken };
}

export function SeatMap({ f, fare, assigned, active, onPick }: { f: Flight; fare: FareKey; assigned: (string | null)[]; active: number; onPick: (seat: string) => void }) {
  const L = layoutFor(f.aircraft);
  const rows = useMemo(() => Array.from({ length: L.rows[1] - L.rows[0] + 1 }, (_, i) => L.rows[0] + i), [f.aircraft]);
  const skip = (r: number) => r === 13 && !L.exits.includes(13) && L.rows[0] === 1; // many airlines skip row 13
  return (
    <div className="seatmap">
      <div className="sm-legend">
        <span><i className="st free" /> Free</span>
        <span><i className="st paid" /> ₹149–349</span>
        <span><i className="st xl" /> Extra legroom</span>
        <span><i className="st taken" /> Taken</span>
      </div>
      <div className="cabin">
        <div className="nose"><span>Front</span></div>
        <div className="sm-cols" style={{ gridTemplateColumns: L.groups.map((g) => `repeat(${g.length}, var(--seat))`).join(' 26px ') }}>
          {L.groups.map((g, gi) => (
            <Fragment key={gi}>
              {gi > 0 && <span />}
              {g.map((l) => <span key={l} className="sm-letter">{l}</span>)}
            </Fragment>
          ))}
        </div>
        <div className="sm-rows">
          {rows.filter((r) => !skip(r)).map((r) => (
            <div key={r} className={cx('sm-row', L.exits.includes(r) && 'exit')} style={{ gridTemplateColumns: L.groups.map((g) => `repeat(${g.length}, var(--seat))`).join(' 26px ') }}>
              {L.groups.map((g, gi) => (
                <Fragment key={gi}>
                  {gi > 0 && <span className="sm-aisle">{r}</span>}
                  {g.map((l) => {
                    const id = `${r}${l}`;
                    const s = seatInfo(f, fare, id);
                    const who = assigned.indexOf(id);
                    const mine = who >= 0;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={cx('seat', s.taken && !mine && 'taken', mine && 'mine', s.kind === 'xl' || s.kind === 'front' ? 'xl' : s.price === 0 ? 'free' : 'paid', mine && who === active && 'act')}
                        disabled={s.taken && !mine}
                        onClick={() => onPick(id)}
                        title={`${id} · ${s.kind === 'xl' ? 'Exit row, extra legroom' : s.kind === 'front' ? 'Front rows, extra legroom' : s.kind[0].toUpperCase() + s.kind.slice(1)} · ${s.price ? inr(s.price) : 'Free'}`}
                        aria-label={`Seat ${id}, ${s.taken && !mine ? 'taken' : s.price ? inr(s.price) : 'free'}`}
                      >
                        {mine ? who + 1 : ''}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          ))}
        </div>
        <div className="tail"><span>Rear</span></div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Icon } from '../components/Icon';
import { AirlineLogo, CodeArt, Empty, Modal, Photo, Logo } from '../components/ui';
import { RouteLine } from '../components/flight';
import { airport, AIRLINES, city as getCity } from '../data/places';
import { fareType, cabinName } from '../data/flights';
import { hotel as getHotel } from '../data/hotels';
import { addDays, cx, dLong, dMid, dShort, daysBetween, dur, fromISO, hm, inr, plural, todayISO, pad } from '../lib/format';
import { Link, navigate } from '../lib/router';
import { toast, tripsStore, updateTrip, useStore, type FlightTrip, type HotelTrip, type Trip } from '../lib/store';
import { BRAND } from '../config';

const MEAL_NAMES: Record<string, string> = {
  'veg-sandwich': 'Veg sandwich', upma: 'Masala upma', 'paneer-wrap': 'Paneer wrap', jain: 'Jain meal', 'chicken-biryani': 'Chicken biryani', 'egg-wrap': 'Egg wrap',
};

const tripDate = (t: Trip) => (t.kind === 'flight' ? t.legs[0].flight.date : t.checkin);
const tripEnd = (t: Trip) => (t.kind === 'flight' ? t.legs[t.legs.length - 1].flight.date : t.checkout);
export const liveStatus = (t: Trip) => (t.status === 'upcoming' && tripEnd(t) < todayISO() ? 'completed' : t.status);

function refundFor(t: Trip) {
  if (t.kind === 'flight') {
    if (t.zeroCancel) return { refund: t.total, fee: 0, note: 'Zero cancellation covers the full fare.' };
    const share = t.legs.reduce((s, l) => s + fareType(l.fare).refundShare, 0) / t.legs.length;
    const refund = Math.round(t.total * share);
    return { refund, fee: t.total - refund, note: `${t.legs.map((l) => fareType(l.fare).name).join(' + ')} fare rules apply.` };
  }
  const free = t.refundable && t.freeCancelDays && todayISO() <= addDays(t.checkin, -t.freeCancelDays);
  if (t.payMode === 'hotel') return { refund: 0, fee: 0, note: free || !t.refundable ? 'Nothing was charged. You can cancel at no cost.' : 'Nothing was charged.' };
  if (free) return { refund: t.paidNow, fee: 0, note: 'You are inside the free cancellation window.' };
  if (t.refundable) {
    const nightCost = Math.round(t.total / Math.max(1, daysBetween(t.checkin, t.checkout)));
    return { refund: Math.max(0, t.paidNow - nightCost), fee: Math.min(t.paidNow, nightCost), note: 'One night is charged after the free window.' };
  }
  return { refund: 0, fee: t.paidNow, note: 'This was a non-refundable rate.' };
}

function CancelModal({ t, open, onClose }: { t: Trip; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const r = refundFor(t);
  const paid = t.kind === 'flight' ? t.total : t.paidNow;
  return (
    <Modal open={open} onClose={onClose} title="Cancel this booking?">
      <div className="cancel-body">
        <p className="muted">{t.kind === 'flight' ? `${airport(t.legs[0].flight.from).city} → ${airport(t.legs[0].flight.to).city} · PNR ${t.ref}` : `${t.hotelName} · ${dShort(t.checkin)} – ${dShort(t.checkout)}`}</p>
        <dl className="bookbox-lines">
          <div><dt>Amount paid</dt><dd>{inr(paid)}</dd></div>
          <div><dt>Cancellation charges</dt><dd>{inr(r.fee)}</dd></div>
          <div className="total"><dt>Refund</dt><dd>{inr(r.refund)}</dd></div>
        </dl>
        <p className="small muted"><Icon name="info" size={14} /> {r.note} {r.refund > 0 ? `Refund goes back to ${t.payMethod} in 3–5 working days.` : ''}</p>
        <span className="eyebrow">Why are you cancelling?</span>
        <div className="chips">{['Change of plans', 'Found a better price', 'Medical reason', 'Booked by mistake', 'Other'].map((x) => <button key={x} className={cx('chip sm', reason === x && 'on')} onClick={() => setReason(x)}>{x}</button>)}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Keep booking</button>
          <button className="btn btn-red" disabled={!reason} onClick={() => {
            updateTrip(t.id, { status: 'cancelled', refund: r.refund });
            onClose();
            toast(r.refund ? `Cancelled. ${inr(r.refund)} refund started.` : 'Booking cancelled.');
          }}>Cancel booking</button>
        </div>
      </div>
    </Modal>
  );
}

function icsDate(iso: string, minutes: number, tz: number) {
  const d = fromISO(iso);
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, minutes - tz);
  const u = new Date(utc);
  return `${u.getUTCFullYear()}${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}T${pad(u.getUTCHours())}${pad(u.getUTCMinutes())}00Z`;
}
function downloadIcs(t: Trip) {
  const ev: string[] = [];
  if (t.kind === 'flight') {
    t.legs.forEach((l) => {
      const f = l.flight;
      ev.push('BEGIN:VEVENT', `UID:${t.id}-${f.id}@rahi`, `DTSTAMP:${icsDate(todayISO(), 0, 0)}`,
        `DTSTART:${icsDate(f.date, f.dep, airport(f.from).tz)}`, `DTEND:${icsDate(f.date, f.dep + f.duration, airport(f.from).tz)}`,
        `SUMMARY:${AIRLINES[f.airline]?.name} ${f.number} ${f.from}→${f.to}`, `DESCRIPTION:PNR ${t.ref}`, `LOCATION:${airport(f.from).name}`, 'END:VEVENT');
    });
  } else {
    ev.push('BEGIN:VEVENT', `UID:${t.id}@rahi`, `DTSTAMP:${icsDate(todayISO(), 0, 0)}`, `DTSTART;VALUE=DATE:${t.checkin.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${t.checkout.replace(/-/g, '')}`,
      `SUMMARY:Stay at ${t.hotelName}`, `DESCRIPTION:Booking ${t.ref}. Check-in from 2 PM.`, `LOCATION:${getHotel(t.hotelId)?.locality || ''}, ${getCity(t.cityId).name}`, 'END:VEVENT');
  }
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${BRAND.name}//Trips//EN`, ...ev, 'END:VCALENDAR'].join('\r\n');
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${BRAND.name.toLowerCase()}-${t.ref}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Calendar file downloaded. Open it to add the trip.');
  } catch { toast('Your browser blocked the download.', 'warn'); }
}

function BoardingPass({ t, li, stamp }: { t: FlightTrip; li: number; stamp?: boolean }) {
  const l = t.legs[li];
  const f = l.flight;
  const A = airport(f.from), B = airport(f.to);
  const ft = fareType(l.fare);
  const seated = t.pax.filter((p) => p.type !== 'infant');
  return (
    <article className={cx('bpass', t.status === 'cancelled' && 'void')}>
      <div className="bp-main">
        <div className="bp-band">
          <Logo light />
          <span className="bp-kind">E-ticket · {li === 0 ? 'Departure' : 'Return'}</span>
          <span className="bp-pnr"><small>PNR</small><b className="mono">{t.ref}</b></span>
        </div>
        <div className="bp-route">
          <div><b className="bp-code">{f.from}</b><span>{A.city}</span><b className="bp-time">{hm(f.dep)}</b><span className="muted small">{dMid(f.date)} · {f.depTerminal}</span></div>
          <RouteLine f={f} />
          <div className="r"><b className="bp-code">{f.to}</b><span>{B.city}</span><b className="bp-time">{hm(f.arr)}</b><span className="muted small">{dMid(addDays(f.date, Math.floor(f.arr / 1440)))} · {f.arrTerminal}</span></div>
        </div>
        <div className="bp-facts">
          <div><span className="eyebrow">Flight</span><b className="bp-al"><AirlineLogo code={f.airline} size={20} /> {f.number}</b></div>
          <div><span className="eyebrow">Fare</span><b>{cabinName(f.cabin)} · {ft.name}</b></div>
          <div><span className="eyebrow">Duration</span><b>{dur(f.duration)}</b></div>
          <div><span className="eyebrow">Baggage</span><b>{ft.checkBag(f.intl)}{t.extraBags ? ` +${t.extraBags} kg` : ''}</b></div>
        </div>
        <table className="bp-pax">
          <thead><tr><th>Traveller</th><th>Seat</th><th>Meal</th></tr></thead>
          <tbody>
            {t.pax.map((p, i) => {
              const si = seated.indexOf(p);
              return (
                <tr key={i}>
                  <td>{p.title} {p.first} {p.last}{p.type !== 'adult' && <span className="muted tiny"> · {p.type}</span>}</td>
                  <td className="mono">{si >= 0 ? l.seats[si] || 'At check-in' : 'On lap'}</td>
                  <td>{si >= 0 && l.meals[si] ? MEAL_NAMES[l.meals[si]!] : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stamp && t.status !== 'cancelled' && <span className="stamp" aria-hidden="true">Confirmed</span>}
        {t.status === 'cancelled' && <span className="stamp void" aria-hidden="true">Cancelled</span>}
      </div>
      <div className="bp-stub">
        <CodeArt value={`${t.ref}${f.id}`} size={92} />
        <span className="mono bp-stub-pnr">{t.ref}</span>
        <span className="tiny">Web check-in opens 48 h before departure. Gate closes 25 min before.</span>
      </div>
    </article>
  );
}

function HotelVoucher({ t, stamp }: { t: HotelTrip; stamp?: boolean }) {
  const h = getHotel(t.hotelId);
  const c = getCity(t.cityId);
  const nights = daysBetween(t.checkin, t.checkout);
  const guests = t.rooms.reduce((n, r) => n + r.a + r.c, 0);
  return (
    <article className={cx('voucher', t.status === 'cancelled' && 'void')}>
      <div className="v-photo"><Photo id={t.image} alt={t.hotelName} w={900} label={c.name} /><div className="v-shade" />
        <div className="v-over"><span className="bp-kind">Hotel voucher</span><h2>{t.hotelName}</h2><span>{h?.locality}, {c.name}</span></div>
      </div>
      <div className="v-body">
        <div className="v-dates">
          <div><span className="eyebrow">Check-in</span><b>{dLong(t.checkin)}</b><span className="muted small">from 2:00 PM</span></div>
          <span className="stay-n">{plural(nights, 'night')}</span>
          <div><span className="eyebrow">Check-out</span><b>{dLong(t.checkout)}</b><span className="muted small">by 11:00 AM</span></div>
        </div>
        <div className="bp-facts">
          <div><span className="eyebrow">Booking ID</span><b className="mono">{t.ref}</b></div>
          <div><span className="eyebrow">Room</span><b>{t.rooms.length} × {t.roomName}</b></div>
          <div><span className="eyebrow">Rate</span><b>{t.planName}</b></div>
          <div><span className="eyebrow">Guests</span><b>{plural(guests, 'guest')}</b></div>
        </div>
        <div className="v-row">
          <div><span className="eyebrow">Lead guest</span><b>{t.guest.title} {t.guest.first} {t.guest.last}</b><span className="muted small">+91 {t.guest.phone} · {t.guest.email}</span></div>
          <div><span className="eyebrow">Payment</span><b>{t.payMode === 'hotel' ? `Pay ${inr(t.total)} at hotel` : t.payMode === 'part' ? `${inr(t.paidNow)} paid · ${inr(t.total - t.paidNow)} due ${dShort(addDays(t.checkin, -3))}` : `${inr(t.total)} paid`}</b><span className="muted small">{t.payMethod}</span></div>
        </div>
        {t.requests.length > 0 && <div className="v-req"><span className="eyebrow">Requests sent to hotel</span><div className="chips">{t.requests.map((r) => <span key={r} className="chip sm">{r}</span>)}</div></div>}
        <p className="small muted"><Icon name="info" size={14} /> {t.refundable && t.freeCancelDays ? `Free cancellation until ${dShort(addDays(t.checkin, -t.freeCancelDays))}.` : 'Non-refundable rate.'} Carry a government photo ID for every adult.</p>
        <div className="v-code"><CodeArt value={t.ref} size={84} /><span className="tiny muted">Show this at the front desk</span></div>
        {stamp && t.status !== 'cancelled' && <span className="stamp" aria-hidden="true">Confirmed</span>}
        {t.status === 'cancelled' && <span className="stamp void" aria-hidden="true">Cancelled</span>}
      </div>
    </article>
  );
}

export function Confirmation({ params, query }: { params: { id: string }; query: URLSearchParams }) {
  const trips = useStore(tripsStore);
  const t = trips.find((x) => x.id === params.id);
  const [cancel, setCancel] = useState(false);
  if (!t) return <div className="wrap page-pad"><Empty icon="ticket" title="We could not find this booking"><p className="muted">Bookings in this demo are saved on this device only.</p><Link className="btn btn-red" to="/trips">Go to my trips</Link></Empty></div>;
  const fresh = query.get('new') === '1';
  const st = liveStatus(t);
  const share = async () => {
    try { await navigator.clipboard.writeText(location.origin + location.pathname); toast('Link copied.'); } catch { toast('Copy the link from the address bar.', 'info'); }
  };
  const email = t.kind === 'flight' ? t.contact.email : t.guest.email;
  const phone = t.kind === 'flight' ? t.contact.phone : t.guest.phone;
  return (
    <div className="wrap conf">
      <div className={cx('conf-head', fresh && 'fresh', st === 'cancelled' && 'cancelled')}>
        <span className="conf-check">{st === 'cancelled' ? <Icon name="xCircle" size={30} /> : <svg viewBox="0 0 52 52" width="46" height="46"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>}</span>
        <div>
          <h1 className="h2">{st === 'cancelled' ? 'Booking cancelled' : fresh ? `You're booked${t.kind === 'flight' ? `, ${t.pax[0].first}` : `, ${t.guest.first}`}!` : t.kind === 'flight' ? 'Your e-ticket' : 'Your hotel voucher'}</h1>
          <p className="muted">{st === 'cancelled' ? (t.refund ? `${inr(t.refund)} refund on its way to ${t.payMethod}.` : 'No refund was due on this booking.') : `${t.kind === 'flight' ? 'E-ticket' : 'Voucher'} sent to ${email} and WhatsApp +91 ${phone}.`}</p>
        </div>
      </div>
      <div className="conf-actions no-print">
        <button className="btn btn-dark btn-sm" onClick={() => window.print()}><Icon name="printer" size={15} /> Print or save PDF</button>
        {st === 'upcoming' && <button className="btn btn-outline btn-sm" onClick={() => downloadIcs(t)}><Icon name="calendar" size={15} /> Add to calendar</button>}
        <button className="btn btn-outline btn-sm" onClick={share}><Icon name="share" size={15} /> Share</button>
        {t.kind === 'hotel' && <a className="btn btn-outline btn-sm" href={`https://www.google.com/maps/search/${encodeURIComponent(`${t.hotelName} ${getCity(t.cityId).name}`)}`} target="_blank" rel="noreferrer"><Icon name="navigation" size={15} /> Directions</a>}
        {st === 'upcoming' && <button className="btn btn-ghost btn-sm danger" onClick={() => setCancel(true)}><Icon name="xCircle" size={15} /> Cancel booking</button>}
      </div>
      <div className="conf-docs">
        {t.kind === 'flight' ? t.legs.map((_, i) => <BoardingPass key={i} t={t} li={i} stamp={fresh} />) : <HotelVoucher t={t} stamp={fresh} />}
      </div>
      {fresh && st === 'upcoming' && (
        <div className="conf-next no-print">
          {t.kind === 'flight' && getCity(airport(t.legs[0].flight.to).cityId || '') && airport(t.legs[0].flight.to).cityId && (
            <Link className="next-card" to={`/hotels?city=${airport(t.legs[0].flight.to).cityId}&in=${t.legs[0].flight.date}&out=${t.legs[1]?.flight.date || addDays(t.legs[0].flight.date, 2)}`}>
              <Icon name="bed" size={22} /><span><b>Need a place to stay in {airport(t.legs[0].flight.to).city}?</b><span className="muted small">Stays for your dates, from people who just booked flights like yours</span></span><Icon name="chevR" />
            </Link>
          )}
          <Link className="next-card" to="/trips"><Icon name="ticket" size={22} /><span><b>Manage this booking</b><span className="muted small">Cancel, see refunds and download tickets from My trips</span></span><Icon name="chevR" /></Link>
        </div>
      )}
      <CancelModal t={t} open={cancel} onClose={() => setCancel(false)} />
    </div>
  );
}

export default function Trips() {
  const trips = useStore(tripsStore);
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [cancel, setCancel] = useState<Trip | null>(null);
  const list = trips.filter((t) => liveStatus(t) === tab).sort((a, b) => (tab === 'upcoming' ? tripDate(a).localeCompare(tripDate(b)) : tripDate(b).localeCompare(tripDate(a))));
  const count = (s: string) => trips.filter((t) => liveStatus(t) === s).length;
  return (
    <div className="wrap trips">
      <div className="trips-head">
        <div><span className="eyebrow">My trips</span><h1 className="h2">Your bookings</h1></div>
        <div className="seg" role="tablist">
          {(['upcoming', 'completed', 'cancelled'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={tab === s} className={cx(tab === s && 'on')} onClick={() => setTab(s)}>{s[0].toUpperCase() + s.slice(1)} <span className="count">{count(s)}</span></button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="trip-list">
          {list.map((t) => {
            const days = daysBetween(todayISO(), tripDate(t));
            return (
              <article key={t.id} className={cx('trip', t.kind)}>
                <div className="trip-ico"><Icon name={t.kind === 'flight' ? 'plane' : 'bed'} size={20} /></div>
                {t.kind === 'flight' ? (
                  <div className="trip-main">
                    <b>{airport(t.legs[0].flight.from).city} {t.legs.length > 1 ? '⇄' : '→'} {airport(t.legs[0].flight.to).city}</b>
                    <span className="muted small">{dMid(t.legs[0].flight.date)}{t.legs[1] ? ` – ${dMid(t.legs[1].flight.date)}` : ''} · {hm(t.legs[0].flight.dep)} · {t.legs.map((l) => l.flight.number).join(', ')} · {plural(t.pax.length, 'traveller')}</span>
                    <span className="small">PNR <b className="mono">{t.ref}</b></span>
                  </div>
                ) : (
                  <div className="trip-main">
                    <b>{t.hotelName}</b>
                    <span className="muted small">{dMid(t.checkin)} – {dMid(t.checkout)} · {getCity(t.cityId).name} · {t.roomName}</span>
                    <span className="small">Booking <b className="mono">{t.ref}</b></span>
                  </div>
                )}
                <div className="trip-side">
                  {tab === 'upcoming' && <span className="chip sm on">{days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}</span>}
                  {tab === 'cancelled' && <span className="chip sm">{t.refund ? `Refund ${inr(t.refund)}` : 'No refund'}</span>}
                  <b>{inr(t.total)}</b>
                  <div className="trip-btns">
                    <button className="btn btn-sm btn-outline" onClick={() => navigate(`/trips/${t.id}`)}>{t.kind === 'flight' ? 'E-ticket' : 'Voucher'}</button>
                    {tab === 'upcoming' && <button className="btn btn-sm btn-ghost danger" onClick={() => setCancel(t)}>Cancel</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty icon="ticket" title={tab === 'upcoming' ? 'No upcoming trips yet' : tab === 'completed' ? 'No completed trips' : 'No cancelled bookings'}>
          <p className="muted">{tab === 'upcoming' ? 'Book a flight or a stay and it will show up here, with tickets and cancellation in one place.' : 'Trips you finish or cancel will show up here.'}</p>
          <div className="row-gap"><Link className="btn btn-red" to="/"><Icon name="plane" size={16} /> Search flights</Link><Link className="btn btn-outline" to="/?tab=hotels"><Icon name="bed" size={16} /> Find a stay</Link></div>
        </Empty>
      )}
      <p className="muted tiny trips-note">Demo build: bookings are saved in this browser only.</p>
      {cancel && <CancelModal t={cancel} open onClose={() => setCancel(null)} />}
    </div>
  );
}

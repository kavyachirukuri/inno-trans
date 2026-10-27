import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Empty, Modal, Photo, RatingBadge, Stars, Steps, useMobile } from '../components/ui';
import { PaymentPanel, CouponBox, Summary, Processing, newPay, payError, payLabel, useHoldTimer, type Line } from '../components/payment';
import { readHotelQuery, stayParams, guestLabel } from '../components/search';
import { city as getCity } from '../data/places';
import { hotel as getHotel, nightly, taxFor, ratingWord } from '../data/hotels';
import { addDays, code, cx, dLong, dShort, daysBetween, inr, plural, todayISO } from '../lib/format';
import { Link, navigate } from '../lib/router';
import { addTrip, openLogin, useStore, userStore } from '../lib/store';

const REQUESTS = ['Early check-in', 'Late check-out', 'High floor', 'Quiet room', 'Twin beds', 'Celebrating an occasion'];
const PICKUP = 1200;

export default function HotelBooking({ params, query }: { params: { id: string }; query: URLSearchParams }) {
  const h = getHotel(params.id);
  const q = readHotelQuery(new URLSearchParams({ ...Object.fromEntries(query), city: h?.city || 'goa' }));
  const user = useStore(userStore);
  const mobile = useMobile();
  const hold = useHoldTimer(15);
  const [step, setStep] = useState(0);
  const [guest, setGuest] = useState(() => {
    const [first = '', ...rest] = (user?.name || '').split(' ');
    return { title: 'Mr', first, last: rest.join(' '), phone: user?.phone || '', email: '' };
  });
  const [forOther, setForOther] = useState(false);
  const [requests, setRequests] = useState<string[]>([]);
  const [pickup, setPickup] = useState(false);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payMode, setPayMode] = useState<'now' | 'part' | 'hotel'>('now');
  const [coupon, setCoupon] = useState<{ code: string; off: number } | null>(null);
  const [pay, setPay] = useState(newPay());
  const [payErr, setPayErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sumOpen, setSumOpen] = useState(false);

  const room = h?.rooms.find((r) => r.id === query.get('room')) || h?.rooms[0];
  const plan = room?.plans.find((p) => p.key === query.get('plan')) || room?.plans[0];
  if (!h || !room || !plan) return <div className="wrap page-pad"><Empty icon="bed" title="This room is no longer available"><Link className="btn btn-red" to="/?tab=hotels">Search again</Link></Empty></div>;

  const c = getCity(h.city);
  const nights = Math.max(1, daysBetween(q.checkin, q.checkout));
  const roomsN = q.rooms.length;
  const perNight = nightly(h, plan.price, q.checkin, q.checkout);
  const tax = taxFor(h, perNight);
  const roomTotal = perNight * nights * roomsN;
  const taxTotal = tax * nights * roomsN;
  const extras = pickup ? PICKUP : 0;
  const subtotal = roomTotal + taxTotal + extras;
  const total = Math.max(0, subtotal - (coupon?.off || 0));
  const canPart = plan.refundable && daysBetween(todayISO(), q.checkin) > 7;
  const paidNow = payMode === 'hotel' ? 0 : payMode === 'part' ? Math.round(total * 0.25) : total;
  const fu = plan.refundable && plan.freeCancelDays ? addDays(q.checkin, -plan.freeCancelDays) : null;
  const freeUntil = fu && fu >= todayISO() ? fu : null;

  const lines: Line[] = [
    { label: `${plural(roomsN, 'room')} × ${plural(nights, 'night')}`, amount: roomTotal, sub: `${inr(perNight)} per room per night` },
    { label: c.intl ? 'Taxes & fees' : `GST (${perNight > 7500 ? '18' : '5'}%)`, amount: taxTotal },
  ];
  if (pickup) lines.push({ label: 'Airport pickup', amount: PICKUP });
  lines.push({ label: 'Convenience fee', amount: 0, tone: 'free' });
  if (coupon) lines.push({ label: `Coupon ${coupon.code}`, amount: coupon.off, tone: 'save' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[a-z][a-z .'-]*$/i.test(guest.first.trim())) e.first = 'Enter the guest’s first name';
    if (!/^[a-z][a-z .'-]*$/i.test(guest.last.trim())) e.last = 'Enter the last name';
    if (!/^[6-9]\d{9}$/.test(guest.phone.replace(/\D/g, ''))) e.phone = 'Enter a 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(guest.email)) e.email = 'We send the voucher to this email';
    setErrors(e);
    if (Object.keys(e).length) setTimeout(() => document.querySelector('.has-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
    return !Object.keys(e).length;
  };
  const next = () => {
    if (step === 0) { if (validate()) { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
    if (payMode !== 'hotel') {
      const err = payError(pay);
      setPayErr(err);
      if (err) return;
    }
    setProcessing(true);
  };
  const finish = () => {
    const id = code('', 10);
    addTrip({
      kind: 'hotel', id, ref: code('RH', 7), createdAt: Date.now(), status: 'upcoming', hotelId: h.id, hotelName: h.name, cityId: h.city, image: h.images[0],
      checkin: q.checkin, checkout: q.checkout, roomName: room.name, planName: plan.name, planKey: plan.key, refundable: plan.refundable, freeCancelDays: plan.freeCancelDays,
      rooms: q.rooms.map((r) => ({ a: r.a, c: r.ages.length })), guest: { ...guest, first: guest.first.trim(), last: guest.last.trim() },
      requests: [...requests, ...(pickup ? ['Airport pickup'] : []), ...(note.trim() ? [note.trim()] : [])], total, paidNow, payMode,
      payMethod: payMode === 'hotel' ? 'Pay at hotel' : payLabel(pay),
    });
    navigate(`/trips/${id}?new=1`);
  };
  const fe = (k: string) => errors[k] && <span className="ferr">{errors[k]}</span>;
  const cta = step === 0 ? 'Continue to payment' : payMode === 'hotel' ? 'Confirm booking' : `Pay ${inr(paidNow)}`;

  const summary = (
    <Summary lines={lines} total={total} totalLabel="Total for your stay"
      note={payMode !== 'now' ? <><Icon name="wallet" size={15} /> Pay {inr(paidNow)} now, {inr(total - paidNow)} {payMode === 'hotel' ? 'at the hotel' : `by ${dShort(addDays(q.checkin, -3))}`}.</> : <><Icon name="shieldCheck" size={15} /> No convenience fee. No hidden charges at the hotel.</>}>
      {step === 1 && <CouponBox kind="hotel" amount={roomTotal} applied={coupon} onApply={setCoupon} />}
    </Summary>
  );

  return (
    <div className="book-page">
      <div className="book-head">
        <div className="wrap book-head-in">
          <button className="link-btn" onClick={() => (step ? setStep(0) : navigate(`/hotels/${h.id}?${stayParams(q)}`))}><Icon name="left" size={16} /> {step ? 'Back' : 'Change room'}</button>
          <Steps steps={['Guest details', 'Payment']} current={step} />
          <span className="hold"><Icon name="clock" size={15} /> Room held <b className="mono">{hold}</b></span>
        </div>
      </div>
      <div className="wrap book-grid">
        <div className="book-main">
          <section className="card stay-card">
            <Photo id={h.images[0]} alt={h.name} w={500} label={c.name} />
            <div className="stay-info">
              <div className="hcard-top"><span className="htype">{h.type}</span><Stars n={h.stars} /></div>
              <h2 className="h3">{h.name}</h2>
              <span className="muted small">{h.locality}, {c.name}</span>
              <RatingBadge score={h.rating} word={ratingWord(h.rating)} count={h.reviews} />
            </div>
            <div className="stay-dates">
              <div><span className="eyebrow">Check-in</span><b>{dLong(q.checkin)}</b><span className="muted small">from 2:00 PM</span></div>
              <span className="stay-n">{plural(nights, 'night')}</span>
              <div><span className="eyebrow">Check-out</span><b>{dLong(q.checkout)}</b><span className="muted small">by 11:00 AM</span></div>
            </div>
            <div className="stay-room"><b>{room.name}</b> · {plan.name} · {guestLabel(q.rooms)}</div>
            <div className="cancel-line">
              <span className="eyebrow">Cancellation</span>
              {freeUntil ? (
                <div className="ctl">
                  <div className="ctl-seg ok" style={{ flex: Math.max(1, daysBetween(todayISO(), freeUntil)) }}><span>Free cancellation</span></div>
                  <div className="ctl-seg bad" style={{ flex: plan.freeCancelDays }}><span>1 night charged</span></div>
                  <div className="ctl-marks"><span>Today</span><span>{dShort(freeUntil)}</span><span>Check-in {dShort(q.checkin)}</span></div>
                </div>
              ) : plan.refundable ? <p className="small muted">The free cancellation window for these dates has passed. Cancelling now costs one night.</p> : <p className="small muted">This rate is non-refundable. You save about 9% compared with the flexible rate.</p>}
            </div>
          </section>

          {step === 0 && (
            <>
              {!user && (
                <button className="login-nudge" onClick={() => openLogin(() => {
                  const u = userStore.get();
                  if (u) { const [first, ...rest] = u.name.split(' '); setGuest((g) => ({ ...g, first, last: rest.join(' '), phone: u.phone })); }
                })}>
                  <Icon name="user" size={18} /> <span><b>Log in to fill details faster</b><span className="muted small">and manage this booking later</span></span> <Icon name="chevR" size={16} />
                </button>
              )}
              <section className="card">
                <div className="card-head"><h2 className="h3">Guest details</h2><span className="muted small">The hotel will check this name against the guest's ID</span></div>
                <label className="check"><input type="checkbox" checked={forOther} onChange={(e) => setForOther(e.target.checked)} /><span>I am booking for someone else</span></label>
                <div className="chips">{['Mr', 'Ms', 'Mrs'].map((t) => <button key={t} type="button" className={cx('chip sm', guest.title === t && 'on')} onClick={() => setGuest({ ...guest, title: t })}>{t}</button>)}</div>
                <div className="row2">
                  <label className={cx('fld', errors.first && 'has-err')}><span>{forOther ? 'Guest first name' : 'First name'}</span><input id="g-first" value={guest.first} onChange={(e) => setGuest({ ...guest, first: e.target.value })} />{fe('first')}</label>
                  <label className={cx('fld', errors.last && 'has-err')}><span>Last name</span><input id="g-last" value={guest.last} onChange={(e) => setGuest({ ...guest, last: e.target.value })} />{fe('last')}</label>
                </div>
                <div className="row2">
                  <label className={cx('fld', errors.phone && 'has-err')}><span>Mobile number</span><div className="phone-in"><span>+91</span><input id="g-phone" inputMode="numeric" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value.replace(/[^\d ]/g, '') })} /></div>{fe('phone')}</label>
                  <label className={cx('fld', errors.email && 'has-err')}><span>Email for the voucher</span><input id="g-email" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} placeholder="you@example.com" />{fe('email')}</label>
                </div>
              </section>
              <section className="card">
                <div className="card-head"><h2 className="h3">Anything the hotel should know?</h2><span className="muted small">Requests depend on availability</span></div>
                <div className="chips">{REQUESTS.map((r) => <button key={r} type="button" className={cx('chip', requests.includes(r) && 'on')} onClick={() => setRequests(requests.includes(r) ? requests.filter((x) => x !== r) : [...requests, r])}>{requests.includes(r) && <Icon name="check" size={13} stroke={2.6} />} {r}</button>)}</div>
                <label className={cx('addon', pickup && 'on')}>
                  <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
                  <span className="addon-ico"><Icon name="car" size={20} /></span>
                  <span><b>Airport pickup</b><span className="muted small">A driver waits at {c.airport} arrivals with your name. Sedan, up to 3 guests.</span></span>
                  <b className="num">{inr(PICKUP)}</b>
                </label>
                <label className="fld"><span>Other requests</span><textarea id="g-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example, we arrive late around 11 PM" /></label>
              </section>
            </>
          )}

          {step === 1 && (
            <>
              <section className="card">
                <div className="card-head"><h2 className="h3">When would you like to pay?</h2></div>
                <div className="paymodes">
                  <label className={cx('paymode', payMode === 'now' && 'on')}><input type="radio" name="pm" checked={payMode === 'now'} onChange={() => setPayMode('now')} /><b>Pay in full now</b><span className="muted small">{inr(total)} today</span></label>
                  <label className={cx('paymode', payMode === 'part' && 'on', !canPart && 'off')}><input type="radio" name="pm" disabled={!canPart} checked={payMode === 'part'} onChange={() => setPayMode('part')} /><b>Pay 25% now</b><span className="muted small">{canPart ? `${inr(Math.round(total * 0.25))} now, rest 3 days before check-in` : 'For refundable stays booked 7+ days ahead'}</span></label>
                  <label className={cx('paymode', payMode === 'hotel' && 'on', !plan.payAtHotel && 'off')}><input type="radio" name="pm" disabled={!plan.payAtHotel} checked={payMode === 'hotel'} onChange={() => setPayMode('hotel')} /><b>Pay at hotel</b><span className="muted small">{plan.payAtHotel ? '₹0 now. Card needed to guarantee the room.' : 'Not available for this rate'}</span></label>
                </div>
              </section>
              {payMode !== 'hotel' && (
                <section className="card">
                  <div className="card-head"><h2 className="h3">Payment method</h2><span className="muted small"><Icon name="lock" size={13} /> Secured with 256-bit encryption</span></div>
                  <PaymentPanel pay={pay} setPay={(p) => { setPay(p); setPayErr(null); }} error={payErr} />
                </section>
              )}
            </>
          )}
          {!mobile && <div className="book-actions"><button className="btn btn-red btn-lg" onClick={next}>{cta} <Icon name="right" size={17} /></button></div>}
        </div>
        {!mobile && <aside className="book-side">{summary}</aside>}
      </div>
      {mobile && (
        <>
          <div className="paybar">
            <button className="paybar-total" onClick={() => setSumOpen(true)}><b>{inr(step === 1 ? paidNow : total)}</b><span className="small">{step === 1 && payMode !== 'now' ? 'due now' : 'Price details'} <Icon name="up" size={13} /></span></button>
            <button className="btn btn-red" onClick={next}>{cta}</button>
          </div>
          <Modal open={sumOpen} onClose={() => setSumOpen(false)} title="Price details" className="sheet-modal">{summary}</Modal>
        </>
      )}
      <Processing open={processing} steps={['Checking the room is still free', payMode === 'hotel' ? 'Guaranteeing your room' : 'Payment authorised', 'Sending your voucher to the hotel']} onDone={finish} />
    </div>
  );
}

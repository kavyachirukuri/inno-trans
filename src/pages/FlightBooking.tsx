import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Empty, Steps, useMobile, Modal } from '../components/ui';
import { AirlineName, FlightTimes, Segments } from '../components/flight';
import { SeatMap, seatInfo } from '../components/SeatMap';
import { PaymentPanel, CouponBox, Summary, Processing, newPay, payError, payLabel, useHoldTimer, type Line } from '../components/payment';
import { readFlightQuery, flightUrl } from '../components/search';
import { airport } from '../data/places';
import { getFlights, fareType, fareFor, specialFare, childFare, infantFare, type FareKey, type Flight } from '../data/flights';
import { code, cx, dMid, inr, plural } from '../lib/format';
import { Link, navigate } from '../lib/router';
import { addTrip, openLogin, useStore, userStore, type Pax } from '../lib/store';

const MEALS = [
  { key: 'veg-sandwich', name: 'Veg club sandwich', price: 350, veg: true },
  { key: 'upma', name: 'Masala upma with chutney', price: 300, veg: true },
  { key: 'paneer-wrap', name: 'Paneer tikka wrap', price: 450, veg: true },
  { key: 'jain', name: 'Jain meal', price: 400, veg: true },
  { key: 'chicken-biryani', name: 'Chicken biryani', price: 550, veg: false },
  { key: 'egg-wrap', name: 'Egg bhurji wrap', price: 400, veg: false },
];
const BAGS = [{ kg: 0, price: 0 }, { kg: 5, price: 1850 }, { kg: 10, price: 3600 }, { kg: 15, price: 5400 }];
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

type Leg = { f: Flight; fare: FareKey };

export default function FlightBooking({ query }: { query: URLSearchParams }) {
  const q = readFlightQuery(query);
  const user = useStore(userStore);
  const mobile = useMobile();
  const hold = useHoldTimer(15);
  const off = specialFare(q.sp)?.off || 0;

  const legs: Leg[] | null = useMemo(() => {
    const o = getFlights(q.from, q.to, q.date, q.cabin)[Number(query.get('o'))];
    if (!o) return null;
    const out: Leg[] = [{ f: o, fare: fareType(query.get('of') || 'saver').key }];
    if (q.trip === 'round' && q.ret) {
      const r = getFlights(q.to, q.from, q.ret, q.cabin)[Number(query.get('r'))];
      if (!r) return null;
      out.push({ f: r, fare: fareType(query.get('rf') || 'saver').key });
    }
    return out;
  }, [query.toString()]);

  const blankPax = (): Pax[] => [
    ...Array.from({ length: q.ad }, () => ({ type: 'adult' as const, title: 'Mr', first: '', last: '' })),
    ...Array.from({ length: q.ch }, () => ({ type: 'child' as const, title: 'Master', first: '', last: '', dob: '' })),
    ...Array.from({ length: q.inf }, () => ({ type: 'infant' as const, title: 'Miss', first: '', last: '', dob: '' })),
  ];
  const [step, setStep] = useState(0);
  const [pax, setPax] = useState<Pax[]>(() => {
    const p = blankPax();
    if (user && p[0]) { const [first, ...rest] = user.name.split(' '); p[0] = { ...p[0], first, last: rest.join(' ') }; }
    return p;
  });
  const [contact, setContact] = useState({ phone: user?.phone || '', email: '' });
  const [gst, setGst] = useState({ on: false, company: '', number: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const seatPax = pax.filter((p) => p.type !== 'infant').length;
  const [seats, setSeats] = useState<(string | null)[][]>(() => (legs || []).map(() => Array(seatPax).fill(null)));
  const [meals, setMeals] = useState<(string | null)[][]>(() => (legs || []).map(() => Array(seatPax).fill(null)));
  const [legTab, setLegTab] = useState(0);
  const [activePax, setActivePax] = useState(0);
  const [bag, setBag] = useState(0);
  const [insurance, setInsurance] = useState(false);
  const [zero, setZero] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; off: number } | null>(null);
  const [pay, setPay] = useState(newPay());
  const [payErr, setPayErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sumOpen, setSumOpen] = useState(false);

  if (!legs) {
    return (
      <div className="wrap page-pad">
        <Empty icon="plane" title="This fare is no longer available">
          <p className="muted">Fares change quickly. Search again to see what is open now.</p>
          <Link className="btn btn-red" to={flightUrl(q)}>Back to results</Link>
        </Empty>
      </div>
    );
  }

  /* ---------- price ---------- */
  const adultOf = (l: Leg) => Math.round(fareFor(l.f, l.fare) * (1 - off));
  const baseTotal = legs.reduce((s, l) => s + q.ad * adultOf(l) + q.ch * childFare(adultOf(l)) + q.inf * infantFare(l.f.intl), 0);
  const seatTotal = legs.reduce((s, l, li) => s + seats[li].reduce((a, id) => a + (id ? seatInfo(l.f, l.fare, id).price : 0), 0), 0);
  const mealTotal = legs.reduce((s, l, li) => s + meals[li].reduce((a, m, pi) => {
    if (!m) return a;
    const free = l.fare !== 'saver';
    return a + (free ? 0 : MEALS.find((x) => x.key === m)!.price);
  }, 0), 0);
  const bagPrice = BAGS[bag].price * legs.length;
  const insTotal = insurance ? 249 * (q.ad + q.ch) : 0;
  const zeroTotal = zero ? legs.reduce((s, l) => s + Math.max(399, Math.round(adultOf(l) * 0.08)) * (q.ad + q.ch), 0) : 0;
  const subtotal = baseTotal + seatTotal + mealTotal + bagPrice + insTotal + zeroTotal;
  const total = Math.max(0, subtotal - (coupon?.off || 0));
  const lines: Line[] = [
    { label: `Base fare`, amount: Math.round(baseTotal * 0.82), sub: `${plural(q.ad + q.ch + q.inf, 'traveller')} · ${legs.length === 2 ? 'round trip' : 'one way'}` },
    { label: 'Taxes & airport fees', amount: baseTotal - Math.round(baseTotal * 0.82) },
  ];
  if (seatTotal || seats.some((s) => s.some(Boolean))) lines.push({ label: 'Seats', amount: seatTotal, tone: seatTotal ? undefined : 'free' });
  if (meals.some((m) => m.some(Boolean))) lines.push({ label: 'Meals', amount: mealTotal, tone: mealTotal ? undefined : 'free' });
  if (bagPrice) lines.push({ label: `Extra baggage +${BAGS[bag].kg} kg`, amount: bagPrice });
  if (insTotal) lines.push({ label: 'Travel insurance', amount: insTotal });
  if (zeroTotal) lines.push({ label: 'Zero cancellation', amount: zeroTotal });
  lines.push({ label: 'Convenience fee', amount: 0, tone: 'free' });
  if (coupon) lines.push({ label: `Coupon ${coupon.code}`, amount: coupon.off, tone: 'save' });

  /* ---------- steps ---------- */
  const validateTravellers = () => {
    const e: Record<string, string> = {};
    pax.forEach((p, i) => {
      if (!/^[a-z][a-z .'-]*$/i.test(p.first.trim())) e[`first${i}`] = 'Enter first name as on ID';
      if (!/^[a-z][a-z .'-]*$/i.test(p.last.trim())) e[`last${i}`] = 'Enter last name';
      if (p.type !== 'adult' && !p.dob) e[`dob${i}`] = 'Date of birth is needed';
    });
    if (!/^[6-9]\d{9}$/.test(contact.phone.replace(/\D/g, ''))) e.phone = 'Enter a 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) e.email = 'Enter an email for your e-ticket';
    if (gst.on) {
      if (gst.company.trim().length < 3) e.company = 'Enter the registered company name';
      if (!GSTIN.test(gst.number.trim().toUpperCase())) e.gst = 'GSTIN has 15 characters, like 29ABCDE1234F1Z5';
    }
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector('.has-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
      return false;
    }
    return true;
  };

  const next = () => {
    if (step === 0) { if (!validateTravellers()) return; setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (step === 1) { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const err = payError(pay);
    setPayErr(err);
    if (err) return;
    setProcessing(true);
  };

  const finish = () => {
    const id = code('', 10);
    addTrip({
      kind: 'flight', id, ref: code('', 6), createdAt: Date.now(), status: 'upcoming',
      legs: legs.map((l, li) => ({ flight: l.f, fare: l.fare, seats: seats[li], meals: meals[li] })),
      pax: pax.map((p) => ({ ...p, first: p.first.trim(), last: p.last.trim() })), contact, total, extraBags: BAGS[bag].kg, insurance, zeroCancel: zero, payMethod: payLabel(pay),
    });
    navigate(`/trips/${id}?new=1`);
  };

  const pickSeat = (id: string) => {
    const legSeats = seats[legTab].slice();
    const holder = legSeats.indexOf(id);
    if (holder >= 0) { legSeats[holder] = null; setActivePax(holder); }
    else {
      legSeats[activePax] = id;
      const nextFree = legSeats.findIndex((s, i) => !s && i !== activePax);
      if (nextFree >= 0) setActivePax(nextFree);
    }
    setSeats(seats.map((s, i) => (i === legTab ? legSeats : s)));
  };

  const updPax = (i: number, p: Partial<Pax>) => setPax(pax.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const fe = (k: string) => errors[k] && <span className="ferr">{errors[k]}</span>;
  const titles = (t: Pax['type']) => (t === 'adult' ? ['Mr', 'Ms', 'Mrs'] : ['Master', 'Miss']);
  const cta = step === 2 ? `Pay ${inr(total)}` : step === 1 ? 'Continue to payment' : 'Continue';
  const seatNames = pax.filter((p) => p.type !== 'infant');

  const summary = (
    <Summary lines={lines} total={total} totalLabel="You pay"
      note={<><Icon name="shieldCheck" size={15} /> No convenience fee. The total above is final.</>}>
      {step === 2 && <CouponBox kind="flight" amount={subtotal} applied={coupon} onApply={setCoupon} />}
    </Summary>
  );

  return (
    <div className="book-page">
      <div className="book-head">
        <div className="wrap book-head-in">
          <button className="link-btn" onClick={() => (step ? setStep(step - 1) : navigate(flightUrl(q)))}><Icon name="left" size={16} /> {step ? 'Back' : 'Change flight'}</button>
          <Steps steps={['Travellers', 'Seats & extras', 'Payment']} current={step} />
          <span className="hold"><Icon name="clock" size={15} /> Fare held <b className="mono">{hold}</b></span>
        </div>
      </div>

      <div className="wrap book-grid">
        <div className="book-main">
          {/* Itinerary */}
          <section className="card itin">
            <div className="card-head">
              <h2 className="h3">{airport(q.from).city} {legs.length === 2 ? '⇄' : '→'} {airport(q.to).city}</h2>
              <span className="muted small">{legs.length === 2 ? 'Round trip' : 'One way'} · {plural(q.ad + q.ch + q.inf, 'traveller')}</span>
            </div>
            {legs.map((l, i) => (
              <details key={i} className="itin-leg" open={step === 0 && !mobile}>
                <summary>
                  <span className="itin-tag">{i === 0 ? 'Depart' : 'Return'} · {dMid(l.f.date)}</span>
                  <div className="itin-row">
                    <AirlineName f={l.f} />
                    <FlightTimes f={l.f} compact={mobile} />
                    <span className="fare-chip">{fareType(l.fare).name}</span>
                  </div>
                </summary>
                <Segments f={l.f} />
                <div className="rules">
                  <span><Icon name="bag" size={15} /> Cabin {fareType(l.fare).cabinBag}, check-in {fareType(l.fare).checkBag(l.f.intl)}</span>
                  <span><Icon name="xCircle" size={15} /> {fareType(l.fare).cancel}</span>
                  <span><Icon name="calendar" size={15} /> {fareType(l.fare).change}</span>
                </div>
              </details>
            ))}
          </section>

          {step === 0 && (
            <>
              {!user && (
                <button className="login-nudge" onClick={() => openLogin(() => {
                  const u = userStore.get();
                  if (u) { const [first, ...rest] = u.name.split(' '); updPax(0, { first, last: rest.join(' ') }); setContact((c) => ({ ...c, phone: u.phone })); }
                })}>
                  <Icon name="user" size={18} /> <span><b>Log in to fill details faster</b><span className="muted small">and manage this booking later</span></span> <Icon name="chevR" size={16} />
                </button>
              )}
              <section className="card">
                <div className="card-head"><h2 className="h3">Who is travelling?</h2><span className="muted small">Names must match the government ID</span></div>
                {pax.map((p, i) => (
                  <div key={i} className="pax">
                    <div className="pax-head">
                      <b>{p.type === 'adult' ? 'Adult' : p.type === 'child' ? 'Child' : 'Infant'} {pax.filter((x, k) => x.type === p.type && k <= i).length}</b>
                      {i === 0 && user && <span className="chip sm on"><Icon name="check" size={12} /> Your details</span>}
                    </div>
                    <div className="chips">
                      {titles(p.type).map((t) => <button key={t} type="button" className={cx('chip sm', p.title === t && 'on')} onClick={() => updPax(i, { title: t })}>{t}</button>)}
                    </div>
                    <div className="row2">
                      <label className={cx('fld', errors[`first${i}`] && 'has-err')}><span>First & middle name</span>
                        <input id={`pax-first-${i}`} value={p.first} onChange={(e) => updPax(i, { first: e.target.value })} autoComplete="given-name" />{fe(`first${i}`)}</label>
                      <label className={cx('fld', errors[`last${i}`] && 'has-err')}><span>Last name</span>
                        <input id={`pax-last-${i}`} value={p.last} onChange={(e) => updPax(i, { last: e.target.value })} autoComplete="family-name" />{fe(`last${i}`)}</label>
                    </div>
                    {p.type !== 'adult' && (
                      <label className={cx('fld narrow', errors[`dob${i}`] && 'has-err')}><span>Date of birth</span>
                        <input id={`pax-dob-${i}`} type="date" value={p.dob} onChange={(e) => updPax(i, { dob: e.target.value })} />{fe(`dob${i}`)}</label>
                    )}
                  </div>
                ))}
              </section>
              <section className="card">
                <div className="card-head"><h2 className="h3">Where should we send the ticket?</h2></div>
                <div className="row2">
                  <label className={cx('fld', errors.phone && 'has-err')}><span>Mobile number</span>
                    <div className="phone-in"><span>+91</span><input id="c-phone" inputMode="numeric" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/[^\d ]/g, '') })} /></div>{fe('phone')}</label>
                  <label className={cx('fld', errors.email && 'has-err')}><span>Email</span>
                    <input id="c-email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="you@example.com" />{fe('email')}</label>
                </div>
                <label className="check big">
                  <input type="checkbox" checked={gst.on} onChange={(e) => setGst({ ...gst, on: e.target.checked })} />
                  <span><b>Add GST details</b><span className="muted small">Claim GST credit on this booking for your company</span></span>
                </label>
                {gst.on && (
                  <div className="row2">
                    <label className={cx('fld', errors.company && 'has-err')}><span>Company name</span><input id="gst-co" value={gst.company} onChange={(e) => setGst({ ...gst, company: e.target.value })} />{fe('company')}</label>
                    <label className={cx('fld', errors.gst && 'has-err')}><span>GSTIN</span><input id="gst-no" value={gst.number} onChange={(e) => setGst({ ...gst, number: e.target.value.toUpperCase() })} placeholder="29ABCDE1234F1Z5" maxLength={15} />{fe('gst')}</label>
                  </div>
                )}
              </section>
            </>
          )}

          {step === 1 && (
            <>
              <section className="card">
                <div className="card-head"><h2 className="h3">Pick your seats</h2><span className="muted small">Optional. Skip and we will assign seats at check-in.</span></div>
                {legs.length > 1 && (
                  <div className="tabs-mini">
                    {legs.map((l, i) => <button key={i} className={cx(legTab === i && 'on')} onClick={() => { setLegTab(i); setActivePax(0); }}>{l.f.from} → {l.f.to}</button>)}
                  </div>
                )}
                <div className="seat-layout">
                  <div className="seat-pax">
                    {seatNames.map((p, i) => {
                      const s = seats[legTab][i];
                      return (
                        <button key={i} className={cx('seat-pax-row', activePax === i && 'on')} onClick={() => setActivePax(i)}>
                          <span className="seat-badge">{i + 1}</span>
                          <span><b>{p.first || `Traveller ${i + 1}`} {p.last}</b><span className="muted small">{s ? `Seat ${s} · ${seatInfo(legs[legTab].f, legs[legTab].fare, s).price ? inr(seatInfo(legs[legTab].f, legs[legTab].fare, s).price) : 'Free'}` : 'No seat yet'}</span></span>
                          {s && <span className="seat-tag mono">{s}</span>}
                        </button>
                      );
                    })}
                    <p className="muted small">{legs[legTab].f.aircraft} · {legs[legTab].fare !== 'saver' ? `${fareType(legs[legTab].fare).name} includes ${legs[legTab].fare === 'super' ? 'any seat' : 'standard seats'} free.` : 'Middle seats at the back are free.'}</p>
                  </div>
                  <SeatMap f={legs[legTab].f} fare={legs[legTab].fare} assigned={seats[legTab]} active={activePax} onPick={pickSeat} />
                </div>
              </section>

              <section className="card">
                <div className="card-head"><h2 className="h3">Meals</h2><span className="muted small">{legs.some((l) => l.fare !== 'saver') ? 'Your fare includes a free meal.' : 'Pre-book and save up to 25% on board prices.'}</span></div>
                {legs.map((l, li) => (
                  <div key={li} className="meal-leg">
                    {legs.length > 1 && <span className="eyebrow">{l.f.from} → {l.f.to}</span>}
                    {seatNames.map((p, pi) => (
                      <label key={pi} className="meal-row">
                        <span>{p.first || `Traveller ${pi + 1}`}</span>
                        <select id={`meal-${li}-${pi}`} value={meals[li][pi] || ''} onChange={(e) => setMeals(meals.map((m, k) => (k === li ? m.map((x, j) => (j === pi ? e.target.value || null : x)) : m)))}>
                          <option value="">No meal</option>
                          {MEALS.map((m) => <option key={m.key} value={m.key}>{m.veg ? '● Veg' : '● Non-veg'} · {m.name} · {l.fare !== 'saver' ? 'Free' : inr(m.price)}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                ))}
              </section>

              <section className="card">
                <div className="card-head"><h2 className="h3">Extra check-in baggage</h2><span className="muted small">Pre-paid baggage costs less than paying at the airport.</span></div>
                <div className="bag-opts">
                  {BAGS.map((b, i) => (
                    <button key={i} className={cx('bag-opt', bag === i && 'on')} onClick={() => setBag(i)}>
                      <Icon name="bag" size={20} />
                      <b>{b.kg ? `+${b.kg} kg` : 'None'}</b>
                      <span className="muted small">{b.price ? `${inr(b.price)}${legs.length > 1 ? ' per flight' : ''}` : 'Included allowance'}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card addons">
                <label className={cx('addon', zero && 'on')}>
                  <input type="checkbox" checked={zero} onChange={(e) => setZero(e.target.checked)} />
                  <span className="addon-ico"><Icon name="refresh" size={20} /></span>
                  <span><b>Zero cancellation</b><span className="muted small">Cancel up to 24 hours before departure and get the full fare back.</span></span>
                  <b className="num">{inr(legs.reduce((s, l) => s + Math.max(399, Math.round(adultOf(l) * 0.08)), 0))}<span className="muted tiny"> /person</span></b>
                </label>
                <label className={cx('addon', insurance && 'on')}>
                  <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} />
                  <span className="addon-ico"><Icon name="shield" size={20} /></span>
                  <span><b>Travel insurance</b><span className="muted small">Covers delays, missed connections and lost baggage up to ₹50,000.</span></span>
                  <b className="num">₹249<span className="muted tiny"> /person</span></b>
                </label>
              </section>
            </>
          )}

          {step === 2 && (
            <section className="card">
              <div className="card-head"><h2 className="h3">How would you like to pay?</h2><span className="muted small"><Icon name="lock" size={13} /> Secured with 256-bit encryption</span></div>
              <PaymentPanel pay={pay} setPay={(p) => { setPay(p); setPayErr(null); }} error={payErr} />
              <div className="review-mini">
                <span className="eyebrow">Ticket goes to</span>
                <span>{pax.map((p) => `${p.title} ${p.first} ${p.last}`).join(', ')} · {contact.email}</span>
              </div>
            </section>
          )}

          {!mobile && (
            <div className="book-actions">
              {step === 1 && <button className="btn btn-ghost" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Skip extras</button>}
              <button className="btn btn-red btn-lg" onClick={next}>{cta} <Icon name="right" size={17} /></button>
            </div>
          )}
        </div>

        {!mobile && <aside className="book-side">{summary}</aside>}
      </div>

      {mobile && (
        <>
          <div className="paybar">
            <button className="paybar-total" onClick={() => setSumOpen(true)}>
              <b>{inr(total)}</b><span className="small">Price details <Icon name="up" size={13} /></span>
            </button>
            <button className="btn btn-red" onClick={next}>{cta}</button>
          </div>
          <Modal open={sumOpen} onClose={() => setSumOpen(false)} title="Price details" className="sheet-modal">{summary}</Modal>
        </>
      )}

      <Processing open={processing} steps={['Re-checking your fare with the airline', 'Payment authorised', 'Issuing e-tickets']} onDone={finish} />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Empty, Modal, Photo, RatingBadge, Stars, useMobile } from '../components/ui';
import { WishBtn } from '../components/hotel';
import { HotelMap } from '../components/HotelMap';
import { HotelSearch, readHotelQuery, stayParams, guestLabel, guestCount } from '../components/search';
import { city as getCity } from '../data/places';
import { AMENITIES, hotel as getHotel, hotelsIn, nightly, ratingWord, reviewsFor, taxFor, fmtKm, type PlanKey } from '../data/hotels';
import { priceHotel } from './HotelResults';
import { addDays, cx, dMid, daysBetween, dShort, inr, plural } from '../lib/format';
import { Link, navigate, qs } from '../lib/router';
import { toast } from '../lib/store';

const SECTIONS = [['overview', 'Overview'], ['rooms', 'Rooms'], ['amenities', 'Amenities'], ['location', 'Location'], ['reviews', 'Reviews'], ['policies', 'Policies']] as const;

export default function HotelDetail({ params, query }: { params: { id: string }; query: URLSearchParams }) {
  const h = getHotel(params.id);
  const q = readHotelQuery(new URLSearchParams({ ...Object.fromEntries(query), city: h?.city || 'goa' }));
  const mobile = useMobile();
  const [gallery, setGallery] = useState<number | null>(null);
  const [sel, setSel] = useState<{ room: string; plan: PlanKey } | null>(null);
  const [edit, setEdit] = useState(false);
  const [section, setSection] = useState('overview');
  const [revTrip, setRevTrip] = useState('All');
  const [revMore, setRevMore] = useState(false);

  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setSection(vis.target.id);
    }, { rootMargin: '-140px 0px -55% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [params.id]);

  const reviews = useMemo(() => (h ? reviewsFor(h) : []), [h]);

  if (!h) return <div className="wrap page-pad"><Empty icon="bed" title="We could not find this stay"><Link className="btn btn-red" to="/?tab=hotels">Search hotels</Link></Empty></div>;

  const c = getCity(h.city);
  const nights = Math.max(1, daysBetween(q.checkin, q.checkout));
  const stay = stayParams(q);
  const roomsN = q.rooms.length;
  const biggest = Math.max(...q.rooms.map((r) => r.a + r.ages.length));
  const cheapest = priceHotel(h, q.checkin, q.checkout, roomsN)!;
  const chosen = sel || { room: cheapest.room.id, plan: cheapest.plan.key };
  const cRoom = h.rooms.find((r) => r.id === chosen.room)!;
  const cPlan = cRoom.plans.find((p) => p.key === chosen.plan)!;
  const perNight = nightly(h, cPlan.price, q.checkin, q.checkout);
  const tax = taxFor(h, perNight);
  const total = (perNight + tax) * nights * roomsN;
  const fits = (maxG: number) => biggest <= maxG;
  const bookUrl = `/hotels/${h.id}/book?${stay}&${qs({ room: chosen.room, plan: chosen.plan })}`;
  const dist = (x: number, y: number) => fmtKm((Math.hypot(x - h.x, y - h.y) * c.spanKm) / 100);
  const shown = reviews.filter((r) => revTrip === 'All' || r.trip === revTrip);
  const similar = hotelsIn(h.city).filter((x) => x.id !== h.id).sort((a, b) => b.rating - a.rating).slice(0, 4);
  const jump = (id: string) => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: 'smooth' }); };
  const groups = Array.from(new Set(h.amenities.map((a) => AMENITIES[a].group)));
  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Link copied. Share it with your travel group.'); }
    catch { toast('Copy the link from the address bar to share this stay.', 'info'); }
  };
  const freeUntil = cPlan.freeCancelDays ? dShort(addDays(q.checkin, -cPlan.freeCancelDays)) : null;

  const box = (
    <div className="bookbox">
      <div className="bookbox-price">
        {h.discount > 0 && <s className="muted small">{inr(Math.round(perNight / (1 - h.discount) / 10) * 10)}</s>}
        <b>{inr(perNight)}</b><span className="muted small">per night</span>
      </div>
      <button className="bookbox-dates" onClick={() => { setEdit(true); jump('rooms'); }}>
        <span><span className="eyebrow">Check-in</span><b>{dMid(q.checkin)}</b></span>
        <span><span className="eyebrow">Check-out</span><b>{dMid(q.checkout)}</b></span>
        <span className="full"><span className="eyebrow">Guests</span><b>{guestLabel(q.rooms)}</b></span>
      </button>
      <div className="bookbox-sel">
        <b>{cRoom.name}</b>
        <span className="muted small">{cPlan.name}</span>
        {cPlan.refundable ? <span className="ok small"><Icon name="check" size={13} /> Free cancellation until {freeUntil}</span> : <span className="muted small">Non-refundable</span>}
      </div>
      <dl className="bookbox-lines">
        <div><dt>{inr(perNight)} × {plural(nights, 'night')}{roomsN > 1 ? ` × ${roomsN} rooms` : ''}</dt><dd>{inr(perNight * nights * roomsN)}</dd></div>
        <div><dt>Taxes & fees</dt><dd>{inr(tax * nights * roomsN)}</dd></div>
        <div className="total"><dt>Total</dt><dd>{inr(total)}</dd></div>
      </dl>
      <button className="btn btn-red btn-block btn-lg" onClick={() => navigate(bookUrl)}>Reserve</button>
      <p className="muted tiny center">{cPlan.payAtHotel ? 'Pay nothing now. Pay at the hotel.' : 'You will not be charged until the next step.'}</p>
    </div>
  );

  return (
    <div className="hotel-page">
      <div className="wrap">
        <div className="crumbs">
          <Link to={`/hotels?city=${h.city}&${stay}`}><Icon name="left" size={15} /> Stays in {c.name}</Link>
          <span className="muted">/ {h.locality}</span>
        </div>
        <div className="htitle">
          <div>
            <div className="hcard-top"><span className="htype">{h.type}</span><Stars n={h.stars} size={14} />{h.coupleFriendly && <span className="chip sm">Couple friendly</span>}</div>
            <h1>{h.name}</h1>
            <button className="link-btn muted" onClick={() => jump('location')}><Icon name="pin" size={15} /> {h.locality}, {c.name} · Show on map</button>
          </div>
          <div className="htitle-r">
            <button className="rating-big" onClick={() => jump('reviews')}>
              <RatingBadge score={h.rating} word={ratingWord(h.rating)} count={h.reviews} />
            </button>
            <div className="htitle-actions">
              <button className="icon-btn bordered" onClick={share} aria-label="Share"><Icon name="share" size={17} /></button>
              <span className="wish-wrap"><WishBtn id={h.id} name={h.name} /></span>
            </div>
          </div>
        </div>

        <div className="gallery">
          {h.images.slice(0, 5).map((img, i) => (
            <button key={i} className={cx('g-item', `g${i}`)} onClick={() => setGallery(i)} aria-label={`Open photo ${i + 1}`}>
              <Photo id={img} alt={`${h.name} photo ${i + 1}`} w={i === 0 ? 1200 : 600} label={i === 0 ? c.name : undefined} eager={i === 0} />
            </button>
          ))}
          <button className="btn btn-sm g-all" onClick={() => setGallery(0)}><Icon name="grid" size={15} /> All {h.images.length} photos</button>
        </div>
      </div>

      <nav className="subnav">
        <div className="wrap subnav-in">
          {SECTIONS.map(([id, n]) => <button key={id} className={cx(section === id && 'on')} onClick={() => jump(id)}>{n}</button>)}
          {!mobile && <button className="btn btn-red btn-sm subnav-cta" onClick={() => jump('rooms')}>From {inr(cheapest.perNight)}</button>}
        </div>
      </nav>

      <div className="wrap hgrid">
        <div className="hmain">
          <section id="overview" className="hsec">
            <p className="lead">{h.description}</p>
            <div className="hl-chips">
              {h.highlights.map((x) => <span key={x} className="hl-chip"><Icon name="sparkle" size={14} /> {x}</span>)}
              <span className="hl-chip"><Icon name="plane" size={14} /> {c.airport} airport {c.airportKm} km</span>
            </div>
            <div className="scores">
              {h.scores.map((s) => (
                <div key={s.label} className="score">
                  <span className="small">{s.label}</span>
                  <span className="bar"><i style={{ width: `${s.score * 10}%` }} /></span>
                  <b className="small num">{s.score.toFixed(1)}</b>
                </div>
              ))}
            </div>
          </section>

          <section id="rooms" className="hsec">
            <div className="sec-head">
              <h2 className="h3">Choose your room</h2>
              <button className="btn btn-sm btn-outline" onClick={() => setEdit(!edit)}><Icon name="calendar" size={15} /> {dShort(q.checkin)} – {dShort(q.checkout)} · {plural(guestCount(q.rooms), 'guest')}</button>
            </div>
            {edit && <div className="inline-search"><HotelSearch key={stay} compact initial={{ ...q, city: h.city, hotelId: h.id }} onSearched={() => { setEdit(false); setSel(null); }} /></div>}
            <div className="rooms">
              {h.rooms.map((room) => (
                <article key={room.id} className="room">
                  <div className="room-info">
                    <Photo id={room.image} alt={room.name} w={600} />
                    <div>
                      <h3>{room.name}</h3>
                      <ul className="room-specs">
                        <li><Icon name="grid" size={14} /> {room.size} sq ft</li>
                        <li><Icon name="bed" size={14} /> {room.bed}</li>
                        <li><Icon name="sun" size={14} /> {room.view}</li>
                        <li><Icon name="users" size={14} /> Up to {room.maxGuests} guests</li>
                      </ul>
                      <p className="muted small">{room.features.join(' · ')}</p>
                      {room.left <= 4 && <span className="left">Only {plural(room.left, 'room')} left at this price</span>}
                    </div>
                  </div>
                  <div className="plans">
                    {room.plans.map((plan) => {
                      const pn = nightly(h, plan.price, q.checkin, q.checkout);
                      const on = chosen.room === room.id && chosen.plan === plan.key;
                      const ok = fits(room.maxGuests) && room.left >= roomsN;
                      return (
                        <label key={plan.key} className={cx('plan', on && 'on', !ok && 'off')}>
                          <input type="radio" name="plan" checked={on} disabled={!ok} onChange={() => setSel({ room: room.id, plan: plan.key })} />
                          <div className="plan-info">
                            <b>{plan.name}</b>
                            <ul>{plan.includes.map((x) => <li key={x}><Icon name={x.startsWith('Free cancel') ? 'check' : x.includes('reakfast') ? 'coffee' : 'check'} size={13} /> {x}</li>)}</ul>
                            {!plan.refundable && <span className="muted tiny">No refund if you cancel</span>}
                            {plan.payAtHotel && <span className="perk"><Icon name="wallet" size={12} /> Pay at hotel</span>}
                            {!ok && <span className="err tiny">{fits(room.maxGuests) ? 'Not enough rooms left' : `Fits up to ${room.maxGuests} per room. Add a room for your group.`}</span>}
                          </div>
                          <div className="plan-price">
                            <b>{inr(pn)}</b>
                            <span className="muted tiny">+ {inr(taxFor(h, pn))} taxes / night</span>
                            <span className="small">{inr((pn + taxFor(h, pn)) * nights * roomsN)} total</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="amenities" className="hsec">
            <h2 className="h3">What this place offers</h2>
            <div className="amen-groups">
              {groups.map((g) => (
                <div key={g}>
                  <span className="eyebrow">{g}</span>
                  <ul>{h.amenities.filter((a) => AMENITIES[a].group === g).map((a) => <li key={a}><Icon name={AMENITIES[a].icon} size={17} /> {AMENITIES[a].name}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>

          <section id="location" className="hsec">
            <h2 className="h3">Where you will be</h2>
            <p className="muted">{h.locality}, {c.name}. {c.blurb}.</p>
            <div className="loc-grid">
              <HotelMap cityId={h.city} pins={[{ h, price: perNight }]} selected={h.id} single className="hmap-sm" />
              <ul className="near">
                {c.landmarks.map((l) => <li key={l.name}><Icon name="navigation" size={14} /> <span>{l.name}</span><b>{dist(l.x, l.y)}</b></li>)}
                <li><Icon name="plane" size={14} /> <span>{c.airport} airport</span><b>{c.airportKm} km</b></li>
              </ul>
            </div>
            <a className="link-btn" href={`https://www.google.com/maps/search/${encodeURIComponent(`${h.locality} ${c.name}`)}`} target="_blank" rel="noreferrer"><Icon name="map" size={15} /> Open area in Google Maps</a>
          </section>

          <section id="reviews" className="hsec">
            <div className="rev-head">
              <div className="rev-score"><b>{h.rating.toFixed(1)}</b><span><b>{ratingWord(h.rating)}</b><span className="muted small">{h.reviews.toLocaleString('en-IN')} verified reviews</span></span></div>
              <div className="chips">{['All', 'Couple', 'Family', 'Business', 'Solo', 'Friends'].map((t) => <button key={t} className={cx('chip sm', revTrip === t && 'on')} onClick={() => setRevTrip(t)}>{t}</button>)}</div>
            </div>
            <div className="revs">
              {shown.slice(0, revMore ? 20 : 4).map((r, i) => (
                <article key={i} className="rev">
                  <div className="rev-top"><span className="avatar sm">{r.name[0]}</span><span><b>{r.name}</b><span className="muted tiny">{r.trip} · {r.date} · {r.room}</span></span><span className="rbadge sm">{r.score.toFixed(1)}</span></div>
                  <b className="rev-title">{r.title}</b>
                  <p className="small">{r.text}</p>
                </article>
              ))}
              {!shown.length && <p className="muted">No {revTrip.toLowerCase()} reviews yet.</p>}
            </div>
            {shown.length > 4 && <button className="btn btn-outline btn-sm" onClick={() => setRevMore(!revMore)}>{revMore ? 'Show fewer' : `Show all ${shown.length} reviews`}</button>}
          </section>

          <section id="policies" className="hsec">
            <h2 className="h3">House rules</h2>
            <div className="policies">
              <div><Icon name="clock" size={18} /><span><b>Check-in from 2:00 PM</b><span className="muted small">Check-out by 11:00 AM. Early check-in on request.</span></span></div>
              <div><Icon name="user" size={18} /><span><b>ID at check-in</b><span className="muted small">{c.intl ? 'Passport with valid visa for all guests.' : 'Aadhaar, passport, driving licence or voter ID. PAN card is not accepted.'}</span></span></div>
              <div><Icon name="smile" size={18} /><span><b>Children</b><span className="muted small">Children under 6 stay free using existing beds. Extra bed ₹{h.stars === 5 ? '2,000' : '1,200'} per night.</span></span></div>
              <div><Icon name="heart" size={18} /><span><b>{h.coupleFriendly ? 'Unmarried couples welcome' : 'Couples'}</b><span className="muted small">{h.coupleFriendly ? 'Local IDs accepted.' : 'Please check with the property before booking.'}</span></span></div>
            </div>
          </section>

          <section className="hsec">
            <h2 className="h3">Similar stays in {c.name}</h2>
            <div className="hstrip">
              {similar.map((x) => {
                const p = priceHotel(x, q.checkin, q.checkout, roomsN)!;
                return (
                  <Link key={x.id} to={`/hotels/${x.id}?${stay}`} className="hmini">
                    <Photo id={x.images[0]} alt={x.name} w={500} label={c.name} />
                    <div className="hmini-body">
                      <span className="muted small">{x.locality}</span>
                      <b>{x.name}</b>
                      <div className="hmini-row"><Stars n={x.stars} /><RatingBadge score={x.rating} compact /></div>
                      <span className="hmini-price"><b>{inr(p.perNight)}</b> <span className="muted small">per night</span></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
        {!mobile && <aside className="hside">{box}</aside>}
      </div>

      {mobile && (
        <div className="paybar">
          <div className="paybar-total"><b>{inr(total)}</b><span className="small">{plural(nights, 'night')} · incl. taxes</span></div>
          <button className="btn btn-red" onClick={() => navigate(bookUrl)}>Reserve</button>
        </div>
      )}

      <Modal open={gallery !== null} onClose={() => setGallery(null)} wide title={`${h.name} · ${gallery !== null ? gallery + 1 : 1} of ${h.images.length}`} className="lightbox">
        {gallery !== null && (
          <div className="lb" onKeyDown={(e) => { if (e.key === 'ArrowRight') setGallery((gallery + 1) % h.images.length); if (e.key === 'ArrowLeft') setGallery((gallery - 1 + h.images.length) % h.images.length); }} tabIndex={0}>
            <Photo id={h.images[gallery]} alt={h.name} w={1400} label={c.name} />
            <button className="car-btn l" onClick={() => setGallery((gallery - 1 + h.images.length) % h.images.length)} aria-label="Previous"><Icon name="chevL" /></button>
            <button className="car-btn r" onClick={() => setGallery((gallery + 1) % h.images.length)} aria-label="Next"><Icon name="chevR" /></button>
            <div className="lb-thumbs">{h.images.map((img, i) => <button key={i} className={cx(i === gallery && 'on')} onClick={() => setGallery(i)}><Photo id={img} alt="" w={200} /></button>)}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

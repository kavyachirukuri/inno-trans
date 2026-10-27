import { useState, type MouseEvent } from 'react';
import { Icon } from './Icon';
import { Photo, RatingBadge, Stars } from './ui';
import { city as getCity } from '../data/places';
import { AMENITIES, ratingWord, type Hotel, type RatePlan, type Room } from '../data/hotels';
import { cx, inr, plural } from '../lib/format';
import { Link, navigate } from '../lib/router';
import { toggleWish, useStore, wishStore, toast } from '../lib/store';

export function Carousel({ images, alt, label, w = 700 }: { images: string[]; alt: string; label?: string; w?: number }) {
  const [i, setI] = useState(0);
  const go = (e: MouseEvent, d: number) => { e.stopPropagation(); e.preventDefault(); setI((i + d + images.length) % images.length); };
  return (
    <div className="carousel">
      <Photo id={images[i]} alt={`${alt}, photo ${i + 1}`} w={w} label={label} />
      {images.length > 1 && (
        <>
          <button className="car-btn l" onClick={(e) => go(e, -1)} aria-label="Previous photo"><Icon name="chevL" size={18} /></button>
          <button className="car-btn r" onClick={(e) => go(e, 1)} aria-label="Next photo"><Icon name="chevR" size={18} /></button>
          <div className="car-dots">{images.slice(0, 6).map((_, k) => <i key={k} className={cx(k === i % 6 && 'on')} />)}</div>
        </>
      )}
    </div>
  );
}

export function WishBtn({ id, name }: { id: string; name: string }) {
  const wish = useStore(wishStore);
  const on = wish.includes(id);
  return (
    <button className={cx('wish', on && 'on')} aria-pressed={on} aria-label={on ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleWish(id); toast(on ? `Removed ${name} from your saved stays.` : `Saved ${name}. Find it again from this device.`); }}>
      <Icon name="heart" size={18} style={on ? { fill: 'currentColor' } : undefined} />
    </button>
  );
}

export type Priced = { h: Hotel; room: Room; plan: RatePlan; perNight: number; was: number; total: number; tax: number };

export function HotelCard({ p, nights, rooms, stay, active, onHover, compact }: { p: Priced; nights: number; rooms: number; stay: string; active?: boolean; onHover?: (id: string | null) => void; compact?: boolean }) {
  const { h } = p;
  const url = `/hotels/${h.id}?${stay}`;
  const c = getCity(h.city);
  return (
    <article className={cx('hcard', active && 'hl', compact && 'compact')} onMouseEnter={() => onHover?.(h.id)} onMouseLeave={() => onHover?.(null)} onClick={() => navigate(url)}>
      <div className="hcard-media">
        <Carousel images={h.images} alt={h.name} label={c.name} w={compact ? 480 : 640} />
        <WishBtn id={h.id} name={h.name} />
        {h.discount > 0 && <span className="deal">{Math.round(h.discount * 100)}% off</span>}
      </div>
      <div className="hcard-body">
        <div className="hcard-top">
          <span className="htype">{h.type}</span><Stars n={h.stars} />
        </div>
        <h3><Link to={url} onClick={(e) => e.stopPropagation()}>{h.name}</Link></h3>
        <span className="muted small hloc"><Icon name="pin" size={13} /> {h.locality}, {c.name} · {h.highlights[0]}</span>
        <RatingBadge score={h.rating} word={ratingWord(h.rating)} count={h.reviews} />
        {!compact && (
          <div className="hamen">
            {h.amenities.filter((a) => ['pool', 'beach', 'spa', 'breakfast', 'shuttle', 'parking', 'gym'].includes(a)).slice(0, 4).map((a) => (
              <span key={a}><Icon name={AMENITIES[a].icon} size={14} /> {AMENITIES[a].name}</span>
            ))}
          </div>
        )}
        <div className="hperks">
          {p.plan.refundable ? <span className="perk ok"><Icon name="check" size={13} stroke={2.6} /> Free cancellation</span> : <span className="perk">Non-refundable · lowest price</span>}
          {(p.plan.key === 'bb' || p.plan.key === 'hb') && <span className="perk ok"><Icon name="coffee" size={13} /> Breakfast included</span>}
          {p.plan.payAtHotel && <span className="perk"><Icon name="wallet" size={13} /> Pay at hotel</span>}
        </div>
      </div>
      <div className="hcard-price">
        {p.room.left <= 4 && <span className="left">Only {plural(p.room.left, 'room')} left</span>}
        <span className="muted small">{p.room.name}</span>
        {p.was > p.perNight && <s className="muted small">{inr(p.was)}</s>}
        <b className="hprice">{inr(p.perNight)}</b>
        <span className="muted tiny">per night · + {inr(p.tax)} taxes</span>
        <span className="small htotal">{inr(p.total)} for {plural(nights, 'night')}{rooms > 1 ? `, ${rooms} rooms` : ''}</span>
        <button className="btn btn-red btn-sm" tabIndex={-1}>See rooms</button>
      </div>
    </article>
  );
}

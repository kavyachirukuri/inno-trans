import { CITIES, city as getCity, HOTEL_EXTERIOR, HOTEL_ROOMS, HOTEL_EXTRA, type City } from './places';
import { rng, int, pick, between, chance, sample, shuffle } from '../lib/rand';
import { slug, fromISO, addDays, daysBetween } from '../lib/format';

export type AmenityKey =
  | 'wifi' | 'pool' | 'breakfast' | 'parking' | 'spa' | 'gym' | 'restaurant' | 'bar' | 'beach'
  | 'shuttle' | 'ac' | 'roomservice' | 'kids' | 'ev' | 'laundry' | 'workspace';

export const AMENITIES: Record<AmenityKey, { name: string; icon: string; group: string }> = {
  wifi: { name: 'Free Wi-Fi', icon: 'wifi', group: 'Essentials' },
  ac: { name: 'Air conditioning', icon: 'snow', group: 'Essentials' },
  roomservice: { name: '24-hour room service', icon: 'bell', group: 'Essentials' },
  laundry: { name: 'Laundry', icon: 'shirt', group: 'Essentials' },
  pool: { name: 'Swimming pool', icon: 'waves', group: 'Leisure' },
  spa: { name: 'Spa', icon: 'leaf', group: 'Leisure' },
  gym: { name: 'Fitness centre', icon: 'dumbbell', group: 'Leisure' },
  beach: { name: 'Beach access', icon: 'umbrella', group: 'Leisure' },
  kids: { name: 'Kids club', icon: 'smile', group: 'Leisure' },
  breakfast: { name: 'Breakfast available', icon: 'coffee', group: 'Food & drink' },
  restaurant: { name: 'Restaurant', icon: 'utensils', group: 'Food & drink' },
  bar: { name: 'Bar', icon: 'wine', group: 'Food & drink' },
  parking: { name: 'Free parking', icon: 'car', group: 'Getting around' },
  shuttle: { name: 'Airport shuttle', icon: 'bus', group: 'Getting around' },
  ev: { name: 'EV charging', icon: 'plug', group: 'Getting around' },
  workspace: { name: 'Work desk & meeting rooms', icon: 'laptop', group: 'Business' },
};

export type PlanKey = 'nr' | 'ro' | 'bb' | 'hb';
export type RatePlan = {
  key: PlanKey;
  name: string;
  includes: string[];
  refundable: boolean;
  freeCancelDays?: number;
  payAtHotel: boolean;
  price: number; // per room per night before date factors
};
export type Room = {
  id: string;
  name: string;
  size: number;
  bed: string;
  view: string;
  maxAdults: number;
  maxGuests: number;
  image: string;
  features: string[];
  left: number;
  plans: RatePlan[];
};
export type Hotel = {
  id: string;
  name: string;
  city: string;
  locality: string;
  type: string;
  stars: number;
  rating: number;
  reviews: number;
  base: number; // cheapest nightly before factors
  discount: number; // 0..0.35, shown as a struck-out price
  amenities: AmenityKey[];
  images: string[];
  x: number;
  y: number;
  rooms: Room[];
  highlights: string[];
  description: string;
  coupleFriendly: boolean;
  payAtHotel: boolean;
  freeCancel: boolean;
  breakfast: boolean;
  scores: { label: string; score: number }[];
};

type Seed = [name: string, stars: number, type: string, locality: string];

const SEEDS: Record<string, Seed[]> = {
  goa: [
    ['Casa Mareia Beach Resort', 5, 'Resort', 'Candolim'],
    ['Sea Almond Suites', 4, 'Hotel', 'Calangute'],
    ['The Laterite House', 4, 'Boutique', 'Panjim'],
    ['Palm Ledger Inn', 3, 'Hotel', 'Baga'],
    ['Monsoon Courtyard Villas', 5, 'Villa', 'Assagao'],
    ['Cabo Rocha Cliff Resort', 5, 'Resort', 'Dona Paula'],
    ['Vagator Blue Retreat', 4, 'Resort', 'Anjuna'],
    ['Fontainhas Heritage Homestay', 3, 'Homestay', 'Panjim'],
    ['Colva Sands Hotel', 3, 'Hotel', 'Colva'],
    ['Palolem Palms Cottages', 3, 'Cottage', 'Palolem'],
  ],
  mumbai: [
    ['The Harbour Arc Hotel', 5, 'Hotel', 'Colaba'],
    ['Marine Line Residency', 4, 'Hotel', 'Nariman Point'],
    ['Bandstand Boutique Suites', 4, 'Boutique', 'Bandra West'],
    ['Juhu Tide Resort', 5, 'Resort', 'Juhu'],
    ['Skybridge Airport Hotel', 4, 'Hotel', 'Andheri East'],
    ['Powai Lakeside Hotel', 4, 'Hotel', 'Powai'],
    ['Mill Quarter Hotel', 4, 'Boutique', 'Lower Parel'],
    ['Kala Ghoda Guesthouse', 3, 'Guesthouse', 'Colaba'],
    ['BKC Grand Central', 5, 'Hotel', 'BKC'],
    ['Linking Road Inn', 3, 'Hotel', 'Bandra West'],
  ],
  delhi: [
    ['The Lutyens Crest', 5, 'Hotel', 'Chanakyapuri'],
    ['Connaught Circle Hotel', 4, 'Hotel', 'Connaught Place'],
    ['Aerocity Transit Suites', 4, 'Hotel', 'Aerocity'],
    ['Paharganj Courtyard Lodge', 3, 'Hotel', 'Paharganj'],
    ['Haveli Karol Bagh', 3, 'Heritage', 'Karol Bagh'],
    ['Qutub Garden Retreat', 5, 'Hotel', 'Saket'],
    ['Nehru Place Business Hotel', 4, 'Hotel', 'Nehru Place'],
    ['Vasant Courtyard Homestay', 3, 'Homestay', 'Vasant Kunj'],
    ['Embassy Row Residency', 4, 'Boutique', 'Chanakyapuri'],
    ['Runway View Hotel', 3, 'Hotel', 'Aerocity'],
  ],
  jaipur: [
    ['Rajmahal Palace Retreat', 5, 'Heritage', 'Pink City'],
    ['Sheesh Haveli Boutique', 4, 'Heritage', 'Pink City'],
    ['Amer Fort View Resort', 5, 'Resort', 'Amer'],
    ['MI Road Grand', 4, 'Hotel', 'MI Road'],
    ['Bani Park Courtyard', 3, 'Heritage', 'Bani Park'],
    ['Gulabi Nagar Homestay', 3, 'Homestay', 'C-Scheme'],
    ['Sandstone Suites', 4, 'Hotel', 'C-Scheme'],
    ['Malviya Business Inn', 3, 'Hotel', 'Malviya Nagar'],
    ['Jal Darshan Resort & Spa', 5, 'Resort', 'Amer'],
    ['Vaishali Garden Hotel', 3, 'Hotel', 'Vaishali Nagar'],
  ],
  bengaluru: [
    ['Cubbon Park Grand', 5, 'Hotel', 'MG Road'],
    ['Indiranagar Loft Hotel', 4, 'Boutique', 'Indiranagar'],
    ['Koramangala Courtyard Inn', 3, 'Hotel', 'Koramangala'],
    ['Whitefield Tech Park Hotel', 4, 'Hotel', 'Whitefield'],
    ['Hebbal Lakeview Hotel', 5, 'Hotel', 'Hebbal'],
    ['Jayanagar Garden Homestay', 3, 'Homestay', 'Jayanagar'],
    ['Electronic City Suites', 3, 'Hotel', 'Electronic City'],
    ['The Brigade Residency', 4, 'Hotel', 'MG Road'],
    ['Ulsoor Lake Boutique', 4, 'Boutique', 'Indiranagar'],
    ['Airport Road Transit Hotel', 3, 'Hotel', 'Hebbal'],
  ],
  udaipur: [
    ['Jharokha Lake Palace', 5, 'Heritage', 'Lake Pichola'],
    ['City Palace Haveli', 4, 'Heritage', 'City Palace'],
    ['Fateh Sagar Lakeside Resort', 5, 'Resort', 'Fateh Sagar'],
    ['Ambamata Garden Hotel', 3, 'Hotel', 'Ambamata'],
    ['Gangaur Ghat Guesthouse', 3, 'Guesthouse', 'Lake Pichola'],
    ['Aravalli Hills Resort', 4, 'Resort', 'Hiran Magri'],
    ['Mewar Courtyard Hotel', 4, 'Hotel', 'City Palace'],
    ['Hiran Magri Business Inn', 3, 'Hotel', 'Hiran Magri'],
    ['Sajjangarh View Villas', 5, 'Villa', 'Fateh Sagar'],
    ['Lal Ghat Boutique Stay', 4, 'Boutique', 'Lake Pichola'],
  ],
  dubai: [
    ['Marina Crescent Hotel', 5, 'Hotel', 'Dubai Marina'],
    ['Palm Fronds Resort', 5, 'Resort', 'Palm Jumeirah'],
    ['Downtown Spire Suites', 5, 'Hotel', 'Downtown Dubai'],
    ['Creekside Heritage Hotel', 4, 'Boutique', 'Deira'],
    ['JBR Sands Hotel', 4, 'Hotel', 'JBR'],
    ['Business Bay Canal Hotel', 4, 'Hotel', 'Business Bay'],
    ['Al Barsha Gardens Hotel', 3, 'Hotel', 'Al Barsha'],
    ['Deira Souk Inn', 3, 'Hotel', 'Deira'],
    ['Marina Walk Apartments', 4, 'Apartment', 'Dubai Marina'],
    ['Desert Rose Downtown', 4, 'Hotel', 'Downtown Dubai'],
  ],
  singapore: [
    ['Marina Bayfront Hotel', 5, 'Hotel', 'Marina Bay'],
    ['Orchard Botanic Hotel', 5, 'Hotel', 'Orchard Road'],
    ['Sentosa Cove Resort', 5, 'Resort', 'Sentosa'],
    ['Chinatown Shophouse Hotel', 4, 'Boutique', 'Chinatown'],
    ['Clarke Quay Riverside', 4, 'Hotel', 'Clarke Quay'],
    ['Bugis Arts Hotel', 3, 'Hotel', 'Bugis'],
    ['Little India Heritage Stay', 3, 'Boutique', 'Little India'],
    ['Orchard Pod Hotel', 3, 'Hotel', 'Orchard Road'],
    ['Keong Saik Boutique', 4, 'Boutique', 'Chinatown'],
    ['Siloso Beach Villas', 5, 'Villa', 'Sentosa'],
  ],
};

const ROOM_NAMES: Record<number, string[]> = {
  3: ['Standard Room', 'Superior Room', 'Family Room'],
  4: ['Superior Room', 'Deluxe Room', 'Premium Room', 'Junior Suite'],
  5: ['Deluxe Room', 'Premier Room', 'Club Room', 'Suite', 'Pool Villa'],
};
const VIEWS: Record<string, string[]> = {
  goa: ['Garden view', 'Pool view', 'Partial sea view', 'Sea view'],
  mumbai: ['City view', 'Sea view', 'Skyline view'],
  delhi: ['City view', 'Garden view', 'Pool view'],
  jaipur: ['Courtyard view', 'Garden view', 'Fort view'],
  bengaluru: ['City view', 'Garden view', 'Lake view'],
  udaipur: ['Courtyard view', 'Lake view', 'Palace view'],
  dubai: ['City view', 'Burj view', 'Sea view', 'Marina view'],
  singapore: ['City view', 'Bay view', 'Garden view'],
};
const SIZE: Record<number, [number, number]> = { 3: [180, 280], 4: [260, 380], 5: [340, 620] };

const TYPE_LINE: Record<string, string> = {
  Resort: 'Expect landscaped grounds, a large pool and slow mornings.',
  Hotel: 'Rooms are practical and quiet, with a 24-hour front desk.',
  Boutique: 'Each room is styled differently, with local art and craft.',
  Villa: 'Private villas come with their own plunge pools and sit-outs.',
  Homestay: 'Hosted by a local family who will happily plan your day.',
  Heritage: 'A restored heritage building with arches, jharokhas and courtyards.',
  Guesthouse: 'A small, friendly guesthouse with a rooftop to unwind.',
  Cottage: 'Simple cottages a few steps from the sand.',
  Apartment: 'Serviced apartments with a kitchenette and space to spread out.',
};

function amenitiesFor(r: () => number, stars: number, type: string, c: City): AmenityKey[] {
  const a: AmenityKey[] = ['wifi', 'ac', 'laundry'];
  if (stars >= 4 || chance(r, 0.5)) a.push('restaurant');
  if (stars >= 4 || chance(r, 0.6)) a.push('breakfast');
  if (stars >= 4) a.push('roomservice', 'gym');
  if (stars === 5 || type === 'Resort' || type === 'Villa' || chance(r, 0.3)) a.push('pool');
  if (stars === 5 || (stars === 4 && chance(r, 0.5))) a.push('spa');
  if (stars >= 4 && chance(r, 0.7)) a.push('bar');
  if (['goa', 'dubai', 'singapore'].includes(c.id) && (type === 'Resort' || type === 'Villa' || type === 'Cottage' || chance(r, 0.25))) a.push('beach');
  if (type === 'Resort' && chance(r, 0.6)) a.push('kids');
  if (chance(r, 0.6) && !c.intl) a.push('parking');
  if (chance(r, stars >= 4 ? 0.5 : 0.2)) a.push('shuttle');
  if (chance(r, 0.25)) a.push('ev');
  if (type === 'Hotel' && chance(r, 0.6)) a.push('workspace');
  return Array.from(new Set(a));
}

function buildHotel(c: City, s: Seed, i: number): Hotel {
  const [name, stars, type, locName] = s;
  const r = rng(`hotel:${c.id}:${name}`);
  const loc = c.localities.find((l) => l.name === locName) || c.localities[0];
  const amenities = amenitiesFor(r, stars, type, c);
  const starBase = stars === 5 ? 9800 : stars === 4 ? 5200 : 2600;
  const base = Math.round((starBase * c.priceFactor * between(r, 0.78, 1.25)) / 10) * 10;
  const ext = shuffle(r, HOTEL_EXTERIOR);
  const rooms = shuffle(r, HOTEL_ROOMS);
  const images = [ext[0], rooms[0], ext[1], rooms[1], pick(r, HOTEL_EXTRA), rooms[2], ext[2]];
  const names = ROOM_NAMES[stars].filter((n) => n !== 'Pool Villa' || type === 'Resort' || type === 'Villa');
  const roomCount = Math.min(names.length, int(r, 2, 4));
  const views = VIEWS[c.id] || ['City view'];
  const breakfastAdd = Math.round((stars === 5 ? 1400 : stars === 4 ? 900 : 550) * (c.intl ? 1.6 : 1));
  const freeCancelDays = int(r, 1, 4);
  const roomList: Room[] = names.slice(0, roomCount).map((rn, k) => {
    const rr = rng(`room:${name}:${rn}`);
    const price = Math.round((base * (1 + k * between(rr, 0.18, 0.32))) / 10) * 10;
    const [sMin, sMax] = SIZE[stars];
    const big = /Suite|Villa|Family/.test(rn);
    const plans: RatePlan[] = [];
    if (chance(rr, 0.7)) plans.push({ key: 'nr', name: 'Room only, non-refundable', includes: ['Free Wi-Fi'], refundable: false, payAtHotel: false, price: Math.round(price * 0.91) });
    plans.push({ key: 'ro', name: 'Room only', includes: ['Free Wi-Fi', `Free cancellation until ${freeCancelDays} day${freeCancelDays > 1 ? 's' : ''} before`], refundable: true, freeCancelDays, payAtHotel: chance(rr, 0.6), price });
    if (amenities.includes('breakfast')) plans.push({ key: 'bb', name: 'Room with breakfast', includes: ['Breakfast for all guests', 'Free Wi-Fi', `Free cancellation until ${freeCancelDays} day${freeCancelDays > 1 ? 's' : ''} before`], refundable: true, freeCancelDays, payAtHotel: chance(rr, 0.5), price: price + breakfastAdd });
    if (amenities.includes('restaurant') && stars >= 4 && chance(rr, 0.6)) plans.push({ key: 'hb', name: 'Breakfast and dinner', includes: ['Breakfast and dinner for all guests', '15% off spa treatments', `Free cancellation until ${freeCancelDays} day${freeCancelDays > 1 ? 's' : ''} before`], refundable: true, freeCancelDays, payAtHotel: false, price: price + breakfastAdd * 2.4 });
    return {
      id: slug(rn), name: rn, size: Math.round(between(rr, sMin, sMax) * (big ? 1.5 : 1)),
      bed: big ? 'King bed + sofa bed' : chance(rr, 0.65) ? 'King bed' : 'Twin beds',
      view: views[Math.min(views.length - 1, k + int(rr, 0, 1))], maxAdults: big ? 3 : 2, maxGuests: big ? 4 : 3,
      image: rooms[(k + 3) % rooms.length],
      features: sample(rr, ['Rain shower', 'Minibar', 'Smart TV', 'Tea & coffee maker', 'Bathtub', 'Balcony', 'Work desk', 'Blackout curtains', 'Bathrobes'], 4),
      left: chance(rr, 0.35) ? int(rr, 1, 4) : int(rr, 5, 12), plans: plans.map((p) => ({ ...p, price: Math.round(p.price) })),
    };
  });
  const rating = Math.round(between(r, stars === 5 ? 8.5 : stars === 4 ? 7.9 : 7.1, stars === 5 ? 9.6 : stars === 4 ? 9.2 : 8.8) * 10) / 10;
  const highlights: string[] = [];
  const near = c.landmarks.map((l) => ({ l, d: Math.hypot(l.x - loc.x, l.y - loc.y) })).sort((a, b) => a.d - b.d)[0];
  if (near) highlights.push(`${fmtKm((near.d * c.spanKm) / 100)} from ${near.l.name}`);
  if (amenities.includes('pool')) highlights.push('Outdoor pool');
  if (amenities.includes('beach')) highlights.push('Beach access');
  if (rating >= 9) highlights.push('Guests love the staff');
  if (amenities.includes('shuttle')) highlights.push('Airport shuttle');
  const scores = ['Cleanliness', 'Location', 'Staff', 'Comfort', 'Value for money'].map((label) => ({
    label, score: Math.min(10, Math.round((rating + between(r, -0.6, 0.5)) * 10) / 10),
  }));
  return {
    id: slug(name), name, city: c.id, locality: locName, type, stars, rating, reviews: int(r, 140, 3400), base,
    discount: chance(r, 0.6) ? Math.round(between(r, 0.08, 0.32) * 100) / 100 : 0,
    amenities, images, x: loc.x + (i % 2 ? 1 : -1) * between(r, 3, 8), y: loc.y + (i % 3 - 1) * between(r, 3, 6), rooms: roomList, highlights,
    description: `${name} is a ${stars}-star ${type.toLowerCase()} in ${locName}, ${c.name}. ${TYPE_LINE[type] || ''} ${c.blurb}, all within easy reach.`,
    coupleFriendly: chance(r, 0.7), payAtHotel: roomList.some((rm) => rm.plans.some((p) => p.payAtHotel)),
    freeCancel: roomList.some((rm) => rm.plans.some((p) => p.refundable)), breakfast: amenities.includes('breakfast'), scores,
  };
}

export const fmtKm = (km: number) => (km < 1 ? `${Math.max(100, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`);

export const HOTELS: Hotel[] = CITIES.flatMap((c) => (SEEDS[c.id] || []).map((s, i) => buildHotel(c, s, i)));
const byId = new Map(HOTELS.map((h) => [h.id, h]));
export const hotel = (id: string) => byId.get(id);
export const hotelsIn = (cityId: string) => HOTELS.filter((h) => h.city === cityId);

/* ---------- Pricing ---------- */
export function nightFactor(cityId: string, iso: string) {
  const d = fromISO(iso);
  const c = getCity(cityId);
  let f = 1;
  if (d.getDay() === 5 || d.getDay() === 6) f += 0.12;
  if (c.peak.includes(d.getMonth() + 1)) f += 0.18;
  if (d.getMonth() === 11 && d.getDate() >= 24) f += 0.25;
  return f;
}

/** Average nightly price for a plan across the stay */
export function nightly(h: Hotel, price: number, checkin: string, checkout: string) {
  const n = Math.max(1, daysBetween(checkin, checkout));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += price * nightFactor(h.city, addDays(checkin, i));
  return Math.round(sum / n / 10) * 10;
}

export const cheapestPlan = (h: Hotel) => {
  let best = { room: h.rooms[0], plan: h.rooms[0].plans[0] };
  h.rooms.forEach((room) => room.plans.forEach((plan) => { if (plan.price < best.plan.price) best = { room, plan }; }));
  return best;
};

export function taxFor(h: Hotel, perNight: number) {
  if (getCity(h.city).intl) return Math.round(perNight * 0.1);
  return Math.round(perNight * (perNight > 7500 ? 0.18 : 0.05));
}

export const ratingWord = (r: number) => (r >= 9 ? 'Exceptional' : r >= 8.5 ? 'Excellent' : r >= 8 ? 'Very good' : r >= 7.5 ? 'Good' : 'Pleasant');

/* ---------- Reviews ---------- */
const NAMES = ['Ananya', 'Rohit', 'Meera', 'Arjun', 'Kavya', 'Sanjay', 'Priya', 'Vikram', 'Neha', 'Aditya', 'Sneha', 'Farhan', 'Ishita', 'Karthik', 'Divya', 'Rahul', 'Zoya', 'Nikhil'];
const TRIPS = ['Couple', 'Family', 'Business', 'Solo', 'Friends'];
const GOOD = [
  ['Felt looked after', 'Staff remembered our names by day two and arranged a late checkout without fuss.'],
  ['Spotless rooms', 'Housekeeping was thorough and the beds were genuinely comfortable.'],
  ['Great breakfast spread', 'Plenty of local options, fresh dosas and good coffee.'],
  ['Location is the winner', 'Easy to walk to cafés and the main sights. Cabs are quick to get.'],
  ['Pool was the highlight', 'Clean, warm and quiet in the mornings. Kids loved it.'],
  ['Smooth check-in', 'We were in our room within ten minutes of arriving.'],
  ['Worth the price', 'Clean, quiet and well located for what we paid.'],
];
const MIXED = [
  ['Good stay, small gaps', 'Room was lovely but the Wi-Fi dropped in the evenings.'],
  ['Nice but busy', 'The restaurant gets crowded at peak hours, so book a table early.'],
  ['Comfortable, a bit dated', 'Bathrooms could use an update. Service made up for it.'],
];

export type Review = { name: string; trip: string; date: string; score: number; title: string; text: string; room: string; nights: number };

export function reviewsFor(h: Hotel): Review[] {
  const r = rng(`reviews:${h.id}`);
  return Array.from({ length: 14 }, (_, i) => {
    const mixed = chance(r, 0.22);
    const [title, text] = pick(r, mixed ? MIXED : GOOD);
    const score = Math.min(10, Math.round((mixed ? between(r, 6.4, 7.8) : between(r, h.rating - 0.4, Math.min(10, h.rating + 0.8))) * 10) / 10);
    const monthsAgo = int(r, 0, 10);
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return {
      name: pick(r, NAMES), trip: pick(r, TRIPS), score, title, text, room: pick(r, h.rooms).name, nights: int(r, 1, 5),
      date: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  });
}

/* ---------- Search suggestions ---------- */
export type HotelSuggestion = { kind: 'city' | 'area' | 'hotel'; id: string; label: string; sub: string; cityId: string; loc?: string };

export function hotelSuggestions(q: string): HotelSuggestion[] {
  const s = q.trim().toLowerCase();
  const cities: HotelSuggestion[] = CITIES.map((c) => ({ kind: 'city', id: c.id, label: c.name, sub: `${c.country} · ${hotelsIn(c.id).length} stays`, cityId: c.id }));
  if (!s) return cities;
  const areas: HotelSuggestion[] = CITIES.flatMap((c) => c.localities.map((l) => ({ kind: 'area' as const, id: `${c.id}:${l.name}`, label: l.name, sub: `Area in ${c.name}`, cityId: c.id, loc: l.name })));
  const hotels: HotelSuggestion[] = HOTELS.map((h) => ({ kind: 'hotel', id: h.id, label: h.name, sub: `${h.stars}★ ${h.type} · ${h.locality}, ${getCity(h.city).name}`, cityId: h.city }));
  const score = (x: HotelSuggestion) => {
    const l = x.label.toLowerCase();
    if (l.startsWith(s)) return 0;
    if (l.includes(` ${s}`)) return 1;
    if (l.includes(s)) return 2;
    if (x.sub.toLowerCase().includes(s)) return 3;
    return 9;
  };
  return [...cities, ...areas, ...hotels]
    .map((x) => ({ x, sc: score(x) }))
    .filter((o) => o.sc < 9)
    .sort((a, b) => a.sc - b.sc || (a.x.kind === 'city' ? -1 : 0))
    .slice(0, 9)
    .map((o) => o.x);
}

export const PROPERTY_TYPES = ['Hotel', 'Resort', 'Boutique', 'Heritage', 'Villa', 'Homestay', 'Guesthouse', 'Cottage', 'Apartment'];

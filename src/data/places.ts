export type Airport = {
  code: string;
  city: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  tz: number; // minutes from UTC
  popular?: boolean;
  cityId?: string; // matching hotel city, when we have one
};

export const AIRPORTS: Airport[] = [
  { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport', country: 'India', lat: 28.56, lon: 77.1, tz: 330, popular: true, cityId: 'delhi' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport', country: 'India', lat: 19.09, lon: 72.87, tz: 330, popular: true, cityId: 'mumbai' },
  { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International Airport', country: 'India', lat: 13.2, lon: 77.71, tz: 330, popular: true, cityId: 'bengaluru' },
  { code: 'GOX', city: 'Goa', name: 'Manohar International Airport, Mopa', country: 'India', lat: 15.73, lon: 73.86, tz: 330, popular: true, cityId: 'goa' },
  { code: 'GOI', city: 'Goa', name: 'Dabolim Airport', country: 'India', lat: 15.38, lon: 73.83, tz: 330, cityId: 'goa' },
  { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International Airport', country: 'India', lat: 17.24, lon: 78.43, tz: 330, popular: true },
  { code: 'MAA', city: 'Chennai', name: 'Chennai International Airport', country: 'India', lat: 12.99, lon: 80.17, tz: 330, popular: true },
  { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International Airport', country: 'India', lat: 22.65, lon: 88.45, tz: 330 },
  { code: 'JAI', city: 'Jaipur', name: 'Jaipur International Airport', country: 'India', lat: 26.82, lon: 75.81, tz: 330, cityId: 'jaipur' },
  { code: 'COK', city: 'Kochi', name: 'Cochin International Airport', country: 'India', lat: 10.15, lon: 76.4, tz: 330 },
  { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel International Airport', country: 'India', lat: 23.07, lon: 72.63, tz: 330 },
  { code: 'PNQ', city: 'Pune', name: 'Pune Airport', country: 'India', lat: 18.58, lon: 73.92, tz: 330 },
  { code: 'UDR', city: 'Udaipur', name: 'Maharana Pratap Airport', country: 'India', lat: 24.62, lon: 73.9, tz: 330, cityId: 'udaipur' },
  { code: 'IXL', city: 'Leh', name: 'Kushok Bakula Rimpochee Airport', country: 'India', lat: 34.14, lon: 77.55, tz: 330 },
  { code: 'SXR', city: 'Srinagar', name: 'Sheikh ul-Alam International Airport', country: 'India', lat: 33.99, lon: 74.77, tz: 330 },
  { code: 'VNS', city: 'Varanasi', name: 'Lal Bahadur Shastri International Airport', country: 'India', lat: 25.45, lon: 82.86, tz: 330 },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'UAE', lat: 25.25, lon: 55.36, tz: 240, popular: true, cityId: 'dubai' },
  { code: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore', lat: 1.36, lon: 103.99, tz: 480, popular: true, cityId: 'singapore' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand', lat: 13.69, lon: 100.75, tz: 420 },
  { code: 'DPS', city: 'Bali', name: 'Ngurah Rai International Airport', country: 'Indonesia', lat: -8.75, lon: 115.17, tz: 480 },
  { code: 'MLE', city: 'Malé', name: 'Velana International Airport', country: 'Maldives', lat: 4.19, lon: 73.53, tz: 300 },
  { code: 'LHR', city: 'London', name: 'Heathrow Airport', country: 'United Kingdom', lat: 51.47, lon: -0.45, tz: 0 },
];

const byCode = new Map(AIRPORTS.map((a) => [a.code, a]));
export const airport = (code: string) => byCode.get(code) || AIRPORTS[0];
export const hasAirport = (code?: string | null) => !!code && byCode.has(code);

export type Airline = { code: string; name: string; hue: number };
export const AIRLINES: Record<string, Airline> = {
  '6E': { code: '6E', name: 'IndiGo', hue: 228 },
  AI: { code: 'AI', name: 'Air India', hue: 352 },
  IX: { code: 'IX', name: 'Air India Express', hue: 18 },
  QP: { code: 'QP', name: 'Akasa Air', hue: 24 },
  SG: { code: 'SG', name: 'SpiceJet', hue: 4 },
  EK: { code: 'EK', name: 'Emirates', hue: 356 },
  SQ: { code: 'SQ', name: 'Singapore Airlines', hue: 40 },
  TG: { code: 'TG', name: 'Thai Airways', hue: 285 },
  BA: { code: 'BA', name: 'British Airways', hue: 215 },
};

/* ---------- Photos ---------- */
// Unsplash photo ids. If one ever fails to load, <Photo> draws a designed fallback instead.
export const IMG = {
  hero: '1436491865332-7a61a109cc05',
  sky: '1474302770737-173ee21bab63',
  goa: '1512343879784-a960bf40e7f2',
  jaipur: '1477587458883-47145ed94245',
  delhi: '1587474260584-136574528ed5',
  mumbai: '1566552881560-0be862a7c445',
  agra: '1524492412937-b28074a5d7da',
  kerala: '1602216056096-3b40cc0c9944',
  udaipur: '1568495248636-6432b97bd949',
  bengaluru: '1596176530529-78163a4f7af2',
  dubai: '1512453979798-5ea266f8880c',
  singapore: '1525625293386-3f8f99389edd',
  bangkok: '1508009603885-50cf7c579365',
  bali: '1537996194471-e657df975ab4',
  london: '1513635269975-59663e0ac1ad',
  maldives: '1514282401047-d79a71a590e8',
  mountains: '1506905925346-21bda4d32df4',
  beach: '1507525428034-b723cf961d3e',
};

export const HOTEL_EXTERIOR = [
  '1566073771259-6a8506099945',
  '1542314831-068cd1dbfeeb',
  '1551882547-ff40c63fe5fa',
  '1520250497591-112f2f40a3f4',
  '1571896349842-33c89424de2d',
  '1564501049412-61c2a3083791',
  '1582719508461-905c673771fd',
  '1584132967334-10e028bd69f7',
  '1540541338287-41700207dee6',
  '1445019980597-93fa8acb246c',
];
export const HOTEL_ROOMS = [
  '1618773928121-c32242e63f39',
  '1611892440504-42a792e24d32',
  '1590490360182-c33d57733427',
  '1582719478250-c89cae4dc85b',
  '1631049307264-da0ec9d70304',
  '1578683010236-d716f9a3f461',
  '1595576508898-0ad5c879a061',
  '1566665797739-1674de7a421a',
  '1596394516093-501ba68a0ba6',
  '1561501900-3701fa6a0864',
];
export const HOTEL_EXTRA = [
  '1414235077428-338989a2e8c0',
  '1517248135467-4c7edcad34c4',
  '1544161515-4ab6ce6db874',
  '1455587734955-081b22074882',
];

export const photoUrl = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/* ---------- Hotel cities ---------- */
export type Locality = { name: string; x: number; y: number };
export type Landmark = { name: string; x: number; y: number };
export type City = {
  id: string;
  name: string;
  country: string;
  airport: string;
  airportKm: number;
  image: string;
  blurb: string;
  spanKm: number; // what 100 map units represent
  localities: Locality[];
  landmarks: Landmark[];
  water: string[]; // svg paths in a 0-100 box
  islands?: string[];
  rivers?: string[];
  peak: number[]; // months (1-12) with higher prices
  priceFactor: number;
  intl?: boolean;
};

export const CITIES: City[] = [
  {
    id: 'goa', name: 'Goa', country: 'India', airport: 'GOX', airportKm: 34, image: IMG.goa, spanKm: 40,
    blurb: 'Beaches, Portuguese lanes and long sunsets',
    localities: [
      { name: 'Anjuna', x: 33, y: 13 }, { name: 'Baga', x: 29, y: 19 }, { name: 'Calangute', x: 30, y: 25 },
      { name: 'Candolim', x: 28, y: 31 }, { name: 'Assagao', x: 46, y: 15 }, { name: 'Panjim', x: 47, y: 44 },
      { name: 'Dona Paula', x: 40, y: 51 }, { name: 'Colva', x: 41, y: 78 }, { name: 'Palolem', x: 56, y: 93 },
    ],
    landmarks: [
      { name: 'Calangute Beach', x: 26, y: 25 }, { name: 'Fort Aguada', x: 25, y: 36 },
      { name: 'Basilica of Bom Jesus', x: 62, y: 45 }, { name: 'Anjuna Flea Market', x: 30, y: 12 },
    ],
    water: ['M0 0 H20 C24 9 18 17 23 25 C27 33 20 40 24 48 C28 58 33 70 31 82 C30 90 40 96 44 100 H0 Z'],
    rivers: ['M23 41 C35 38 48 42 72 35 C82 32 92 34 100 30'],
    peak: [11, 12, 1, 2], priceFactor: 1.1,
  },
  {
    id: 'mumbai', name: 'Mumbai', country: 'India', airport: 'BOM', airportKm: 18, image: IMG.mumbai, spanKm: 30,
    blurb: 'Sea-facing promenades and the city that never pauses',
    localities: [
      { name: 'Colaba', x: 46, y: 89 }, { name: 'Nariman Point', x: 40, y: 81 }, { name: 'Lower Parel', x: 50, y: 66 },
      { name: 'BKC', x: 58, y: 50 }, { name: 'Bandra West', x: 44, y: 46 }, { name: 'Juhu', x: 40, y: 30 },
      { name: 'Andheri East', x: 62, y: 28 }, { name: 'Powai', x: 80, y: 30 },
    ],
    landmarks: [
      { name: 'Gateway of India', x: 48, y: 91 }, { name: 'Marine Drive', x: 41, y: 79 },
      { name: 'Bandra-Worli Sea Link', x: 40, y: 56 }, { name: 'Juhu Beach', x: 36, y: 31 },
    ],
    water: [
      'M0 0 H28 C32 12 30 24 35 34 C38 44 32 52 36 62 C40 72 34 80 42 92 L46 100 H0 Z',
      'M100 58 C90 66 84 78 72 84 C64 88 60 96 58 100 H100 Z',
    ],
    peak: [11, 12, 1], priceFactor: 1.25,
  },
  {
    id: 'delhi', name: 'New Delhi', country: 'India', airport: 'DEL', airportKm: 16, image: IMG.delhi, spanKm: 30,
    blurb: 'Mughal monuments, wide avenues and street food',
    localities: [
      { name: 'Connaught Place', x: 50, y: 40 }, { name: 'Paharganj', x: 44, y: 35 }, { name: 'Karol Bagh', x: 36, y: 33 },
      { name: 'Chanakyapuri', x: 42, y: 58 }, { name: 'Aerocity', x: 24, y: 78 }, { name: 'Saket', x: 52, y: 84 },
      { name: 'Nehru Place', x: 64, y: 74 }, { name: 'Vasant Kunj', x: 34, y: 88 },
    ],
    landmarks: [
      { name: 'India Gate', x: 54, y: 50 }, { name: 'Red Fort', x: 58, y: 26 },
      { name: 'Qutub Minar', x: 46, y: 92 }, { name: "Humayun's Tomb", x: 64, y: 56 },
    ],
    water: [],
    rivers: ['M80 0 C75 20 84 34 74 50 C66 62 76 78 72 100'],
    peak: [10, 11, 2, 3], priceFactor: 1.05,
  },
  {
    id: 'jaipur', name: 'Jaipur', country: 'India', airport: 'JAI', airportKm: 12, image: IMG.jaipur, spanKm: 20,
    blurb: 'Pink sandstone, forts and royal havelis',
    localities: [
      { name: 'Amer', x: 60, y: 12 }, { name: 'Pink City', x: 56, y: 40 }, { name: 'Bani Park', x: 40, y: 42 },
      { name: 'MI Road', x: 50, y: 50 }, { name: 'C-Scheme', x: 52, y: 60 }, { name: 'Vaishali Nagar', x: 24, y: 50 },
      { name: 'Malviya Nagar', x: 66, y: 78 },
    ],
    landmarks: [
      { name: 'Hawa Mahal', x: 58, y: 37 }, { name: 'Amber Fort', x: 62, y: 8 },
      { name: 'City Palace', x: 55, y: 34 }, { name: 'Albert Hall Museum', x: 54, y: 54 },
    ],
    water: ['M47 21 C50 17 57 18 58 22 C59 26 52 28 48 26 C46 25 46 23 47 21 Z'],
    peak: [10, 11, 12, 1, 2], priceFactor: 0.95,
  },
  {
    id: 'bengaluru', name: 'Bengaluru', country: 'India', airport: 'BLR', airportKm: 35, image: IMG.bengaluru, spanKm: 30,
    blurb: 'Gardens, breweries and startup energy',
    localities: [
      { name: 'Hebbal', x: 52, y: 20 }, { name: 'MG Road', x: 54, y: 48 }, { name: 'Indiranagar', x: 68, y: 46 },
      { name: 'Koramangala', x: 60, y: 66 }, { name: 'Jayanagar', x: 44, y: 70 }, { name: 'Whitefield', x: 90, y: 44 },
      { name: 'Electronic City', x: 68, y: 95 },
    ],
    landmarks: [
      { name: 'Cubbon Park', x: 51, y: 47 }, { name: 'Lalbagh', x: 48, y: 62 },
      { name: 'Bangalore Palace', x: 50, y: 34 }, { name: 'UB City', x: 52, y: 51 },
    ],
    water: [
      'M48 16 C52 12 58 14 58 18 C58 22 52 23 49 21 C47 20 47 18 48 16 Z',
      'M62 42 C64 40 67 41 67 43 C67 45 64 46 62 45 C61 44 61 43 62 42 Z',
      'M72 70 C76 67 82 68 82 72 C82 76 76 77 73 75 C71 74 71 72 72 70 Z',
    ],
    peak: [12, 1], priceFactor: 1,
  },
  {
    id: 'udaipur', name: 'Udaipur', country: 'India', airport: 'UDR', airportKm: 22, image: IMG.udaipur, spanKm: 10,
    blurb: 'Lake palaces and rooftop sunsets',
    localities: [
      { name: 'Fateh Sagar', x: 44, y: 26 }, { name: 'Ambamata', x: 26, y: 42 }, { name: 'Lake Pichola', x: 52, y: 56 },
      { name: 'City Palace', x: 58, y: 48 }, { name: 'Hiran Magri', x: 70, y: 78 },
    ],
    landmarks: [
      { name: 'City Palace', x: 56, y: 46 }, { name: 'Lake Pichola ghats', x: 48, y: 60 },
      { name: 'Fateh Sagar Lake', x: 36, y: 24 }, { name: 'Sajjangarh Fort', x: 10, y: 40 },
    ],
    water: [
      'M34 44 C38 38 48 40 50 48 C52 56 48 68 40 68 C32 66 30 52 34 44 Z',
      'M28 18 C34 13 44 17 42 26 C40 32 32 33 29 28 C27 25 26 21 28 18 Z',
    ],
    peak: [10, 11, 12, 1, 2], priceFactor: 1.05,
  },
  {
    id: 'dubai', name: 'Dubai', country: 'UAE', airport: 'DXB', airportKm: 14, image: IMG.dubai, spanKm: 40, intl: true,
    blurb: 'Skyline views, desert evenings and the souks',
    localities: [
      { name: 'Deira', x: 82, y: 30 }, { name: 'Downtown Dubai', x: 60, y: 62 }, { name: 'Business Bay', x: 66, y: 70 },
      { name: 'Palm Jumeirah', x: 26, y: 48 }, { name: 'JBR', x: 16, y: 72 }, { name: 'Dubai Marina', x: 22, y: 78 },
      { name: 'Al Barsha', x: 36, y: 84 },
    ],
    landmarks: [
      { name: 'Burj Khalifa', x: 59, y: 64 }, { name: 'The Dubai Mall', x: 61, y: 66 },
      { name: 'Gold Souk', x: 84, y: 26 }, { name: 'Dubai Marina Walk', x: 20, y: 76 },
    ],
    water: ['M0 0 H72 C68 10 60 16 52 22 C42 30 32 38 22 48 C14 56 8 64 0 70 Z'],
    islands: ['M20 40 C24 36 32 38 32 44 C32 50 24 52 20 48 C18 46 18 42 20 40 Z'],
    rivers: ['M72 0 C78 14 86 24 100 30'],
    peak: [11, 12, 1, 2, 3], priceFactor: 1.6,
  },
  {
    id: 'singapore', name: 'Singapore', country: 'Singapore', airport: 'SIN', airportKm: 20, image: IMG.singapore, spanKm: 20, intl: true,
    blurb: 'Gardens, hawker food and the bay at night',
    localities: [
      { name: 'Little India', x: 55, y: 36 }, { name: 'Orchard Road', x: 42, y: 44 }, { name: 'Bugis', x: 60, y: 46 },
      { name: 'Clarke Quay', x: 50, y: 56 }, { name: 'Chinatown', x: 48, y: 64 }, { name: 'Marina Bay', x: 62, y: 62 },
      { name: 'Sentosa', x: 46, y: 89 },
    ],
    landmarks: [
      { name: 'Marina Bay Sands', x: 63, y: 66 }, { name: 'Gardens by the Bay', x: 68, y: 68 },
      { name: 'Merlion Park', x: 58, y: 61 }, { name: 'Universal Studios', x: 44, y: 90 },
    ],
    water: ['M0 76 C20 72 40 79 55 74 C70 70 85 77 100 72 V100 H0 Z'],
    islands: ['M36 87 C40 83 53 84 55 88 C56 93 45 95 38 93 C35 92 35 89 36 87 Z'],
    peak: [12, 1, 6], priceFactor: 1.9,
  },
];

const cityById = new Map(CITIES.map((c) => [c.id, c]));
export const city = (id: string) => cityById.get(id) || CITIES[0];
export const hasCity = (id?: string | null) => !!id && cityById.has(id);

export const DESTINATIONS = [
  { id: 'goa', label: 'Goa', airport: 'GOX', image: IMG.goa, note: 'Beach season' },
  { id: 'dubai', label: 'Dubai', airport: 'DXB', image: IMG.dubai, note: 'Visa on arrival options' },
  { id: 'jaipur', label: 'Jaipur', airport: 'JAI', image: IMG.jaipur, note: 'Heritage stays' },
  { id: 'singapore', label: 'Singapore', airport: 'SIN', image: IMG.singapore, note: 'Family favourite' },
  { id: 'udaipur', label: 'Udaipur', airport: 'UDR', image: IMG.udaipur, note: 'Lakeside weekends' },
  { id: 'bali', label: 'Bali', airport: 'DPS', image: IMG.bali, note: 'Flights only for now' },
];

# Rahi — flights & hotels demo

A clickable sample of a flight and hotel booking platform. It has no backend: every fare, hotel, seat and booking is generated in the browser, so it deploys anywhere as a static site.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `npx vercel` inside it).
2. In Vercel, import the repo. It detects **Vite** automatically:
   build command `npm run build`, output directory `dist`.
3. `vercel.json` already rewrites every route to `index.html`, so deep links like `/hotels/casa-mareia-beach-resort` work.

## What you can show

- **Home:** departure-board hero, flight and hotel search with airport autocomplete, fare calendar, travellers and rooms pickers, special fares, offers, a 30-day fare tracker and destinations.
- **Flights:** date strip with daily lowest fares, sort tabs (best, cheapest, fastest, earliest), filters, fare families (Saver, Flexi, Super Flexi), flight details with layovers, one-way and round trip.
- **Flight booking:** traveller details with validation, GST details, interactive seat map, meals, extra baggage, zero cancellation, insurance, coupons, UPI, card and net banking, and an e-ticket with PNR.
- **Hotels:** list and map views, a price histogram filter, quick filters, an image carousel and wishlist, and a hotel page with gallery, room and rate plans, reviews, location and house rules.
- **Hotel booking:** guest details, special requests, airport pickup, a cancellation timeline, pay now, pay 25% or pay at hotel, and a voucher.
- **My trips:** upcoming, completed and cancelled trips, cancellation with a refund estimate, print and add to calendar.
- **Login:** any 10-digit mobile number, OTP `123456`.

Demo coupons: `RAHIFLY`, `RAHISTAY`, `FIRSTTRIP`.

## Change the brand

- Name, phone, email and coupons: `src/config.ts`
- Colours and fonts: the `:root` block at the top of `src/styles/base.css`
- Logo: `Logo` in `src/components/ui.tsx` and `public/favicon.svg`
- Photos: Unsplash ids in `src/data/places.ts`. If a photo fails to load, a drawn placeholder shows instead.

## Where the data lives

- `src/data/places.ts`: airports, airlines, cities and map shapes
- `src/data/flights.ts`: the flight and fare generator (the same search always gives the same results)
- `src/data/hotels.ts`: hotels, rooms, rate plans, reviews and pricing

When the real backend is ready, replace these generators with API calls; the pages only use the functions they export.

Bookings, login and recent searches are saved in the browser (localStorage) only.

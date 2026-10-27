import { useEffect, type ComponentType } from 'react';
import { match, useLocation, Link } from './lib/router';
import { Header, Footer, BottomNav, LoginModal } from './components/chrome';
import { Toaster, Empty } from './components/ui';
import Home from './pages/Home';
import FlightResults from './pages/FlightResults';
import FlightBooking from './pages/FlightBooking';
import HotelResults from './pages/HotelResults';
import HotelDetail from './pages/HotelDetail';
import HotelBooking from './pages/HotelBooking';
import Trips, { Confirmation } from './pages/Trips';
import { BRAND } from './config';

type Page = ComponentType<{ params: Record<string, string>; query: URLSearchParams }>;
const ROUTES: [string, Page, string][] = [
  ['/', Home as Page, 'Flights & Hotels'],
  ['/flights', FlightResults as Page, 'Flights'],
  ['/flights/book', FlightBooking as Page, 'Complete your booking'],
  ['/hotels', HotelResults as Page, 'Hotels'],
  ['/hotels/:id/book', HotelBooking as Page, 'Complete your booking'],
  ['/hotels/:id', HotelDetail as Page, 'Hotel'],
  ['/trips', Trips as Page, 'My trips'],
  ['/trips/:id', Confirmation as Page, 'Your booking'],
];

function NotFound() {
  return (
    <div className="wrap page-pad">
      <Empty icon="navigation" title="This page took a wrong turn">
        <p className="muted">The link may be old. Start a new search from the home page.</p>
        <Link className="btn btn-red" to="/">Go home</Link>
      </Empty>
    </div>
  );
}

export default function App() {
  const loc = useLocation();
  let el = <NotFound />;
  let title = 'Page not found';
  for (const [p, C, t] of ROUTES) {
    const params = match(p, loc.path);
    if (params) {
      el = <C key={loc.path} params={params} query={loc.query} />;
      title = t;
      break;
    }
  }
  useEffect(() => {
    document.title = `${title} · ${BRAND.name}`;
  }, [title]);
  return (
    <>
      <Header />
      <main id="main">{el}</main>
      <Footer />
      <BottomNav />
      <LoginModal />
      <Toaster />
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Logo, Modal, Pop } from './ui';
import { Link, navigate, useLocation } from '../lib/router';
import { useStore, userStore, loginStore, openLogin, toast, tripsStore } from '../lib/store';
import { BRAND } from '../config';
import { cx } from '../lib/format';

export function Header() {
  const { path, query } = useLocation();
  const user = useStore(userStore);
  const trips = useStore(tripsStore);
  const [menu, setMenu] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const tab = query.get('tab');
  const on = path.startsWith('/hotels') || (path === '/' && tab === 'hotels') ? 'hotels' : path.startsWith('/flights') || path === '/' ? 'flights' : path.startsWith('/trips') ? 'trips' : '';
  const upcoming = trips.filter((t) => t.status === 'upcoming').length;
  const goOffers = () => {
    if (path !== '/') navigate('/' + (tab ? `?tab=${tab}` : ''));
    setTimeout(() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Link to="/" className="hdr-logo" aria-label={`${BRAND.name} home`}><Logo /></Link>
        <nav className="hdr-nav" aria-label="Main">
          <Link to="/" className={cx(on === 'flights' && 'on')}><Icon name="plane" size={17} /> Flights</Link>
          <Link to="/?tab=hotels" className={cx(on === 'hotels' && 'on')}><Icon name="bed" size={17} /> Hotels</Link>
          <Link to="/trips" className={cx(on === 'trips' && 'on')}><Icon name="ticket" size={17} /> My trips{upcoming > 0 && <span className="count">{upcoming}</span>}</Link>
        </nav>
        <div className="hdr-right">
          <button className="hdr-link hide-sm" onClick={goOffers}><Icon name="tag" size={16} /> Offers</button>
          <span className="hdr-help hide-md"><Icon name="headset" size={16} /> <span><small>24×7 support</small>{BRAND.phone}</span></span>
          {user ? (
            <div className="hdr-user" ref={anchor}>
              <button className="avatar-btn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
                <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="hide-sm">Hi, {user.name.split(' ')[0]}</span>
                <Icon name="down" size={15} />
              </button>
              <Pop open={menu} onClose={() => setMenu(false)} anchor={anchor} align="right" title="Account" className="pop-menu">
                <div className="menu">
                  <div className="menu-who"><b>{user.name}</b><span className="muted small">+91 {user.phone}</span></div>
                  <button onClick={() => { setMenu(false); navigate('/trips'); }}><Icon name="ticket" size={16} /> My trips</button>
                  <button onClick={() => { setMenu(false); userStore.set(null); toast('You are logged out.', 'info'); }}><Icon name="logout" size={16} /> Log out</button>
                </div>
              </Pop>
            </div>
          ) : (
            <button className="btn btn-dark btn-sm" onClick={() => openLogin()}><Icon name="user" size={16} /> <span>Log in</span></button>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { path, query } = useLocation();
  const user = useStore(userStore);
  if (!(path === '/' || path === '/trips')) return null;
  const tab = query.get('tab');
  return (
    <nav className="bnav" aria-label="Quick">
      <Link to="/" className={cx(path === '/' && tab !== 'hotels' && 'on')}><Icon name="plane" /> Flights</Link>
      <Link to="/?tab=hotels" className={cx(path === '/' && tab === 'hotels' && 'on')}><Icon name="bed" /> Hotels</Link>
      <Link to="/trips" className={cx(path === '/trips' && 'on')}><Icon name="ticket" /> Trips</Link>
      <button onClick={() => (user ? navigate('/trips') : openLogin())}><Icon name="user" /> {user ? user.name.split(' ')[0] : 'Log in'}</button>
    </nav>
  );
}

export function Footer() {
  const { path } = useLocation();
  const slim = path.includes('/book');
  return (
    <footer className={cx('ftr', slim && 'slim')}>
      <div className="wrap">
        {!slim && (
          <div className="ftr-top">
            <div className="ftr-brand">
              <Logo light />
              <p>{BRAND.tagline} Compare fares across airlines and stays across suppliers, then book in a few taps.</p>
              <div className="ftr-contact">
                <span><Icon name="headset" size={16} /> {BRAND.phone}</span>
                <span><Icon name="mail" size={16} /> {BRAND.email}</span>
              </div>
            </div>
            <div className="ftr-cols">
              <div>
                <h4>Book</h4>
                <Link to="/">Flights</Link>
                <Link to="/?tab=hotels">Hotels</Link>
                <Link to="/trips">My trips</Link>
              </div>
              <div>
                <h4>Popular flights</h4>
                <Link to="/flights?from=DEL&to=GOX">Delhi to Goa</Link>
                <Link to="/flights?from=BOM&to=DXB">Mumbai to Dubai</Link>
                <Link to="/flights?from=BLR&to=DEL">Bengaluru to Delhi</Link>
              </div>
              <div>
                <h4>Popular stays</h4>
                <Link to="/hotels?city=goa">Hotels in Goa</Link>
                <Link to="/hotels?city=jaipur">Hotels in Jaipur</Link>
                <Link to="/hotels?city=dubai">Hotels in Dubai</Link>
              </div>
            </div>
          </div>
        )}
        <div className="ftr-bottom">
          <span>© {new Date().getFullYear()} {BRAND.name} Travel. Sample build: fares, hotels and bookings are demo data.</span>
          <span className="ftr-pay"><Icon name="lock" size={14} /> Secure payments · UPI · Cards · Net banking</span>
        </div>
      </div>
    </footer>
  );
}

export function LoginModal() {
  const st = useStore(loginStore);
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [timer, setTimer] = useState(30);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (st.open) { setStep('phone'); setOtp(['', '', '', '', '', '']); setErr(''); }
  }, [st.open]);
  useEffect(() => {
    if (step !== 'otp' || timer <= 0) return;
    const t = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [step, timer]);

  const close = () => loginStore.set({ open: false });
  const sendOtp = () => {
    const p = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(p)) return setErr('Enter a 10-digit Indian mobile number.');
    setErr(''); setStep('otp'); setTimer(30);
    setTimeout(() => boxes.current[0]?.focus(), 30);
  };
  const verify = (code: string) => {
    if (code !== '123456') { setErr('That code does not match. In this demo the code is 123456.'); return; }
    setErr(''); setStep('name');
  };
  const finish = () => {
    if (name.trim().length < 2) return setErr('Tell us your name so we can fill it in for you.');
    userStore.set({ name: name.trim(), phone: phone.replace(/\D/g, '') });
    toast(`Welcome, ${name.trim().split(' ')[0]}. Your details will be filled in at checkout.`);
    const then = st.then;
    close();
    then?.();
  };
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length > 1) {
      const all = d.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''].map((_, k) => all[k] || '');
      setOtp(next);
      if (all.length === 6) verify(next.join(''));
      else boxes.current[all.length]?.focus();
      return;
    }
    const next = otp.slice();
    next[i] = d;
    setOtp(next);
    if (d && i < 5) boxes.current[i + 1]?.focus();
    if (next.every((x) => x)) verify(next.join(''));
  };

  return (
    <Modal open={st.open} onClose={close} className="login">
      <div className="login-art">
        <Logo light />
        <h3>Your trips, in one place</h3>
        <ul>
          <li><Icon name="check" size={16} /> Traveller details filled in for you</li>
          <li><Icon name="check" size={16} /> Manage and cancel bookings anytime</li>
          <li><Icon name="check" size={16} /> Member-only fares on select routes</li>
        </ul>
      </div>
      <div className="login-form">
        <button className="icon-btn login-x" onClick={close} aria-label="Close"><Icon name="x" /></button>
        {step === 'phone' && (
          <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
            <h3>Log in or sign up</h3>
            <p className="muted">We will send a one-time code to your mobile.</p>
            <label className="fld">
              <span>Mobile number</span>
              <div className="phone-in"><span>+91</span><input id="login-phone" inputMode="numeric" autoFocus maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} placeholder="98450 11234" /></div>
            </label>
            {err && <p className="err">{err}</p>}
            <button className="btn btn-red btn-block" type="submit">Get code</button>
            <p className="tiny muted">By continuing you agree to the terms and privacy policy.</p>
          </form>
        )}
        {step === 'otp' && (
          <div>
            <h3>Enter the 6-digit code</h3>
            <p className="muted">Sent to +91 {phone}. <button className="link-btn" onClick={() => setStep('phone')}>Change</button></p>
            <div className="otp">
              {otp.map((d, i) => (
                <input key={i} ref={(el) => { boxes.current[i] = el; }} inputMode="numeric" maxLength={6} value={d} aria-label={`Digit ${i + 1}`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) boxes.current[i - 1]?.focus(); }} />
              ))}
            </div>
            {err && <p className="err">{err}</p>}
            <p className="demo-hint"><Icon name="info" size={14} /> Demo code: <b className="mono">123456</b></p>
            <p className="small muted">{timer > 0 ? `Resend code in 0:${String(timer).padStart(2, '0')}` : <button className="link-btn" onClick={() => { setTimer(30); toast('A new code is on its way.', 'info'); }}>Resend code</button>}</p>
          </div>
        )}
        {step === 'name' && (
          <form onSubmit={(e) => { e.preventDefault(); finish(); }}>
            <h3>Nice to meet you</h3>
            <p className="muted">Use your name as on your ID, so we can fill tickets for you.</p>
            <label className="fld"><span>Full name</span><input id="login-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Kavya Rao" /></label>
            {err && <p className="err">{err}</p>}
            <button className="btn btn-red btn-block" type="submit">Continue</button>
          </form>
        )}
      </div>
    </Modal>
  );
}

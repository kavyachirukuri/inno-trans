import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { BRAND, applyCoupon } from '../config';
import { cx, inr } from '../lib/format';
import { toast } from '../lib/store';

export type PayMethod = 'upi' | 'card' | 'netbanking';
export type PayState = { method: PayMethod; upi: string; upiApp: string | null; num: string; name: string; exp: string; cvv: string; bank: string | null };
export const newPay = (): PayState => ({ method: 'upi', upi: '', upiApp: null, num: '', name: '', exp: '', cvv: '', bank: null });

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Punjab National Bank', 'Yes Bank', 'IDFC FIRST Bank', 'Federal Bank'];
const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'];

const cardBrand = (n: string) => (/^4/.test(n) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(n) ? 'MASTERCARD' : /^3[47]/.test(n) ? 'AMEX' : /^(60|65|81|82|508)/.test(n) ? 'RUPAY' : '');

export function payError(p: PayState): string | null {
  if (p.method === 'upi') {
    if (p.upiApp) return null;
    if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test(p.upi.trim())) return 'Enter a UPI ID like name@okbank, or pick your UPI app.';
  }
  if (p.method === 'card') {
    const n = p.num.replace(/\D/g, '');
    if (n.length < 15) return 'Card number looks short. Check the 16 digits on your card.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(p.exp)) return 'Expiry should look like 08/29.';
    const [m, y] = p.exp.split('/').map(Number);
    const now = new Date();
    if (2000 + y < now.getFullYear() || (2000 + y === now.getFullYear() && m < now.getMonth() + 1)) return 'This card has expired.';
    if (!/^\d{3,4}$/.test(p.cvv)) return 'CVV is the 3 digits on the back of your card.';
    if (p.name.trim().length < 2) return 'Enter the name as printed on the card.';
  }
  if (p.method === 'netbanking' && !p.bank) return 'Choose your bank to continue.';
  return null;
}

export const payLabel = (p: PayState) =>
  p.method === 'upi' ? `UPI${p.upiApp ? ` · ${p.upiApp}` : p.upi ? ` · ${p.upi}` : ''}` : p.method === 'card' ? `${cardBrand(p.num.replace(/\D/g, '')) || 'Card'} •••• ${p.num.replace(/\D/g, '').slice(-4)}` : `Net banking · ${p.bank}`;

export function PaymentPanel({ pay, setPay, error }: { pay: PayState; setPay: (p: PayState) => void; error?: string | null }) {
  const [flip, setFlip] = useState(false);
  const [verified, setVerified] = useState(false);
  const set = (x: Partial<PayState>) => setPay({ ...pay, ...x });
  const digits = pay.num.replace(/\D/g, '');
  const brand = cardBrand(digits);
  const shown = (digits + '•'.repeat(Math.max(0, 16 - digits.length))).replace(/(.{4})/g, '$1 ').trim();
  return (
    <div className="pay">
      <div className="pay-tabs" role="tablist">
        {([['upi', 'zap', 'UPI'], ['card', 'card', 'Card'], ['netbanking', 'bank', 'Net banking']] as const).map(([k, ic, n]) => (
          <button key={k} role="tab" aria-selected={pay.method === k} className={cx(pay.method === k && 'on')} onClick={() => set({ method: k })}>
            <Icon name={ic} size={18} /> {n}
          </button>
        ))}
      </div>

      {pay.method === 'upi' && (
        <div className="pay-body">
          <span className="eyebrow">Pay with an app</span>
          <div className="chips">
            {UPI_APPS.map((a) => (
              <button key={a} type="button" className={cx('chip', pay.upiApp === a && 'on')} onClick={() => set({ upiApp: pay.upiApp === a ? null : a, upi: '' })}>{a}</button>
            ))}
          </div>
          <div className="or"><span>or enter UPI ID</span></div>
          <div className="inline-field">
            <input id="pay-upi" value={pay.upi} onChange={(e) => { setVerified(false); set({ upi: e.target.value, upiApp: null }); }} placeholder="yourname@okbank" aria-label="UPI ID" />
            <button type="button" className="btn btn-sm btn-outline" onClick={() => {
              if (/^[\w.\-]{2,}@[a-z]{2,}$/i.test(pay.upi.trim())) { setVerified(true); toast('UPI ID verified.'); }
              else toast('That UPI ID does not look right. It should be like name@okbank.', 'warn');
            }}>{verified ? <><Icon name="check" size={14} /> Verified</> : 'Verify'}</button>
          </div>
          <p className="muted small">You will get a payment request in your UPI app. Approve it within 5 minutes.</p>
        </div>
      )}

      {pay.method === 'card' && (
        <div className="pay-body card-pay">
          <div className={cx('cc', flip && 'flip')} aria-hidden="true">
            <div className="cc-in">
              <div className="cc-front">
                <div className="cc-top"><span className="cc-chip" /><span className="cc-brand">{brand}</span></div>
                <div className="cc-num mono">{shown}</div>
                <div className="cc-bottom"><span>{pay.name.toUpperCase() || 'NAME ON CARD'}</span><span className="mono">{pay.exp || 'MM/YY'}</span></div>
              </div>
              <div className="cc-back"><div className="cc-strip" /><div className="cc-cvv mono">{pay.cvv.replace(/./g, '•') || 'CVV'}</div></div>
            </div>
          </div>
          <div className="cc-form">
            <label className="fld"><span>Card number</span>
              <input id="pay-num" inputMode="numeric" autoComplete="cc-number" value={pay.num} placeholder="1234 5678 9012 3456"
                onChange={(e) => set({ num: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim() })} /></label>
            <div className="row2">
              <label className="fld"><span>Expiry</span>
                <input id="pay-exp" inputMode="numeric" autoComplete="cc-exp" value={pay.exp} placeholder="MM/YY"
                  onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); set({ exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }); }} /></label>
              <label className="fld"><span>CVV</span>
                <input id="pay-cvv" inputMode="numeric" autoComplete="cc-csc" type="password" value={pay.cvv} placeholder="•••" onFocus={() => setFlip(true)} onBlur={() => setFlip(false)}
                  onChange={(e) => set({ cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
            </div>
            <label className="fld"><span>Name on card</span>
              <input id="pay-name" autoComplete="cc-name" value={pay.name} placeholder="As printed on the card" onChange={(e) => set({ name: e.target.value })} /></label>
            <p className="muted tiny"><Icon name="lock" size={12} /> Card details go straight to the bank. We never store your CVV.</p>
          </div>
        </div>
      )}

      {pay.method === 'netbanking' && (
        <div className="pay-body">
          <div className="banks">
            {BANKS.slice(0, 6).map((b) => (
              <button key={b} type="button" className={cx('bank', pay.bank === b && 'on')} onClick={() => set({ bank: b })}>
                <span className="bank-mono">{b.split(' ').map((w) => w[0]).join('').slice(0, 3)}</span>
                <span>{b}</span>
              </button>
            ))}
          </div>
          <label className="fld"><span>Other banks</span>
            <select id="pay-bank" value={BANKS.slice(0, 6).includes(pay.bank || '') ? '' : pay.bank || ''} onChange={(e) => set({ bank: e.target.value || null })}>
              <option value="">Choose a bank</option>
              {BANKS.slice(6).map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        </div>
      )}
      {error && <p className="err"><Icon name="info" size={14} /> {error}</p>}
    </div>
  );
}

export function CouponBox({ kind, amount, applied, onApply }: { kind: 'flight' | 'hotel'; amount: number; applied: { code: string; off: number } | null; onApply: (c: { code: string; off: number } | null) => void }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!applied) return;
    const r = applyCoupon(applied.code, kind, amount);
    if (r.ok && r.off !== applied.off) onApply({ code: r.code, off: r.off });
  }, [amount]);
  const apply = (c: string) => {
    const r = applyCoupon(c, kind, amount);
    setMsg({ ok: r.ok, text: r.msg });
    if (r.ok) { onApply({ code: r.code, off: r.off }); setCode(''); }
  };
  const list = BRAND.coupons.filter((c) => c.applies === 'any' || c.applies === kind);
  return (
    <div className="coupon">
      <b className="coupon-h"><Icon name="tag" size={16} /> Offers & coupons</b>
      {applied ? (
        <div className="coupon-on">
          <span><b className="mono">{applied.code}</b> applied · you save {inr(applied.off)}</span>
          <button className="link-btn" onClick={() => { onApply(null); setMsg(null); }}>Remove</button>
        </div>
      ) : (
        <form className="inline-field" onSubmit={(e) => { e.preventDefault(); apply(code); }}>
          <input id={`coupon-${kind}`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" aria-label="Coupon code" />
          <button className="btn btn-sm btn-dark" type="submit" disabled={!code}>Apply</button>
        </form>
      )}
      {msg && !applied && <p className={cx('small', msg.ok ? 'ok' : 'err')}>{msg.text}</p>}
      {!applied && (
        <div className="coupon-list">
          {list.map((c) => (
            <button key={c.code} className="coupon-opt" onClick={() => apply(c.code)}>
              <span className="mono">{c.code}</span><span className="small muted">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type Line = { label: ReactNode; amount: number; sub?: string; tone?: 'save' | 'free' };

export function Summary({ title = 'Price details', lines, total, totalLabel = 'Total', note, children }: { title?: string; lines: Line[]; total: number; totalLabel?: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="summary">
      <h3>{title}</h3>
      <dl>
        {lines.map((l, i) => (
          <div key={i} className={cx('sline', l.tone)}>
            <dt>{l.label}{l.sub && <span className="muted tiny">{l.sub}</span>}</dt>
            <dd className="num">{l.tone === 'free' ? 'Free' : l.tone === 'save' ? `− ${inr(l.amount)}` : inr(l.amount)}</dd>
          </div>
        ))}
        <div className="sline total"><dt>{totalLabel}</dt><dd className="num">{inr(total)}</dd></div>
      </dl>
      {note && <div className="summary-note">{note}</div>}
      {children}
    </div>
  );
}

export function Processing({ open, steps, onDone }: { open: boolean; steps: string[]; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!open) { setN(0); return; }
    if (n >= steps.length) { const t = setTimeout(onDone, 450); return () => clearTimeout(t); }
    const t = setTimeout(() => setN((x) => x + 1), 850);
    return () => clearTimeout(t);
  }, [open, n]);
  if (!open) return null;
  return createPortal(
    <div className="proc-wrap" role="alertdialog" aria-live="assertive">
      <div className="proc">
        <div className="proc-ring" />
        <h3>Confirming your booking</h3>
        <p className="muted small">Please keep this page open.</p>
        <ul>
          {steps.map((s, i) => (
            <li key={s} className={cx(i < n && 'done', i === n && 'now')}>
              <span className="proc-dot">{i < n ? <Icon name="check" size={12} stroke={3} /> : null}</span>{s}
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export function useHoldTimer(mins = 15) {
  const [left, setLeft] = useState(mins * 60);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) { toast('We re-checked your fare. The price is unchanged.', 'info'); return mins * 60; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [mins]);
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

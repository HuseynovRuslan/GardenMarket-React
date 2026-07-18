import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl } from '../api.js';

export default function CartDrawer({ open, onClose }) {
  const { tl, formatPrice, convertPrice, currency, settings, t, apiUrl, apiBase, unitLabel } = useApp();
  const { items, updateQty, remove, clear, totalAZN } = useCart();

  // Unlike the café this was forked from there is no table number: a shopper
  // either collects the basket in store or has it delivered.
  const [fulfillment, setFulfillment] = useState('pickup');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = Number(settings.delivery_fee || 0);
  const freeOver = Number(settings.free_delivery_over || 0);
  const feeApplies = fulfillment === 'delivery' && deliveryFee > 0 && !(freeOver > 0 && totalAZN >= freeOver);
  const payableAZN = totalAZN + (feeApplies ? deliveryFee : 0);

  const submitOrder = async () => {
    if (!items.length || submitting) return;
    if (fulfillment === 'delivery' && !address.trim()) {
      setAddressError(true);
      return;
    }
    setAddressError(false);
    setSubmitting(true);

    // Each line shows the unit price so it's clear how the total is made up:
    // "Çolpa: 2 × 18.00 AZN/əd = 36.00 AZN". No leading emoji — some phones
    // render it as a broken � in the WhatsApp text.
    const lines = items.map((i) => {
      const u = unitLabel ? unitLabel(i.unit) : '';
      const sz = i.size ? ` (${i.size})` : '';
      return `• ${tl(i.name)}${sz}: ${i.qty} × ${formatPrice(i.price)}${u ? `/${u}` : ''} = ${formatPrice(i.price * i.qty)}`;
    });
    const header = tl(settings.restaurant_name) || 'GardenMarket';
    const modeStr = fulfillment === 'delivery'
      ? `\n${t.delivery}: ${address.trim()}`
      : `\n${t.pickup}`;
    const feeStr = feeApplies ? `\n${t.deliveryFee}: ${formatPrice(deliveryFee)}` : '';
    const text = `${header}${modeStr}\n\n${t.yourOrder}:\n${lines.join('\n')}${feeStr}\n\n${t.total}: ${formatPrice(payableAZN)}`;

    // Persist the order (best effort — WhatsApp still opens if this fails).
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({ id: i.id, name: tl(i.name), size: i.size || null, unit: i.unit || 'piece', qty: i.qty, price: convertPrice(i.price) })),
            total: convertPrice(payableAZN),
            currency,
            fulfillment_type: fulfillment,
            delivery_address: fulfillment === 'delivery' ? address.trim() : null,
          }),
        });
      } catch { /* ignore — still open WhatsApp */ }
    }

    setSubmitting(false);
    const phone = (settings.whatsapp_number || '').replace(/[^\d]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!open) return null;

  const modeButton = (mode, icon, label) => (
    <button
      type="button"
      onClick={() => setFulfillment(mode)}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        fulfillment === mode
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-bg text-ink hover:border-accent'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full max-w-lg animate-[cartbar-in_0.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-h-[85vh] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl font-bold text-ink">🛒 {t.cart}</h2>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-lg text-ink transition hover:bg-surface-2"
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="grid place-items-center py-16 text-center text-muted">
              <div>
                <div className="mb-2 text-5xl opacity-40">🧺</div>
                <p className="text-sm">{t.emptyCart}</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-3 py-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-2xl">
                    {i.image ? <img src={assetUrl(i.image, apiBase)} alt="" className="h-full w-full object-cover" /> : (i.icon || '🛒')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-semibold text-ink">
                      {tl(i.name)}
                      {i.size ? <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{i.size}</span> : null}
                    </div>
                    <div className="text-sm text-muted">{formatPrice(i.price)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface-2 px-1">
                    <button onClick={() => updateQty(i.key, i.qty - 1)} className="grid h-8 w-8 place-items-center rounded-full text-lg text-ink transition hover:bg-surface" aria-label="−">−</button>
                    <span className="w-6 text-center text-sm font-bold text-ink">{i.qty}</span>
                    <button onClick={() => updateQty(i.key, i.qty + 1)} className="grid h-8 w-8 place-items-center rounded-full text-lg text-ink transition hover:bg-surface" aria-label="+">+</button>
                  </div>
                  <div className="w-16 shrink-0 text-right font-display text-base font-bold text-accent">{formatPrice(i.price * i.qty)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.fulfillment}</h3>
            <div className="mb-3 flex gap-2">
              {modeButton('pickup', '🏪', t.pickup)}
              {modeButton('delivery', '🚚', t.delivery)}
            </div>

            {fulfillment === 'delivery' && (
              <div className="mb-3">
                <input
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); if (addressError) setAddressError(false); }}
                  placeholder={t.addressPlaceholder}
                  aria-label={t.deliveryAddress}
                  className={`w-full rounded-xl border bg-bg px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent ${
                    addressError ? 'border-red-500' : 'border-line'
                  }`}
                />
                {addressError && <p className="mt-1 text-xs text-red-500">{t.addressRequired}</p>}
                {freeOver > 0 && (
                  <p className="mt-1 text-xs text-muted">{t.freeDeliveryOver} {formatPrice(freeOver)}</p>
                )}
              </div>
            )}

            {feeApplies && (
              <div className="mb-2 flex items-center justify-between text-sm text-muted">
                <span>{t.deliveryFee}</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <span className="text-base text-muted">{t.grandTotal}</span>
              <span className="font-display text-3xl font-bold text-accent">{formatPrice(payableAZN)}</span>
            </div>
            <button
              onClick={clear}
              className="mb-3 w-full rounded-full border border-line bg-surface py-3.5 font-semibold text-ink transition hover:bg-surface-2"
            >
              🗑 {t.clearCart}
            </button>
            <button
              onClick={submitOrder}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] to-[#1da851] py-4 text-lg font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
            >
              <span className="text-xl">💬</span> {t.orderViaWhatsapp}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

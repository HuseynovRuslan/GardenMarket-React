import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from './AppContext.jsx';
import { sizeKey } from '../api.js';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY_PREFIX = 'qrmenu_cart';

// Unique cart-line key: a product with a chosen variant is a distinct line
// from the same product in another variant, so 1 kq and 5 kq (or thyme and
// dill oil) live as two rows. `sizeKey` keeps it language-independent.
const lineKey = (id, size) => (size ? `${id}::${size}` : String(id));

function readCart(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(raw)) return [];
    // Backfill `key` for carts persisted before size variants existed.
    return raw.map((i) => ({ ...i, key: i.key || lineKey(i.id, sizeKey({ label: i.size })) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { activeRestaurant } = useApp();
  const storageKey = useMemo(
    () => `${KEY_PREFIX}_${activeRestaurant?.slug || 'platform'}`,
    [activeRestaurant?.slug],
  );
  const [items, setItems] = useState(() => readCart(storageKey));

  useEffect(() => {
    setItems(readCart(storageKey));
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, storageKey]);

  // All handlers are stable (state updates go through the functional form), so
  // adding to the cart doesn't hand every product card a new callback identity.
  // `size` is an optional { label, price, image? } variant (rice 1 kq / 5 kq,
  // or a named variety). The raw label (string or per-language object) is kept
  // on the line and resolved with tl() at render time, so the cart follows the
  // UI language.
  const add = useCallback((dish, qty = 1, size = null) => {
    const key = lineKey(dish.id, sizeKey(size));
    const price = size ? size.price : dish.price;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      }
      const image = size?.image || dish.image || null;
      return [...prev, { ...dish, key, size: size?.label ?? null, image, price, qty }];
    });
  }, []);

  const remove = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);

  const updateQty = useCallback((key, qty) => {
    if (qty <= 0) return remove(key);
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }, [remove]);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const totalAZN = useMemo(() => items.reduce((s, i) => s + Number(i.price) * i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, add, remove, updateQty, clear, count, totalAZN }),
    [items, add, remove, updateQty, clear, count, totalAZN],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

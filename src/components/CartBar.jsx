import { useApp } from '../context/AppContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function CartBar({ onOpen }) {
  const { t, formatPrice } = useApp();
  const { count, totalAZN } = useCart();

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={onOpen}
          className="pointer-events-auto flex w-full animate-[cartbar-in_0.25s_ease-out] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-accent to-[#b8893f] px-6 py-4 text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition active:scale-[0.99]"
        >
          <span className="text-xl">🛒</span>
          <span className="text-lg font-semibold">{t.cart}</span>
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white/25 px-2 text-sm font-bold">
            {count}
          </span>
          <span className="ml-1 text-lg font-bold tracking-wide">{formatPrice(totalAZN)}</span>
        </button>
      </div>
    </div>
  );
}

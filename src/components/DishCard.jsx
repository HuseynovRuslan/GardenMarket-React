import { useApp } from '../context/AppContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl, dishSizes, isOutOfStock } from '../api.js';
import { CategoryIcon } from '../categoryIcons.jsx';

export default function DishCard({ dish, category, onOpen }) {
  const { tl, formatPrice, formatUnitPrice, t, apiBase } = useApp();
  const { items, add, updateQty } = useCart();
  const sizes = dishSizes(dish);
  const soldOut = isOutOfStock(dish);

  // Once the item is in the cart, the Add button turns into a live −/+
  // stepper (matches this dish's actual cart line) so a second tap on the
  // grid is enough to grab 2+ — no need to open the modal just to bump qty.
  const cartLine = sizes.length === 0 ? items.find((i) => i.key === String(dish.id)) : null;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (soldOut) return;
    // With pack variants, let the customer pick one in the modal.
    if (sizes.length > 0) {
      onOpen(dish);
      return;
    }
    add(dish);
  };

  const step = (e, delta) => {
    e.stopPropagation();
    if (cartLine) updateQty(cartLine.key, cartLine.qty + delta);
  };

  return (
    <article
      onClick={() => onOpen(dish)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-surface-2">
        {dish.image ? (
          <img
            src={assetUrl(dish.image, apiBase)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center transition group-hover:scale-110">
            {category ? <CategoryIcon category={category} size={44} boxed={false} /> : <span className="text-5xl opacity-80">🛒</span>}
          </span>
        )}
        {dish.is_featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-ink">
            ★ {t.featured}
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute inset-0 grid place-items-center bg-surface/70">
            <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-surface">{t.outOfStock}</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-display text-base font-semibold leading-tight text-ink">{tl(dish.name)}</h3>
        <p className="line-clamp-2 flex-1 text-xs text-muted">{tl(dish.description)}</p>
        {/* Price on its own row, action full-width below — a side-by-side row
            overflowed the (overflow-hidden) card once the price carried a unit
            suffix like "100.00 AZN/əd", clipping the button. */}
        <div className="mt-2 space-y-2">
          <div className="truncate font-display text-lg font-bold text-accent">
            {sizes.length > 0 ? (
              <>
                {formatPrice(Math.min(...sizes.map((s) => s.price)))}
                <span className="ml-1 text-[10px] font-medium text-muted">{sizes.map((s) => s.label).join('/')}</span>
              </>
            ) : (
              formatUnitPrice(dish.price, dish.unit)
            )}
          </div>
          {cartLine ? (
            <div className="flex items-center justify-between rounded-lg bg-accent px-2 py-1 text-accent-ink">
              <button onClick={(e) => step(e, -1)} className="grid h-6 w-9 place-items-center rounded text-lg font-bold active:scale-90" aria-label="−">−</button>
              <span className="text-sm font-bold">{cartLine.qty}</span>
              <button onClick={(e) => step(e, 1)} className="grid h-6 w-9 place-items-center rounded text-lg font-bold active:scale-90" aria-label="+">+</button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={soldOut}
              className={`w-full rounded-lg py-2 text-xs font-semibold transition ${
                soldOut ? 'cursor-not-allowed bg-surface-2 text-muted' : 'bg-accent text-accent-ink active:scale-95'
              }`}
            >
              {soldOut ? t.outOfStock : `+ ${t.add}`}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl, dishSizes, hasNamedVariants, isOutOfStock, sizeKey } from '../api.js';
import { CategoryIcon } from '../categoryIcons.jsx';

export default function DishModal({ dish, category, onClose }) {
  const { tl, formatPrice, formatUnitPrice, t, apiBase } = useApp();
  const { add } = useCart();
  const sizes = dishSizes(dish);
  const [size, setSize] = useState(sizes[0] || null);
  if (!dish) return null;

  const price = size ? size.price : dish.price;
  const soldOut = isOutOfStock(dish);
  const named = hasNamedVariants(sizes);
  // Every flavour at the same price → don't repeat "· 5.00 ₼" on eight buttons.
  const samePrice = sizes.length > 0 && sizes.every((s) => Number(s.price) === Number(sizes[0].price));
  // A variety can carry its own photo (the thyme bottle, the dill bottle…).
  const image = size?.image || dish.image;
  // A pack variant ("5 kq") carries its own absolute price, so it drops the
  // per-unit suffix; a named variety (yellow / cherry tomatoes) is still sold
  // by the product's unit, so "/kq" stays.
  const fmt = (p) => (size && !named ? formatPrice(p) : formatUnitPrice(p, dish.unit));
  const priceLabel = fmt(price);

  const ingredients = tl(dish.ingredients);
  const ingList = Array.isArray(ingredients) ? ingredients : [];

  const nutrition = [
    [t.calories, dish.calories, 'kcal'],
    [t.protein, dish.protein, 'g'],
    [t.fat, dish.fat, 'g'],
    [t.carbs, dish.carbs, 'g'],
  ].filter(([, v]) => v != null && v !== 0);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface sm:rounded-3xl"
      >
        <div className="relative grid h-56 place-items-center overflow-hidden bg-surface-2 sm:h-64">
          {image ? (
            <img key={image} src={assetUrl(image, apiBase)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            category ? <CategoryIcon category={category} size={64} boxed={false} /> : <span className="text-7xl">🛒</span>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-bg/80 text-ink"
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-ink">{tl(dish.name)}</h2>
            <span className="whitespace-nowrap font-display text-xl font-bold text-accent">{priceLabel}</span>
          </div>
          {tl(dish.description) && <p className="text-sm text-muted">{tl(dish.description)}</p>}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 font-semibold ${
                soldOut ? 'bg-surface-2 text-muted' : 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {soldOut ? t.outOfStock : t.inStock}
            </span>
            {dish.sku ? <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-muted">{t.sku}: {dish.sku}</span> : null}
          </div>

          {sizes.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{named ? t.variant : t.size}</h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={sizeKey(s)}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      sizeKey(size) === sizeKey(s)
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line bg-bg text-ink hover:border-accent'
                    }`}
                  >
                    {tl(s.label)}{samePrice ? '' : ` · ${fmt(s.price)}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {dish.weight ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-muted">
                ⚖️ {dish.weight >= 1000 ? `${dish.weight / 1000} kq` : `${dish.weight} q`}
              </span>
            </div>
          ) : null}

          {ingList.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.ingredients}</h3>
              <div className="flex flex-wrap gap-1.5">
                {ingList.map((ing, i) => (
                  <span key={i} className="rounded-lg border border-line bg-bg px-2.5 py-1 text-xs text-ink">{ing}</span>
                ))}
              </div>
            </div>
          )}

          {nutrition.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.nutrition}</h3>
              <div className="grid grid-cols-4 gap-2">
                {nutrition.map(([label, val, unit]) => (
                  <div key={label} className="rounded-xl bg-surface-2 p-2 text-center">
                    <div className="font-display text-base font-bold text-ink">{val}{unit === 'g' ? 'g' : ''}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { add(dish, 1, size); onClose(); }}
            disabled={soldOut}
            className={`w-full rounded-xl py-3 font-semibold ${
              soldOut ? 'cursor-not-allowed bg-surface-2 text-muted' : 'bg-accent text-accent-ink active:scale-[0.99]'
            }`}
          >
            {soldOut ? t.outOfStock : `+ ${t.add} · ${formatPrice(price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

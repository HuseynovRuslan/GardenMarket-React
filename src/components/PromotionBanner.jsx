import { assetUrl } from '../api.js';
import { useApp } from '../context/AppContext.jsx';

export default function PromotionBanner({ promotions }) {
  const { tl, t, apiBase } = useApp();
  const visible = (promotions || []).filter((promo) => promo && Number(promo.is_active) !== 0);

  if (visible.length === 0) return null;

  return (
    <section className="mb-4 space-y-3" aria-label="Promotions">
      {visible.map((promo) => {
        const discount = Number(promo.discount_percent) || 0;

        return (
          <article
            key={promo.id}
            className="relative overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm"
          >
            <div className="absolute inset-y-0 left-0 w-1.5 bg-accent" />
            <div className="flex gap-3 p-4">
              {promo.image ? (
                <img
                  src={assetUrl(promo.image, apiBase)}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-surface-2 text-3xl">
                  %
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {discount > 0 ? (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-ink">
                      -{discount}%
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t.promotion}</span>
                </div>
                <h2 className="font-display text-xl font-bold leading-tight text-ink">{tl(promo.title)}</h2>
                {tl(promo.description) ? (
                  <p className="mt-1 text-sm leading-relaxed text-muted">{tl(promo.description)}</p>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

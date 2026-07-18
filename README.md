# GardenMarket — Storefront (React)

Customer-facing storefront + admin panel for **GardenMarket**, a QR grocery store. Built with React 18 + Vite + Tailwind CSS v4. Talks to the **GardenMarket-API** backend cross-origin.

Served under **`/gardenmarket`** on `menyuqr.com` (Traefik strips the prefix), the same pattern as the coffee menu and driver-game-center apps. The backend is a separate Coolify app on its own domain. Forked from a coffee-shop QR menu, so a few internal names (`dishSizes`, the `dishes` API route) are inherited — they mean **products** here.

## The three-part subpath contract

This app serves at a subpath, and **all three must agree** or you get blank pages / a redirect loop:

1. **Vite `base`** — `/gardenmarket/` (`vite.config.js`)
2. **Router `basename`** — `/gardenmarket` (`src/main.jsx`)
3. **Traefik StripPrefix** — strips `/gardenmarket` before forwarding (configured in Coolify, not in this repo)

## Develop

```bash
npm install
npm run dev        # http://localhost:5175/gardenmarket/
```

`.env.development` points the app at a local API on `http://localhost:3100`, so run **GardenMarket-API** alongside it (`npm run dev` in that repo). The Vite dev server also proxies `/api`, `/uploads`, and `/ws` to `:3100` as a convenience.

## Build

```bash
npm run build      # → dist/
npm run preview    # serve the build locally
```

The API origin is baked in at build time from `VITE_API_BASE` (see `src/api.js`). Locally it falls back to `.env.development`; in production the Docker build passes it as a `--build-arg` (see `Dockerfile`). Set it to whatever domain the GardenMarket-API Coolify app is given.

## Deploy

`Dockerfile` builds the SPA and serves it with nginx (`nginx.conf`). In Coolify, deploy this repo as its own app with:

- build arg `VITE_API_BASE` = the deployed API host (e.g. `https://gardenmarket-api.bahram.site`)
- a Traefik rule `Host(menyuqr.com||www.menyuqr.com) && PathPrefix(/gardenmarket)` **+ a StripPrefix middleware**, at a higher priority than the fallback app's `PathPrefix(/)`

## Structure

```
src/
  main.jsx          ← ReactDOM entry, BrowserRouter basename="/gardenmarket"
  App.jsx           ← Routes: / (storefront) and /admin
  api.js            ← fetch helpers, API_BASE, dishSizes(), isOutOfStock(), UNITS
  i18n.js           ← storefront UI strings EN/RU/AZ/TR (+ unit labels)
  adminStrings.jsx  ← admin-panel UI strings EN/RU/AZ/TR
  categoryIcons.jsx ← lucide icon registry keyed by category.icon_key
  restaurants.js    ← single-store config (slug, name, accentColor, apiBase)
  context/
    AppContext.jsx  ← language, currency, theme, settings, tl, formatPrice, formatUnitPrice
    CartContext.jsx ← persistent cart (localStorage), pack variants as distinct lines
  components/       ← Navbar, CategoryFilter, DishCard, DishModal, CartDrawer (pickup/delivery),
                      AIChat, PromotionBanner, RestaurantInfo, ContactBar, Pagination
  pages/            ← MenuPage (storefront), AdminPage (products/categories/promos/orders/settings/QR)
  index.css         ← Tailwind v4 entry + green theme tokens (light + dark)
```

## Grocery specifics

- **Per-unit pricing**: `formatUnitPrice(price, unit)` renders "2.20 AZN/kq" for weighed goods and plain "2.40 AZN" for per-piece items.
- **Stock**: `isOutOfStock()` treats `stock_qty === null` as available; only a tracked `0` shows the sold-out overlay and disables add-to-cart.
- **Pickup / delivery**: `CartDrawer` offers both; delivery requires an address and can add a delivery fee (free over a configurable threshold).

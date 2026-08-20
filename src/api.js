// All data comes from the GardenMarket backend (repo: GardenMarket-API), which is
// deployed as its own Coolify app — this store shares no database with the café.
// The store itself is served at menyuqr.com/gardenmarket, but the API is a
// separate host (Coolify gives the API app its own domain).
//
// Set the real API host via VITE_API_BASE as a build arg in Coolify (the
// Dockerfile declares `ARG VITE_API_BASE`). This literal is only the fallback.
export const API_BASE = (import.meta.env.VITE_API_BASE || 'https://gardenmarket-api.bahram.site').replace(/\/$/, '');

// Base for REST calls, e.g. `${API_URL}/menu/dishes`.
export const API_URL = `${API_BASE}/api`;

export function apiBaseFor(restaurant) {
  return (restaurant?.apiBase || API_BASE).replace(/\/$/, '');
}

export function apiUrlFor(restaurant) {
  return `${apiBaseFor(restaurant)}/api`;
}

// Photos stored on Cloudinary are served at whatever size was uploaded. Ask the
// CDN for a display-sized copy instead: w_700 caps the width, q_auto picks a
// quality, f_auto delivers WebP/AVIF where supported. Local /uploads photos are
// already resized on upload (see the API's optimizeImage), so this only matters
// when Cloudinary is configured.
const CLOUDINARY_TRANSFORM = 'w_700,q_auto,f_auto';
function cdnOptimized(url) {
  if (typeof url !== 'string') return url;
  const marker = '/image/upload/';
  if (!url.includes('res.cloudinary.com') || !url.includes(marker)) return url;
  const rest = url.slice(url.indexOf(marker) + marker.length);
  if (/^[^/]*\b(?:w|h|q|f|c)_/.test(rest)) return url; // already transformed
  return url.replace(marker, `${marker}${CLOUDINARY_TRANSFORM}/`);
}

// Resolve a server-relative asset path (e.g. "/uploads/x.png") to an absolute URL.
export function assetUrl(path, base = API_BASE) {
  if (!path) return path;
  if (/^(https?:|data:|blob:)/i.test(path)) return cdnOptimized(path);
  if (path.startsWith('/uploads/')) return `${(base || API_BASE).replace(/\/$/, '')}${path}`;
  return path;
}

// Parse a product's `sizes` column (JSON array of { label, price, image? } in
// AZN) into a clean array. These are the product's variants: either pack sizes
// (label "1 kq" / "5 kq") or named varieties, where `label` is a per-language
// object ({ az: 'Kəklikotulu', en: 'Thyme', … }) and `image` an optional photo
// of that variety. Returns [] when the product has no variants — callers then
// fall back to the plain `price` field.
export function dishSizes(dish) {
  if (!dish || dish.sizes == null) return [];
  try {
    const arr = typeof dish.sizes === 'string' ? JSON.parse(dish.sizes) : dish.sizes;
    return Array.isArray(arr) ? arr.filter((s) => s && sizeKey(s) && s.price != null) : [];
  } catch {
    return [];
  }
}

// Stable, language-independent identifier for a variant — used for cart line
// keys and React keys, so switching the UI language doesn't split a cart line.
export function sizeKey(size) {
  const l = size?.label;
  if (l == null) return '';
  if (typeof l === 'string') return l;
  if (typeof l === 'object') return l.az || l.en || Object.values(l).find(Boolean) || '';
  return String(l);
}

// True when the variants are named varieties (flavours) rather than pack sizes.
export function hasNamedVariants(sizes) {
  return sizes.some((s) => s.label && typeof s.label === 'object');
}

// Units of sale, mirroring UNITS in the API's db/database.js.
export const UNITS = ['kg', 'piece', 'pack', 'bunch'];

// A product is out of stock only when stock is *tracked* and has run out.
// stock_qty === null means "not tracked", which must read as available.
export function isOutOfStock(dish) {
  return dish?.stock_qty != null && Number(dish.stock_qty) <= 0;
}

// WebSocket endpoint on the API host.
export function wsUrl(path = '/ws') {
  const url = new URL(API_BASE);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = path;
  return url.toString();
}

// Thin fetch helper. `path` is relative to the API root, e.g. "/menu/dishes".
export async function api(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export function adminHeaders(pw, extra = {}) {
  return { 'x-admin-password': pw || '', ...extra };
}

// JSON helper for admin writes (non-multipart)
export function jsonHeaders(pw) {
  return { 'Content-Type': 'application/json', ...adminHeaders(pw) };
}

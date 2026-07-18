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

// Resolve a server-relative asset path (e.g. "/uploads/x.png") to an absolute URL.
export function assetUrl(path, base = API_BASE) {
  if (!path) return path;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith('/uploads/')) return `${(base || API_BASE).replace(/\/$/, '')}${path}`;
  return path;
}

// Parse a product's `sizes` column (JSON array of { label, price } in AZN) into
// a clean array. For a grocery store these are pack variants (1 kq / 5 kq).
// Returns [] when the product has no variants — callers then fall back to the
// plain `price` field.
export function dishSizes(dish) {
  if (!dish || dish.sizes == null) return [];
  try {
    const arr = typeof dish.sizes === 'string' ? JSON.parse(dish.sizes) : dish.sizes;
    return Array.isArray(arr) ? arr.filter((s) => s && s.label != null && s.price != null) : [];
  } catch {
    return [];
  }
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

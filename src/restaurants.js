import { API_BASE } from './api.js';

// Single-tenant app: just GardenMarket. The multi-store scaffolding is kept
// (AppContext/CartContext resolve the active store) but there is only one entry,
// used as the default everywhere.
export const DEFAULT_RESTAURANT_SLUG = 'gardenmarket';

export const restaurants = [
  {
    slug: 'gardenmarket',
    name: 'GardenMarket',
    category: 'Market kataloqu',
    description: 'Tərəvəz, meyvə, ət və gündəlik ərzaq.',
    logo: `${import.meta.env.BASE_URL}gardenmarket-logo.svg`,
    accentColor: '#4C9A2A',
    apiBase: API_BASE,
    tags: ['Market', 'Çatdırılma', 'Təzə'],
  },
];

export function getRestaurantBySlug(slug) {
  return restaurants.find((restaurant) => restaurant.slug === slug) || null;
}

export function restaurantSlugFromPath(pathname) {
  const [segment] = pathname.split('/').filter(Boolean);
  if (!segment || segment === 'admin') return null;
  return segment;
}

export function localizedText(value, language = 'az') {
  if (value == null) return '';
  if (typeof value === 'object') return value[language] || value.az || value.en || Object.values(value)[0] || '';
  return String(value);
}

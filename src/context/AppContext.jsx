import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useStrings } from '../i18n.js';
import { apiBaseFor, apiUrlFor } from '../api.js';
import { DEFAULT_RESTAURANT_SLUG, getRestaurantBySlug, restaurantSlugFromPath } from '../restaurants.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Resolve a multilingual JSON value (or plain string) to the current language.
export function tl(value, language = 'az') {
  if (value == null) return '';
  if (typeof value === 'object') {
    return value[language] || value.az || value.en || Object.values(value)[0] || '';
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
        return tl(parsed, language);
      } catch { /* not JSON */ }
    }
    return value;
  }
  return String(value);
}

export function AppProvider({ children }) {
  const location = useLocation();
  const routeSlug = restaurantSlugFromPath(location.pathname);
  const restaurant = useMemo(
    () => (routeSlug ? getRestaurantBySlug(routeSlug) : null),
    [routeSlug],
  );
  const activeRestaurant = restaurant || getRestaurantBySlug(DEFAULT_RESTAURANT_SLUG);
  const apiBase = activeRestaurant?.apiBase ? apiBaseFor(activeRestaurant) : null;
  const apiUrl = activeRestaurant?.apiBase ? apiUrlFor(activeRestaurant) : null;
  const [settings, setSettings] = useState({});
  // v2 key: bumped so older cached language choices fall back to the new 'az' default.
  const [language, setLanguage] = useState(() => localStorage.getItem('qrmenu_lang_v2') || 'az');
  const [currency, setCurrency] = useState(() => localStorage.getItem('qrmenu_currency') || 'AZN');
  const [theme, setTheme] = useState(() => localStorage.getItem('qrmenu_theme') || 'light');

  const t = useStrings(language);

  useEffect(() => {
    const baseSettings = activeRestaurant?.settings || {};
    setSettings(baseSettings);

    if (!apiUrl) return;

    fetch(`${apiUrl}/settings/public`)
      .then((r) => r.json())
      .then((s) => {
        setSettings({ ...baseSettings, ...s });
      })
      .catch(() => {});
  }, [activeRestaurant, apiUrl]);

  // Theme → <html data-theme>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('qrmenu_theme', theme);
  }, [theme]);

  // Accent color from settings → inline --accent (overrides theme default)
  useEffect(() => {
    if (settings.accent_color) {
      document.documentElement.style.setProperty('--accent', settings.accent_color);
    }
  }, [settings.accent_color]);

  useEffect(() => { localStorage.setItem('qrmenu_lang_v2', language); }, [language]);
  useEffect(() => { localStorage.setItem('qrmenu_currency', currency); }, [currency]);

  const toggleTheme = useCallback(() => {
    setTheme((p) => (p === 'dark' ? 'light' : 'dark'));
  }, []);

  // Memoised: a fresh object here would invalidate convertPrice → formatPrice →
  // formatUnitPrice on every render, and with them the whole context value.
  const rates = useMemo(() => {
    try { return JSON.parse(settings.currency_rates || '{}'); } catch { return {}; }
  }, [settings.currency_rates]);

  const convertPrice = useCallback((priceAZN) => {
    const rate = rates[currency] ?? 1;
    return (Number(priceAZN) * rate);
  }, [rates, currency]);

  const formatPrice = useCallback((priceAZN) => {
    const v = convertPrice(priceAZN);
    return `${v.toFixed(2)} ${currency}`;
  }, [convertPrice, currency]);

  // "2.20 AZN/kq" for weighed goods; plain "2.40 AZN" for per-piece items,
  // where a "/pc" suffix would just be noise.
  const formatUnitPrice = useCallback((priceAZN, unit) => {
    return `${formatPrice(priceAZN)}${t.perUnit?.[unit] || ''}`;
  }, [formatPrice, t]);

  // Short label for one unit of sale, e.g. "kq" — used next to quantities.
  const unitLabel = useCallback((unit) => t.units?.[unit] || t.units?.piece || '', [t]);

  const tlBound = useCallback((v) => tl(v, language), [language]);

  // Memoised so a provider render doesn't force every consumer (navbar, each
  // product card, cart bar, chat) to re-render just because the object identity
  // changed.
  const value = useMemo(() => ({
    settings,
    restaurant,
    activeRestaurant,
    routeSlug,
    apiBase,
    apiUrl,
    language, setLanguage,
    currency, setCurrency,
    theme, setTheme, toggleTheme,
    t,
    tl: tlBound,
    convertPrice,
    formatPrice,
    formatUnitPrice,
    unitLabel,
  }), [
    settings, restaurant, activeRestaurant, routeSlug, apiBase, apiUrl,
    language, currency, theme, toggleTheme, t, tlBound,
    convertPrice, formatPrice, formatUnitPrice, unitLabel,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

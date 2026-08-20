import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Navbar from '../components/Navbar.jsx';
import CategoryFilter from '../components/CategoryFilter.jsx';
import DishCard from '../components/DishCard.jsx';
import DishModal from '../components/DishModal.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import CartBar from '../components/CartBar.jsx';
import AIChat from '../components/AIChat.jsx';
import ContactBar from '../components/ContactBar.jsx';
import RestaurantInfo from '../components/RestaurantInfo.jsx';
import PromotionBanner from '../components/PromotionBanner.jsx';
import { assetUrl, dishSizes } from '../api.js';

function searchableText(value) {
  if (value == null) return '';
  if (typeof value === 'object') return Object.values(value).join(' ');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return searchableText(parsed);
    } catch { /* plain string */ }
    return value;
  }
  return String(value);
}

export default function MenuPage() {
  const { tl, t, settings, activeRestaurant, apiUrl } = useApp();
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [modalDish, setModalDish] = useState(null);
  const [loading, setLoading] = useState(true);
  // Infinite scroll: pages accumulate into `dishes`; this sentinel sits under
  // the grid and requests the next page when it scrolls into view. The request
  // id guards against a stale response (e.g. an old page racing a filter reset)
  // being appended after the list was replaced.
  const sentinelRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setPage(1);
    setActiveCat(null);
    setSearch('');
    setDebounced('');
    setModalDish(null);
  }, [activeRestaurant?.slug]);

  useEffect(() => {
    if (activeRestaurant?.menu?.categories) {
      setCategories(activeRestaurant.menu.categories);
      return;
    }

    if (!apiUrl) {
      setCategories([]);
      return;
    }

    fetch(`${apiUrl}/menu/categories`).then((r) => r.json()).then(setCategories).catch(() => {});
  }, [activeRestaurant, apiUrl]);

  useEffect(() => {
    if (activeRestaurant?.menu?.promotions) {
      setPromotions(activeRestaurant.menu.promotions);
      return;
    }

    if (!apiUrl) {
      setPromotions([]);
      return;
    }

    fetch(`${apiUrl}/menu/promotions`).then((r) => r.json()).then(setPromotions).catch(() => {});
  }, [activeRestaurant, apiUrl]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeCat, debounced]);

  useEffect(() => {
    if (activeRestaurant?.menu?.dishes) {
      setLoading(true);
      const query = debounced.trim().toLowerCase();
      const filtered = activeRestaurant.menu.dishes
        .filter((dish) => !activeCat || dish.category_id === activeCat)
        .filter((dish) => {
          if (!query) return true;
          // Variant names too, so "kəklikotulu" finds the oil that has it as a variety.
          const variants = dishSizes(dish).map((s) => searchableText(s.label)).join(' ');
          return `${searchableText(dish.name)} ${searchableText(dish.description)} ${variants}`.toLowerCase().includes(query);
        });
      const limit = 12;
      // accumulate: show everything up to the current page
      setDishes(filtered.slice(0, page * limit));
      setTotalPages(Math.max(1, Math.ceil(filtered.length / limit)));
      setLoading(false);
      return;
    }

    if (!apiUrl) {
      setDishes([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    const reqId = ++reqIdRef.current;
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (activeCat) params.set('category_id', String(activeCat));
    if (debounced) params.set('search', debounced);
    fetch(`${apiUrl}/menu/dishes?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (reqIdRef.current !== reqId) return; // a newer request superseded this one
        const items = data.items || [];
        setDishes((prev) => {
          if (page === 1) return items;
          // guard against duplicates if the same page ever lands twice
          const seen = new Set(prev.map((d) => d.id));
          return [...prev, ...items.filter((d) => !seen.has(d.id))];
        });
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => { if (reqIdRef.current === reqId) setLoading(false); });
  }, [activeRestaurant, apiUrl, page, activeCat, debounced]);

  // Ask for the next page as soon as the sentinel under the grid comes near the
  // viewport (rootMargin pre-loads before the customer actually hits the end).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && page < totalPages) setPage((p) => p + 1);
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading, page, totalPages]);

  const categoryFor = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c.id] = c; });
    return (id) => map[id] || null;
  }, [categories]);

  // Every active category is shown. Hide one by unticking is_active in the
  // admin panel rather than hardcoding names here.
  const visibleCategories = categories;
  const visibleDishes = dishes;

  return (
    <div className="min-h-screen bg-bg pb-28">
      <Navbar onSearch={setSearch} search={search} />

      <main className="mx-auto max-w-5xl px-4 pb-12">
        <section className="py-6 text-center">
          <img
            src={assetUrl(settings.logo_image || activeRestaurant?.logo || `${import.meta.env.BASE_URL}gardenmarket-logo.svg`, activeRestaurant?.apiBase)}
            alt=""
            className="mx-auto mb-3 h-16 w-16 rounded-full object-cover shadow-sm"
          />
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {tl(settings.restaurant_name) || 'GardenMarket'}
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">{t.specialty}</p>
          <p className="mt-1 font-display text-sm italic text-accent">{t.tagline}</p>
          <ContactBar />
        </section>

        <PromotionBanner promotions={promotions} />

        <div id="menu" className="sticky top-[58px] z-20 -mx-4 bg-bg/90 px-4 py-2 backdrop-blur">
          <CategoryFilter categories={visibleCategories} active={activeCat} onChange={setActiveCat} />
        </div>

        {loading && page === 1 ? (
          <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-line bg-surface" />
            ))}
          </div>
        ) : visibleDishes.length === 0 ? (
          <p className="py-16 text-center text-muted">{t.noResults}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleDishes.map((d, i) => (
              <DishCard key={d.id} dish={d} category={categoryFor(d.category_id)} onOpen={setModalDish} priority={i < 4} />
            ))}
          </div>
        )}

        {/* infinite-scroll sentinel + "loading more" dots */}
        <div ref={sentinelRef} aria-hidden="true" />
        {loading && page > 1 && (
          <div className="flex justify-center gap-1.5 py-6" aria-label="Yüklənir">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}
      </main>

      <RestaurantInfo />

      <AIChat />
      <CartBar onOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      {modalDish && (
        <DishModal dish={modalDish} category={categoryFor(modalDish.category_id)} onClose={() => setModalDish(null)} />
      )}
    </div>
  );
}

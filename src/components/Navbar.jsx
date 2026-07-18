import { useApp } from '../context/AppContext.jsx';
import { LANGUAGES, CURRENCIES } from '../i18n.js';
import { assetUrl } from '../api.js';

export default function Navbar({ onSearch, search }) {
  const { settings, language, setLanguage, currency, setCurrency, theme, toggleTheme, tl, t, activeRestaurant } = useApp();

  const showCurrency = settings.show_currency_selector !== '0';
  const showLang = settings.show_language_selector !== '0';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={assetUrl(settings.logo_image || activeRestaurant?.logo || `${import.meta.env.BASE_URL}gardenmarket-logo.svg`, activeRestaurant?.apiBase)}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-lg font-semibold text-ink">
              {tl(settings.restaurant_name) || 'GardenMarket'}
            </div>
            <div className="truncate text-[11px] uppercase tracking-[0.2em] text-muted">{t.specialty}</div>
          </div>
        </div>

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
          <a href="#menu" className="transition hover:text-accent">{t.menu}</a>
          <a href="#about" className="transition hover:text-accent">{t.about}</a>
          <a href="#contact" className="transition hover:text-accent">{t.contact}</a>
        </nav>

        <div className="flex items-center gap-1.5">
          {showLang && (
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink outline-none"
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          )}
          {showCurrency && (
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink outline-none"
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-base"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {onSearch && (
        <div className="mx-auto max-w-md px-4 pb-3">
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t.search}
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
          />
        </div>
      )}
    </header>
  );
}

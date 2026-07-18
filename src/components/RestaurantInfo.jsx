import { useApp } from '../context/AppContext.jsx';
import { assetUrl } from '../api.js';

export default function RestaurantInfo() {
  const { settings, tl, t, activeRestaurant, apiBase } = useApp();

  let hours = {};
  try { hours = JSON.parse(settings.opening_hours || '{}'); } catch { /* ignore */ }
  const days = Object.entries(hours);

  return (
    <footer id="contact" className="mt-10 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-3">
        <div id="about">
          <div className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <img
              src={assetUrl(settings.logo_image || activeRestaurant?.logo || `${import.meta.env.BASE_URL}gardenmarket-logo.svg`, apiBase)}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
            {tl(settings.restaurant_name) || activeRestaurant?.name || 'Menyu QR'}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{t.tagline}</p>
          {settings.address && <p className="mt-3 text-sm text-muted">📍 {settings.address}</p>}
        </div>

        {days.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.hours}</h3>
            <ul className="space-y-1 text-sm text-ink">
              {days.map(([day, time]) => (
                <li key={day} className="flex justify-between gap-4">
                  <span className="capitalize text-muted">{day}</span>
                  <span>{time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 text-sm text-ink">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.contact}</h3>
          {settings.phone && <p>📞 {settings.phone}</p>}
          {settings.instagram && <p>📸 {settings.instagram}</p>}
          {settings.wifi_name && (
            <p className="text-muted">
              📶 {t.wifi}: <span className="text-ink">{settings.wifi_name}</span>
              {settings.wifi_password ? ` · ${settings.wifi_password}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        Made with passion ♥ · {new Date().getFullYear()}
      </div>
    </footer>
  );
}

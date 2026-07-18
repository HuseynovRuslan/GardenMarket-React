import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

// Inline SVG icons (stroke = currentColor) to match the clean look of the reference.
const icons = {
  phone: (
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z" />
  ),
  whatsapp: (
    <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm0 2a7 7 0 1 1-3.7 12.9l-.3-.2-2.3.6.6-2.2-.2-.3A7 7 0 0 1 12 5zm-2.3 3.3c-.2 0-.5 0-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.6 2 .8 2.5.7 2.9.6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2 0-.1-.2-.2-.5-.3l-1.6-.8c-.2-.1-.4-.1-.6.1l-.6.8c-.1.1-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a16 16 0 0 1 19 0" />
      <path d="M5.5 12.5a11 11 0 0 1 13 0" />
      <path d="M8.5 16a6 6 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

// A circular icon button with a hover tooltip. Either a link (href) or a toggle (onClick).
function BarButton({ name, label, href, onClick, active }) {
  const cls = `group relative grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-surface-2 hover:text-accent ${active ? 'bg-surface-2 text-accent' : ''}`;
  const tip = (
    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-bg opacity-0 transition group-hover:opacity-100">
      {label}
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={label}>
        <Icon name={name} />
        {tip}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      <Icon name={name} />
      {tip}
    </button>
  );
}

export default function ContactBar() {
  const { settings, t } = useApp();
  const [popover, setPopover] = useState(null); // 'wifi' | 'hours' | null

  const wa = (settings.whatsapp_number || '').replace(/[^\d]/g, '');
  const igRaw = (settings.instagram || '').trim();
  const igHref = igRaw
    ? igRaw.startsWith('http')
      ? igRaw
      : `https://instagram.com/${igRaw.replace(/^@/, '')}`
    : '';

  let hours = {};
  try { hours = JSON.parse(settings.opening_hours || '{}'); } catch { /* ignore */ }
  const days = Object.entries(hours);

  const hasAny = settings.phone || wa || igHref || settings.wifi_name || days.length > 0;
  if (!hasAny) return null;

  const toggle = (key) => setPopover((p) => (p === key ? null : key));

  return (
    <div className="relative mt-5 flex justify-center">
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1.5 shadow-lg shadow-black/5">
        {settings.phone && (
          <BarButton name="phone" label={settings.phone} href={`tel:${settings.phone}`} />
        )}
        {wa && (
          <BarButton name="whatsapp" label="WhatsApp" href={`https://wa.me/${wa}`} />
        )}
        {igHref && (
          <BarButton name="instagram" label="Instagram" href={igHref} />
        )}
        {settings.wifi_name && (
          <BarButton name="wifi" label="Wi-Fi" onClick={() => toggle('wifi')} active={popover === 'wifi'} />
        )}
        {days.length > 0 && (
          <BarButton name="clock" label={t.hours} onClick={() => toggle('hours')} active={popover === 'hours'} />
        )}
      </div>

      {popover === 'wifi' && (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 text-left shadow-xl">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t.wifi}</h3>
          <p className="text-sm text-ink">{settings.wifi_name}</p>
          {settings.wifi_password && (
            <p className="mt-1 text-sm text-muted">🔑 <span className="font-mono text-ink">{settings.wifi_password}</span></p>
          )}
        </div>
      )}

      {popover === 'hours' && (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 text-left shadow-xl">
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
    </div>
  );
}

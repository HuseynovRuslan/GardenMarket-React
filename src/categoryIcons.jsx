import { Carrot, Apple, Drumstick, Milk, Leaf, Croissant, Wheat, ShoppingBasket } from 'lucide-react';
import { assetUrl } from './api.js';
import { useApp } from './context/AppContext.jsx';

// Built-in professional category icons. `key` is what's stored in the DB
// (category.icon_key), so these keys must match the ones seeded by the API in
// db/database.js — a key with no entry here silently falls back to the emoji.
export const ICON_OPTIONS = [
  { key: 'vegetables', label: 'Tərəvəz', Icon: Carrot },
  { key: 'fruit', label: 'Meyvə', Icon: Apple },
  { key: 'meat', label: 'Ət və Toyuq', Icon: Drumstick },
  { key: 'dairy', label: 'Süd və Yumurta', Icon: Milk },
  { key: 'herbs', label: 'Göyərti', Icon: Leaf },
  { key: 'bakery', label: 'Çörək', Icon: Croissant },
  { key: 'pantry', label: 'Quru Ərzaq', Icon: Wheat },
  { key: 'other', label: 'Digər', Icon: ShoppingBasket },
];

const ICONS = Object.fromEntries(ICON_OPTIONS.map((o) => [o.key, o.Icon]));

// Renders a category's icon. Resolution order:
//   icon_type 'image' + icon_url  -> uploaded custom icon
//   icon_type 'svg'   + icon_key  -> built-in lucide icon, tinted with the brand color
//   otherwise                     -> legacy emoji (category.icon)
// When `boxed`, the icon sits inside a small rounded tinted box.
export function CategoryIcon({ category, size = 18, boxed = true, className = '' }) {
  const { apiBase } = useApp();
  if (!category) return null;

  let inner;
  if (category.icon_type === 'image' && category.icon_url) {
    inner = (
      <img src={assetUrl(category.icon_url, apiBase)} alt="" style={{ width: size, height: size }} className="object-contain" />
    );
  } else {
    const Lucide = category.icon_type !== 'image' ? ICONS[category.icon_key] : null;
    if (Lucide) {
      inner = <Lucide size={size} strokeWidth={2} style={{ color: 'var(--accent)' }} />;
    } else {
      inner = <span style={{ fontSize: size, lineHeight: 1 }}>{category.icon || '🛒'}</span>;
    }
  }

  if (!boxed) return inner;

  const box = Math.round(size * 1.9);
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-lg bg-surface-2 ${className}`}
      style={{ width: box, height: box }}
    >
      {inner}
    </span>
  );
}

import { useApp } from '../context/AppContext.jsx';
import { CategoryIcon } from '../categoryIcons.jsx';

export default function CategoryFilter({ categories, active, onChange }) {
  const { tl, t } = useApp();

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
          active == null
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line bg-surface text-ink'
        }`}
      >
        ✦ {t.all}
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition ${
            active === c.id
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-surface text-ink'
          }`}
        >
          <CategoryIcon category={c} size={16} />
          {tl(c.name)}
        </button>
      ))}
    </div>
  );
}

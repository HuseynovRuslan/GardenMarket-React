import { useApp } from '../context/AppContext.jsx';

export default function Pagination({ page, totalPages, onChange }) {
  const { t } = useApp();
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink disabled:opacity-40"
      >
        ‹
      </button>
      <span className="text-sm text-muted">
        {t.page} <span className="font-semibold text-ink">{page}</span> {t.of} {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}

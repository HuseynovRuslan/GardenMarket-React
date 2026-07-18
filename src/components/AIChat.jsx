import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl, dishSizes } from '../api.js';

export default function AIChat() {
  const { language, tl, formatPrice, t, apiUrl, apiBase, activeRestaurant } = useApp();
  const { add, count } = useCart();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedId, setAddedId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((p) => [...p, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language, history }),
      });
      const data = await res.json();
      setMessages((p) => [...p, { role: 'assistant', content: data.reply, dishes: data.dishes || [] }]);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: '⚠️', dishes: [] }]);
    } finally {
      setLoading(false);
    }
  };

  if (!apiUrl || activeRestaurant?.aiEnabled === false) return null;

  const quickAdd = (d) => {
    // Default to the smallest size variant when the dish has sizes.
    add(d, 1, dishSizes(d)[0] || null);
    setAddedId(d.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <>
      <div className={`group fixed right-5 z-40 transition-[bottom] ${count > 0 ? 'bottom-24 sm:bottom-5' : 'bottom-5'}`}>
        {!open && (
          <span className="pointer-events-none absolute right-full top-1/2 mr-3 flex -translate-y-1/2 flex-col whitespace-nowrap rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-right text-white opacity-100 shadow-lg transition">
            <span className="text-xs font-semibold leading-tight">{t.askAI}</span>
            <span className="text-[10px] leading-tight text-white/80">{t.aiSubtitle}</span>
          </span>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-2xl text-white shadow-lg shadow-black/20 active:scale-95"
          aria-label={t.askAI}
        >
          {open ? '✕' : '✨'}
        </button>
      </div>

      {open && (
        <div className={`fixed right-5 z-40 flex h-[28rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl ${count > 0 ? 'bottom-44 sm:bottom-24' : 'bottom-24'}`}>
          <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-xl">✨</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-display font-semibold">{t.askAI}</div>
              <div className="truncate text-xs text-white/70">{t.aiSubtitle}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-sm text-white transition hover:bg-white/25"
            >
              ✕
            </button>
          </div>

          {messages.length === 0 && (
            <div className="border-b border-line px-3 pt-3">
              <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t.quickSelect}</div>
              <div className="flex flex-wrap gap-2 pb-3">
                {t.quickChips.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => send(`${c.emoji} ${c.label}`)}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm transition hover:border-accent hover:bg-surface-2 active:scale-95"
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="px-2 pt-6 text-center text-sm text-muted">{t.aiPlaceholder}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink'
                  }`}
                >
                  {m.content}
                </span>
                {m.dishes && m.dishes.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.dishes.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 rounded-xl border border-line bg-bg p-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-lg">
                          {d.image ? <img src={assetUrl(d.image, apiBase)} alt="" className="h-full w-full rounded-lg object-cover" /> : '🛒'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-ink">{tl(d.name)}</div>
                          <div className="text-[11px] text-accent">{formatPrice(d.price)}</div>
                        </div>
                        <button
                          onClick={() => quickAdd(d)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${addedId === d.id ? 'bg-emerald-600 text-white' : 'bg-accent text-accent-ink'}`}
                        >
                          {addedId === d.id ? '✓' : `+ ${t.add}`}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-left"><span className="inline-block rounded-2xl bg-surface-2 px-3 py-2 text-sm text-muted">●●●</span></div>}
          </div>

          <div className="flex gap-2 border-t border-line p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t.aiPlaceholder}
              className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
            />
            <button onClick={() => send()} disabled={loading} className="rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50">
              {t.send}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

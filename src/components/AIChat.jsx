import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { assetUrl, dishSizes } from '../api.js';

export default function AIChat() {
  const { language, tl, formatPrice, unitLabel, t, apiUrl, apiBase, activeRestaurant } = useApp();
  const { add, count } = useCart();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedId, setAddedId] = useState(null);
  const [addedAllIdx, setAddedAllIdx] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const scrollRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Voice input: record a short clip, send it to Groq Whisper (/ai/transcribe),
  // then auto-send the transcript so the assistant parses it into a cart the
  // customer can add with one tap.
  const startRecording = async () => {
    if (recording || transcribing || loading) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (!blob.size) return;
        setTranscribing(true);
        try {
          const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
          const fd = new FormData();
          fd.append('audio', blob, `voice.${ext}`);
          fd.append('language', language);
          const res = await fetch(`${apiUrl}/ai/transcribe`, { method: 'POST', body: fd });
          const data = await res.json();
          const text = (data.text || '').trim();
          if (text) send(text); // speak → auto-send → cart preview
        } catch { /* ignore — typing still works */ } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false); // mic denied/unsupported — silently fall back to typing
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  };

  const toggleRecording = () => (recording ? stopRecording() : startRecording());

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
      setMessages((p) => [...p, { role: 'assistant', content: data.reply, cart: data.cart || [] }]);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: '⚠️', cart: [] }]);
    } finally {
      setLoading(false);
    }
  };

  if (!apiUrl || activeRestaurant?.aiEnabled === false) return null;

  // A resolved variety carries its own price; otherwise the base price applies.
  const linePrice = (c) => Number(c.variant?.price ?? c.price);

  // Add every product the assistant parsed from the order, with its quantity.
  const addAll = (cart, idx) => {
    // The assistant may have resolved a named variety ("kəklikotulu") → use it;
    // otherwise fall back to the first variant, as tapping "+ Add" would.
    cart.forEach((c) => add(c, c.qty, c.variant || dishSizes(c)[0] || null));
    setAddedAllIdx(idx);
    setTimeout(() => setAddedAllIdx(null), 2000);
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
                {m.cart && m.cart.length > 0 && (
                  <div className="mt-2 rounded-xl border border-line bg-bg p-2">
                    <div className="space-y-1.5">
                      {m.cart.map((c) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-base">
                            {(c.variant?.image || c.image) ? <img src={assetUrl(c.variant?.image || c.image, apiBase)} alt="" className="h-full w-full object-cover" /> : '🛒'}
                          </div>
                          <div className="min-w-0 flex-1 text-xs leading-tight">
                            <span className="font-semibold text-ink">{tl(c.name)}</span>
                            {c.variant ? <span className="ml-1 rounded bg-surface-2 px-1 py-0.5 text-[10px] font-semibold text-muted">{tl(c.variant.label)}</span> : null}
                            <span className="text-muted"> × {c.qty} {unitLabel(c.unit)}</span>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-accent">{formatPrice(linePrice(c) * c.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addAll(m.cart, i)}
                      className={`mt-2 w-full rounded-lg py-2 text-xs font-bold transition ${
                        addedAllIdx === i ? 'bg-emerald-600 text-white' : 'bg-accent text-accent-ink active:scale-[0.98]'
                      }`}
                    >
                      {addedAllIdx === i
                        ? `✓ ${t.added}`
                        : `🧺 ${t.addAll} · ${formatPrice(m.cart.reduce((s, c) => s + linePrice(c) * c.qty, 0))}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-left"><span className="inline-block rounded-2xl bg-surface-2 px-3 py-2 text-sm text-muted">●●●</span></div>}
          </div>

          <div className="flex gap-1.5 border-t border-line p-2">
            {/* min-w-0 is required: a flex child with text content otherwise
                refuses to shrink below its content's intrinsic width (here the
                placeholder), pushing the mic/send buttons out of the panel —
                which has overflow-hidden, so they were rendering clipped. */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={transcribing ? t.transcribing : recording ? t.listening : t.aiPlaceholder}
              disabled={recording || transcribing}
              className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent disabled:opacity-70"
            />
            <button
              onClick={toggleRecording}
              disabled={loading || transcribing}
              aria-label={t.voice}
              title={t.voice}
              className={`grid w-9 shrink-0 place-items-center rounded-xl text-lg transition disabled:opacity-50 ${
                recording ? 'animate-pulse bg-red-600 text-white' : 'bg-surface-2 text-ink hover:bg-surface'
              }`}
            >
              {transcribing ? '…' : recording ? '⏹' : '🎤'}
            </button>
            <button onClick={() => send()} disabled={loading || recording} className="shrink-0 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-50">
              {t.send}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

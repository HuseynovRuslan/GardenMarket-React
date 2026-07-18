import { useEffect, useState, useCallback, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import { useApp, tl } from '../context/AppContext.jsx';
import { LANGUAGES } from '../i18n.js';
import Pagination from '../components/Pagination.jsx';
import { API_URL, assetUrl, wsUrl, UNITS } from '../api.js';
import { AdminLangProvider, useAdminLang, ADMIN_LANG_CODES } from '../adminStrings.jsx';
import { CategoryIcon, ICON_OPTIONS } from '../categoryIcons.jsx';

const LANG_CODES = LANGUAGES.map((l) => l.code);

// ---------- small helpers ----------
function parseML(value) {
  try {
    const o = JSON.parse(value);
    return typeof o === 'object' && o ? o : { en: value || '' };
  } catch {
    return { en: value || '' };
  }
}

// SQLite CURRENT_TIMESTAMP is UTC "YYYY-MM-DD HH:MM:SS" with no zone. `new Date()`
// would read it as LOCAL time and show it hours off. Mark it UTC, then format to
// the viewer's local time.
function orderTime(s) {
  if (!s) return '';
  const iso = /[TZ]/.test(s) ? s : s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return isNaN(d) ? s : d.toLocaleString();
}

function MultiLang({ label, value, onChange, textarea }) {
  const { lang: adminLang } = useAdminLang();
  const [lang, setLang] = useState(adminLang);
  const Field = textarea ? 'textarea' : 'input';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
        <div className="flex gap-1">
          {LANG_CODES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setLang(c)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${lang === c ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <Field
        value={value[lang] || ''}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        rows={textarea ? 2 : undefined}
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input {...props} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
    </label>
  );
}

// ---------- main ----------
export default function AdminPage() {
  return (
    <AdminLangProvider>
      <AdminPanel />
    </AdminLangProvider>
  );
}

function AdminPanel() {
  const { theme, toggleTheme } = useApp();
  const { lang: adminLang, setLang: setAdminLang, t } = useAdminLang();
  const [pw, setPw] = useState(() => sessionStorage.getItem('admin_pw') || '');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loginInput, setLoginInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState('dishes');
  const [error, setError] = useState('');

  const headers = useCallback((json) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-admin-password': pw,
  }), [pw]);

  const validate = useCallback(async (candidate) => {
    const res = await fetch(`${API_URL}/admin/dishes?limit=1`, { headers: { 'x-admin-password': candidate } });
    return res.ok;
  }, []);

  // silent re-validate on load
  useEffect(() => {
    (async () => {
      if (pw && (await validate(pw))) setAuthed(true);
      setChecking(false);
    })();
  }, [pw, validate]);

  const login = async (e) => {
    e.preventDefault();
    setError('');
    if (await validate(loginInput)) {
      sessionStorage.setItem('admin_pw', loginInput);
      setPw(loginInput);
      setAuthed(true);
    } else {
      setError(t.wrongPassword);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('admin_pw');
    setPw(''); setAuthed(false); setLoginInput('');
  };

  if (checking) return null;

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg px-4">
        <form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6">
          <div className="text-center">
            <div className="text-4xl">🛒</div>
            <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t.panel}</h1>
            <p className="text-sm text-muted">GardenMarket</p>
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder={t.password}
              autoFocus
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 pr-10 text-sm text-ink outline-none focus:border-accent"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-ink">{t.signIn}</button>
        </form>
      </div>
    );
  }

  const tabs = [
    ['dishes', t.tabDishes],
    ['categories', t.tabCategories],
    ['promotions', t.tabPromotions],
    ['orders', t.tabOrders],
    ['settings', t.tabSettings],
    ['qr', t.tabQr],
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="font-display text-lg font-bold text-ink">🛒 {t.admin}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const i = ADMIN_LANG_CODES.indexOf(adminLang);
                setAdminLang(ADMIN_LANG_CODES[(i + 1) % ADMIN_LANG_CODES.length]);
              }}
              className="grid h-9 min-w-9 place-items-center rounded-lg border border-line bg-bg px-2 text-xs font-semibold uppercase text-ink"
              title="Язык / Language / Dil"
            >
              {adminLang.toUpperCase()}
            </button>
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-bg">{theme === 'dark' ? '☀️' : '🌙'}</button>
            {/* Plain <a>, not a router Link — a bare href="/" would go to the domain
                root (menyuqr.com/), not this app's own base under /gardenmarket/. */}
            <a href={import.meta.env.BASE_URL} className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">{t.viewMenu}</a>
            <button onClick={logout} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">{t.logout}</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-bg'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'dishes' && <DishesTab headers={headers} />}
        {tab === 'categories' && <CategoriesTab headers={headers} />}
        {tab === 'promotions' && <PromotionsTab headers={headers} />}
        {tab === 'orders' && <OrdersTab headers={headers} />}
        {tab === 'settings' && <SettingsTab headers={headers} />}
        {tab === 'qr' && <QRTab headers={headers} />}
      </main>
    </div>
  );
}

// ---------- Dishes ----------
function DishesTab({ headers }) {
  const { t, lang } = useAdminLang();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    fetch(`${API_URL}/admin/dishes?page=${page}&limit=20`, { headers: headers() })
      .then((r) => r.json()).then((d) => { setItems(d.items || []); setTotalPages(d.totalPages || 1); });
  }, [page, headers]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch(`${API_URL}/admin/categories`, { headers: headers() }).then((r) => r.json()).then(setCats); }, [headers]);

  const blank = { name: { en: '' }, description: { en: '' }, ingredients: { en: '' }, price: '', category_id: cats[0]?.id || '', unit: 'kg', stock_qty: '', sku: '', calories: '', weight: '', sizes: '[]', is_featured: 0, is_available: 1 };

  const save = async (form, file) => {
    const fd = new FormData();
    fd.append('name', JSON.stringify(form.name));
    fd.append('description', JSON.stringify(form.description));
    fd.append('ingredients', JSON.stringify(form.ingredients));
    ['price', 'category_id', 'unit', 'stock_qty', 'sku', 'calories', 'weight', 'is_featured', 'is_available'].forEach((k) => fd.append(k, form[k] ?? ''));
    // Normalize sizes: drop blank rows and coerce prices to numbers.
    let sizes = [];
    try { sizes = JSON.parse(form.sizes || '[]'); } catch { /* ignore */ }
    sizes = (Array.isArray(sizes) ? sizes : [])
      .map((s) => ({ label: String(s.label || '').trim(), price: Number(s.price) }))
      .filter((s) => s.label && Number.isFinite(s.price));
    fd.append('sizes', JSON.stringify(sizes));
    // new upload wins; otherwise send the current path (empty string = remove existing photo)
    if (file) fd.append('image', file);
    else fd.append('image', form.image ?? '');
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${API_URL}/admin/dishes/${form.id}` : `${API_URL}/admin/dishes`;
    await fetch(url, { method, headers: headers(), body: fd });
    setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm(t.confirmDeleteDrink)) return;
    await fetch(`${API_URL}/admin/dishes/${id}`, { method: 'DELETE', headers: headers() });
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">{t.drinks} ({items.length})</h2>
        <button onClick={() => setEditing(blank)} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">{t.new}</button>
      </div>
      <div className="grid gap-2">
        {items.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-surface-2 text-xl">
              {d.image ? <img src={assetUrl(d.image)} className="h-full w-full rounded-lg object-cover" alt="" /> : <CategoryIcon category={cats.find((c) => c.id === d.category_id)} size={18} boxed={false} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{tl(d.name, lang)}</div>
              <div className="text-xs text-muted">{d.price} AZN {d.is_featured ? '· ★' : ''} {d.is_available ? '' : `· ${t.hidden}`}</div>
            </div>
            <button onClick={() => setEditing({ ...d, name: parseML(d.name), description: parseML(d.description), ingredients: parseML(d.ingredients) })} className="rounded-lg border border-line px-2 py-1 text-xs text-ink">{t.edit}</button>
            <button onClick={() => del(d.id)} className="rounded-lg border border-line px-2 py-1 text-xs text-red-500">{t.del}</button>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editing && <DishForm form={editing} cats={cats} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function DishForm({ form: initial, cats, onCancel, onSave }) {
  const { t, lang } = useAdminLang();
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Pack variants (e.g. rice 1 kq / 5 kq). Stored on the product as a JSON string.
  const [sizes, setSizes] = useState(() => {
    try {
      const arr = JSON.parse(initial.sizes || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });
  const syncSizes = (arr) => {
    setSizes(arr);
    set('sizes', JSON.stringify(arr));
  };
  const updateSize = (i, key, val) => syncSizes(sizes.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));
  const addSize = () => syncSizes([...sizes, { label: '', price: '' }]);
  const removeSize = (i) => syncSizes(sizes.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSave(form, file); }}
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-surface p-5"
      >
        <h3 className="font-display text-lg font-bold text-ink">{form.id ? t.editTitle : t.newTitle} · {t.drink}</h3>
        <MultiLang label={t.name} value={form.name} onChange={(v) => set('name', v)} />
        <MultiLang label={t.description} value={form.description} onChange={(v) => set('description', v)} textarea />
        <MultiLang label={t.ingredients} value={form.ingredients} onChange={(v) => set('ingredients', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.priceAzn} type="number" step="0.25" value={form.price} onChange={(e) => set('price', e.target.value)} required />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t.category}</span>
            <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">
              {cats.map((c) => <option key={c.id} value={c.id}>{tl(c.name, lang)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t.unit}</span>
            <select value={form.unit || 'piece'} onChange={(e) => set('unit', e.target.value)} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">
              {UNITS.map((u) => <option key={u} value={u}>{t.unitNames[u]}</option>)}
            </select>
          </label>
          <Field label={t.stockQty} type="number" step="0.1" value={form.stock_qty ?? ''} onChange={(e) => set('stock_qty', e.target.value)} />
          <Field label={t.sku} value={form.sku || ''} onChange={(e) => set('sku', e.target.value)} />
          <Field label={t.calories} type="number" value={form.calories || ''} onChange={(e) => set('calories', e.target.value)} />
          <Field label={t.weight} type="number" value={form.weight || ''} onChange={(e) => set('weight', e.target.value)} />
        </div>
        <p className="-mt-1 text-[11px] text-muted">{t.stockHint}</p>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">{t.sizesOptional}</label>
            <button type="button" onClick={addSize} className="rounded-lg border border-line px-2 py-1 text-xs text-ink">{t.addSize}</button>
          </div>
          {sizes.length === 0 ? (
            <p className="text-xs text-muted">{t.noSizes}</p>
          ) : (
            <div className="space-y-2">
              {sizes.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s.label}
                    onChange={(e) => updateSize(i, 'label', e.target.value)}
                    placeholder={t.sizeLabelPh}
                    className="w-1/2 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    step="0.25"
                    value={s.price}
                    onChange={(e) => updateSize(i, 'price', e.target.value)}
                    placeholder={t.priceAzn}
                    className="w-1/2 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                  <button type="button" onClick={() => removeSize(i)} className="shrink-0 rounded-lg border border-line px-2 py-2 text-xs text-red-500">✕</button>
                </div>
              ))}
              <p className="text-[11px] text-muted">{t.sizeTip}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-ink">
          {[['is_featured', t.featured], ['is_available', t.available]].map(([k, lbl]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={!!Number(form[k])} onChange={(e) => set(k, e.target.checked ? 1 : 0)} /> {lbl}
            </label>
          ))}
        </div>
        <div className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t.photoOptional}</span>
          {(file || form.image) ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <img src={file ? URL.createObjectURL(file) : assetUrl(form.image)} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                {file && <div className="truncate text-sm font-medium text-ink">{file.name}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-lg border border-line px-2 py-1 text-xs text-ink hover:border-accent">
                    {t.edit}
                    <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => { setFile(null); set('image', ''); }}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-red-500"
                  >
                    {t.removePhoto}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-surface-2 px-4 py-6 text-center transition-colors hover:border-accent">
              <ImageIcon size={28} className="text-muted" />
              <span className="text-sm font-medium text-ink">{t.uploadHint}</span>
              <span className="text-[11px] text-muted">{t.uploadFormats}</span>
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-line py-2 text-sm text-ink">{t.cancel}</button>
          <button className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-accent-ink">{t.save}</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Categories ----------
function CategoriesTab({ headers }) {
  const { t, lang } = useAdminLang();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => fetch(`${API_URL}/admin/categories`, { headers: headers() }).then((r) => r.json()).then(setItems), [headers]);
  useEffect(() => { load(); }, [load]);

  const save = async (form, file) => {
    const fd = new FormData();
    fd.append('name', JSON.stringify(form.name));
    fd.append('icon', form.icon || '🛒');
    fd.append('icon_type', form.icon_type || 'svg');
    fd.append('icon_key', form.icon_key || '');
    fd.append('sort_order', Number(form.sort_order) || 0);
    fd.append('is_active', form.is_active ?? 1);
    // new upload wins; otherwise send the current path (empty string = removed)
    if (form.icon_type === 'image') {
      if (file) fd.append('iconFile', file);
      else fd.append('icon_url', form.icon_url ?? '');
    } else {
      fd.append('icon_url', ''); // switching back to a built-in clears any old upload
    }
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${API_URL}/admin/categories/${form.id}` : `${API_URL}/admin/categories`;
    await fetch(url, { method, headers: headers(), body: fd });
    setEditing(null); load();
  };
  const del = async (id) => { if (confirm(t.confirmDeleteCategory)) { await fetch(`${API_URL}/admin/categories/${id}`, { method: 'DELETE', headers: headers() }); load(); } };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">{t.categories}</h2>
        <button onClick={() => setEditing({ name: { en: '' }, icon: '🛒', icon_type: 'svg', icon_key: 'vegetables', icon_url: '', sort_order: items.length + 1, is_active: 1 })} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">{t.new}</button>
      </div>
      <div className="grid gap-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <CategoryIcon category={c} size={20} />
            <div className="flex-1 text-sm font-semibold text-ink">{tl(c.name, lang)}</div>
            <span className="text-xs text-muted">#{c.sort_order}</span>
            <button onClick={() => setEditing({ ...c, name: parseML(c.name) })} className="rounded-lg border border-line px-2 py-1 text-xs text-ink">{t.edit}</button>
            <button onClick={() => del(c.id)} className="rounded-lg border border-line px-2 py-1 text-xs text-red-500">{t.del}</button>
          </div>
        ))}
      </div>
      {editing && <CategoryForm form={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function CategoryForm({ form: initial, onCancel, onSave }) {
  const { t } = useAdminLang();
  const [form, setForm] = useState({ icon_type: 'svg', icon_key: 'vegetables', icon_url: '', ...initial });
  const [file, setFile] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const customPreview = file ? URL.createObjectURL(file) : (form.icon_url ? assetUrl(form.icon_url) : null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave(form, file); }} className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-surface p-5">
        <h3 className="font-display text-lg font-bold text-ink">{form.id ? t.editTitle : t.newTitle} · {t.categoryWord}</h3>
        <MultiLang label={t.name} value={form.name} onChange={(v) => set('name', v)} />

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t.icon}</label>
          <div className="mb-2 inline-flex rounded-lg border border-line p-0.5 text-xs">
            {[['svg', t.iconBuiltIn], ['image', t.iconCustom]].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => set('icon_type', val)}
                className={`rounded-md px-3 py-1 font-semibold ${form.icon_type === val ? 'bg-accent text-accent-ink' : 'text-muted'}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {form.icon_type === 'image' ? (
            <div className="flex items-center gap-3">
              {customPreview && (
                <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-surface-2">
                  <img src={customPreview} alt="" className="h-7 w-7 object-contain" />
                </span>
              )}
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="text-sm text-ink" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => set('icon_key', opt.key)}
                  title={opt.label}
                  className={`grid place-items-center rounded-lg border p-1.5 ${form.icon_key === opt.key ? 'border-accent ring-1 ring-accent' : 'border-line'}`}
                >
                  <CategoryIcon category={{ icon_type: 'svg', icon_key: opt.key }} size={18} />
                </button>
              ))}
            </div>
          )}
        </div>

        <Field label={t.sortOrder} type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-line py-2 text-sm text-ink">{t.cancel}</button>
          <button className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-accent-ink">{t.save}</button>
        </div>
      </form>
    </div>
  );
}

// ---------- Promotions ----------
function PromotionsTab({ headers }) {
  const { t, lang } = useAdminLang();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => fetch(`${API_URL}/admin/promotions`, { headers: headers() }).then((r) => r.json()).then(setItems), [headers]);
  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    const fd = new FormData();
    fd.append('title', JSON.stringify(form.title));
    fd.append('description', JSON.stringify(form.description));
    fd.append('discount_percent', form.discount_percent || 0);
    fd.append('is_active', form.is_active ?? 1);
    fd.append('sort_order', form.sort_order ?? 0);
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${API_URL}/admin/promotions/${form.id}` : `${API_URL}/admin/promotions`;
    await fetch(url, { method, headers: headers(), body: fd });
    setEditing(null); load();
  };
  const del = async (id) => { if (confirm(t.confirmDeletePromotion)) { await fetch(`${API_URL}/admin/promotions/${id}`, { method: 'DELETE', headers: headers() }); load(); } };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">{t.promotions}</h2>
        <button onClick={() => setEditing({ title: { en: '' }, description: { en: '' }, discount_percent: 10, is_active: 1, sort_order: items.length + 1 })} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">{t.new}</button>
      </div>
      <div className="grid gap-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="flex-1 text-sm font-semibold text-ink">{tl(p.title, lang)}</div>
            <span className="text-xs text-accent">−{p.discount_percent}%</span>
            <button onClick={() => setEditing({ ...p, title: parseML(p.title), description: parseML(p.description) })} className="rounded-lg border border-line px-2 py-1 text-xs text-ink">{t.edit}</button>
            <button onClick={() => del(p.id)} className="rounded-lg border border-line px-2 py-1 text-xs text-red-500">{t.del}</button>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(editing); }} className="w-full max-w-md space-y-3 rounded-2xl bg-surface p-5">
            <h3 className="font-display text-lg font-bold text-ink">{editing.id ? t.editTitle : t.newTitle} · {t.promotionWord}</h3>
            <MultiLang label={t.title} value={editing.title} onChange={(v) => setEditing((f) => ({ ...f, title: v }))} />
            <MultiLang label={t.description} value={editing.description} onChange={(v) => setEditing((f) => ({ ...f, description: v }))} textarea />
            <Field label={t.discount} type="number" value={editing.discount_percent} onChange={(e) => setEditing((f) => ({ ...f, discount_percent: e.target.value }))} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-line py-2 text-sm text-ink">{t.cancel}</button>
              <button className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-accent-ink">{t.save}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------- Orders ----------
// Filter buttons / workflow statuses (no separate "ready" step: new → picking → done).
// "picking" = staff are gathering the items off the shelves. Legacy "ready"
// orders still display via STATUS_BADGE / statusLabels.
const ORDER_STATUSES = ['new', 'picking', 'done', 'cancelled'];
const ORDER_DATES = ['today', 'yesterday', 'month', 'all'];
const STATUS_BADGE = {
  new: 'border-accent text-accent',
  picking: 'border-blue-500/40 text-blue-600',
  ready: 'border-indigo-500/40 text-indigo-600',
  done: 'border-green-500/40 text-green-600',
  cancelled: 'border-red-500/40 text-red-600',
};

// Short beep via the Web Audio API — no asset file needed.
function playOrderChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.start(t0);
      osc.stop(t0 + dur);
    };
    beep(880, 0, 0.18);
    beep(1175, 0.16, 0.22);
    setTimeout(() => ctx.close(), 600);
  } catch { /* ignore */ }
}

function OrdersTab({ headers }) {
  const { t, lang } = useAdminLang();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatusFilter] = useState('all'); // 'all' | one of ORDER_STATUSES
  const [date, setDate] = useState('today');          // one of ORDER_DATES
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [cancelId, setCancelId] = useState(null); // order pending cancel confirmation
  const [selected, setSelected] = useState(new Set()); // order ids checked on the current page
  const toastTimer = useRef(null);
  const statusLabels = { new: t.statusNew, picking: t.statusPicking, ready: t.statusReady, done: t.statusDone, cancelled: t.statusCancelled };

  const query = useCallback((p) => {
    const params = new URLSearchParams({ page: p, limit: '20' });
    if (status !== 'all') params.set('status', status);
    if (date !== 'all') params.set('date', date);
    return params.toString();
  }, [status, date]);

  const loadStats = useCallback(() => {
    const d = date === 'all' ? 'today' : date;
    fetch(`${API_URL}/admin/orders/stats?date=${d}`, { headers: headers() })
      .then((r) => r.json()).then(setStats).catch(() => { /* ignore */ });
  }, [date, headers]);

  const load = useCallback((p = page) => {
    fetch(`${API_URL}/admin/orders?${query(p)}`, { headers: headers() })
      .then((r) => r.json()).then((d) => { setItems(d.items || []); setTotalPages(d.totalPages || 1); setSelected(new Set()); });
    loadStats();
  }, [page, headers, query, loadStats]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => { setPage(1); }, [status, date]);
  useEffect(() => { load(page); }, [page, load]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  // live updates: chime + popup on every new order, then refresh the list
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(wsUrl('/ws'));
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type !== 'new_order') return;
          playOrderChime();
          const mode = msg.order?.fulfillment_type === 'delivery' ? t.delivery : t.pickup;
          showToast(`${t.newOrderToast} — ${mode}`);
          setPage(1);
          load(1);
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
    return () => ws?.close();
  }, [load, showToast, t]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const setStatus = async (id, value) => {
    await fetch(`${API_URL}/admin/orders/${id}/status`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ status: value }) });
    load(page);
  };

  // Selection-based delete: check one or more orders, then delete them all in a
  // single request. Replaces per-card delete buttons so removing many orders
  // doesn't mean confirming a dialog once per order.
  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = items.length > 0 && items.every((o) => selected.has(o.id));
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(items.map((o) => o.id)));
  const deleteSelected = async () => {
    if (!selected.size || !confirm(`${t.confirmDeleteOrders} (${selected.size})`)) return;
    await fetch(`${API_URL}/admin/orders`, { method: 'DELETE', headers: headers(true), body: JSON.stringify({ ids: [...selected] }) });
    load(page);
  };

  // Fetch the CSV with the admin header, then trigger a client-side download.
  // `lang` matches the admin's current language so headers/labels aren't
  // hardcoded to one language regardless of the switcher.
  const exportCsv = async (report) => {
    const res = await fetch(`${API_URL}/admin/orders/export?report=${report}&date=${date}&lang=${lang}`, { headers: headers() });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report === 'products' ? 'satilanlar' : 'sifarisler'}-${date}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const chip = (active) => `rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? 'bg-accent text-accent-ink' : 'border border-line bg-bg text-ink'}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-ink">{t.orders}</h2>
        <div className="flex gap-2">
          <button onClick={() => exportCsv('orders')} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent">⬇ {t.exportOrders}</button>
          <button onClick={() => exportCsv('products')} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent">⬇ {t.exportSold}</button>
        </div>
      </div>

      {/* stats — Orders / Revenue (delivered only) / New / Delivered */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="text-lg font-bold text-ink">{stats.count}</div>
            <div className="text-[11px] text-muted">{t.statOrders}</div>
          </div>
          <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-3 text-center">
            <div className="text-lg font-bold text-green-600">{stats.revenue} {stats.currency}</div>
            <div className="text-[11px] text-muted">{t.statRevenue}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="text-lg font-bold text-accent">{stats.newCount}</div>
            <div className="text-[11px] text-muted">{t.statNew}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="text-lg font-bold text-green-600">{stats.deliveredCount}</div>
            <div className="text-[11px] text-muted">{t.statDelivered}</div>
          </div>
        </div>
      )}

      {/* status filter */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button onClick={() => setStatusFilter('all')} className={chip(status === 'all')}>{t.filterAll}</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={chip(status === s)}>{statusLabels[s]}</button>
        ))}
      </div>

      {/* date filter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ORDER_DATES.map((d) => (
          <button key={d} onClick={() => setDate(d)} className={chip(date === d)}>
            {{ today: t.dateToday, yesterday: t.dateYesterday, month: t.dateMonth, all: t.dateAll }[d]}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            {t.selectAll}
          </label>
          {selected.size > 0 && (
            <button onClick={deleteSelected} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700">
              🗑 {t.deleteSelected} ({selected.size})
            </button>
          )}
        </div>
      )}

      <div className="grid gap-2">
        {items.length === 0 && <p className="text-muted">{t.noOrders}</p>}
        {items.map((o) => {
          let list = [];
          try { list = JSON.parse(o.items); } catch { /* ignore */ }
          const cardClass =
            o.status === 'cancelled' ? 'border-red-500/30 bg-red-500/5 opacity-75'
            : o.status === 'done' ? 'border-green-500/40 bg-green-500/5'
            : o.status === 'new' ? 'border-accent ring-1 ring-accent bg-surface'
            : 'border-line bg-surface';
          const active = o.status === 'new' || o.status === 'picking' || o.status === 'ready';
          const isDelivery = o.fulfillment_type === 'delivery';
          return (
            <div key={o.id} className={`rounded-xl border p-3 ${cardClass}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    className="mt-1 shrink-0"
                    aria-label={t.selectOrder}
                  />
                  <div>
                    <div className="text-sm font-semibold text-ink">{t.orderNo} #{o.id} · {o.total} {o.currency}</div>
                    <div className="mt-0.5 text-xs font-medium text-muted">
                      {isDelivery ? `🚚 ${t.delivery}` : `🏪 ${t.pickup}`}
                      {isDelivery && o.delivery_address ? ` · ${o.delivery_address}` : ''}
                      {o.customer_phone ? ` · ${o.customer_phone}` : ''}
                    </div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[o.status] || 'border-line text-muted'}`}>
                  {statusLabels[o.status] || o.status}
                </span>
              </div>
              <ul className="mt-1 text-xs text-muted">
                {list.map((it, i) => <li key={i}>• {it.name} ×{it.qty}</li>)}
              </ul>
              <div className="mt-1 text-[11px] text-muted">{orderTime(o.created_at)}</div>
              {active && (
                <div className="mt-3 flex gap-2">
                  {o.status === 'new' && (
                    <>
                      <button onClick={() => setStatus(o.id, 'picking')} className="flex-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-ink transition-transform active:scale-[0.98]">
                        ✓ {t.btnAccept}
                      </button>
                      <button onClick={() => setCancelId(o.id)} className="flex-1 rounded-lg border border-red-500/40 px-3 py-2.5 text-sm font-semibold text-red-600 transition-transform active:scale-[0.98]">
                        ✕ {t.btnCancel}
                      </button>
                    </>
                  )}
                  {(o.status === 'picking' || o.status === 'ready') && (
                    <button onClick={() => setStatus(o.id, 'done')} className="flex-1 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]">
                      ✓ {t.btnDeliver}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* cancel confirmation */}
      {cancelId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setCancelId(null)}>
          <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold text-ink">{t.cancelConfirm}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setStatus(cancelId, 'cancelled'); setCancelId(null); }}
                className="w-full rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {t.cancelYes}
              </button>
              <button
                onClick={() => setCancelId(null)}
                className="w-full rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition-transform active:scale-[0.98]"
              >
                {t.cancelNo}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* new-order popup */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-accent bg-surface px-4 py-3 shadow-lg">
            <span className="text-lg">🔔</span>
            <span className="text-sm font-semibold text-ink">{toast}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-muted hover:text-ink">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Settings ----------
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function SettingsTab({ headers }) {
  const { t } = useAdminLang();
  const { apiBase } = useApp();
  const [s, setS] = useState(null);
  const [hours, setHours] = useState({});
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/settings`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        delete d.admin_password; // don't prefill the password
        let parsed = {};
        try { parsed = JSON.parse(d.opening_hours || '{}'); } catch { /* ignore */ }
        setHours(parsed && typeof parsed === 'object' ? parsed : {});
        setS(d);
      });
  }, [headers]);
  if (!s) return <p className="text-muted">{t.loading}</p>;

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setDay = (day, v) => setHours((p) => ({ ...p, [day]: v }));
  const name = parseML(s.restaurant_name);

  // Logo upload goes through a dedicated multipart endpoint (persists to
  // Cloudinary/local + the logo_image setting immediately) — the plain settings
  // PUT is JSON-only. `set` also mirrors the new URL into local state.
  const uploadLogo = async (file) => {
    if (!file) return;
    setLogoBusy(true);
    const fd = new FormData();
    fd.append('key', 'logo_image');
    fd.append('image', file);
    try {
      const res = await fetch(`${API_URL}/admin/settings-image`, { method: 'POST', headers: headers(), body: fd });
      const d = await res.json();
      if (d.value) set('logo_image', d.value);
    } catch { /* ignore */ } finally { setLogoBusy(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    // Keep only non-empty days so a blank field hides that day on the menu.
    const cleanHours = {};
    for (const day of WEEKDAYS) {
      const v = (hours[day] || '').trim();
      if (v) cleanHours[day] = v;
    }
    const body = { ...s, restaurant_name: JSON.stringify(name), opening_hours: JSON.stringify(cleanHours) };
    await fetch(`${API_URL}/settings`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <h2 className="font-display text-xl font-bold text-ink">{t.settings}</h2>
      <MultiLang label={t.cafeName} value={name} onChange={(v) => set('restaurant_name', JSON.stringify(v))} />

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t.logo}</span>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface">
            {s.logo_image ? <img src={assetUrl(s.logo_image, apiBase)} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl">🛒</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:border-accent ${logoBusy ? 'opacity-60' : ''}`}>
              {logoBusy ? t.loading : t.uploadLogo}
              <input type="file" accept="image/*" disabled={logoBusy} onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} className="hidden" />
            </label>
            {s.logo_image ? <button type="button" onClick={() => set('logo_image', '')} className="rounded-lg border border-line px-3 py-1.5 text-xs text-red-500">{t.removePhoto}</button> : null}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted">{t.logoHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.phone} value={s.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        <Field label={t.instagram} value={s.instagram || ''} onChange={(e) => set('instagram', e.target.value)} />
        <Field label={t.deliveryFeeAzn} type="number" step="0.5" value={s.delivery_fee ?? ''} onChange={(e) => set('delivery_fee', e.target.value)} />
        <Field label={t.freeDeliveryOverAzn} type="number" step="1" value={s.free_delivery_over ?? ''} onChange={(e) => set('free_delivery_over', e.target.value)} />
        <Field label={t.address} value={s.address || ''} onChange={(e) => set('address', e.target.value)} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t.accentColor}</span>
          <input type="color" value={s.accent_color || '#4C9A2A'} onChange={(e) => set('accent_color', e.target.value)} className="h-10 w-full rounded-lg border border-line bg-bg" />
        </label>
        <Field label={t.menuUrl} value={s.menu_url || ''} onChange={(e) => set('menu_url', e.target.value)} />
        <Field label={t.newAdminPassword} type="password" placeholder={t.leaveBlank} value={s.admin_password || ''} onChange={(e) => set('admin_password', e.target.value)} />
      </div>

      <div>
        <Field label={t.whatsapp} value={s.whatsapp_number || ''} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder="+994..." />
        <p className="mt-1 text-[11px] text-muted">{t.whatsappHint}</p>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t.workingHours}</div>
        <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-ink">{t[day]}</span>
              <input
                value={hours[day] || ''}
                onChange={(e) => setDay(day, e.target.value)}
                placeholder="08:00–22:00"
                className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted">{t.hoursHint}</p>
      </div>

      <button className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink">{saved ? t.saved : t.saveSettings}</button>
    </form>
  );
}

// ---------- QR ----------
// One storefront QR — no per-table code, unlike the café this was forked from.
function QRTab({ headers }) {
  const { t } = useAdminLang();
  const [qr, setQr] = useState(null);
  const [url, setUrl] = useState('');

  const gen = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/settings/qrcode`, { method: 'POST', headers: headers(true), body: JSON.stringify({}) });
    const d = await res.json();
    setQr(d.qr); setUrl(d.url);
  };

  return (
    <div className="max-w-md space-y-4">
      <h2 className="font-display text-xl font-bold text-ink">{t.qrCode}</h2>
      <p className="text-sm text-muted">{t.qrHint}</p>
      <form onSubmit={gen}>
        <button className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink">{t.generate}</button>
      </form>
      {qr && (
        <div className="rounded-2xl border border-line bg-surface p-5 text-center">
          <img src={qr} alt="QR" className="mx-auto w-56" />
          <p className="mt-2 break-all text-xs text-muted">{url}</p>
          <a href={qr} download="gardenmarket-qr.png" className="mt-3 inline-block rounded-lg border border-line px-3 py-2 text-sm text-ink">{t.download}</a>
        </div>
      )}
    </div>
  );
}

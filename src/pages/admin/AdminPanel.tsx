import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, LogOut, Loader2, Save, RefreshCw, X, Search } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TOKEN_KEY = 'doko_admin_token';

interface AdminMember {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
}

interface AdminSubscription {
  plan?: string;
  status?: string;
  document_limit?: number;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface AdminCompany {
  id: string;
  name: string;
  cif: string;
  city: string;
  province: string;
  phone: string;
  created_at: string;
  free_doc_limit: number;
  free_plan_anchor: string | null;
  company_role: string;
  subscription: AdminSubscription | null;
  members: AdminMember[];
}

async function adminCall(action: string, body: Record<string, unknown> = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (token) headers['X-Admin-Token'] = token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export function AdminPanel() {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });

  const handleLogout = () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(null);
  };

  if (!token) {
    return <AdminLogin onLogin={(t) => {
      try { localStorage.setItem(TOKEN_KEY, t); } catch {}
      setToken(t);
    }} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { ok, data } = await adminCall('login', { email, password });
    setLoading(false);
    if (!ok || !data?.token) {
      setError(data?.error || 'Error de autenticacion');
      return;
    }
    onLogin(data.token);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">DOKO Admin</h1>
            <p className="text-xs text-slate-400">Panel interno restringido</p>
          </div>
        </div>

        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
          required
          autoComplete="username"
        />
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contrasena</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          Entrar
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await adminCall('list_companies', {}, token);
    setLoading(false);
    if (!ok) {
      if (data?.error === 'Unauthorized') {
        onLogout();
        return;
      }
      setError(data?.error || 'Error');
      return;
    }
    setCompanies(data.companies || []);
  }, [token, onLogout]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = companies.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.cif?.toLowerCase().includes(q) ||
      c.members.some((m) => m.email?.toLowerCase().includes(q) || m.full_name?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-none">DOKO Admin Panel</p>
            <p className="text-xs text-slate-400 mt-0.5">Gestion interna de clientes</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm">
          <LogOut size={16} /> Salir
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por empresa, CIF o email..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={refresh} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 px-4 py-3 rounded-xl text-sm font-semibold">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_100px_140px] gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Empresa</span>
            <span>CIF</span>
            <span>Plan</span>
            <span>Limite Gratis</span>
            <span>Usuarios</span>
            <span>Creada</span>
          </div>
          {loading && filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">Sin resultados</div>
          ) : (
            filtered.map((c) => {
              const plan = c.subscription?.status === 'active' || c.subscription?.status === 'trialing'
                ? (c.subscription.plan || 'Activo')
                : 'Gratuito';
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="w-full text-left grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px_100px_140px] gap-3 px-5 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors items-center"
                >
                  <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                  <span className="text-sm text-slate-600">{c.cif}</span>
                  <span className={`text-xs font-bold uppercase ${plan === 'Gratuito' ? 'text-slate-500' : 'text-emerald-600'}`}>{plan}</span>
                  <span className="text-sm text-slate-700">{c.free_doc_limit}</span>
                  <span className="text-sm text-slate-600">{c.members.length}</span>
                  <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </button>
              );
            })
          )}
        </div>
      </main>

      {selected && (
        <CompanyDrawer
          company={selected}
          token={token}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); refresh(); }}
        />
      )}
    </div>
  );
}

function CompanyDrawer({ company, token, onClose, onSaved }: {
  company: AdminCompany;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [cif, setCif] = useState(company.cif);
  const [city, setCity] = useState(company.city ?? '');
  const [province, setProvince] = useState(company.province ?? '');
  const [phone, setPhone] = useState(company.phone ?? '');
  const [freeDocLimit, setFreeDocLimit] = useState(company.free_doc_limit);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    const { ok, data } = await adminCall('update_company', {
      id: company.id,
      name, cif, city, province, phone,
      free_doc_limit: Number(freeDocLimit) || 0,
    }, token);
    setSaving(false);
    if (!ok) {
      setErr(data?.error || 'Error');
      return;
    }
    onSaved();
  };

  const resetWindow = async () => {
    if (!confirm('Reiniciar el ciclo de 30 dias del Plan Gratuito ahora?')) return;
    setResetting(true);
    setErr(null);
    const { ok, data } = await adminCall('reset_free_window', { id: company.id }, token);
    setResetting(false);
    if (!ok) {
      setErr(data?.error || 'Error');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cliente</p>
            <h2 className="text-lg font-extrabold text-slate-900">{company.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Section title="Datos de la empresa">
            <Field label="Nombre" value={name} onChange={setName} />
            <Field label="CIF" value={cif} onChange={setCif} />
            <Field label="Ciudad" value={city} onChange={setCity} />
            <Field label="Provincia" value={province} onChange={setProvince} />
            <Field label="Telefono" value={phone} onChange={setPhone} />
          </Section>

          <Section title="Plan Gratuito">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Limite de documentos por ciclo (30 dias)</label>
              <input
                type="number"
                value={freeDocLimit}
                onChange={(e) => setFreeDocLimit(parseInt(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                min={0}
              />
              <p className="text-xs text-slate-400 mt-1">
                Anchor actual: {company.free_plan_anchor ? new Date(company.free_plan_anchor).toLocaleString() : '—'}
              </p>
            </div>
            <button
              onClick={resetWindow}
              disabled={resetting}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {resetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Reiniciar ciclo de 30 dias ahora
            </button>
          </Section>

          <Section title="Suscripcion">
            {company.subscription ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1">
                <div><span className="text-slate-500">Plan:</span> <span className="font-semibold">{company.subscription.plan}</span></div>
                <div><span className="text-slate-500">Estado:</span> <span className="font-semibold">{company.subscription.status}</span></div>
                <div><span className="text-slate-500">Limite mensual:</span> <span className="font-semibold">{company.subscription.document_limit ?? '—'}</span></div>
                <div><span className="text-slate-500">Vencimiento:</span> <span className="font-semibold">{company.subscription.current_period_end ? new Date(company.subscription.current_period_end).toLocaleDateString() : '—'}</span></div>
                {company.subscription.cancel_at_period_end && <div className="text-red-600 font-semibold">Cancelacion programada</div>}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin suscripcion activa.</p>
            )}
          </Section>

          <Section title={`Usuarios (${company.members.length})`}>
            <div className="space-y-2">
              {company.members.map((m) => (
                <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-800">{m.full_name || 'Sin nombre'}</p>
                  <p className="text-slate-500 text-xs">{m.email} &middot; {m.role}</p>
                </div>
              ))}
            </div>
          </Section>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{err}</div>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

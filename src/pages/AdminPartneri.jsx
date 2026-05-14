import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isOwner } from '@/lib/permissions';
import { motion } from 'framer-motion';
import { Handshake, Ticket, Webhook, Plus, ToggleLeft, ToggleRight, Send, RefreshCw, Copy, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const TABS = [
  { key: 'partneri', label: 'Partneri', icon: Handshake },
  { key: 'voucheri', label: 'Voucheri', icon: Ticket },
  { key: 'webhook', label: 'Webhook test', icon: Webhook },
];

const STATUS_COLORS = {
  issued:    'bg-primary/15 text-primary',
  redeemed:  'bg-green-500/15 text-green-400',
  expired:   'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
};

const TYPE_LABELS = { cash: 'Gotovina', product: 'Proizvod', discount: 'Popust' };

// ── Partner Form ──────────────────────────────────────────────────────────────
function PartnerForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', contact_email: '', webhook_url: '', webhook_secret: '', logo_url: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.contact_email) return toast.error('Ime i email su obavezni');
    setSaving(true);
    await base44.entities.Partner.create({ ...form, is_active: true });
    toast.success('Partner dodan!');
    onSave();
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 mb-4">
      <h3 className="font-black text-sm">Novi partner</h3>
      {[
        { key: 'name', placeholder: 'Ime partnera (npr. Hervis Sport)', label: 'Ime *' },
        { key: 'contact_email', placeholder: 'kontakt@partner.hr', label: 'Kontakt email *' },
        { key: 'webhook_url', placeholder: 'https://partner.hr/webhook', label: 'Webhook URL' },
        { key: 'webhook_secret', placeholder: 'tajni_ključ', label: 'Webhook Secret' },
        { key: 'logo_url', placeholder: 'https://...logo.png', label: 'Logo URL' },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
            placeholder={f.placeholder}
            value={form[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-60">
          {saving ? 'Spremam...' : 'Dodaj partnera'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Odustani</button>
      </div>
    </div>
  );
}

// ── Issue Voucher Modal ───────────────────────────────────────────────────────
function IssueVoucherModal({ partners, onClose, onIssued }) {
  const [form, setForm] = useState({
    partner_id: '', user_email: '', voucher_type: 'cash', voucher_value: '',
    voucher_description: '', contest_id: '', expires_in_days: 90,
  });
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    if (!form.partner_id || !form.user_email || !form.voucher_value) return toast.error('Popuni sva obavezna polja');
    setIssuing(true);
    const res = await base44.functions.invoke('partnerVoucherIssuance', {
      ...form,
      voucher_value: parseFloat(form.voucher_value),
      expires_in_days: parseInt(form.expires_in_days),
    });
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`✓ Voucher izdan: ${res.data.voucher_code}`);
      onIssued();
      onClose();
    }
    setIssuing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-card border border-border/50 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black">Izdaj voucher</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Partner *</label>
            <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none"
              value={form.partner_id} onChange={e => setForm(p => ({ ...p, partner_id: e.target.value }))}>
              <option value="">Odaberi partnera</option>
              {partners.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {[
            { key: 'user_email', label: 'Email korisnika *', placeholder: 'user@example.com' },
            { key: 'voucher_description', label: 'Opis', placeholder: 'npr. €50 voucher za Hervis Sport' },
            { key: 'contest_id', label: 'Contest ID (opcionalno)', placeholder: '' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
              <input className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none"
                placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tip</label>
              <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none"
                value={form.voucher_type} onChange={e => setForm(p => ({ ...p, voucher_type: e.target.value }))}>
                <option value="cash">Gotovina</option>
                <option value="product">Proizvod</option>
                <option value="discount">Popust</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vrijednost (€) *</label>
              <input type="number" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none"
                placeholder="50" value={form.voucher_value}
                onChange={e => setForm(p => ({ ...p, voucher_value: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vrijedi dana</label>
            <input type="number" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none"
              value={form.expires_in_days} onChange={e => setForm(p => ({ ...p, expires_in_days: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleIssue} disabled={issuing}
          className="mt-5 w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 disabled:opacity-60">
          {issuing ? 'Izdajem...' : '🎁 Izdaj voucher'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminPartneri() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('partneri');
  const [partners, setPartners] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');

  // Webhook test state
  const [testPartnerId, setTestPartnerId] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (isOwner(me)) await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    const [p, v] = await Promise.all([
      base44.entities.Partner.list('-created_date', 100),
      base44.entities.PartnerVoucher.list('-created_date', 200),
    ]);
    setPartners(p);
    setVouchers(v);
  };

  const toggleActive = async (partner) => {
    await base44.entities.Partner.update(partner.id, { is_active: !partner.is_active });
    toast.success(partner.is_active ? 'Partner deaktiviran' : 'Partner aktiviran');
    await loadData();
  };

  const updateVoucherStatus = async (id, status) => {
    const update = { status };
    if (status === 'redeemed') update.redeemed_date = new Date().toISOString();
    await base44.entities.PartnerVoucher.update(id, update);
    toast.success('Status ažuriran');
    await loadData();
  };

  const runWebhookTest = async () => {
    if (!testPartnerId) return toast.error('Odaberi partnera');
    const partner = partners.find(p => p.id === testPartnerId);
    if (!partner?.webhook_url) return toast.error('Partner nema webhook URL');
    setTestLoading(true);
    setTestResponse(null);
    try {
      const testBody = {
        voucher_code: 'SF-TEST-XXXXXXXX',
        value: 0,
        voucher_type: 'cash',
        description: 'TEST webhook — ScopeFantasy',
        expires_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        user_email: 'test@scopefantasy.com',
        issued_date: new Date().toISOString(),
        is_test: true,
      };
      const res = await fetch(partner.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBody),
      });
      const text = await res.text();
      setTestResponse({ status: res.status, ok: res.ok, body: text });
    } catch (e) {
      setTestResponse({ status: 0, ok: false, body: e.message });
    }
    setTestLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!isOwner(user)) return <div className="text-center py-20 text-muted-foreground">Nemaš pristup.</div>;

  const filteredVouchers = vouchers.filter(v => {
    if (voucherFilter !== 'all' && v.status !== voucherFilter) return false;
    if (partnerFilter !== 'all' && v.partner_id !== partnerFilter) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Handshake className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Admin: Partneri</h1>
          <p className="text-sm text-muted-foreground">Infrastruktura za partner voucher integracije</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── PARTNERI TAB ── */}
      {tab === 'partneri' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{partners.length} partner(a)</p>
            <button onClick={() => setShowPartnerForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">
              <Plus className="w-4 h-4" /> Dodaj partnera
            </button>
          </div>

          {showPartnerForm && <PartnerForm onSave={() => { setShowPartnerForm(false); loadData(); }} onCancel={() => setShowPartnerForm(false)} />}

          {partners.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Handshake className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Još nema partnera</p>
              <p className="text-sm mt-1">Dodaj prvog partnera kad bude spreman za suradnju.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-4">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.name} className="w-12 h-12 rounded-xl object-contain bg-secondary p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-lg">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-black text-sm">{p.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {p.is_active ? 'Aktivan' : 'Neaktivan'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.contact_email}</p>
                      {p.webhook_url && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{p.webhook_url}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">{p.total_vouchers_issued || 0} vouchera</p>
                      <p className="text-xs text-muted-foreground">€{(p.total_value_issued || 0).toLocaleString()} ukupno</p>
                    </div>
                    <button onClick={() => toggleActive(p)} className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
                      {p.is_active ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VOUCHERI TAB ── */}
      {tab === 'voucheri' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-2">
              {['all', 'issued', 'redeemed', 'expired', 'cancelled'].map(s => (
                <button key={s} onClick={() => setVoucherFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${voucherFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {s === 'all' ? 'Svi' : s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-1.5 rounded-xl bg-secondary border border-border/50 text-xs focus:outline-none"
                value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)}>
                <option value="all">Svi partneri</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">
                <Plus className="w-4 h-4" /> Izdaj voucher
              </button>
            </div>
          </div>

          {filteredVouchers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Nema vouchera</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVouchers.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="rounded-xl border border-border/40 bg-card p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-black text-sm text-primary">{v.voucher_code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[v.status] || 'bg-muted text-muted-foreground'}`}>
                          {v.status}
                        </span>
                        {v.partner_webhook_sent && <span className="text-[10px] text-green-400 font-bold">✓ Webhook</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{v.issued_to_email} · {v.partner_name} · {TYPE_LABELS[v.voucher_type]}: {v.voucher_type === 'cash' ? `€${v.voucher_value}` : v.voucher_value}</p>
                      <p className="text-xs text-muted-foreground/60">{v.voucher_description}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>Izdan: {moment(v.issued_date || v.created_date).format('DD.MM.YY')}</p>
                      {v.expires_date && <p>Istječe: {moment(v.expires_date).format('DD.MM.YY')}</p>}
                    </div>
                    {v.status === 'issued' && (
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => updateVoucherStatus(v.id, 'redeemed')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all">
                          Iskorišten
                        </button>
                        <button onClick={() => updateVoucherStatus(v.id, 'cancelled')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all">
                          Otkaži
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WEBHOOK TEST TAB ── */}
      {tab === 'webhook' && (
        <div className="max-w-lg">
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div>
              <h3 className="font-black mb-1">Webhook Test</h3>
              <p className="text-xs text-muted-foreground">Pošalji testni POST request na partner webhook URL s lažnim voucher podacima.</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Odaberi partnera</label>
              <select className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none"
                value={testPartnerId} onChange={e => setTestPartnerId(e.target.value)}>
                <option value="">Odaberi...</option>
                {partners.filter(p => p.webhook_url).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.webhook_url}</option>
                ))}
              </select>
              {partners.filter(p => p.webhook_url).length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Nema partnera s webhook URL-om. Dodaj ga na kartici Partneri.</p>
              )}
            </div>
            <button onClick={runWebhookTest} disabled={testLoading || !testPartnerId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
              {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {testLoading ? 'Šaljem...' : 'Pošalji test webhook'}
            </button>
            {testResponse && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-4 border text-sm ${testResponse.ok ? 'bg-green-500/8 border-green-500/30' : 'bg-destructive/8 border-destructive/30'}`}>
                <div className="flex items-center gap-2 mb-2 font-bold">
                  {testResponse.ok
                    ? <><CheckCircle2 className="w-4 h-4 text-green-400" /> <span className="text-green-400">HTTP {testResponse.status} — Uspjeh!</span></>
                    : <><X className="w-4 h-4 text-destructive" /> <span className="text-destructive">HTTP {testResponse.status} — Greška</span></>
                  }
                </div>
                {testResponse.body && (
                  <pre className="text-xs text-muted-foreground bg-black/30 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">{testResponse.body}</pre>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {showIssueModal && (
        <IssueVoucherModal partners={partners} onClose={() => setShowIssueModal(false)} onIssued={loadData} />
      )}
    </div>
  );
}
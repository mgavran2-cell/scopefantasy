import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Trophy, ChevronDown, ChevronUp, Star } from 'lucide-react';
import moment from 'moment';
import SponsorFields from '../components/admin/SponsorFields';

const SPORTS = ['Nogomet', 'Košarka', 'Tenis', 'Formula 1', 'Hokej', 'MMA'];
const STATUSES = ['upcoming', 'active', 'finished'];
const STATUS_LABELS = { upcoming: 'Uskoro', active: 'Aktivno', finished: 'Završeno' };
const ALL_TAGS = ['Derbi', 'Ekskluzivno', 'Besplatno', 'Novi', 'Popularno', 'Ograničeno', 'VIP'];
const TAG_STYLE = {
  'Derbi':       'bg-red-500/15 text-red-400 border-red-500/30',
  'Ekskluzivno': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Besplatno':   'bg-green-500/15 text-green-400 border-green-500/30',
  'Novi':        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Popularno':   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Ograničeno':  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'VIP':         'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
};

const emptyForm = {
  title: '', sport: 'Košarka', description: '', entry_cost: 100, prize_pool: 10000,
  status: 'upcoming', picks_required: 5, start_time: '', end_time: '',
  tags: [],
  is_sponsored: false, sponsor_name: '', sponsor_logo_url: '', sponsor_message: '',
  sponsor_color: '', sponsor_url: '', sponsor_prize_description: '',
  players: [],
};

const emptyPlayer = { name: '', team: '', position: '', stat_type: 'Poeni', over_under: 20 };

export default function AdminContests() {
  const [user, setUser] = useState(null);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [me, data] = await Promise.all([base44.auth.me(), base44.entities.Contest.list('-created_date', 100)]);
    setUser(me);
    setContests(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (contest) => {
    setEditing(contest.id);
    setForm({
      ...emptyForm,
      ...contest,
      is_sponsored: !!contest.is_sponsored,
      players: contest.players || [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.sport) return;
    setSaving(true);
    const payload = {
      ...form,
      entry_cost: Number(form.entry_cost),
      prize_pool: Number(form.prize_pool),
      picks_required: Number(form.picks_required),
      players: form.players.filter(p => p.name),
      // Clear sponsor fields if not sponsored
      ...(form.is_sponsored ? {} : {
        sponsor_name: '', sponsor_logo_url: '', sponsor_message: '',
        sponsor_color: '', sponsor_url: '', sponsor_prize_description: '',
      }),
    };
    if (editing) {
      await base44.entities.Contest.update(editing, payload);
    } else {
      await base44.entities.Contest.create(payload);
    }
    await init();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Obriši ovo natjecanje?')) return;
    await base44.entities.Contest.delete(id);
    setContests(prev => prev.filter(c => c.id !== id));
  };

  const handleNotifyWinner = async (contest) => {
    if (!contest.is_sponsored || !contest.sponsor_name) return;
    // Find all won picks for this contest
    const picks = await base44.entities.Pick.filter({ contest_id: contest.id, status: 'won' });
    if (picks.length === 0) {
      alert('Nema pobjednika za ovo natjecanje (ni jedan listić s statusom "won").');
      return;
    }
    for (const pick of picks) {
      await base44.entities.Notification.create({
        user_email: pick.user_email,
        type: 'reward',
        title: `🎁 Osvojio si sponzor nagradu od ${contest.sponsor_name}!`,
        body: `Javi se na marko.gavran@outlook.com za preuzimanje nagrade: ${contest.sponsor_prize_description || 'Kontaktiraj nas za detalje.'}`,
      });
    }
    alert(`Obavijesti poslane ${picks.length} pobjedniku/pobjednicima!`);
  };

  const addPlayer = () => setForm(f => ({ ...f, players: [...f.players, { ...emptyPlayer }] }));
  const updatePlayer = (i, key, val) => setForm(f => ({
    ...f,
    players: f.players.map((p, idx) => idx === i ? { ...p, [key]: val } : p),
  }));
  const removePlayer = (i) => setForm(f => ({ ...f, players: f.players.filter((_, idx) => idx !== i) }));

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (user?.role !== 'admin') return (
    <div className="text-center py-20 text-muted-foreground">Nemaš pristup ovoj stranici.</div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-black uppercase">Admin: Natjecanja</h1>
          <p className="text-muted-foreground text-sm mt-1">{contests.length} natjecanja ukupno</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo natjecanje
        </button>
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-border/50 bg-card p-6 mb-6"
          >
            <h2 className="font-bold text-lg mb-5">{editing ? 'Uredi natjecanje' : 'Novo natjecanje'}</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Naslov *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" placeholder="npr. NBA Finals Pick'em" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Sport *</label>
                <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50">
                  {SPORTS.map(s => <option key={s} value={s}>{s}{s === 'Hokej' ? ' (Uskoro)' : ''}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Opis</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Cijena ulaza (tokeni)</label>
                <input type="number" value={form.entry_cost} onChange={e => setForm(f => ({ ...f, entry_cost: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nagradni fond (tokeni)</label>
                <input type="number" value={form.prize_pool} onChange={e => setForm(f => ({ ...f, prize_pool: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Broj potrebnih odabira</label>
                <input type="number" value={form.picks_required} onChange={e => setForm(f => ({ ...f, picks_required: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Početak</label>
                <input type="datetime-local" value={form.start_time ? moment(form.start_time).format('YYYY-MM-DDTHH:mm') : ''} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Kraj</label>
                <input type="datetime-local" value={form.end_time ? moment(form.end_time).format('YYYY-MM-DDTHH:mm') : ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              </div>
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Tagovi</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => {
                  const active = (form.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        tags: active ? f.tags.filter(t => t !== tag) : [...(f.tags || []), tag],
                      }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? TAG_STYLE[tag] : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sponsored toggle */}
            <label className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 cursor-pointer mb-2 hover:bg-yellow-500/8 transition-all">
              <div
                onClick={() => setForm(f => ({ ...f, is_sponsored: !f.is_sponsored }))}
                className={`w-11 h-6 rounded-full transition-all relative ${form.is_sponsored ? 'bg-yellow-500' : 'bg-secondary border border-border'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.is_sponsored ? 'left-5' : 'left-0.5'}`} />
              </div>
              <div>
                <p className="font-bold text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> Sponzorirano natjecanje
                </p>
                <p className="text-xs text-muted-foreground">Natjecanje u partnerstvu s brendom ili trgovinom</p>
              </div>
            </label>

            <AnimatePresence>
              {form.is_sponsored && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <SponsorFields data={form} onChange={setForm} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Players */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">Igrači ({form.players.length})</p>
                <button onClick={addPlayer} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Dodaj igrača
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {form.players.map((player, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-2 items-center">
                    <input value={player.name} onChange={e => updatePlayer(i, 'name', e.target.value)} placeholder="Ime igrača" className="px-2.5 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs focus:outline-none" />
                    <input value={player.team} onChange={e => updatePlayer(i, 'team', e.target.value)} placeholder="Momčad" className="px-2.5 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs focus:outline-none" />
                    <input value={player.stat_type} onChange={e => updatePlayer(i, 'stat_type', e.target.value)} placeholder="Statistika" className="px-2.5 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs focus:outline-none" />
                    <input type="number" value={player.over_under} onChange={e => updatePlayer(i, 'over_under', parseFloat(e.target.value))} placeholder="Linija" className="w-16 px-2.5 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs focus:outline-none" />
                    <input value={player.position} onChange={e => updatePlayer(i, 'position', e.target.value)} placeholder="Poz." className="w-14 px-2.5 py-1.5 rounded-lg bg-secondary border border-border/50 text-xs focus:outline-none" />
                    <button onClick={() => removePlayer(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {form.players.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nema igrača. Dodaj klikom gore.</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving || !form.title}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? 'Sprema...' : editing ? 'Spremi izmjene' : 'Kreiraj natjecanje'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground font-semibold text-sm hover:text-foreground transition-all">
                Odustani
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contest list */}
      <div className="space-y-3">
        {contests.map((contest, i) => {
          const isExpanded = expandedId === contest.id;
          const sc = { upcoming: 'bg-accent/15 text-accent', active: 'bg-primary/15 text-primary', finished: 'bg-muted text-muted-foreground' };
          return (
            <motion.div key={contest.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`rounded-2xl border bg-card overflow-hidden ${contest.is_sponsored ? 'border-yellow-500/30' : 'border-border/50'}`}>
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate">{contest.title}</p>
                    {contest.is_sponsored && (
                      <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
                        <Star className="w-3 h-3" /> Sponzorirano
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc[contest.status]}`}>
                      {STATUS_LABELS[contest.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {contest.sport} · {contest.players?.length || 0} igrača · {contest.entry_cost} tokena ulaz
                    {contest.is_sponsored && contest.sponsor_name && ` · ${contest.sponsor_name}`}
                  </p>
                  {contest.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {contest.tags.map(tag => (
                        <span key={tag} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${TAG_STYLE[tag] || ''}`}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(contest)} className="p-2 rounded-xl hover:bg-secondary transition-all">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(contest.id)} className="p-2 rounded-xl hover:bg-destructive/10 transition-all">
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : contest.id)} className="p-2 rounded-xl hover:bg-secondary transition-all">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-2">
                      {contest.description && <p className="text-xs text-muted-foreground">{contest.description}</p>}
                      {contest.is_sponsored && (
                        <div className="p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-xs space-y-2">
                          <p className="font-bold text-yellow-400">Sponzor: {contest.sponsor_name}</p>
                          {contest.sponsor_message && <p className="text-muted-foreground">{contest.sponsor_message}</p>}
                          {contest.sponsor_prize_description && <p className="text-muted-foreground">Nagrada: {contest.sponsor_prize_description}</p>}
                          <button
                            onClick={() => handleNotifyWinner(contest)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 font-bold hover:bg-yellow-500/30 transition-all mt-1"
                          >
                            🎁 Pošalji obavijest pobjednicima
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {(contest.players || []).map((p, j) => (
                          <span key={j} className="text-xs px-2 py-1 rounded-lg bg-secondary font-medium">
                            {p.name} · {p.over_under} {p.stat_type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {contests.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">Nema natjecanja. Kreiraj prvo klikom na "Novo natjecanje".</p>
          </div>
        )}
      </div>
    </div>
  );
}
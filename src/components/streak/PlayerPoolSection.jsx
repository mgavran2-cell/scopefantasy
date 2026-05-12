import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const SPORTS = ['Nogomet', 'Košarka', 'Tenis', 'Formula 1', 'MMA'];
const STATS_BY_SPORT = {
  Nogomet: ['Golovi', 'Asistencije', 'Dodavanja', 'Udarci', 'Dueli'],
  Košarka: ['Bodovi', 'Skokovi', 'Asistencije', 'Blokade', 'Ukradene lopte'],
  Tenis: ['Asovi', 'Dvostruke greške', 'Winneri', 'Gemovi', 'Setovi'],
  'Formula 1': ['Pozicija na startu', 'Pozicija na cilju', 'Krugovi u vodstvu', 'Odustajanja'],
  MMA: ['Udarci', 'Obaranja', 'Pokušaji predaje', 'Runde'],
};

const emptyForm = { sport: 'Košarka', player_name: '', team: '', stat_type: 'Bodovi', typical_line: '', priority: 5 };

export default function PlayerPoolSection() {
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterSport, setFilterSport] = useState('all');

  useEffect(() => { loadPool(); }, []);

  const loadPool = async () => {
    const data = await base44.entities.DailyStreakPlayerPool.list('-created_date', 200);
    setPool(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.player_name || !form.stat_type || !form.typical_line) return;
    setSaving(true);
    await base44.entities.DailyStreakPlayerPool.create({
      sport: form.sport,
      player_name: form.player_name,
      team: form.team || undefined,
      stat_type: form.stat_type,
      typical_line: parseFloat(form.typical_line),
      priority: parseInt(form.priority),
      is_active: true,
    });
    await loadPool();
    setForm(emptyForm);
    setSaving(false);
  };

  const toggleActive = async (item) => {
    await base44.entities.DailyStreakPlayerPool.update(item.id, { is_active: !item.is_active });
    setPool(prev => prev.map(p => p.id === item.id ? { ...p, is_active: !p.is_active } : p));
  };

  const handleDelete = async (id) => {
    await base44.entities.DailyStreakPlayerPool.delete(id);
    setPool(prev => prev.filter(p => p.id !== id));
  };

  const availableStats = STATS_BY_SPORT[form.sport] || [];
  const filtered = filterSport === 'all' ? pool : pool.filter(p => p.sport === filterSport);
  const activeCt = pool.filter(p => p.is_active).length;

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Dodaj igrača u pool
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <select
            value={form.sport}
            onChange={e => setForm(p => ({ ...p, sport: e.target.value, stat_type: STATS_BY_SPORT[e.target.value]?.[0] || '' }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm"
          >
            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            placeholder="Igrač (npr. LeBron James)"
            value={form.player_name}
            onChange={e => setForm(p => ({ ...p, player_name: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Tim (opcionalno)"
            value={form.team}
            onChange={e => setForm(p => ({ ...p, team: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={form.stat_type}
            onChange={e => setForm(p => ({ ...p, stat_type: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm"
          >
            {availableStats.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            placeholder="Tipična linija (npr. 25.5)"
            type="number"
            step="0.5"
            value={form.typical_line}
            onChange={e => setForm(p => ({ ...p, typical_line: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Prioritet: {form.priority}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !form.player_name || !form.typical_line}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? 'Dodajem...' : 'Dodaj u pool'}
        </button>
      </div>

      {/* Pool list */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="font-bold">
            Player Pool
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {activeCt} aktivnih / {pool.length} ukupno
            </span>
          </h3>
          <select
            value={filterSport}
            onChange={e => setFilterSport(e.target.value)}
            className="bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="all">Svi sportovi</option>
            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Nema igrača u poolu</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {item.player_name}
                    {item.team && <span className="text-muted-foreground font-normal"> · {item.team}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.sport} · {item.stat_type} {item.typical_line} · P{item.priority}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(item)}
                  className={`transition-colors ${item.is_active ? 'text-primary' : 'text-muted-foreground'}`}
                  title={item.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                >
                  {item.is_active
                    ? <ToggleRight className="w-6 h-6" />
                    : <ToggleLeft className="w-6 h-6" />
                  }
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  title="Obriši"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
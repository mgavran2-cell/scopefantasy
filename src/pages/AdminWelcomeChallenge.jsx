import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isOwner } from '@/lib/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Star } from 'lucide-react';

const emptyPick = { player_name: '', team: '', stat_type: 'Bodovi', over_under: 20 };

export default function AdminWelcomeChallenge() {
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPicks, setNewPicks] = useState([{ ...emptyPick }, { ...emptyPick }, { ...emptyPick }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [me, allPicks] = await Promise.all([
      base44.auth.me(),
      base44.entities.WelcomeChallengePick.list('-created_date', 100),
    ]);
    setUser(me);

    // Group picks by admin_set_id
    const grouped = {};
    allPicks.forEach(p => {
      if (!grouped[p.admin_set_id]) grouped[p.admin_set_id] = [];
      grouped[p.admin_set_id].push(p);
    });
    setSets(Object.values(grouped).sort((a, b) => new Date(b[0].created_date) - new Date(a[0].created_date)));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (newPicks.some(p => !p.player_name || !p.stat_type)) return;
    setSaving(true);
    const setId = `set_${Date.now()}`;
    await Promise.all(newPicks.map(p =>
      base44.entities.WelcomeChallengePick.create({
        ...p,
        admin_set_id: setId,
        over_under: Number(p.over_under),
        correct_choice: '',
        is_active: false,
      })
    ));
    await init();
    setNewPicks([{ ...emptyPick }, { ...emptyPick }, { ...emptyPick }]);
    setSaving(false);
  };

  const handleActivate = async (setId) => {
    // Deactivate all, then activate this set
    const allPicks = sets.flat();
    await Promise.all(allPicks.map(p =>
      base44.entities.WelcomeChallengePick.update(p.id, { is_active: p.admin_set_id === setId })
    ));
    await init();
  };

  const handleSetCorrect = async (pickId, choice) => {
    await base44.entities.WelcomeChallengePick.update(pickId, { correct_choice: choice });

    // After grading, resolve pending entries for this set
    const allPicks = await base44.entities.WelcomeChallengePick.filter({ is_active: true });
    const allGraded = allPicks.every(p => p.correct_choice === 'over' || p.correct_choice === 'under');
    if (allGraded && allPicks.length === 3) {
      // Get all pending entries for this set
      const entries = await base44.entities.WelcomeChallengeEntry.filter({
        admin_set_id: allPicks[0].admin_set_id,
        status: 'pending',
      });
      for (const entry of entries) {
        const allCorrect = entry.selections.every(sel => {
          const pick = allPicks.find(p => p.id === sel.pick_id);
          return pick && pick.correct_choice === sel.choice;
        });
        const newStatus = allCorrect ? 'won' : 'lost';
        await base44.entities.WelcomeChallengeEntry.update(entry.id, { status: newStatus });
        // Token payout is handled by claimWelcomeChallengeReward called on user side
        // For immediate admin resolution, use adminResolveWelcomeChallenge function
      }
    }

    await init();
  };

  const handleDelete = async (setId) => {
    if (!confirm('Obriši ovaj set?')) return;
    const picksToDelete = sets.find(s => s[0]?.admin_set_id === setId) || [];
    await Promise.all(picksToDelete.map(p => base44.entities.WelcomeChallengePick.delete(p.id)));
    await init();
  };

  const updateNewPick = (i, key, val) => setNewPicks(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!isOwner(user)) return <div className="text-center py-20 text-muted-foreground">Nemaš pristup ovoj stranici.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-black uppercase">Admin: Welcome Challenge</h1>
        <p className="text-muted-foreground text-sm mt-1">Kreiraj setove od 3 picka, aktiviraj ih i unesi rezultate</p>
      </div>

      {/* Create new set */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 mb-6">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Novi set (3 picka)</h2>
        <div className="space-y-2 mb-4">
          {newPicks.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_80px] gap-2 items-center">
              <input value={p.player_name} onChange={e => updateNewPick(i, 'player_name', e.target.value)}
                placeholder={`Igrač ${i + 1}`}
                className="px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              <input value={p.team} onChange={e => updateNewPick(i, 'team', e.target.value)}
                placeholder="Momčad"
                className="px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              <input value={p.stat_type} onChange={e => updateNewPick(i, 'stat_type', e.target.value)}
                placeholder="Statistika"
                className="px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
              <input type="number" value={p.over_under} onChange={e => updateNewPick(i, 'over_under', e.target.value)}
                placeholder="Linija"
                className="px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
            </div>
          ))}
        </div>
        <button onClick={handleCreate} disabled={saving || newPicks.some(p => !p.player_name)}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
          {saving ? 'Kreira se...' : 'Kreiraj set'}
        </button>
      </div>

      {/* Existing sets */}
      <div className="space-y-4">
        {sets.map((pickSet) => {
          const setId = pickSet[0]?.admin_set_id;
          const isActive = pickSet.some(p => p.is_active);
          return (
            <motion.div key={setId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-2xl border bg-card p-5 ${isActive ? 'border-primary/40' : 'border-border/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isActive && <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary"><Star className="w-3 h-3" /> Aktivan</span>}
                  <span className="text-xs text-muted-foreground">{setId}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button onClick={() => handleActivate(setId)}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                      Aktiviraj
                    </button>
                  )}
                  <button onClick={() => handleDelete(setId)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {pickSet.map(pick => (
                  <div key={pick.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                    <div>
                      <span className="font-bold text-sm">{pick.player_name}</span>
                      {pick.team && <span className="text-xs text-muted-foreground ml-2">{pick.team}</span>}
                      <span className="text-xs text-muted-foreground ml-2">{pick.over_under} {pick.stat_type}</span>
                    </div>
                    <div className="flex gap-2">
                      {['over', 'under'].map(choice => {
                        const isSet = pick.correct_choice === choice;
                        return (
                          <button key={choice} onClick={() => handleSetCorrect(pick.id, choice)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              isSet ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}>
                            {choice === 'over' ? '▲ Više' : '▼ Manje'}
                            {isSet && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
        {sets.length === 0 && <p className="text-center text-muted-foreground py-8">Nema setova. Kreiraj prvi gore!</p>}
      </div>
    </div>
  );
}
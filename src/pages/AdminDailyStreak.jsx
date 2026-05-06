import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, XCircle, ChevronDown, Users, Calendar } from 'lucide-react';
import moment from 'moment';
import { getWeekStart, getDayLabel } from '@/lib/streakUtils';

const DAY_OPTIONS = [1,2,3,4,5,6,7];

export default function AdminDailyStreak() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart());
  const [form, setForm] = useState({ day_number: 1, pick_player: '', pick_stat: '', pick_line: '' });
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [filterDay, setFilterDay] = useState('all');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);
    await loadEntries();
    setLoading(false);
  };

  const loadEntries = async () => {
    const data = await base44.entities.DailyStreakEntry.list('-created_date', 200);
    setEntries(data);
  };

  // Get unique user emails from entries for this week
  const weekEntries = entries.filter(e => e.week_start_date === selectedWeek);
  const uniqueUsers = [...new Set(weekEntries.map(e => e.user_email))];

  // Admin adds a pick for ALL existing users (or creates template entry)
  const handleAddPick = async () => {
    if (!form.pick_player || !form.pick_stat || !form.pick_line) return;
    setSaving(true);

    // Get all users (we'll create entries for users who already have streak entries this week,
    // plus create a "template" entry that new users can use)
    const existingUserEmails = [...new Set(entries.map(e => e.user_email))];

    // For each known user, create or update entry for this day
    for (const email of existingUserEmails) {
      const existing = entries.find(e =>
        e.user_email === email &&
        e.week_start_date === selectedWeek &&
        e.day_number === parseInt(form.day_number)
      );
      const payload = {
        user_email: email,
        week_start_date: selectedWeek,
        day_number: parseInt(form.day_number),
        pick_player: form.pick_player,
        pick_stat: form.pick_stat,
        pick_line: parseFloat(form.pick_line),
        result: 'pending',
      };
      if (existing) {
        await base44.entities.DailyStreakEntry.update(existing.id, payload);
      } else {
        await base44.entities.DailyStreakEntry.create(payload);
      }
    }

    // Also create a "seed" entry for the admin user so it's visible
    const adminEmail = user?.email;
    const adminExisting = entries.find(e =>
      e.user_email === adminEmail &&
      e.week_start_date === selectedWeek &&
      e.day_number === parseInt(form.day_number)
    );
    const adminPayload = {
      user_email: adminEmail,
      week_start_date: selectedWeek,
      day_number: parseInt(form.day_number),
      pick_player: form.pick_player,
      pick_stat: form.pick_stat,
      pick_line: parseFloat(form.pick_line),
      result: 'pending',
    };
    if (adminExisting) {
      await base44.entities.DailyStreakEntry.update(adminExisting.id, adminPayload);
    } else {
      await base44.entities.DailyStreakEntry.create(adminPayload);
    }

    await loadEntries();
    setForm(prev => ({ ...prev, pick_player: '', pick_stat: '', pick_line: '' }));
    setSaving(false);
  };

  const handleSetResult = async (entryId, result) => {
    await base44.entities.DailyStreakEntry.update(entryId, { result });
    await loadEntries();

    // After setting result, check if we need to update DailyStreakWeek
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    // Find or create week record for this user
    const weekRecords = await base44.entities.DailyStreakWeek.filter({
      user_email: entry.user_email,
      week_start_date: entry.week_start_date,
    });

    const userWeekEntries = entries.filter(e =>
      e.user_email === entry.user_email &&
      e.week_start_date === entry.week_start_date
    );
    const correctCount = userWeekEntries.filter(e => e.id === entryId ? result === 'won' : e.result === 'won').length;

    if (weekRecords[0]) {
      await base44.entities.DailyStreakWeek.update(weekRecords[0].id, { correct_picks: correctCount });
    }
  };

  const handleCompleteWeek = async (userEmail) => {
    const userWeekEntries = weekEntries.filter(e => e.user_email === userEmail);
    const correctCount = userWeekEntries.filter(e => e.result === 'won').length;
    const rewardMap = { 4: 500, 5: 1500, 6: 5000, 7: 15000 };
    const reward = rewardMap[correctCount] || 0;

    const weekRecords = await base44.entities.DailyStreakWeek.filter({
      user_email: userEmail,
      week_start_date: selectedWeek,
    });

    if (weekRecords[0]) {
      await base44.entities.DailyStreakWeek.update(weekRecords[0].id, {
        correct_picks: correctCount,
        reward_amount: reward,
        status: 'completed',
      });
    } else {
      await base44.entities.DailyStreakWeek.create({
        user_email: userEmail,
        week_start_date: selectedWeek,
        correct_picks: correctCount,
        reward_amount: reward,
        status: 'completed',
        reward_claimed: false,
      });
    }
  };

  const filteredEntries = entries.filter(e => {
    if (e.week_start_date !== selectedWeek) return false;
    if (filterDay !== 'all' && e.day_number !== parseInt(filterDay)) return false;
    return true;
  });

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (user?.role !== 'admin') return (
    <div className="text-center py-20 text-muted-foreground">Nemaš pristup ovoj stranici.</div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-black uppercase mb-6">Admin: Daily Streak</h1>

      {/* Week selector */}
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <input
          type="date"
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
          className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm"
        />
        <span className="text-xs text-muted-foreground">
          Tjedan {moment(selectedWeek).format('DD.MM')} – {moment(selectedWeek).add(6,'days').format('DD.MM.YYYY')}
        </span>
      </div>

      {/* Add pick form */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Dodaj Pick Dana
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <select
            value={form.day_number}
            onChange={e => setForm(p => ({ ...p, day_number: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm col-span-1"
          >
            {DAY_OPTIONS.map(d => (
              <option key={d} value={d}>{getDayLabel(d)} (Dan {d})</option>
            ))}
          </select>
          <input
            placeholder="Igrač (npr. LeBron James)"
            value={form.pick_player}
            onChange={e => setForm(p => ({ ...p, pick_player: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm col-span-1"
          />
          <input
            placeholder="Statistika (npr. Bodovi)"
            value={form.pick_stat}
            onChange={e => setForm(p => ({ ...p, pick_stat: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm col-span-1"
          />
          <input
            placeholder="Linija (npr. 25.5)"
            type="number"
            value={form.pick_line}
            onChange={e => setForm(p => ({ ...p, pick_line: e.target.value }))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm col-span-1"
          />
        </div>
        <button
          onClick={handleAddPick}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60"
        >
          {saving ? 'Spremate...' : 'Dodaj za sve korisnike'}
        </button>
      </div>

      {/* Entries table */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-6">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h2 className="font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Odabiri ovog tjedna ({filteredEntries.length})
          </h2>
          <select
            value={filterDay}
            onChange={e => setFilterDay(e.target.value)}
            className="bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="all">Svi dani</option>
            {DAY_OPTIONS.map(d => (
              <option key={d} value={d}>{getDayLabel(d)}</option>
            ))}
          </select>
        </div>
        {filteredEntries.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Nema unosa za ovaj tjedan</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-3">
                <span className="text-xs font-bold text-muted-foreground w-8">{getDayLabel(entry.day_number)}</span>
                <div>
                  <p className="text-sm font-bold">{entry.pick_player} — {entry.pick_stat} {entry.pick_line}</p>
                  <p className="text-xs text-muted-foreground">{entry.user_email}</p>
                  {entry.pick_choice && (
                    <span className={`text-xs font-bold ${entry.pick_choice === 'vise' ? 'text-primary' : 'text-accent'}`}>
                      Odabrano: {entry.pick_choice === 'vise' ? 'Više ↑' : 'Manje ↓'}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  entry.result === 'won' ? 'bg-green-500/15 text-green-400' :
                  entry.result === 'lost' ? 'bg-destructive/15 text-destructive' :
                  'bg-yellow-500/15 text-yellow-400'
                }`}>
                  {entry.result === 'won' ? 'Točno' : entry.result === 'lost' ? 'Krivo' : 'Čeka'}
                </span>
                <button
                  onClick={() => handleSetResult(entry.id, 'won')}
                  className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors"
                  title="Označi kao točno"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </button>
                <button
                  onClick={() => handleSetResult(entry.id, 'lost')}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                  title="Označi kao krivo"
                >
                  <XCircle className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete week per user */}
      {uniqueUsers.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h2 className="font-bold mb-3">Završi tjedan (isplati nagrade)</h2>
          <div className="space-y-2">
            {uniqueUsers.map(email => {
              const userWEntries = weekEntries.filter(e => e.user_email === email);
              const correct = userWEntries.filter(e => e.result === 'won').length;
              const rewardMap = { 4: 500, 5: 1500, 6: 5000, 7: 15000 };
              const reward = rewardMap[correct] || 0;
              return (
                <div key={email} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{email}</p>
                    <p className="text-xs text-muted-foreground">{correct}/7 točnih · {reward > 0 ? `+${reward.toLocaleString()} tokena` : 'bez nagrade'}</p>
                  </div>
                  <button
                    onClick={() => handleCompleteWeek(email)}
                    className="px-3 py-1.5 rounded-xl bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-all"
                  >
                    Završi tjedan
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TodayPickCard({ entry, userEmail, onChosen }) {
  const [loading, setLoading] = useState(false);

  if (!entry) return null;

  const handleChoose = async (choice) => {
    if (loading || entry.pick_choice) return;
    setLoading(true);
    await base44.entities.DailyStreakEntry.update(entry.id, {
      pick_choice: choice,
      completed_date: new Date().toISOString(),
    });
    setLoading(false);
    if (onChosen) onChosen();
  };

  const chosen = entry.pick_choice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-fuchsia-500/5 p-5"
    >
      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Pick dana</p>

      <div className="text-center mb-5">
        <p className="text-2xl font-black text-white">{entry.pick_player}</p>
        <p className="text-sm text-muted-foreground mt-1">{entry.pick_stat}</p>
        <div className="inline-flex items-center gap-2 mt-3 px-5 py-2 rounded-full bg-white/8 border border-white/15">
          <span className="text-3xl font-black text-primary">{entry.pick_line}</span>
          <span className="text-muted-foreground text-sm">{entry.pick_stat}</span>
        </div>
      </div>

      {chosen ? (
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">
            Tvoj odabir: {chosen === 'vise' ? 'Više ↑' : 'Manje ↓'}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleChoose('vise')}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/20 border border-primary/40 text-primary font-black text-sm hover:bg-primary/30 transition-all disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            VIŠE
          </button>
          <button
            onClick={() => handleChoose('manje')}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-accent/20 border border-accent/40 text-accent font-black text-sm hover:bg-accent/30 transition-all disabled:opacity-50"
          >
            <TrendingDown className="w-4 h-4" />
            MANJE
          </button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-3">Besplatno · Ne troši tokene</p>
    </motion.div>
  );
}
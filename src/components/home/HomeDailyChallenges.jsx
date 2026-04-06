import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, Gift, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

export default function HomeDailyChallenges({ user }) {
  const [challenges, setChallenges] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const today = moment().format('YYYY-MM-DD');

  useEffect(() => {
    if (!user?.email) return;
    load();
  }, [user?.email]);

  const load = async () => {
    const [allChallenges, myProgresses] = await Promise.all([
      base44.entities.DailyChallenge.list('-created_date', 20),
      base44.entities.ChallengeProgress.filter({ user_email: user.email, date: today }),
    ]);
    const active = allChallenges.filter(c => !c.active_date || c.active_date === today).slice(0, 3);
    setChallenges(active);
    const pMap = {};
    myProgresses.forEach(p => { pMap[p.challenge_id] = p; });
    setProgressMap(pMap);
    setLoading(false);
  };

  if (loading || challenges.length === 0) return null;

  const completedCount = challenges.filter(c => progressMap[c.id]?.completed).length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <span className="font-black text-sm uppercase tracking-wide">Dnevni Izazovi</span>
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold">{completedCount}/{challenges.length}</span>
          </div>
          <Link to="/natjecanja" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all font-semibold">
            Svi izazovi <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Overall progress */}
        <div className="px-5 pt-4 pb-2">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / challenges.length) * 100}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            />
          </div>
        </div>

        {/* Challenges list */}
        <div className="px-5 pb-4 pt-2 space-y-3">
          {challenges.map((c, i) => {
            const prog = progressMap[c.id];
            const current = prog?.current_count || 0;
            const pct = Math.min((current / c.target_count) * 100, 100);
            const completed = prog?.completed || false;
            const claimed = prog?.reward_claimed || false;

            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{c.icon || '⚡'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold truncate">{c.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{current}/{c.target_count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className={`h-full rounded-full ${completed ? 'bg-primary' : 'bg-accent/60'}`}
                    />
                  </div>
                </div>
                <div className="shrink-0">
                  {claimed ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : completed ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                      <Gift className="w-3 h-3" /> Preuzmi
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-accent">+{c.reward_tokens}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, Gift, RefreshCw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import { notifyUser } from '../hooks/useNotifications';
import moment from 'moment';

const typeLabel = {
  picks_count: 'Napravi pickove',
  correct_picks: 'Točni pickovi',
  sport_picks: 'Pickovi u sportu',
  win_contest: 'Pobijedi u natjecanju',
};

export default function DailyChallengePage({ embedded } = {}) {
  const ctx = useOutletContext() || {};
  const loadBalance = ctx?.loadBalance || (() => {});
  const [challenges, setChallenges] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const today = moment().format('YYYY-MM-DD');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);

    const [allChallenges, myPicks, myProgresses] = await Promise.all([
      base44.entities.DailyChallenge.list('-created_date', 20),
      base44.entities.Pick.list('-created_date', 100),
      base44.entities.ChallengeProgress.filter({ user_email: me.email, date: today }),
    ]);

    // Filter active challenges (today or permanent)
    const active = allChallenges.filter(c => !c.active_date || c.active_date === today);
    setChallenges(active);

    // Build progress map
    const pMap = {};
    myProgresses.forEach(p => { pMap[p.challenge_id] = p; });

    // Auto-calculate progress for each challenge based on today's picks
    const todayPicks = myPicks.filter(p =>
      moment(p.created_date).format('YYYY-MM-DD') === today
    );

    for (const challenge of active) {
      const existing = pMap[challenge.id];
      if (existing?.completed) continue;

      let count = 0;
      if (challenge.type === 'picks_count') {
        count = todayPicks.length;
      } else if (challenge.type === 'sport_picks') {
        // Need contest data to check sport
        count = todayPicks.length; // simplified
      } else if (challenge.type === 'correct_picks') {
        count = todayPicks.reduce((acc, p) => acc + (p.correct_picks || 0), 0);
      } else if (challenge.type === 'win_contest') {
        count = todayPicks.filter(p => p.status === 'won').length;
      }

      if (existing) {
        if (existing.current_count !== count) {
          const updated = await base44.entities.ChallengeProgress.update(existing.id, {
            current_count: count,
            completed: count >= challenge.target_count,
          });
          pMap[challenge.id] = updated;
        }
      } else {
        const created = await base44.entities.ChallengeProgress.create({
          user_email: me.email,
          challenge_id: challenge.id,
          current_count: count,
          completed: count >= challenge.target_count,
          reward_claimed: false,
          date: today,
        });
        pMap[challenge.id] = created;
      }
    }

    setProgressMap(pMap);
    setLoading(false);
  };

  const claimReward = async (challenge) => {
    const progress = progressMap[challenge.id];
    if (!progress?.completed || progress?.reward_claimed) return;
    setClaiming(challenge.id);

    const newBalance = (user.token_balance || 0) + challenge.reward_tokens;
    await Promise.all([
      base44.auth.updateMe({ token_balance: newBalance }),
      base44.entities.ChallengeProgress.update(progress.id, { reward_claimed: true }),
      base44.entities.TokenTransaction.create({
        user_email: user.email,
        type: 'bonus',
        amount: challenge.reward_tokens,
        description: `Dnevni izazov: ${challenge.title}`,
        balance_after: newBalance,
      }),
      notifyUser(user.email, 'reward', `🎉 Izazov ispunjen!`, `Zaradio si ${challenge.reward_tokens} tokena za: ${challenge.title}`),
    ]);

    setProgressMap(prev => ({
      ...prev,
      [challenge.id]: { ...prev[challenge.id], reward_claimed: true },
    }));
    setUser(prev => ({ ...prev, token_balance: newBalance }));
    loadBalance();
    setClaiming(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const completedCount = challenges.filter(c => progressMap[c.id]?.completed).length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black tracking-wide">DNEVNI IZAZOVI</h1>
            <p className="text-muted-foreground text-sm">{moment().format('DD. MMMM YYYY.')} · {completedCount}/{challenges.length} ispunjeno</p>
          </div>
          <button onClick={init} className="ml-auto p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Daily progress overview */}
        <div className="p-4 rounded-2xl bg-card border border-border/50 mb-6 mt-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Dnevni napredak</span>
            <span className="font-bold">{completedCount}/{challenges.length}</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: challenges.length > 0 ? `${(completedCount / challenges.length) * 100}%` : '0%' }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            />
          </div>
        </div>

        {/* Challenges */}
        {challenges.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">Nema aktivnih izazova danas</p>
            <p className="text-sm mt-1">Admin će uskoro dodati nove izazove!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((c, i) => {
              const prog = progressMap[c.id];
              const current = prog?.current_count || 0;
              const pct = Math.min((current / c.target_count) * 100, 100);
              const completed = prog?.completed || false;
              const claimed = prog?.reward_claimed || false;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl border p-4 transition-all ${completed ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{c.icon || '⚡'}</span>
                      <div>
                        <p className="font-bold text-sm">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description || typeLabel[c.type]}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/20">
                      <Gift className="w-3 h-3 text-accent" />
                      <span className="text-xs font-black text-accent">+{c.reward_tokens}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{current} / {c.target_count}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className={`h-full rounded-full ${completed ? 'bg-primary' : 'bg-accent/60'}`}
                      />
                    </div>
                  </div>

                  {/* Claim button */}
                  {completed && !claimed && (
                    <button
                      onClick={() => claimReward(c)}
                      disabled={claiming === c.id}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {claiming === c.id
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><CheckCircle2 className="w-4 h-4" /> Preuzmi nagradu</>
                      }
                    </button>
                  )}
                  {claimed && (
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-primary font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Nagrada preuzeta!
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
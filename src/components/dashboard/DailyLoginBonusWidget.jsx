import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Coins, CheckCircle2, Lock, Gift, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Must match backend
const STREAK_TIERS = [
  { minDay: 1,  maxDay: 2,  tokens: 100,  emoji: '🌱' },
  { minDay: 3,  maxDay: 6,  tokens: 200,  emoji: '🔥' },
  { minDay: 7,  maxDay: 13, tokens: 350,  emoji: '⚡' },
  { minDay: 14, maxDay: 20, tokens: 500,  emoji: '💎' },
  { minDay: 21, maxDay: 29, tokens: 750,  emoji: '👑' },
  { minDay: 30, maxDay: 999, tokens: 1000, emoji: '🏆' },
];

function getTier(streak) {
  return STREAK_TIERS.find(t => streak >= t.minDay && streak <= t.maxDay) || STREAK_TIERS[0];
}

function getNextTier(streak) {
  return STREAK_TIERS.find(t => streak < t.minDay) || null;
}

// Show last 7 days calendar
function WeekCalendar({ lastClaimDate, currentStreak }) {
  const days = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('hr-HR', { weekday: 'short' }).slice(0, 2).toUpperCase();

    // Determine status
    let status = 'future';
    if (dateStr === today) {
      status = lastClaimDate === today ? 'claimed' : 'today';
    } else if (dateStr < today) {
      // Was it within the current streak?
      const daysAgo = i;
      status = daysAgo < currentStreak ? 'claimed' : 'missed';
    }

    days.push({ dateStr, dayLabel, dayNum: d.getDate(), status });
  }

  return (
    <div className="flex gap-1.5 justify-between">
      {days.map(({ dayLabel, dayNum, status }) => (
        <div key={dayLabel + dayNum} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-semibold">{dayLabel}</span>
          <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
            status === 'claimed' ? 'bg-primary text-primary-foreground' :
            status === 'today'   ? 'bg-primary/20 text-primary border-2 border-primary border-dashed' :
            status === 'missed'  ? 'bg-destructive/10 text-destructive/50' :
            'bg-secondary text-muted-foreground/30'
          }`}>
            {status === 'claimed' ? '✓' : dayNum}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DailyLoginBonusWidget({ onBalanceUpdate }) {
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [claimedInfo, setClaimedInfo] = useState(null);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    const records = await base44.entities.DailyLoginStreak.list('-created_date', 1);
    setStreakData(records[0] || null);
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const alreadyClaimed = streakData?.last_claim_date === today;
  const currentStreak = streakData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || 0;

  // What tier will next claim give?
  const nextStreak = alreadyClaimed ? currentStreak : currentStreak + 1;
  const tier = getTier(nextStreak);
  const nextTier = getNextTier(nextStreak);

  const handleClaim = async () => {
    if (claiming || alreadyClaimed) return;
    setClaiming(true);
    const res = await base44.functions.invoke('claimDailyBonus', {});
    if (res.data?.error && !res.data?.already_claimed) {
      toast.error(res.data.error);
      setClaiming(false);
      return;
    }
    if (res.data?.success) {
      setClaimedInfo({ reward: res.data.reward, streak: res.data.streak, label: res.data.label });
      setJustClaimed(true);
      await loadStreak();
      if (onBalanceUpdate) onBalanceUpdate();
      toast.success(`🔥 +${res.data.reward} tokena! Dan ${res.data.streak}`);
      setTimeout(() => setJustClaimed(false), 3000);
    }
    setClaiming(false);
  };

  if (loading) return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 animate-pulse h-48" />
  );

  const progressToNext = nextTier
    ? Math.round(((nextStreak - nextTier.minDay + 1) / (nextTier.minDay - tier.minDay + 1)) * 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 relative overflow-hidden ${
        alreadyClaimed
          ? 'bg-card border-border/50'
          : 'bg-gradient-to-br from-primary/8 to-accent/5 border-primary/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${alreadyClaimed ? 'bg-muted' : 'bg-primary/15'}`}>
            <Flame className={`w-5 h-5 ${alreadyClaimed ? 'text-muted-foreground' : 'text-primary'}`} />
          </div>
          <div>
            <h3 className="font-black text-sm">Dnevna prijava</h3>
            <p className="text-xs text-muted-foreground">
              {currentStreak > 0 ? `${currentStreak} dana zaredom 🔥` : 'Počni streak danas!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl">{tier.emoji}</p>
          <p className="text-xs font-bold text-muted-foreground">{tier.tokens} tok/dan</p>
        </div>
      </div>

      {/* Week calendar */}
      <div className="mb-4">
        <WeekCalendar lastClaimDate={streakData?.last_claim_date} currentStreak={currentStreak} />
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Do {nextTier.emoji} {nextTier.tokens} tok/dan</span>
            <span>{nextTier.minDay - nextStreak} dana</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((nextStreak - tier.minDay) / (nextTier.minDay - tier.minDay)) * 100)}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex gap-3 mb-4 text-center">
        <div className="flex-1 rounded-xl bg-secondary/70 py-2">
          <p className="text-base font-black text-primary">{currentStreak}</p>
          <p className="text-[10px] text-muted-foreground">Trenutni</p>
        </div>
        <div className="flex-1 rounded-xl bg-secondary/70 py-2">
          <p className="text-base font-black text-accent">{longestStreak}</p>
          <p className="text-[10px] text-muted-foreground">Rekord</p>
        </div>
        <div className="flex-1 rounded-xl bg-secondary/70 py-2">
          <p className="text-base font-black text-yellow-400">{streakData?.total_tokens_earned?.toLocaleString() || 0}</p>
          <p className="text-[10px] text-muted-foreground">Ukupno</p>
        </div>
      </div>

      {/* Claim button */}
      <AnimatePresence mode="wait">
        {alreadyClaimed ? (
          <motion.div
            key="claimed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-muted-foreground text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Već preuzeto danas — vrati se sutra!
          </motion.div>
        ) : (
          <motion.button
            key="claim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClaim}
            disabled={claiming}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all disabled:opacity-60 shadow-lg shadow-primary/20"
          >
            {claiming ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Gift className="w-4 h-4" />
                Preuzmi +{tier.tokens} tokena (Dan {nextStreak})
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Just claimed overlay */}
      <AnimatePresence>
        {justClaimed && claimedInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm rounded-2xl"
          >
            <p className="text-4xl mb-2">{getTier(claimedInfo.streak).emoji}</p>
            <p className="font-black text-xl text-primary">+{claimedInfo.reward} tokena!</p>
            <p className="text-sm text-muted-foreground mt-1">Dan {claimedInfo.streak} — {claimedInfo.label}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
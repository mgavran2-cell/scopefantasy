import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Flame, Coins, Gift } from 'lucide-react';
import moment from 'moment';
import { getWeekStart, getDayNumber, getRewardForCorrect } from '@/lib/streakUtils';
import StreakDayCard from '@/components/streak/StreakDayCard';
import TodayPickCard from '@/components/streak/TodayPickCard';
import RewardTable from '@/components/streak/RewardTable';
import { useOutletContext } from 'react-router-dom';

export default function DailyStreak() {
  const { loadBalance } = useOutletContext();
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showToday, setShowToday] = useState(false);

  const weekStart = getWeekStart();
  const todayDayNum = getDayNumber();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);
    await loadData(me.email);
    setLoading(false);
  };

  const loadData = async (email) => {
    const [allEntries, allWeeks] = await Promise.all([
      base44.entities.DailyStreakEntry.filter({ user_email: email, week_start_date: weekStart }),
      base44.entities.DailyStreakWeek.filter({ user_email: email, week_start_date: weekStart }),
    ]);
    setEntries(allEntries);
    setWeekData(allWeeks[0] || null);
  };

  const todayEntry = entries.find(e => e.day_number === todayDayNum);
  const correctCount = entries.filter(e => e.result === 'won').length;

  const handleClaim = async () => {
    if (claiming || !weekData || weekData.reward_claimed) return;
    setClaiming(true);
    const freshUser = await base44.auth.me();
    const reward = weekData.reward_amount || getRewardForCorrect(correctCount);
    if (reward > 0) {
      const newBalance = (freshUser.token_balance || 0) + reward;
      await base44.auth.updateMe({ token_balance: newBalance });
      await base44.entities.TokenTransaction.create({
        user_email: freshUser.email,
        type: 'bonus',
        amount: reward,
        description: `Daily Streak nagrada — ${correctCount}/7 točnih`,
        balance_after: newBalance,
      });
    }
    await base44.entities.DailyStreakWeek.update(weekData.id, { reward_claimed: true });
    await loadData(freshUser.email);
    if (loadBalance) await loadBalance();
    setClaiming(false);
  };

  const canClaim = weekData && weekData.status === 'completed' && !weekData.reward_claimed;
  const reward = weekData?.reward_amount || getRewardForCorrect(correctCount);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black tracking-wide uppercase">Daily Streak</h1>
            <p className="text-xs text-muted-foreground">Tjedan {moment(weekStart).format('DD.MM')} – {moment(weekStart).add(6, 'days').format('DD.MM.YYYY')}</p>
          </div>
        </div>
      </motion.div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {[1,2,3,4,5,6,7].map(day => {
          const entry = entries.find(e => e.day_number === day);
          const isToday = day === todayDayNum;
          return (
            <StreakDayCard
              key={day}
              dayNumber={day}
              entry={entry}
              isToday={isToday}
              onClick={() => setShowToday(true)}
            />
          );
        })}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border/50 mb-4">
        <span className="text-sm text-muted-foreground">Ovaj tjedan</span>
        <span className="font-black text-primary">{correctCount}/7 točnih</span>
      </div>

      {/* Claim reward */}
      {canClaim && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleClaim}
          disabled={claiming}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 text-white font-black text-sm hover:opacity-90 transition-all mb-4 shadow-lg shadow-primary/30 disabled:opacity-60"
        >
          {claiming
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Gift className="w-5 h-5" /> Preuzmi nagradu: +{reward.toLocaleString()} tokena</>
          }
        </motion.button>
      )}

      {weekData?.reward_claimed && (
        <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
          <Coins className="w-4 h-4 text-green-400" />
          <span className="text-sm font-bold text-green-400">Nagrada je već preuzeta ovaj tjedan!</span>
        </div>
      )}

      {/* Today's pick */}
      {(showToday || (todayEntry && !todayEntry.pick_choice)) && todayEntry && (
        <div className="mb-4">
          <TodayPickCard
            entry={todayEntry}
            userEmail={user?.email}
            onChosen={() => loadData(user?.email)}
          />
        </div>
      )}

      {!todayEntry && (
        <div className="rounded-2xl border border-border/50 bg-card p-5 text-center mb-4">
          <Flame className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-bold">Odabir dana još nije dostupan</p>
          <p className="text-xs text-muted-foreground mt-1">Odabir za danas bit će dostupan uskoro. Provjeri opet malo kasnije.</p>
        </div>
      )}

      {/* Reward table */}
      <RewardTable currentCorrect={correctCount} />
    </div>
  );
}
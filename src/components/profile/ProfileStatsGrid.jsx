import { motion } from 'framer-motion';
import { Coins, Trophy, TrendingUp, Flame } from 'lucide-react';

export default function ProfileStatsGrid({ tokenBalance, stats, streakCount }) {
  const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0.0';

  const cards = [
    {
      label: 'Tokeni',
      value: tokenBalance?.toLocaleString() ?? '0',
      icon: Coins,
      color: 'text-primary',
      bg: 'from-primary/10 to-primary/5',
    },
    {
      label: 'Pobjede / Ukupno',
      value: `${stats.won} / ${stats.total}`,
      icon: Trophy,
      color: 'text-accent',
      bg: 'from-accent/10 to-accent/5',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'from-green-400/10 to-green-400/5',
    },
    {
      label: 'Daily Streak',
      value: `${streakCount ?? 0} / 7`,
      icon: Flame,
      color: 'text-orange-400',
      bg: 'from-orange-400/10 to-orange-400/5',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-2xl border border-border/40 bg-gradient-to-br ${c.bg} p-4 text-center`}
        >
          <c.icon className={`w-5 h-5 mx-auto mb-2 ${c.color}`} />
          <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
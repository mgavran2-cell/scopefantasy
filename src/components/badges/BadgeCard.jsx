import { motion } from 'framer-motion';
import { RARITY_CONFIG } from '@/lib/badgeDefinitions';

export default function BadgeCard({ badge, earned = false, earnedDate = null, index = 0 }) {
  const rarity = RARITY_CONFIG[badge.rarity || 'common'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className={`relative rounded-2xl border p-4 transition-all ${
        earned
          ? `${rarity.border} ${rarity.bg} shadow-lg ${rarity.glow}`
          : 'border-border/30 bg-card/40 opacity-40 grayscale'
      }`}
    >
      {/* Rarity badge */}
      <div className={`absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${rarity.color} ${rarity.bg}`}>
        {rarity.label}
      </div>

      <div className="flex flex-col items-center text-center gap-2 mt-2">
        <span className="text-4xl">{badge.emoji}</span>
        <div>
          <p className="font-black text-sm leading-tight">{badge.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{badge.description}</p>
        </div>
        {badge.reward_tokens > 0 && (
          <div className={`text-xs font-black px-2 py-0.5 rounded-full ${earned ? rarity.color : 'text-muted-foreground'} ${rarity.bg}`}>
            +{badge.reward_tokens} tokena
          </div>
        )}
        {earned && earnedDate && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(earnedDate).toLocaleDateString('hr-HR')}
          </p>
        )}
        {!earned && (
          <p className="text-[10px] text-muted-foreground font-semibold">🔒 Nije zarađeno</p>
        )}
      </div>
    </motion.div>
  );
}
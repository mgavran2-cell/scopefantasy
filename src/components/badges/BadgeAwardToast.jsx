import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RARITY_CONFIG } from '@/lib/badgeDefinitions';

export default function BadgeAwardToast({ badges, onDone }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!badges?.length) return;
    const timer = setTimeout(() => {
      if (current < badges.length - 1) {
        setCurrent(c => c + 1);
      } else {
        setVisible(false);
        setTimeout(onDone, 400);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [current, badges]);

  if (!badges?.length || !visible) return null;

  const badge = badges[current];
  const rarity = RARITY_CONFIG[badge.rarity || 'common'];

  return (
    <AnimatePresence>
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-72"
      >
        <div className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-sm ${rarity.border} ${rarity.bg}`}>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">🏅 Novo dostignuće!</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{badge.emoji}</span>
            <div>
              <p className={`font-black text-sm ${rarity.color}`}>{badge.title}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              {badge.reward_tokens > 0 && (
                <p className={`text-xs font-black mt-0.5 ${rarity.color}`}>+{badge.reward_tokens} tokena</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
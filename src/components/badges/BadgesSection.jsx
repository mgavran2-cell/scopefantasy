import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Medal } from 'lucide-react';
import { BADGE_DEFINITIONS } from '@/lib/badgeDefinitions';
import BadgeCard from './BadgeCard';

const CATEGORIES = [
  { key: 'all', label: 'Sva' },
  { key: 'picks', label: '🎯 Pickovi' },
  { key: 'tokens', label: '💰 Tokeni' },
  { key: 'streak', label: '🔥 Streak' },
  { key: 'social', label: '🤝 Socijalno' },
  { key: 'special', label: '⭐ Posebna' },
];

export default function BadgesSection({ userEmail }) {
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.UserBadge.filter({ user_email: userEmail }).then(data => {
      setUserBadges(data);
      setLoading(false);
    });
  }, [userEmail]);

  const earnedMap = {};
  userBadges.forEach(ub => { earnedMap[ub.badge_key] = ub; });

  const filtered = BADGE_DEFINITIONS.filter(b =>
    activeCategory === 'all' || b.category === activeCategory
  );

  const earnedCount = BADGE_DEFINITIONS.filter(b => earnedMap[b.key]).length;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Medal className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-black text-lg">Dostignuća</h2>
          <p className="text-xs text-muted-foreground">{earnedCount} / {BADGE_DEFINITIONS.length} zarađeno</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5 h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(earnedCount / BADGE_DEFINITIONS.length) * 100}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-400"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((badge, i) => (
          <BadgeCard
            key={badge.key}
            badge={badge}
            earned={!!earnedMap[badge.key]}
            earnedDate={earnedMap[badge.key]?.created_date}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
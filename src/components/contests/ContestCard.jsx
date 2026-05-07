import { Link } from 'react-router-dom';
import { Trophy, Users, Clock, Coins, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import moment from 'moment';

const sportEmoji = {
  'Nogomet': '⚽',
  'Košarka': '🏀',
  'Tenis': '🎾',
  'Formula 1': '🏎️',
  'Hokej': '🏒',
  'MMA': '🥊',
};

const sportGradient = {
  'Nogomet': 'from-violet-600/15 to-purple-500/5',
  'Košarka': 'from-purple-600/15 to-violet-500/5',
  'Tenis': 'from-fuchsia-600/15 to-purple-500/5',
  'Formula 1': 'from-red-600/15 to-violet-500/5',
  'Hokej': 'from-purple-600/15 to-blue-500/5',
  'MMA': 'from-fuchsia-700/15 to-violet-500/5',
};

export default function ContestCard({ contest, index = 0 }) {
  const emoji = sportEmoji[contest.sport] || '🏆';
  const gradient = sportGradient[contest.sport] || 'from-primary/20 to-primary/5';
  const isSponsored = !!contest.is_sponsored;
  const sponsorColor = contest.sponsor_color || '#FFD700';

  const borderStyle = isSponsored
    ? { borderColor: `${sponsorColor}60`, boxShadow: `0 0 16px ${sponsorColor}18` }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/natjecanje/${contest.id}`}
        className="group block"
      >
        <div
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${gradient} p-5 transition-all duration-300 hover:shadow-lg ${isSponsored ? '' : 'border-border/50 hover:border-primary/30 hover:shadow-primary/5'}`}
          style={borderStyle}
        >
          {/* Sponsored glow overlay */}
          {isSponsored && (
            <div
              className="absolute inset-0 opacity-[0.06] rounded-2xl pointer-events-none"
              style={{ background: `radial-gradient(circle at top left, ${sponsorColor}, transparent 60%)` }}
            />
          )}

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Sponsor logo or sport emoji */}
              {isSponsored && contest.sponsor_logo_url ? (
                <div className="relative shrink-0">
                  <span className="text-xl absolute -top-1 -left-1 opacity-60">{emoji}</span>
                  <img
                    src={contest.sponsor_logo_url}
                    alt={contest.sponsor_name}
                    className="w-10 h-10 rounded-lg object-contain bg-white/10 p-0.5 border border-white/10 relative"
                  />
                </div>
              ) : (
                <span className="text-2xl">{emoji}</span>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{contest.sport}</p>
                <h3 className="font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors">{contest.title}</h3>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {isSponsored && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ color: sponsorColor, background: `${sponsorColor}20` }}
                >
                  🏆 Sponzorirano
                </span>
              )}
              <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                contest.status === 'active'
                  ? 'bg-primary/20 text-primary'
                  : contest.status === 'upcoming'
                  ? 'bg-white/10 text-white/70'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {contest.status === 'active' ? '🔴 Uživo' : contest.status === 'upcoming' ? 'Uskoro' : 'Završeno'}
              </div>
            </div>
          </div>

          {isSponsored && contest.sponsor_name && (
            <p className="text-xs font-semibold mb-1" style={{ color: sponsorColor }}>
              od {contest.sponsor_name}
            </p>
          )}
          {contest.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{contest.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="w-3.5 h-3.5 text-accent" />
              <span className="font-semibold text-accent">{contest.entry_cost}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-primary">{contest.prize_pool?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{contest.current_participants || 0}/{contest.max_participants || '∞'}</span>
            </div>
            {contest.start_time && (
              <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{moment(contest.start_time).format('DD.MM. HH:mm')}</span>
              </div>
            )}
          </div>

          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </motion.div>
  );
}
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
        <div className={`relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${gradient} p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{contest.sport}</p>
                <h3 className="font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors">{contest.title}</h3>
              </div>
            </div>
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
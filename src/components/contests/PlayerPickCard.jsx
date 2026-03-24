import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PlayerPickCard({ player, selected, onSelect, index = 0 }) {
  const isOver = selected === 'over';
  const isUnder = selected === 'under';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border/50 bg-card p-4 hover:border-border transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
          {player.image_url ? (
            <img src={player.image_url} alt={player.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {player.name?.split(' ').map(n => n[0]).join('')}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm truncate">{player.name}</h4>
          <p className="text-xs text-muted-foreground">{player.team} · {player.position}</p>
        </div>
      </div>

      <div className="text-center mb-3">
        <p className="text-xs text-muted-foreground mb-1">{player.stat_type}</p>
        <p className="text-2xl font-black text-foreground">{player.over_under}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onSelect(player.name, 'over')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isOver
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'bg-secondary hover:bg-primary/15 hover:text-primary text-muted-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Više
        </button>
        <button
          onClick={() => onSelect(player.name, 'under')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isUnder
              ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25'
              : 'bg-secondary hover:bg-destructive/10 hover:text-destructive text-muted-foreground'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Manje
        </button>
      </div>
    </motion.div>
  );
}
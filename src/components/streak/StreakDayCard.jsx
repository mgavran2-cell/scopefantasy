import { getDayLabel } from '@/lib/streakUtils';
import { Check, X, Clock, Lock } from 'lucide-react';

const stateConfig = {
  future:   { bg: 'bg-muted/40 border-border/30',              text: 'text-muted-foreground', icon: Lock,  iconColor: 'text-muted-foreground/40' },
  today:    { bg: 'bg-white/8 border-white/20',                text: 'text-white',             icon: null,  iconColor: '' },
  pending:  { bg: 'bg-yellow-500/10 border-yellow-500/30',     text: 'text-yellow-400',        icon: Clock, iconColor: 'text-yellow-400' },
  won:      { bg: 'bg-green-500/10 border-green-500/30',       text: 'text-green-400',         icon: Check, iconColor: 'text-green-400' },
  lost:     { bg: 'bg-destructive/10 border-destructive/30',   text: 'text-destructive',       icon: X,     iconColor: 'text-destructive' },
};

export default function StreakDayCard({ dayNumber, entry, isToday, onClick }) {
  let state = 'future';
  if (entry) {
    if (entry.result === 'won') state = 'won';
    else if (entry.result === 'lost') state = 'lost';
    else if (entry.pick_choice) state = 'pending';
    else if (isToday) state = 'today';
    else state = 'today'; // past day with no choice = missed
  } else if (isToday) {
    state = 'today';
  }

  const cfg = stateConfig[state];
  const Icon = cfg.icon;
  const isClickable = (isToday && entry && !entry.pick_choice) || (isToday && !entry);

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 w-full aspect-square transition-all
        ${cfg.bg} ${isClickable ? 'hover:scale-105 cursor-pointer hover:border-primary/50' : 'cursor-default'}`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>
        {getDayLabel(dayNumber)}
      </span>
      {Icon ? (
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
      ) : (
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
      <span className={`text-[10px] ${cfg.text}`}>
        {state === 'won' ? 'Točno' : state === 'lost' ? 'Krivo' : state === 'pending' ? 'Čeka' : state === 'today' ? 'Igraj' : 'Uskoro'}
      </span>
    </button>
  );
}
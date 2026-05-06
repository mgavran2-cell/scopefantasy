import { REWARD_TABLE } from '@/lib/streakUtils';
import { Trophy } from 'lucide-react';

export default function RewardTable({ currentCorrect = 0 }) {
  const milestones = REWARD_TABLE.filter(r => r.tokens > 0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm">Nagrade</h3>
      </div>
      <div className="space-y-2">
        {milestones.map(({ correct, tokens, label }) => {
          const isReached = currentCorrect >= correct;
          const isCurrent = currentCorrect === correct;
          return (
            <div
              key={correct}
              className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all
                ${isCurrent ? 'bg-primary/15 border border-primary/30' : isReached ? 'bg-green-500/8 border border-green-500/20' : 'bg-secondary/50 border border-transparent'}`}
            >
              <span className={`text-sm font-semibold ${isCurrent ? 'text-primary' : isReached ? 'text-green-400' : 'text-muted-foreground'}`}>
                {correct}/7 točnih
              </span>
              <span className={`text-sm font-black ${isCurrent ? 'text-primary' : isReached ? 'text-green-400' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
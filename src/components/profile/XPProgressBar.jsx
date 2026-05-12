import { motion } from 'framer-motion';
import { getLevelInfo, LEVELS } from '@/lib/xpSystem';
import { cn } from '@/lib/utils';

export function LevelBadge({ xp = 0, size = 'sm' }) {
  const { current } = getLevelInfo(xp);
  const isLg = size === 'lg';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-bold rounded-full',
      current.bg,
      current.color,
      isLg ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
    )}>
      <span>{current.emoji}</span>
      <span>Lv.{current.level}</span>
      {isLg && <span className="opacity-70">· {current.title}</span>}
    </span>
  );
}

export default function XPProgressBar({ xp = 0 }) {
  const { current, next, xpIntoLevel, xpForNextLevel, progress } = getLevelInfo(xp);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl', current.bg)}>
            {current.emoji}
          </div>
          <div>
            <p className={cn('font-black text-lg', current.color)}>
              Razina {current.level} · {current.title}
            </p>
            <p className="text-xs text-muted-foreground">{xp.toLocaleString()} ukupno XP</p>
          </div>
        </div>
        {next && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Sljedeće</p>
            <p className={cn('text-sm font-bold', LEVELS.find(l => l.level === next.level)?.color)}>
              {next.emoji} {next.title}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full', current.level >= 9 ? 'bg-gradient-to-r from-yellow-400 to-yellow-300' :
            current.level >= 7 ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
            current.level >= 5 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
            current.level >= 3 ? 'bg-gradient-to-r from-green-500 to-green-400' :
            'bg-gradient-to-r from-zinc-500 to-zinc-400'
          )}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        {next ? (
          <>
            <span>{xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP</span>
            <span>{Math.round(progress)}% do Razine {next.level}</span>
          </>
        ) : (
          <span className="text-yellow-400 font-bold">🏆 Maksimalna razina dostignuta!</span>
        )}
      </div>

      {/* All levels overview */}
      <div className="flex gap-1 mt-4">
        {LEVELS.map(lvl => (
          <div
            key={lvl.level}
            title={`Lv.${lvl.level} ${lvl.title} (${lvl.xpRequired} XP)`}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-all',
              xp >= lvl.xpRequired ? lvl.bg.replace('/20', '/60') : 'bg-border'
            )}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>Lv.1</span>
        <span>Lv.10</span>
      </div>
    </div>
  );
}
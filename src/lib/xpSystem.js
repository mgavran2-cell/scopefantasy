// XP thresholds per level (index = level, value = total XP needed)
export const LEVELS = [
  { level: 1,  xpRequired: 0,     title: 'Početnik',    emoji: '🥉', color: 'text-zinc-400',   bg: 'bg-zinc-400/20'   },
  { level: 2,  xpRequired: 200,   title: 'Rookie',      emoji: '🎯', color: 'text-zinc-300',   bg: 'bg-zinc-300/20'   },
  { level: 3,  xpRequired: 500,   title: 'Analitičar',  emoji: '📊', color: 'text-green-400',  bg: 'bg-green-400/20'  },
  { level: 4,  xpRequired: 1000,  title: 'Strateg',     emoji: '🧠', color: 'text-green-400',  bg: 'bg-green-400/20'  },
  { level: 5,  xpRequired: 1800,  title: 'Ekspert',     emoji: '⭐', color: 'text-blue-400',   bg: 'bg-blue-400/20'   },
  { level: 6,  xpRequired: 3000,  title: 'Pro',         emoji: '🔵', color: 'text-blue-400',   bg: 'bg-blue-400/20'   },
  { level: 7,  xpRequired: 4500,  title: 'Veteran',     emoji: '💎', color: 'text-purple-400', bg: 'bg-purple-400/20' },
  { level: 8,  xpRequired: 6500,  title: 'Elite',       emoji: '🔥', color: 'text-purple-400', bg: 'bg-purple-400/20' },
  { level: 9,  xpRequired: 9000,  title: 'Master',      emoji: '👑', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  { level: 10, xpRequired: 12000, title: 'Legenda',     emoji: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
];

// XP rewards
export const XP_REWARDS = {
  PICK_SUBMITTED:   10,
  STREAK_WIN:       50,
  CONTEST_WIN:     150,
  DUEL_WIN:        200,
  PARLAY_WIN:      100,
};

export function getLevelInfo(xp = 0) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }
  const xpIntoLevel = next ? xp - current.xpRequired : 0;
  const xpForNextLevel = next ? next.xpRequired - current.xpRequired : 1;
  const progress = next ? Math.min(100, (xpIntoLevel / xpForNextLevel) * 100) : 100;
  return { current, next, xpIntoLevel, xpForNextLevel, progress };
}

export async function awardXP(base44, userEmail, amount, reason) {
  try {
    const users = await base44.entities.User.filter({ email: userEmail });
    const user = users?.[0];
    if (!user) return;
    const newXp = (user.xp || 0) + amount;
    await base44.auth.updateMe({ xp: newXp });
  } catch {}
}
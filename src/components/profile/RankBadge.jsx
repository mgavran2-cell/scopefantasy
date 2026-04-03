import { motion } from 'framer-motion';
import { Shield, Star, Gem, Crown, Zap } from 'lucide-react';

export const RANKS = [
  {
    id: 'bronze',
    label: 'Brončani',
    icon: Shield,
    color: 'text-amber-700',
    bg: 'bg-amber-700/15',
    border: 'border-amber-700/40',
    gradient: 'from-amber-900/30 to-amber-700/10',
    minPicks: 0,
    minTokens: 0,
    perks: [
      'Pristup svim javnim natjecanjima',
      'Osnovna statistika profila',
      'Sudjelovanje u Social Feedu',
    ],
  },
  {
    id: 'silver',
    label: 'Srebrni',
    icon: Star,
    color: 'text-slate-300',
    bg: 'bg-slate-300/15',
    border: 'border-slate-300/40',
    gradient: 'from-slate-700/30 to-slate-400/10',
    minPicks: 10,
    minTokens: 500,
    perks: [
      'Sve pogodnosti Brončanog',
      '+5% bonus na osvajanje nagrade',
      'Pristup ekskluzivnim Srebrnim natjecanjima',
      'Istaknuti profil u ljestvici',
    ],
  },
  {
    id: 'gold',
    label: 'Zlatni',
    icon: Crown,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/15',
    border: 'border-yellow-400/40',
    gradient: 'from-yellow-900/30 to-yellow-500/10',
    minPicks: 30,
    minTokens: 2000,
    perks: [
      'Sve pogodnosti Srebrnog',
      '+10% bonus na osvajanje nagrade',
      'Pristup Zlatnim VIP natjecanjima',
      'Zlatna oznaka na profilu',
      'Rani pristup novim natjecanjima',
    ],
  },
  {
    id: 'platinum',
    label: 'Platinasti',
    icon: Gem,
    color: 'text-cyan-300',
    bg: 'bg-cyan-300/15',
    border: 'border-cyan-300/40',
    gradient: 'from-cyan-900/30 to-cyan-400/10',
    minPicks: 75,
    minTokens: 7500,
    perks: [
      'Sve pogodnosti Zlatnog',
      '+15% bonus na osvajanje nagrade',
      'Ekskluzivni Platinasti turniri',
      'Prioritetna korisnička podrška',
      'Posebni avatar okvir',
    ],
  },
  {
    id: 'diamond',
    label: 'Dijamantni',
    icon: Zap,
    color: 'text-violet-400',
    bg: 'bg-violet-400/15',
    border: 'border-violet-400/40',
    gradient: 'from-violet-900/30 to-violet-500/10',
    minPicks: 150,
    minTokens: 25000,
    perks: [
      'Sve pogodnosti Platinastog',
      '+25% bonus na osvajanje nagrade',
      'Dijamantni ekskluzivni turniri',
      'Besplatni ulaz u 1 natjecanje tjedno',
      'Vlastiti profil badge + animacija',
      'Direktan pristup beta značajkama',
    ],
  },
];

export function getRank(totalPicks, totalTokensWon) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (totalPicks >= r.minPicks && totalTokensWon >= r.minTokens) {
      rank = r;
    }
  }
  return rank;
}

export function getNextRank(currentRank) {
  const idx = RANKS.findIndex(r => r.id === currentRank.id);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

export function RankBadgeSmall({ rank }) {
  const Icon = rank.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${rank.bg} ${rank.border} ${rank.color}`}>
      <Icon className="w-3 h-3" />
      {rank.label}
    </span>
  );
}

export default function RankCard({ totalPicks, totalTokensWon }) {
  const rank = getRank(totalPicks, totalTokensWon);
  const next = getNextRank(rank);
  const Icon = rank.icon;

  const progressPicks = next ? Math.min((totalPicks / next.minPicks) * 100, 100) : 100;
  const progressTokens = next ? Math.min((totalTokensWon / next.minTokens) * 100, 100) : 100;
  const overallProgress = next ? Math.min((progressPicks + progressTokens) / 2, 100) : 100;

  return (
    <div className={`rounded-2xl border ${rank.border} bg-gradient-to-br ${rank.gradient} overflow-hidden`}>
      {/* Rank header */}
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl ${rank.bg} border ${rank.border} flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${rank.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Tvoj rang</p>
            <h2 className={`text-2xl font-black ${rank.color}`}>{rank.label}</h2>
          </div>
        </div>

        {/* Progress to next rank */}
        {next ? (
          <div className="mb-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Napredak do <span className={`font-bold ${next.color || 'text-foreground'}`}>{next.label}</span></span>
              <span className="font-bold">{overallProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-black/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${rank.bg.replace('/15', '')}`}
                style={{ backgroundColor: 'currentColor' }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{totalPicks} / {next.minPicks} tiketa</span>
              <span>{totalTokensWon.toLocaleString()} / {next.minTokens.toLocaleString()} tokena</span>
            </div>
          </div>
        ) : (
          <p className={`text-sm font-bold ${rank.color}`}>✨ Maksimalni rang dostignut!</p>
        )}
      </div>

      {/* Perks */}
      <div className="border-t border-white/5 px-5 py-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Pogodnosti ranga</p>
        <ul className="space-y-2">
          {rank.perks.map((perk, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rank.color} bg-current`} />
              <span className="text-foreground/80">{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* All ranks overview */}
      <div className="border-t border-white/5 px-5 py-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Svi rangovi</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {RANKS.map(r => {
            const RIcon = r.icon;
            const isActive = r.id === rank.id;
            const isPast = RANKS.indexOf(r) < RANKS.indexOf(rank);
            return (
              <div key={r.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isActive ? `${r.bg} ${r.border} ${r.color}` :
                isPast ? 'bg-secondary/50 border-border/30 text-muted-foreground/60 line-through' :
                'bg-secondary/30 border-border/20 text-muted-foreground/40'
              }`}>
                <RIcon className="w-3 h-3" />
                {r.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
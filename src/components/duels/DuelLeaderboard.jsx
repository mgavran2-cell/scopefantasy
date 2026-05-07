import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Coins, Swords, Crown, TrendingUp } from 'lucide-react';

export default function DuelLeaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [sortBy, setSortBy] = useState('wins'); // 'wins' | 'tokens'

  useEffect(() => {
    (async () => {
      const [user, duels] = await Promise.all([
        base44.auth.me(),
        base44.entities.Duel.list('-created_date', 200),
      ]);
      setMe(user);

      const finished = duels.filter(d => d.status === 'finished');

      // Aggregate per player
      const map = {};
      const ensure = (email, name) => {
        if (!map[email]) map[email] = { email, name: name || email, wins: 0, losses: 0, ties: 0, tokensWon: 0 };
      };

      finished.forEach(d => {
        ensure(d.challenger_email, d.challenger_name);
        ensure(d.opponent_email, d.opponent_name);

        if (d.winner_email) {
          // winner gets stake_tokens net profit (won 2x, paid 1x = net +1x)
          map[d.winner_email].wins++;
          map[d.winner_email].tokensWon += d.stake_tokens;
          const loser = d.winner_email === d.challenger_email ? d.opponent_email : d.challenger_email;
          if (map[loser]) map[loser].losses++;
        } else {
          // tie
          map[d.challenger_email].ties++;
          map[d.opponent_email].ties++;
        }
      });

      setRows(Object.values(map).filter(r => r.wins + r.losses + r.ties > 0));
      setLoading(false);
    })();
  }, []);

  const sorted = [...rows].sort((a, b) =>
    sortBy === 'wins' ? b.wins - a.wins || b.tokensWon - a.tokensWon : b.tokensWon - a.tokensWon || b.wins - a.wins
  );

  const medalEmoji = (i) => ['🥇', '🥈', '🥉'][i] ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Crown className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-semibold">Još nema završenih duela</p>
        <p className="text-sm mt-1">Budi prvi na ljestvici!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort toggle */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'wins',   label: 'Pobjede',      icon: Trophy },
          { key: 'tokens', label: 'Tokeni',        icon: Coins },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              sortBy === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {sorted.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {[sorted[1], sorted[0], sorted[2]].map((row, i) => {
            const heights = ['h-24', 'h-32', 'h-20'];
            const ranks   = [2, 1, 3];
            const rank    = ranks[i];
            const isMe    = row.email === me?.email;
            return (
              <motion.div
                key={row.email}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2 flex-1 max-w-[110px]"
              >
                <p className="text-xs font-bold text-muted-foreground truncate w-full text-center">{row.name.split(' ')[0]}</p>
                <div className={`w-full ${heights[i]} rounded-t-2xl flex flex-col items-center justify-end pb-3 gap-1 ${
                  rank === 1 ? 'bg-gradient-to-b from-primary/30 to-primary/10 border-t-2 border-primary/50' :
                  rank === 2 ? 'bg-gradient-to-b from-secondary to-secondary/60 border-t border-border/60' :
                               'bg-gradient-to-b from-secondary/70 to-secondary/40 border-t border-border/40'
                } ${isMe ? 'ring-2 ring-accent/60' : ''}`}>
                  <span className="text-2xl">{medalEmoji(rank - 1)}</span>
                  <p className="text-xs font-black text-primary">{sortBy === 'wins' ? `${row.wins}W` : `+${row.tokensWon.toLocaleString()}`}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 text-xs font-bold text-muted-foreground border-b border-border/40 uppercase tracking-wide">
          <span>#</span>
          <span>Igrač</span>
          <span className="text-right">W/L</span>
          <span className="text-right">Win%</span>
          <span className="text-right flex items-center gap-1 justify-end"><Coins className="w-3 h-3" />Tokeni</span>
        </div>
        {sorted.map((row, i) => {
          const total = row.wins + row.losses + row.ties;
          const winPct = total > 0 ? ((row.wins / total) * 100).toFixed(0) : 0;
          const isMe = row.email === me?.email;
          const medal = medalEmoji(i);
          return (
            <motion.div
              key={row.email}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-4 py-3 border-b border-border/20 last:border-0 transition-all ${
                isMe ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-secondary/40'
              }`}
            >
              <span className="text-sm font-black w-5 text-center">
                {medal ?? <span className="text-muted-foreground text-xs">{i + 1}</span>}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${isMe ? 'text-primary' : ''}`}>
                  {row.name} {isMe && <span className="text-xs font-normal text-accent">(Ti)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{total} duela</p>
              </div>
              <span className="text-sm font-bold text-right">
                <span className="text-primary">{row.wins}</span>
                <span className="text-muted-foreground">/{row.losses}</span>
              </span>
              <span className={`text-sm font-bold text-right ${Number(winPct) >= 50 ? 'text-primary' : 'text-muted-foreground'}`}>
                {winPct}%
              </span>
              <span className="text-sm font-black text-right text-accent">
                +{row.tokensWon.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
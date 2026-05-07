import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Coins, TrendingUp } from 'lucide-react';
import FollowButton from '../components/social/FollowButton';
import moment from 'moment';

const PERIODS = [
  { key: 'all',   label: 'Sve vrijeme' },
  { key: 'month', label: 'Ovaj mjesec' },
  { key: 'week',  label: 'Ovaj tjedan' },
];

const topIcons  = [Crown, Trophy, Medal];
const topColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
const topBg     = ['bg-yellow-400/10 border-yellow-400/30', 'bg-gray-300/10 border-gray-300/30', 'bg-amber-600/10 border-amber-600/30'];

function aggregatePicks(picks) {
  const userStats = {};
  picks.forEach(pick => {
    const email = pick.user_email || pick.created_by;
    if (!userStats[email]) {
      userStats[email] = { email, name: pick.user_name || email, wins: 0, total: 0, tokensWon: 0 };
    }
    userStats[email].total++;
    if (pick.status === 'won') userStats[email].wins++;
    userStats[email].tokensWon += (pick.tokens_won || 0);
  });
  return Object.values(userStats).sort((a, b) => b.tokensWon - a.tokensWon || b.wins - a.wins);
}

export default function Leaderboard() {
  const [allPicks, setAllPicks]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [period, setPeriod]           = useState('month');

  useEffect(() => {
    (async () => {
      const [picks, user] = await Promise.all([
        base44.entities.Pick.list('-created_date', 500),
        base44.auth.me(),
      ]);
      setCurrentUser(user);
      setAllPicks(picks);
      setLoading(false);
    })();
  }, []);

  const filteredPicks = allPicks.filter(pick => {
    if (period === 'all') return true;
    const cutoff = period === 'week'
      ? moment().startOf('isoWeek')
      : moment().startOf('month');
    return moment(pick.created_date).isAfter(cutoff);
  });

  const entries = aggregatePicks(filteredPicks);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black mb-1">Ljestvica</h1>
          <p className="text-muted-foreground text-sm">Rang-lista igrača prema zaradi i postotku pobjeda</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-8">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              period === p.key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Ljestvica je prazna</h3>
          <p className="text-muted-foreground">Nema podataka za odabrano razdoblje. Igrači koji sudjeluju u natjecanjima pojavit će se ovdje.</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-8 items-end">
              {[1, 0, 2].map((rank) => {
                const entry = entries[rank];
                const Icon = topIcons[rank];
                const winRate = entry.total > 0 ? ((entry.wins / entry.total) * 100).toFixed(0) : 0;
                return (
                  <motion.div
                    key={rank}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rank * 0.1 }}
                    className={`flex flex-col items-center p-4 rounded-2xl border ${topBg[rank]} ${rank === 0 ? 'py-6' : ''}`}
                  >
                    <Icon className={`w-7 h-7 ${topColors[rank]} mb-2`} />
                    <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center mb-2">
                      <span className="font-black text-base">{entry.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="font-bold text-xs truncate max-w-full text-center">{entry.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{winRate}% pobjeda</p>
                    <p className="flex items-center gap-1 mt-1.5 text-sm font-black text-accent">
                      <Coins className="w-3.5 h-3.5" /> {entry.tokensWon.toLocaleString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Igrač</span>
            <span className="w-16 text-center hidden sm:block">Win %</span>
            <span className="w-20 text-right">Zarada</span>
          </div>

          {/* Rest of leaderboard */}
          <div className="space-y-2">
            {entries.slice(entries.length >= 3 ? 3 : 0).map((entry, i) => {
              const rank    = entries.length >= 3 ? i + 4 : i + 1;
              const isMe    = currentUser?.email === entry.email;
              const winRate = entry.total > 0 ? ((entry.wins / entry.total) * 100).toFixed(1) : '0.0';
              return (
                <motion.div
                  key={entry.email}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border border-border/50 ${
                    isMe ? 'bg-primary/5 border-primary/20' : 'bg-card'
                  }`}
                >
                  <span className="w-8 text-center font-black text-muted-foreground text-sm">{rank}</span>
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="font-bold text-sm">{entry.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {entry.name} {isMe && <span className="text-primary text-xs">(Ti)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.wins} pobjeda · {entry.total} listića</p>
                  </div>
                  {!isMe && (
                    <FollowButton targetEmail={entry.email} targetName={entry.name} currentUserEmail={currentUser?.email} />
                  )}
                  <p className="flex items-center gap-1 font-bold text-primary text-sm w-20 justify-end">
                    <Coins className="w-3.5 h-3.5 shrink-0" /> {entry.tokensWon.toLocaleString()}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
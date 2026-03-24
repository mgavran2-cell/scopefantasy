import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Coins } from 'lucide-react';

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const [picks, user] = await Promise.all([
      base44.entities.Pick.list('-created_date', 500),
      base44.auth.me()
    ]);
    setCurrentUser(user);

    // Aggregate by user
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

    const sorted = Object.values(userStats).sort((a, b) => b.tokensWon - a.tokensWon || b.wins - a.wins);
    setEntries(sorted);
    setLoading(false);
  };

  const topIcons = [Crown, Trophy, Medal];
  const topColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
  const topBg = ['bg-yellow-400/10 border-yellow-400/30', 'bg-gray-300/10 border-gray-300/30', 'bg-amber-600/10 border-amber-600/30'];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Ljestvica</h1>
        <p className="text-muted-foreground">Najbolji igrači ovog mjeseca</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Ljestvica je prazna</h3>
          <p className="text-muted-foreground">Budi prvi na ljestvici!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[1, 0, 2].map((rank) => {
                const entry = entries[rank];
                const Icon = topIcons[rank];
                return (
                  <motion.div
                    key={rank}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rank * 0.1 }}
                    className={`flex flex-col items-center p-4 rounded-2xl border ${topBg[rank]} ${rank === 0 ? 'col-start-2 row-start-1 scale-105' : ''}`}
                  >
                    <Icon className={`w-8 h-8 ${topColors[rank]} mb-2`} />
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-2">
                      <span className="font-black text-lg">{entry.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="font-bold text-sm truncate max-w-full">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.wins}W / {entry.total}P</p>
                    <p className="flex items-center gap-1 mt-1 text-sm font-bold text-accent">
                      <Coins className="w-3.5 h-3.5" /> {entry.tokensWon.toLocaleString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          <div className="space-y-2">
            {entries.slice(entries.length >= 3 ? 3 : 0).map((entry, i) => {
              const rank = entries.length >= 3 ? i + 4 : i + 1;
              const isMe = currentUser?.email === entry.email;
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
                  <span className="w-8 text-center font-black text-muted-foreground">{rank}</span>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="font-bold">{entry.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {entry.name} {isMe && <span className="text-primary text-xs">(Ti)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.wins} pobjeda · {entry.total} igara</p>
                  </div>
                  <p className="flex items-center gap-1 font-bold text-accent text-sm">
                    <Coins className="w-3.5 h-3.5" /> {entry.tokensWon.toLocaleString()}
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
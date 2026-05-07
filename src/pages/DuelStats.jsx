import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Swords, Trophy, TrendingUp, TrendingDown, Users, Coins, BarChart2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';
import moment from 'moment';

const COLORS = {
  win: 'hsl(262 83% 65%)',
  loss: 'hsl(0 84% 60%)',
  tie: 'hsl(0 0% 50%)',
};

export default function DuelStats() {
  const [user, setUser] = useState(null);
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [me, duelData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Duel.list('-created_date', 100),
      ]);
      setUser(me);
      setDuels(duelData);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const finished = duels.filter(
    d => d.status === 'finished' &&
      (d.challenger_email === user?.email || d.opponent_email === user?.email)
  );

  // --- Basic counts ---
  const wins   = finished.filter(d => d.winner_email === user?.email).length;
  const losses = finished.filter(d => d.winner_email && d.winner_email !== user?.email).length;
  const ties   = finished.filter(d => !d.winner_email).length;
  const total  = finished.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

  // --- Net profit ---
  let netProfit = 0;
  finished.forEach(d => {
    if (d.winner_email === user?.email) netProfit += d.stake_tokens; // won pool = 2x, paid 1x = net +1x
    else if (d.winner_email) netProfit -= d.stake_tokens;
    // tie = 0
  });

  // --- Pie data ---
  const pieData = [
    { name: 'Pobjede', value: wins,   color: COLORS.win },
    { name: 'Porazi',  value: losses, color: COLORS.loss },
    { name: 'Neriješeno', value: ties, color: COLORS.tie },
  ].filter(d => d.value > 0);

  // --- Opponents frequency ---
  const opponentMap = {};
  finished.forEach(d => {
    const opp = d.challenger_email === user?.email
      ? (d.opponent_name || d.opponent_email)
      : (d.challenger_name || d.challenger_email);
    if (!opp) return;
    if (!opponentMap[opp]) opponentMap[opp] = { name: opp, duels: 0, wins: 0, losses: 0 };
    opponentMap[opp].duels++;
    if (d.winner_email === user?.email) opponentMap[opp].wins++;
    else if (d.winner_email) opponentMap[opp].losses++;
  });
  const opponentData = Object.values(opponentMap)
    .sort((a, b) => b.duels - a.duels)
    .slice(0, 8);

  // --- Cumulative profit over time ---
  let cumulative = 0;
  const profitOverTime = [...finished]
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .map((d, i) => {
      if (d.winner_email === user?.email) cumulative += d.stake_tokens;
      else if (d.winner_email) cumulative -= d.stake_tokens;
      return {
        idx: i + 1,
        date: moment(d.created_date).format('DD.MM'),
        profit: cumulative,
      };
    });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/60 rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/dueli" className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <BarChart2 className="w-7 h-7 text-primary" /> Statistika Dueliranja
          </h1>
          <p className="text-muted-foreground text-sm">Pregled tvojih duel performansi</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Swords className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">Još nema završenih duela</p>
          <p className="text-sm mt-1">Izazovi nekoga i vrati se ovdje!</p>
          <Link to="/natjecanja" className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
            <Swords className="w-4 h-4" /> Idi na natjecanja
          </Link>
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ukupno duela', value: total, icon: Swords, color: 'text-muted-foreground' },
              { label: 'Pobjede', value: wins, icon: Trophy, color: 'text-primary' },
              { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-accent' },
              {
                label: 'Neto profit',
                value: (netProfit >= 0 ? '+' : '') + netProfit.toLocaleString(),
                icon: netProfit >= 0 ? TrendingUp : TrendingDown,
                color: netProfit >= 0 ? 'text-primary' : 'text-destructive',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl bg-card border border-border/50 p-4 text-center"
              >
                <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Win/Loss Pie + summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border border-border/50 p-5"
          >
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> Omjer Pobjeda / Poraza
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-44 h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {[
                  { label: 'Pobjede', value: wins, color: 'bg-primary', pct: total > 0 ? (wins / total * 100) : 0 },
                  { label: 'Porazi', value: losses, color: 'bg-destructive', pct: total > 0 ? (losses / total * 100) : 0 },
                  { label: 'Neriješeno', value: ties, color: 'bg-muted-foreground', pct: total > 0 ? (ties / total * 100) : 0 },
                ].map((row, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">{row.label}</span>
                      <span className="text-muted-foreground">{row.value} ({row.pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                        className={`h-full rounded-full ${row.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Cumulative profit chart */}
          {profitOverTime.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-card border border-border/50 p-5"
            >
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4 text-accent" /> Kumulativni Profit kroz Vrijeme
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={profitOverTime} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262 83% 65%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262 83% 65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Neto profit"
                    stroke="hsl(262 83% 65%)"
                    strokeWidth={2}
                    fill="url(#profitGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Opponents bar chart */}
          {opponentData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-card border border-border/50 p-5"
            >
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Najčešći Protivnici
              </h2>
              <ResponsiveContainer width="100%" height={Math.max(180, opponentData.length * 42)}>
                <BarChart
                  data={opponentData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(0 0% 50%)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(0 0% 60%)' }} />
                  <Bar dataKey="wins" name="Pobjede" fill={COLORS.win} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="losses" name="Porazi" fill={COLORS.loss} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Biggest wins/losses */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-card border border-border/50 p-5"
          >
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" /> Najveći Ulog po Duel
            </h2>
            <div className="space-y-2">
              {[...finished]
                .sort((a, b) => b.stake_tokens - a.stake_tokens)
                .slice(0, 5)
                .map((d, i) => {
                  const won = d.winner_email === user?.email;
                  const lost = d.winner_email && d.winner_email !== user?.email;
                  const opp = d.challenger_email === user?.email
                    ? (d.opponent_name || d.opponent_email)
                    : (d.challenger_name || d.challenger_email);
                  return (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{won ? '🏆' : lost ? '💀' : '🤝'}</span>
                        <div>
                          <p className="text-sm font-semibold">vs {opp}</p>
                          <p className="text-xs text-muted-foreground">{d.contest_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${won ? 'text-primary' : lost ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {won ? '+' : lost ? '-' : '±'}{d.stake_tokens}
                        </p>
                        <p className="text-xs text-muted-foreground">{moment(d.created_date).format('DD.MM.YY')}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
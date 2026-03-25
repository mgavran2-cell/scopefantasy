import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Target, Coins, Users, BarChart2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Area, AreaChart,
} from 'recharts';
import moment from 'moment';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold mb-1 text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name.includes('%') ? p.value.toFixed(1) + '%' : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { tokenBalance } = useOutletContext();
  const [loading, setLoading]         = useState(true);
  const [user, setUser]               = useState(null);
  const [weeklyData, setWeeklyData]   = useState([]);
  const [dailyTokens, setDailyTokens] = useState([]);
  const [sportBreakdown, setSportBreakdown] = useState([]);
  const [globalStats, setGlobalStats] = useState({ avgWinRate: 0, avgTokens: 0 });
  const [myStats, setMyStats]         = useState({ winRate: 0, tokensWon: 0, total: 0, won: 0 });

  useEffect(() => {
    (async () => {
      const [me, allPicks, allContests] = await Promise.all([
        base44.auth.me(),
        base44.entities.Pick.list('-created_date', 500),
        base44.entities.Contest.list('-created_date', 200),
      ]);
      setUser(me);
      processData(me, allPicks, allContests);
    })();
  }, []);

  const processData = (me, allPicks, allContests) => {
    const contestMap = {};
    allContests.forEach(c => { contestMap[c.id] = c; });

    const myPicks = allPicks.filter(p => (p.user_email || p.created_by) === me.email);

    // --- My stats ---
    let won = 0, tokensWon = 0;
    myPicks.forEach(p => {
      if (p.status === 'won') won++;
      tokensWon += (p.tokens_won || 0);
    });
    const myWinRate = myPicks.length > 0 ? (won / myPicks.length) * 100 : 0;
    setMyStats({ winRate: myWinRate, tokensWon, total: myPicks.length, won });

    // --- Global average win rate ---
    const userMap = {};
    allPicks.forEach(p => {
      const email = p.user_email || p.created_by;
      if (!userMap[email]) userMap[email] = { wins: 0, total: 0, tokensWon: 0 };
      userMap[email].total++;
      if (p.status === 'won') userMap[email].wins++;
      userMap[email].tokensWon += (p.tokens_won || 0);
    });
    const users = Object.values(userMap);
    const avgWinRate = users.length > 0 ? users.reduce((s, u) => s + (u.total > 0 ? (u.wins / u.total) * 100 : 0), 0) / users.length : 0;
    const avgTokens  = users.length > 0 ? users.reduce((s, u) => s + u.tokensWon, 0) / users.length : 0;
    setGlobalStats({ avgWinRate, avgTokens });

    // --- Weekly performance (last 8 weeks) ---
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = moment().subtract(i, 'weeks').startOf('isoWeek');
      const end   = moment().subtract(i, 'weeks').endOf('isoWeek');
      const label = `T${moment().subtract(i, 'weeks').isoWeek()}`;

      const myW = myPicks.filter(p => moment(p.created_date).isBetween(start, end));
      const allW = allPicks.filter(p => moment(p.created_date).isBetween(start, end));

      const myWR  = myW.length > 0 ? (myW.filter(p => p.status === 'won').length / myW.length) * 100 : null;
      const allWR = allW.length > 0 ? (allW.filter(p => p.status === 'won').length / allW.length) * 100 : null;

      weeks.push({ label, 'Moj Win %': myWR, 'Prosjek %': allWR });
    }
    setWeeklyData(weeks);

    // --- Daily token earnings (last 14 days) ---
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const day   = moment().subtract(i, 'days');
      const label = day.format('DD.MM');
      const dayPicks = myPicks.filter(p => moment(p.created_date).isSame(day, 'day'));
      const earned   = dayPicks.reduce((s, p) => s + (p.tokens_won || 0), 0);
      const spent    = dayPicks.reduce((s, p) => s + (p.tokens_spent || 0), 0);
      days.push({ label, 'Zarađeno': earned, 'Potrošeno': spent });
    }
    setDailyTokens(days);

    // --- Sport breakdown ---
    const sportMap = {};
    myPicks.forEach(p => {
      const sport = contestMap[p.contest_id]?.sport || 'Ostalo';
      if (!sportMap[sport]) sportMap[sport] = { wins: 0, total: 0 };
      sportMap[sport].total++;
      if (p.status === 'won') sportMap[sport].wins++;
    });
    const breakdown = Object.entries(sportMap).map(([sport, s]) => ({
      sport,
      'Win %': s.total > 0 ? parseFloat(((s.wins / s.total) * 100).toFixed(1)) : 0,
      Igara: s.total,
    })).sort((a, b) => b['Win %'] - a['Win %']);
    setSportBreakdown(breakdown);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Moj Win Rate',    value: `${myStats.winRate.toFixed(1)}%`,   sub: `Prosjek: ${globalStats.avgWinRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Ukupno odigrano', value: myStats.total,                       sub: `${myStats.won} pobjeda`, icon: Target, color: 'text-accent' },
    { label: 'Ukupno zarađeno', value: myStats.tokensWon.toLocaleString(),  sub: `Prosjek: ${Math.round(globalStats.avgTokens).toLocaleString()}`, icon: Coins, color: 'text-yellow-400' },
    { label: 'Stanje tokena',   value: tokenBalance?.toLocaleString() ?? 0, sub: 'Trenutno stanje', icon: Trophy, color: 'text-fuchsia-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-black mb-1">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Analitika tvojih rezultata i usporedba s platformom</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl bg-card border border-border/50"
          >
            <s.icon className={`w-5 h-5 mb-3 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-sm font-semibold mt-0.5">{s.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Win Rate Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl bg-card border border-border/50 p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-bold">Win Rate trend — zadnjih 8 tjedana</h2>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Moj Win %" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} connectNulls />
            <Line type="monotone" dataKey="Prosjek %" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Token Flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Coins className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold">Token aktivnost — zadnjih 14 dana</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyTokens} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Zarađeno" stroke="hsl(var(--primary))" fill="url(#earnGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Potrošeno" stroke="hsl(var(--destructive))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sport Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5 text-accent" />
            <h2 className="font-bold">Win % po sportu</h2>
          </div>
          {sportBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Nema podataka
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sportBreakdown} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sport" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={globalStats.avgWinRate} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Prosjek', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Bar dataKey="Win %" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* vs Platform comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-2xl bg-card border border-border/50 p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-fuchsia-400" />
          <h2 className="font-bold">Usporedba s platformom</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { label: 'Win Rate', mine: myStats.winRate, avg: globalStats.avgWinRate, unit: '%', color: 'hsl(var(--primary))' },
            { label: 'Ukupno zarađeno (tokeni)', mine: myStats.tokensWon, avg: globalStats.avgTokens, unit: '', color: 'hsl(var(--accent))' },
          ].map((item, i) => {
            const max = Math.max(item.mine, item.avg, 1);
            const myPct  = (item.mine / max) * 100;
            const avgPct = (item.avg  / max) * 100;
            const better = item.mine >= item.avg;
            return (
              <div key={i}>
                <p className="font-semibold text-sm mb-3">{item.label}</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">Ti</span>
                      <span style={{ color: item.color }} className="font-black">
                        {typeof item.mine === 'number' && item.unit === '%' ? item.mine.toFixed(1) : Math.round(item.mine).toLocaleString()}{item.unit}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${myPct}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: item.color }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Prosjek platforme</span>
                      <span className="text-muted-foreground font-semibold">
                        {typeof item.avg === 'number' && item.unit === '%' ? item.avg.toFixed(1) : Math.round(item.avg).toLocaleString()}{item.unit}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${avgPct}%` }}
                        transition={{ duration: 0.8, delay: 0.7 + i * 0.1 }}
                        className="h-full rounded-full bg-muted-foreground/50"
                      />
                    </div>
                  </div>
                </div>
                <p className={`text-xs mt-2 font-semibold ${better ? 'text-primary' : 'text-destructive'}`}>
                  {better ? '↑ Iznad prosjeka' : '↓ Ispod prosjeka'}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
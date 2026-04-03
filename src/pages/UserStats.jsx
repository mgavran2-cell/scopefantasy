import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { Trophy, TrendingUp, Coins, Target, Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import moment from 'moment';

const SPORT_COLORS = ['#7c3aed', '#a855f7', '#22d3ee', '#34d399', '#f59e0b', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold mb-1 text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function UserStats() {
  const { tokenBalance } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [picks, setPicks] = useState([]);
  const [allPicks, setAllPicks] = useState([]);
  const [contests, setContests] = useState({});

  useEffect(() => {
    (async () => {
      const [me, myPicks, contestsData, allPicksData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Pick.list('-created_date', 200),
        base44.entities.Contest.list('-created_date', 200),
        base44.entities.Pick.list('-created_date', 500),
      ]);
      setUser(me);
      setPicks(myPicks);
      const contestMap = {};
      contestsData.forEach(c => { contestMap[c.id] = c; });
      setContests(contestMap);
      setAllPicks(allPicksData);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  // --- Computed stats ---
  const total = picks.length;
  const won = picks.filter(p => p.status === 'won').length;
  const lost = picks.filter(p => p.status === 'lost').length;
  const tokensWon = picks.reduce((s, p) => s + (p.tokens_won || 0), 0);
  const tokensSpent = picks.reduce((s, p) => s + (p.tokens_spent || 0), 0);
  const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;
  const netProfit = tokensWon - tokensSpent;

  // Platform avg win rate
  const platformWins = allPicks.filter(p => p.status === 'won').length;
  const platformTotal = allPicks.length;
  const platformWinRate = platformTotal > 0 ? ((platformWins / platformTotal) * 100).toFixed(1) : 0;
  const platformNetPerUser = platformTotal > 0
    ? ((allPicks.reduce((s, p) => s + (p.tokens_won || 0), 0) - allPicks.reduce((s, p) => s + (p.tokens_spent || 0), 0)) / new Set(allPicks.map(p => p.user_email)).size).toFixed(0)
    : 0;

  // Win rate per sport
  const sportStats = {};
  picks.forEach(pick => {
    const contest = contests[pick.contest_id];
    const sport = contest?.sport || 'Ostalo';
    if (!sportStats[sport]) sportStats[sport] = { sport, total: 0, won: 0, tokensWon: 0, tokensSpent: 0 };
    sportStats[sport].total++;
    if (pick.status === 'won') sportStats[sport].won++;
    sportStats[sport].tokensWon += (pick.tokens_won || 0);
    sportStats[sport].tokensSpent += (pick.tokens_spent || 0);
  });
  const sportData = Object.values(sportStats).map(s => ({
    ...s,
    winRate: s.total > 0 ? parseFloat(((s.won / s.total) * 100).toFixed(1)) : 0,
    profit: s.tokensWon - s.tokensSpent,
  })).sort((a, b) => b.total - a.total);

  // Earnings over time (last 10 picks)
  let runningBalance = 0;
  const earningsHistory = [...picks].reverse().map((pick, i) => {
    runningBalance += (pick.tokens_won || 0) - (pick.tokens_spent || 0);
    return {
      i: i + 1,
      zarada: runningBalance,
      datum: moment(pick.created_date).format('DD.MM'),
    };
  });

  // Monthly breakdown
  const monthlyMap = {};
  picks.forEach(pick => {
    const month = moment(pick.created_date).format('MMM YY');
    if (!monthlyMap[month]) monthlyMap[month] = { month, won: 0, lost: 0, tokensWon: 0 };
    if (pick.status === 'won') monthlyMap[month].won++;
    else if (pick.status === 'lost') monthlyMap[month].lost++;
    monthlyMap[month].tokensWon += (pick.tokens_won || 0);
  });
  const monthlyData = Object.values(monthlyMap).slice(-6);

  // Radar data (by sport)
  const radarData = sportData.slice(0, 6).map(s => ({
    sport: s.sport,
    'Win %': s.winRate,
    'Prosjek': parseFloat(platformWinRate),
  }));

  const comparisonDelta = parseFloat(winRate) - parseFloat(platformWinRate);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1">Moja Statistika</h1>
        <p className="text-muted-foreground text-sm">Detaljna analiza tvojih oklada i usporedba s platformom</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Ukupno tiketa', value: total, icon: Target, color: 'text-muted-foreground' },
          { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-primary' },
          { label: 'Ukupno zarađeno', value: `+${tokensWon.toLocaleString()}`, icon: Trophy, color: 'text-accent' },
          { label: 'Neto profit', value: (netProfit >= 0 ? '+' : '') + netProfit.toLocaleString(), icon: Coins, color: netProfit >= 0 ? 'text-green-400' : 'text-destructive' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Comparison vs Platform */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="p-5 rounded-2xl bg-card border border-border/50 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Usporedba s platformom
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Tvoj win rate', value: `${winRate}%`, sub: `Platforma: ${platformWinRate}%`, delta: comparisonDelta },
            { label: 'Tvoj neto profit', value: netProfit.toLocaleString(), sub: `Prosjek: ${Number(platformNetPerUser).toLocaleString()}`, delta: netProfit - Number(platformNetPerUser) },
            { label: 'Broj tiketa', value: total, sub: `Ukupno platformi: ${platformTotal}`, delta: null },
          ].map((row, i) => (
            <div key={i} className="p-4 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">{row.label}</p>
              <p className="text-2xl font-black">{row.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.sub}</p>
              {row.delta !== null && (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-bold ${row.delta > 0 ? 'text-green-400' : row.delta < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {row.delta > 0 ? <ArrowUp className="w-3 h-3" /> : row.delta < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {Math.abs(row.delta).toFixed(1)} od prosjeka
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {/* Earnings over time */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl bg-card border border-border/50">
          <h2 className="font-bold mb-4">Kumulativna zarada</h2>
          {earningsHistory.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Premalo podataka</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={earningsHistory}>
                <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="zarada" stroke="hsl(262 83% 65%)" strokeWidth={2} dot={false} name="Zarada" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Monthly wins/losses */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="p-5 rounded-2xl bg-card border border-border/50">
          <h2 className="font-bold mb-4">Rezultati po mjesecu</h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Premalo podataka</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="won" name="Pobjede" fill="hsl(262 83% 65%)" radius={[4,4,0,0]} />
                <Bar dataKey="lost" name="Porazi" fill="hsl(0 62% 50%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Sport breakdown */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="p-5 rounded-2xl bg-card border border-border/50 mb-6">
        <h2 className="font-bold mb-4">Win rate po sportu</h2>
        {sportData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nema podataka</p>
        ) : (
          <div className="space-y-3">
            {sportData.map((s, i) => (
              <div key={s.sport} className="flex items-center gap-3">
                <span className="w-24 text-sm font-semibold truncate">{s.sport}</span>
                <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.winRate}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: SPORT_COLORS[i % SPORT_COLORS.length] }}
                  />
                </div>
                <span className="text-sm font-bold w-12 text-right" style={{ color: SPORT_COLORS[i % SPORT_COLORS.length] }}>{s.winRate}%</span>
                <span className="text-xs text-muted-foreground w-16 text-right">{s.won}/{s.total} tiketa</span>
                <span className={`text-xs font-bold w-16 text-right ${s.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.profit >= 0 ? '+' : ''}{s.profit.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Radar - sport comparison */}
      {radarData.length >= 3 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="p-5 rounded-2xl bg-card border border-border/50">
          <h2 className="font-bold mb-4">Uspješnost vs prosjek platforme</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(0 0% 14%)" />
              <PolarAngleAxis dataKey="sport" tick={{ fontSize: 11, fill: '#888' }} />
              <Radar name="Ti" dataKey="Win %" stroke="hsl(262 83% 65%)" fill="hsl(262 83% 65%)" fillOpacity={0.3} />
              <Radar name="Prosjek" dataKey="Prosjek" stroke="hsl(280 91% 68%)" fill="hsl(280 91% 68%)" fillOpacity={0.15} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary inline-block" /> Ti</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent inline-block" /> Prosjek platforme</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
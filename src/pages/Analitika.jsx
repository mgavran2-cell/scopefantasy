import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, Coins, Trophy, Crown, Medal, Flame } from 'lucide-react';
import moment from 'moment';

const SPORT_COLORS = {
  'Nogomet': '#7c3aed',
  'Košarka': '#22d3ee',
  'Tenis':   '#34d399',
  'Formula 1': '#f59e0b',
  'Hokej':   '#f43f5e',
  'MMA':     '#a855f7',
  'Ostalo':  '#64748b',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold mb-1 text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name !== 'Win Rate %' ? p.value.toLocaleString() : p.value}
          {p.name === 'Win Rate %' ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

function TopPerformerCard({ rank, entry }) {
  const icons = [Crown, Trophy, Medal];
  const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
  const bgs = ['bg-yellow-400/10 border-yellow-400/30', 'bg-gray-300/10 border-gray-300/30', 'bg-amber-600/10 border-amber-600/30'];
  const Icon = icons[rank] || Flame;
  const color = colors[rank] || 'text-primary';
  const bg = bgs[rank] || 'bg-primary/10 border-primary/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className={`flex items-center gap-3 p-4 rounded-2xl border ${bg}`}
    >
      <Icon className={`w-6 h-6 shrink-0 ${color}`} />
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <span className="font-black text-sm">{entry.name?.charAt(0).toUpperCase() || '?'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{entry.name}</p>
        <p className="text-xs text-muted-foreground">{entry.won}/{entry.total} pobjeda</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-lg font-black ${color}`}>{entry.winRate}%</p>
        <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
          <Coins className="w-3 h-3" /> +{(entry.tokensWon || 0).toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

export default function Analitika() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [myPicks, setMyPicks] = useState([]);
  const [allPicks, setAllPicks] = useState([]);
  const [contests, setContests] = useState({});

  useEffect(() => {
    (async () => {
      const [me, myPicksData, contestsData, allPicksData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Pick.list('-created_date', 300),
        base44.entities.Contest.list('-created_date', 300),
        base44.entities.Pick.list('-created_date', 1000),
      ]);
      setUser(me);

      const contestMap = {};
      contestsData.forEach(c => { contestMap[c.id] = c; });
      setContests(contestMap);

      // Filter my picks
      const mine = myPicksData.filter(p => p.user_email === me.email || p.created_by === me.email);
      setMyPicks(mine);
      setAllPicks(allPicksData.filter(p => !p.user_email?.startsWith('deleted_user_')));
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  // ── Win Rate po tjednima (zadnjih 8 tjedana) ──────────────────────────
  const weeklyData = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = moment().subtract(w, 'weeks').startOf('isoWeek');
    const weekEnd = weekStart.clone().endOf('isoWeek');
    const label = weekStart.format('DD.MM');
    const weekPicks = myPicks.filter(p =>
      moment(p.created_date).isBetween(weekStart, weekEnd, null, '[]')
    );
    const won = weekPicks.filter(p => p.status === 'won').length;
    const total = weekPicks.length;
    const winRate = total > 0 ? parseFloat(((won / total) * 100).toFixed(1)) : null;
    weeklyData.push({ tjedan: label, 'Win Rate %': winRate, tiketi: total });
  }

  // ── Profit/Loss po sportovima ─────────────────────────────────────────
  const sportMap = {};
  myPicks.forEach(pick => {
    const contest = contests[pick.contest_id];
    const sport = contest?.sport || 'Ostalo';
    if (!sportMap[sport]) sportMap[sport] = { sport, zarada: 0, ulog: 0, won: 0, total: 0 };
    sportMap[sport].ulog += (pick.tokens_spent || 0);
    sportMap[sport].zarada += (pick.tokens_won || 0);
    sportMap[sport].total++;
    if (pick.status === 'won') sportMap[sport].won++;
  });
  const sportData = Object.values(sportMap)
    .map(s => ({
      ...s,
      profit: s.zarada - s.ulog,
      winRate: s.total > 0 ? parseFloat(((s.won / s.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit));

  // ── Zarada vs Ulog kumulativno ────────────────────────────────────────
  let cumEarned = 0, cumSpent = 0;
  const profitHistory = [...myPicks].reverse().slice(-20).map((pick, i) => {
    cumEarned += (pick.tokens_won || 0);
    cumSpent += (pick.tokens_spent || 0);
    return {
      i: i + 1,
      datum: moment(pick.created_date).format('DD.MM'),
      Zarada: cumEarned,
      Ulog: cumSpent,
      Neto: cumEarned - cumSpent,
    };
  });

  // ── Top Performers (zadnjih 30 dana, min 3 tiketa) ───────────────────
  const cutoff = moment().subtract(30, 'days');
  const recentPicks = allPicks.filter(p => moment(p.created_date).isAfter(cutoff));
  const perfMap = {};
  recentPicks.forEach(p => {
    const email = p.user_email || p.created_by;
    if (!email || email.startsWith('deleted_user_')) return;
    if (!perfMap[email]) perfMap[email] = { email, name: p.user_name || email, won: 0, total: 0, tokensWon: 0 };
    perfMap[email].total++;
    if (p.status === 'won') perfMap[email].won++;
    perfMap[email].tokensWon += (p.tokens_won || 0);
  });
  const topPerformers = Object.values(perfMap)
    .filter(u => u.total >= 3)
    .map(u => ({ ...u, winRate: parseFloat(((u.won / u.total) * 100).toFixed(1)) }))
    .sort((a, b) => b.winRate - a.winRate || b.tokensWon - a.tokensWon)
    .slice(0, 10);

  const hasPickData = myPicks.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-black tracking-wide uppercase flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" /> Analitika
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Tjedna uspješnost, profit po sportovima i ljestvica igrača</p>
      </motion.div>

      {/* ── Win Rate po tjednima ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border/50 bg-card p-5 mb-6">
        <h2 className="font-bold mb-1">Win Rate po tjednima</h2>
        <p className="text-xs text-muted-foreground mb-4">Postotak pobjeda po tjednu (zadnjih 8 tjedana)</p>
        {!hasPickData ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nema dovoljno podataka. Počni igrati!</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(262 83% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
              <XAxis dataKey="tjedan" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#888' }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Win Rate %"
                stroke="hsl(262 83% 65%)"
                fill="url(#winRateGrad)"
                strokeWidth={2.5}
                dot={{ fill: 'hsl(262 83% 65%)', r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── Zarada vs Ulog ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card p-5 mb-6">
        <h2 className="font-bold mb-1">Zarada vs Ulog (zadnjih 20 tiketa)</h2>
        <p className="text-xs text-muted-foreground mb-4">Kumulativna zarada u odnosu na kumulativni ulog tokena</p>
        {profitHistory.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Premalo tiketa. Potrebno minimum 2.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={profitHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
              <XAxis dataKey="datum" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Zarada" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Ulog" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Neto" stroke="hsl(262 83% 65%)" strokeWidth={2.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── Profit/Loss po sportovima ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/50 bg-card p-5 mb-8">
        <h2 className="font-bold mb-1">Profit / Loss po sportovima</h2>
        <p className="text-xs text-muted-foreground mb-4">Neto zarada (zarađeno − uloženo) po sportu</p>
        {sportData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nema podataka</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sportData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis type="category" dataKey="sport" tick={{ fontSize: 11, fill: '#ccc' }} width={72} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Neto profit" radius={[0, 6, 6, 0]}>
                  {sportData.map((entry, i) => (
                    <rect key={i} fill={entry.profit >= 0 ? '#34d399' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Sport table */}
            <div className="mt-4 space-y-2">
              {sportData.map((s, i) => (
                <div key={s.sport} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SPORT_COLORS[s.sport] || '#64748b' }} />
                  <span className="text-sm font-semibold w-24 truncate">{s.sport}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(s.winRate, 100)}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: SPORT_COLORS[s.sport] || '#64748b' }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: SPORT_COLORS[s.sport] || '#64748b' }}>
                    {s.winRate}%
                  </span>
                  <span className={`text-xs font-bold w-20 text-right ${s.profit >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                    {s.profit >= 0 ? '+' : ''}{s.profit.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* ── Top Performers ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-5 h-5 text-yellow-400" />
          <div>
            <h2 className="font-bold">Top Performers</h2>
            <p className="text-xs text-muted-foreground">Igrači s najboljim Win Rate-om u zadnjih 30 dana (min. 3 tiketa)</p>
          </div>
        </div>

        {topPerformers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-2xl border border-border/40 bg-card">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nema dovoljno podataka za zadnjih 30 dana</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPerformers.map((entry, i) => (
              <TopPerformerCard key={entry.email} rank={i} entry={entry} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
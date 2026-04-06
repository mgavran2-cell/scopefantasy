import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, RefreshCw, Wifi, TrendingUp, Target, Timer, Users, ChevronDown, ChevronUp } from 'lucide-react';

function StatBar({ label, homeVal, awayVal, homeTeam, awayTeam }) {
  const total = homeVal + awayVal;
  const homePct = total > 0 ? (homeVal / total) * 100 : 50;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span className="font-semibold text-foreground">{homeVal}{typeof homeVal === 'number' && label.includes('%') ? '%' : ''}</span>
        <span className="font-medium">{label}</span>
        <span className="font-semibold text-foreground">{awayVal}{typeof awayVal === 'number' && label.includes('%') ? '%' : ''}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex">
        <motion.div
          animate={{ width: `${homePct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full bg-primary rounded-l-full"
        />
        <div className="flex-1 h-full bg-accent/60 rounded-r-full" />
      </div>
    </div>
  );
}

export default function LiveMatchCenter({ contest }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef(null);

  const fetchStats = async () => {
    setLoading(true);
    const players = contest.players?.map(p => `${p.name} (${p.team})`).join(', ') || '';
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate realistic LIVE match statistics for a ${contest.sport} contest titled "${contest.title}".
Players involved: ${players}.
Return current live match stats as if the match is in progress.
Include: match time/minute, score if applicable, and key stats for the sport.
For football/soccer: possession %, shots on target, total shots, corners, fouls.
For basketball: points, rebounds, assists, field goal %.
For tennis: sets, games, aces, errors.
For F1: lap number, gap to leader, tire compound.
For MMA/hockey: similar relevant stats.
Also include a brief 1-sentence "live commentary" about the current moment.
Make the numbers realistic and varied, not 50/50.`,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          match_time: { type: 'string' },
          score: { type: 'string' },
          home_team: { type: 'string' },
          away_team: { type: 'string' },
          live_commentary: { type: 'string' },
          stats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                home: { type: 'number' },
                away: { type: 'number' },
              }
            }
          },
          player_highlights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                stat: { type: 'string' },
                value: { type: 'string' },
                trend: { type: 'string', enum: ['up', 'down', 'neutral'] }
              }
            }
          }
        }
      }
    });
    setStats(result);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 60000); // refresh every 60s
    return () => clearInterval(intervalRef.current);
  }, [contest.id]);

  const trendColor = (t) => t === 'up' ? 'text-primary' : t === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const trendIcon = (t) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-black text-sm uppercase tracking-wide">Live Match Center</span>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              · osvježeno {lastUpdated.toLocaleTimeString('hr', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-secondary transition-all text-muted-foreground">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            {loading && !stats ? (
              <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
                <span className="text-sm">Učitavanje live statistike...</span>
              </div>
            ) : stats ? (
              <div className="p-5">
                {/* Score & Time */}
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-xs font-bold text-red-400 mb-3">
                    <Timer className="w-3 h-3" /> {stats.match_time}
                  </div>
                  {stats.score && (
                    <div className="text-3xl font-display font-black tracking-wide mb-1">{stats.score}</div>
                  )}
                  <div className="flex items-center justify-center gap-3 text-sm font-semibold text-muted-foreground">
                    <span>{stats.home_team}</span>
                    <span className="text-xs">vs</span>
                    <span>{stats.away_team}</span>
                  </div>
                </div>

                {/* Live commentary */}
                {stats.live_commentary && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-secondary/50 border border-border/30">
                    <p className="text-xs text-muted-foreground leading-relaxed italic">💬 {stats.live_commentary}</p>
                  </div>
                )}

                {/* Stats bars */}
                {stats.stats?.length > 0 && (
                  <div className="mb-5">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground mb-3">
                      <span>{stats.home_team}</span>
                      <span>Statistika</span>
                      <span>{stats.away_team}</span>
                    </div>
                    {stats.stats.map((s, i) => (
                      <StatBar key={i} label={s.label} homeVal={s.home} awayVal={s.away} homeTeam={stats.home_team} awayTeam={stats.away_team} />
                    ))}
                  </div>
                )}

                {/* Player highlights */}
                {stats.player_highlights?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Igrači u fokusu</p>
                    <div className="grid grid-cols-2 gap-2">
                      {stats.player_highlights.slice(0, 4).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40 border border-border/30">
                          <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${trendColor(p.trend)}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.stat}: <span className={`font-bold ${trendColor(p.trend)}`}>{p.value} {trendIcon(p.trend)}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground/50 mt-4 flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3" /> Auto-refresh svakih 60s
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap } from 'lucide-react';

function OddsTicket({ player, currentOdds, prevOdds, userChoice }) {
  const overOdds = currentOdds?.over ?? 1.90;
  const underOdds = currentOdds?.under ?? 1.90;
  const prevOver = prevOdds?.over ?? overOdds;
  const prevUnder = prevOdds?.under ?? underOdds;

  const overDir = overOdds > prevOver ? 'up' : overOdds < prevOver ? 'down' : 'neutral';
  const underDir = underOdds > prevUnder ? 'up' : underOdds < prevUnder ? 'down' : 'neutral';

  const dirColor = (d) => d === 'up' ? 'text-green-400' : d === 'down' ? 'text-red-400' : 'text-muted-foreground';
  const dirBg = (d) => d === 'up' ? 'bg-green-400/10' : d === 'down' ? 'bg-red-400/10' : '';
  const DirIcon = (d) => d === 'up' ? TrendingUp : d === 'down' ? TrendingDown : Minus;

  const isUserOver = userChoice === 'over';
  const isUserUnder = userChoice === 'under';

  return (
    <div className={`rounded-xl border p-3 transition-all ${userChoice ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-card'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">{player.name}</p>
          <p className="text-xs text-muted-foreground">{player.stat_type} {player.over_under}</p>
        </div>
        {userChoice && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold shrink-0 ml-2">
            Tvoj odabir: {userChoice === 'over' ? 'VIŠE' : 'MANJE'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Over */}
        <motion.div
          key={`over-${overOdds}`}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          className={`flex items-center justify-between px-3 py-2 rounded-lg ${dirBg(overDir)} ${isUserOver ? 'ring-1 ring-primary' : ''}`}
        >
          <span className="text-xs text-muted-foreground">VIŠE</span>
          <div className="flex items-center gap-1">
            {(() => { const I = DirIcon(overDir); return <I className={`w-3 h-3 ${dirColor(overDir)}`} />; })()}
            <span className={`text-sm font-black ${dirColor(overDir)}`}>{overOdds.toFixed(2)}</span>
          </div>
        </motion.div>
        {/* Under */}
        <motion.div
          key={`under-${underOdds}`}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          className={`flex items-center justify-between px-3 py-2 rounded-lg ${dirBg(underDir)} ${isUserUnder ? 'ring-1 ring-primary' : ''}`}
        >
          <span className="text-xs text-muted-foreground">MANJE</span>
          <div className="flex items-center gap-1">
            {(() => { const I = DirIcon(underDir); return <I className={`w-3 h-3 ${dirColor(underDir)}`} />; })()}
            <span className={`text-sm font-black ${dirColor(underDir)}`}>{underOdds.toFixed(2)}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LiveOddsPanel({ contest, selections }) {
  const [odds, setOdds] = useState({});       // { playerName: { over, under } }
  const [prevOdds, setPrevOdds] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const intervalRef = useRef(null);

  const fetchOdds = async () => {
    if (!contest.players?.length) return;
    setLoading(true);
    const playerList = contest.players.map(p => `${p.name} - ${p.stat_type} ${p.over_under} (${p.team})`).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate realistic LIVE betting odds for these players in a ${contest.sport} match.
For each player, provide over/under decimal odds (European format, typically between 1.50 and 2.50).
Odds should reflect realistic market movement - some slightly above 2.00, some below, based on recent performance.
Add natural variance to simulate live market movement.

Players:
${playerList}`,
      response_json_schema: {
        type: 'object',
        properties: {
          odds: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                player_name: { type: 'string' },
                over: { type: 'number' },
                under: { type: 'number' }
              }
            }
          }
        }
      }
    });

    const newOdds = {};
    result.odds?.forEach(o => { newOdds[o.player_name] = { over: o.over, under: o.under }; });
    setPrevOdds(prev => ({ ...prev, ...odds }));
    setOdds(newOdds);
    setLastUpdated(new Date());
    setFlashKey(k => k + 1);
    setLoading(false);
  };

  useEffect(() => {
    fetchOdds();
    intervalRef.current = setInterval(fetchOdds, 45000);
    return () => clearInterval(intervalRef.current);
  }, [contest.id]);

  if (!contest.players?.length) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Zap className="w-4 h-4 text-accent" />
          <span className="font-black text-sm uppercase tracking-wide">Live Kvote</span>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              · {lastUpdated.toLocaleTimeString('hr', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOdds}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setCollapsed(v => !v)} className="text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-all">
            {collapsed ? 'Prikaži' : 'Sakrij'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            key={flashKey}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading && Object.keys(odds).length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-muted border-t-accent rounded-full animate-spin" />
                <span className="text-sm">Dohvaćanje live kvota...</span>
              </div>
            ) : (
              <div className="p-4 grid gap-3 sm:grid-cols-2">
                {contest.players.map(player => (
                  <OddsTicket
                    key={player.name}
                    player={player}
                    currentOdds={odds[player.name]}
                    prevOdds={prevOdds[player.name]}
                    userChoice={selections?.[player.name]}
                  />
                ))}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground/50 pb-3 flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3" /> Auto-refresh svakih 45s
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
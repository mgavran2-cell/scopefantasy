import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, Coins, Trophy, Clock, XCircle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import moment from 'moment';

const STATUS_FILTERS = [
  { key: 'all',    label: 'Sve',      color: '' },
  { key: 'won',    label: 'Dobitni',  color: 'text-green-400' },
  { key: 'lost',   label: 'Gubici',   color: 'text-destructive' },
  { key: 'active', label: 'Čekanje',  color: 'text-yellow-400' },
];

const STATUS_CONFIG = {
  won:    { label: 'Dobitni',  icon: Trophy,    bg: 'bg-green-500/10 border-green-500/25',   text: 'text-green-400' },
  lost:   { label: 'Gubitak', icon: XCircle,   bg: 'bg-destructive/10 border-destructive/25', text: 'text-destructive' },
  active: { label: 'Čekanje', icon: Clock,     bg: 'bg-yellow-500/10 border-yellow-500/25', text: 'text-yellow-400' },
  partial:{ label: 'Djelom.',  icon: TrendingUp, bg: 'bg-accent/10 border-accent/25',         text: 'text-accent' },
};

const CHOICE_LABEL = { over: 'VIŠE', under: 'MANJE', vise: 'VIŠE', manje: 'MANJE' };
const RESULT_COLOR = { win: 'text-green-400', loss: 'text-destructive', pending: 'text-muted-foreground' };

function PickCard({ pick, contestMap }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[pick.status] || STATUS_CONFIG.active;
  const Icon = cfg.icon;
  const contest = contestMap[pick.contest_id];
  const profit = (pick.tokens_won || 0) - (pick.tokens_spent || 0);
  const isWon = pick.status === 'won';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${cfg.bg} overflow-hidden`}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl bg-card flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${cfg.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {contest?.title || `Natjecanje`}
          </p>
          <p className="text-xs text-muted-foreground">
            {contest?.sport && <span className="mr-2">{contest.sport}</span>}
            {moment(pick.created_date).format('DD.MM.YYYY · HH:mm')}
          </p>
        </div>

        {/* Payout indicator */}
        <div className="text-right shrink-0">
          {isWon ? (
            <div className="flex flex-col items-end">
              <span className="text-green-400 font-black text-sm flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +{(pick.tokens_won || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-green-400/70 font-semibold">
                profit +{profit.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span className={`font-bold text-sm flex items-center gap-1 ${cfg.text}`}>
                <Coins className="w-3.5 h-3.5" />
                {(pick.tokens_spent || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground">uloženo</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-3">
              {/* Token summary */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[
                  { label: 'Uloženo', value: (pick.tokens_spent || 0).toLocaleString(), color: 'text-foreground' },
                  { label: 'Dobiveno', value: (pick.tokens_won || 0).toLocaleString(), color: isWon ? 'text-green-400' : 'text-muted-foreground' },
                  { label: 'Profit', value: (profit >= 0 ? '+' : '') + profit.toLocaleString(), color: profit > 0 ? 'text-green-400' : profit < 0 ? 'text-destructive' : 'text-muted-foreground' },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl bg-card/60 p-3 text-center">
                    <p className={`font-black text-base ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Selections */}
              {pick.selections?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odabiri</p>
                  {pick.selections.map((sel, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-card/40 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{sel.player_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sel.stat_type} · {sel.over_under} · <span className="font-bold">{CHOICE_LABEL[sel.choice] || sel.choice}</span>
                        </p>
                      </div>
                      {sel.result && sel.result !== 'pending' && (
                        <span className={`text-xs font-black ${RESULT_COLOR[sel.result]}`}>
                          {sel.result === 'win' ? '✓ WIN' : '✗ LOSS'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Correct picks badge */}
              {pick.correct_picks != null && pick.total_picks != null && (
                <p className="text-xs text-muted-foreground text-right">
                  {pick.correct_picks}/{pick.total_picks} točnih odabira
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Povijest() {
  const [picks, setPicks] = useState([]);
  const [contestMap, setContestMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const [myPicks, contests] = await Promise.all([
        base44.entities.Pick.filter({ user_email: me.email }, '-created_date', 200),
        base44.entities.Contest.list('-created_date', 200),
      ]);
      const map = {};
      contests.forEach(c => { map[c.id] = c; });
      setPicks(myPicks);
      setContestMap(map);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? picks : picks.filter(p => p.status === filter);

  const stats = {
    won:   picks.filter(p => p.status === 'won').length,
    lost:  picks.filter(p => p.status === 'lost').length,
    active: picks.filter(p => p.status === 'active').length,
    totalWon:   picks.reduce((s, p) => s + (p.tokens_won || 0), 0),
    totalSpent: picks.reduce((s, p) => s + (p.tokens_spent || 0), 0),
  };
  const winRate = picks.length > 0 ? Math.round((stats.won / picks.filter(p => p.status !== 'active').length || 0) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <ListChecks className="w-7 h-7 text-primary" /> Povijest listića
        </h1>
        <p className="text-muted-foreground text-sm">Pregled svih tvojih odigranih listića</p>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Win Rate',    value: `${winRate}%`,                       color: 'text-primary' },
            { label: 'Dobitnih',   value: stats.won,                            color: 'text-green-400' },
            { label: 'Zarađeno',   value: stats.totalWon.toLocaleString(),      color: 'text-accent' },
            { label: 'Profit',     value: (stats.totalWon - stats.totalSpent >= 0 ? '+' : '') + (stats.totalWon - stats.totalSpent).toLocaleString(), color: stats.totalWon >= stats.totalSpent ? 'text-green-400' : 'text-destructive' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card border border-border/50 p-4 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === f.key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {f.key !== 'all' && !loading && (
              <span className="ml-1.5 opacity-60 text-xs">
                ({f.key === 'won' ? stats.won : f.key === 'lost' ? stats.lost : stats.active})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ListChecks className="w-14 h-14 text-muted-foreground/25 mx-auto mb-4" />
          <p className="font-semibold text-muted-foreground">Nema listića za ovaj filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pick, i) => (
            <PickCard key={pick.id} pick={pick} contestMap={contestMap} />
          ))}
        </div>
      )}
    </div>
  );
}
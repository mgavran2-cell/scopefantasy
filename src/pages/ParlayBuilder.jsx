import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Layers, Plus, X, TrendingUp, TrendingDown, Coins, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import moment from 'moment';

const BASE_ODDS = 1.85; // base odds per leg

const riskConfig = {
  low:     { label: 'Nizak rizik',    color: 'text-green-400',  bg: 'bg-green-400/15',  border: 'border-green-400/30',  legs: [1, 2] },
  medium:  { label: 'Srednji rizik',  color: 'text-yellow-400', bg: 'bg-yellow-400/15', border: 'border-yellow-400/30', legs: [3, 4] },
  high:    { label: 'Visok rizik',    color: 'text-orange-400', bg: 'bg-orange-400/15', border: 'border-orange-400/30', legs: [5, 6] },
  extreme: { label: 'Ekstremni rizik',color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/30', legs: [7, 99] },
};

function getRisk(count) {
  if (count <= 2) return 'low';
  if (count <= 4) return 'medium';
  if (count <= 6) return 'high';
  return 'extreme';
}

function calcOdds(count) {
  return parseFloat(Math.pow(BASE_ODDS, count).toFixed(2));
}

function SelectionRow({ sel, onRemove }) {
  const Icon = sel.choice === 'over' ? TrendingUp : TrendingDown;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{sel.player_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {sel.choice === 'over' ? 'Više' : 'Manje'} od {sel.over_under} {sel.stat_type} · {sel.contest_title}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-black text-accent">@{BASE_ODDS}</span>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ContestPicker({ contests, onAdd, existing }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-2">
      {contests.map(contest => {
        const isOpen = open === contest.id;
        const contestSelections = existing.filter(s => s.contest_id === contest.id);
        return (
          <div key={contest.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : contest.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{contest.sport === 'Nogomet' ? '⚽' : contest.sport === 'Košarka' ? '🏀' : contest.sport === 'Tenis' ? '🎾' : contest.sport === 'Formula 1' ? '🏎️' : contest.sport === 'Hokej' ? '🏒' : '🥊'}</span>
                <div className="text-left">
                  <p className="text-sm font-bold">{contest.title}</p>
                  <p className="text-xs text-muted-foreground">{contest.sport} · {contest.players?.length || 0} igrača</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contestSelections.length > 0 && (
                  <span className="text-xs bg-primary/15 text-primary font-black px-2 py-0.5 rounded-full">{contestSelections.length}</span>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2 border-t border-border/30 pt-3">
                    {(contest.players || []).map((player, i) => {
                      const alreadyOver = existing.some(s => s.contest_id === contest.id && s.player_name === player.name && s.choice === 'over');
                      const alreadyUnder = existing.some(s => s.contest_id === contest.id && s.player_name === player.name && s.choice === 'under');
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 py-1">
                          <div>
                            <p className="text-xs font-semibold">{player.name}</p>
                            <p className="text-xs text-muted-foreground">{player.over_under} {player.stat_type}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onAdd({ contest_id: contest.id, contest_title: contest.title, sport: contest.sport, player_name: player.name, stat_type: player.stat_type, over_under: player.over_under, choice: 'over', odds: BASE_ODDS, result: 'pending' })}
                              disabled={alreadyOver || alreadyUnder}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${alreadyOver ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'} disabled:opacity-50`}
                            >
                              Over
                            </button>
                            <button
                              onClick={() => onAdd({ contest_id: contest.id, contest_title: contest.title, sport: contest.sport, player_name: player.name, stat_type: player.stat_type, over_under: player.over_under, choice: 'under', odds: BASE_ODDS, result: 'pending' })}
                              disabled={alreadyOver || alreadyUnder}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${alreadyUnder ? 'bg-accent text-accent-foreground' : 'bg-accent/10 text-accent hover:bg-accent/20'} disabled:opacity-50`}
                            >
                              Under
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {(!contest.players || contest.players.length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-2">Nema dostupnih igrača</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function ParlayBuilder() {
  const { tokenBalance, loadBalance } = useOutletContext();
  const [contests, setContests] = useState([]);
  const [selections, setSelections] = useState([]);
  const [stake, setStake] = useState(100);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myParlays, setMyParlays] = useState([]);
  const [tab, setTab] = useState('builder');
  const [success, setSuccess] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [me, activeContests, parlays] = await Promise.all([
      base44.auth.me(),
      base44.entities.Contest.filter({ status: 'active' }, '-created_date', 20),
      base44.entities.Parlay.list('-created_date', 20),
    ]);
    setUser(me);
    setContests(activeContests);
    setMyParlays(parlays);
    setLoading(false);
  };

  const addSelection = (sel) => {
    setSelections(prev => [...prev, sel]);
  };

  const removeSelection = (idx) => {
    setSelections(prev => prev.filter((_, i) => i !== idx));
  };

  const totalOdds = calcOdds(selections.length);
  const potentialWin = Math.round(stake * totalOdds);
  const risk = getRisk(selections.length);
  const rc = riskConfig[risk];

  const submitParlay = async () => {
    if (selections.length < 2) return;
    if ((user?.token_balance || 0) < stake) return;
    setSubmitting(true);

    const newBalance = (user.token_balance || 0) - stake;
    await Promise.all([
      base44.entities.Parlay.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        selections,
        total_odds: totalOdds,
        stake_tokens: stake,
        potential_win: potentialWin,
        status: 'active',
        tokens_won: 0,
        risk_level: risk,
      }),
      base44.auth.updateMe({ token_balance: newBalance }),
      base44.entities.TokenTransaction.create({
        user_email: user.email,
        type: 'entry',
        amount: stake,
        description: `Parlay listić (${selections.length} odabira)`,
        balance_after: newBalance,
      }),
    ]);

    loadBalance();
    setUser(prev => ({ ...prev, token_balance: newBalance }));
    setSelections([]);
    setStake(100);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    await init();
    setSubmitting(false);
    setTab('moji');
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  const statusMap = {
    active:  { label: 'Aktivan',     color: 'bg-accent/20 text-accent' },
    won:     { label: 'Osvoji',      color: 'bg-primary/20 text-primary' },
    lost:    { label: 'Izgubljen',   color: 'bg-destructive/20 text-destructive' },
    partial: { label: 'Djelomičan', color: 'bg-muted text-muted-foreground' },
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Layers className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black tracking-wide">PARLAY LISTIĆ</h1>
            <p className="text-sm text-muted-foreground">Kombiniraj više ishoda, pomnoži koeficijente</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{ key: 'builder', label: 'Sastavi listić' }, { key: 'moji', label: `Moji listići (${myParlays.length})` }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Builder tab */}
        {tab === 'builder' && (
          <div className="space-y-5">
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/25">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Parlay listić je uspješno podnesen!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary card */}
            {selections.length > 0 && (
              <div className={`p-4 rounded-2xl border ${rc.border} ${rc.bg}`}>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Odabiri</p>
                    <p className="text-xl font-black">{selections.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ukupni koef.</p>
                    <p className="text-xl font-black text-accent">@{totalOdds}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Moguća zarada</p>
                    <p className="text-xl font-black text-primary">+{potentialWin.toLocaleString()}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${rc.color}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {rc.label}
                </div>
              </div>
            )}

            {/* My selections */}
            {selections.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">Moji odabiri</p>
                <div className="space-y-2">
                  <AnimatePresence>
                    {selections.map((sel, i) => (
                      <SelectionRow key={i} sel={sel} onRemove={() => removeSelection(i)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Stake + submit */}
            {selections.length >= 2 && (
              <div className="p-4 rounded-2xl bg-card border border-border/50">
                <p className="text-sm font-bold mb-3">Ulog (tokeni)</p>
                <div className="flex gap-2 mb-3">
                  {[50, 100, 250, 500].map(v => (
                    <button
                      key={v}
                      onClick={() => setStake(v)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${stake === v ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={stake}
                  onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50 mb-4"
                  placeholder="Upiši iznos..."
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Stanje: <strong className="text-foreground">{(user?.token_balance || 0).toLocaleString()}</strong></span>
                  <span>Pobijeda: <strong className="text-primary">+{potentialWin.toLocaleString()}</strong></span>
                </div>
                <button
                  onClick={submitParlay}
                  disabled={submitting || (user?.token_balance || 0) < stake}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {submitting
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Layers className="w-4 h-4" /> Potvrdi Parlay ({stake} tokena)</>
                  }
                </button>
                {(user?.token_balance || 0) < stake && (
                  <p className="text-xs text-destructive text-center mt-2">Nedovoljno tokena</p>
                )}
              </div>
            )}

            {selections.length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-2">Odaberi najmanje 2 ishoda za parlay listić</p>
            )}

            {/* Contest picker */}
            <div>
              <p className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">Aktivna natjecanja</p>
              {contests.length === 0
                ? <p className="text-center py-8 text-muted-foreground text-sm">Nema aktivnih natjecanja</p>
                : <ContestPicker contests={contests} onAdd={addSelection} existing={selections} />
              }
            </div>
          </div>
        )}

        {/* My parlays tab */}
        {tab === 'moji' && (
          <div className="space-y-3">
            {myParlays.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Još nisi podnio parlay listić</p>
              </div>
            ) : myParlays.map((p, i) => {
              const sc = statusMap[p.status] || statusMap.active;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-border/50 bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-black text-sm">{p.selections?.length || 0}-struki parlay</p>
                      <p className="text-xs text-muted-foreground">{moment(p.created_date).format('DD.MM.YYYY HH:mm')}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>{sc.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-lg bg-secondary p-2 text-center">
                      <p className="text-xs text-muted-foreground">Koef.</p>
                      <p className="font-black text-accent text-sm">@{p.total_odds}x</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-2 text-center">
                      <p className="text-xs text-muted-foreground">Ulog</p>
                      <p className="font-black text-sm">{p.stake_tokens}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-2 text-center">
                      <p className="text-xs text-muted-foreground">{p.status === 'won' ? 'Zarada' : 'Moguće'}</p>
                      <p className={`font-black text-sm ${p.status === 'won' ? 'text-primary' : ''}`}>+{p.tokens_won || p.potential_win}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(p.selections || []).map((sel, j) => {
                      const Icon = sel.choice === 'over' ? TrendingUp : TrendingDown;
                      const resultColor = sel.result === 'win' ? 'text-primary' : sel.result === 'loss' ? 'text-destructive' : 'text-muted-foreground';
                      return (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <Icon className={`w-3 h-3 shrink-0 ${resultColor}`} />
                          <span className="text-muted-foreground truncate">{sel.player_name} — {sel.choice === 'over' ? 'Više' : 'Manje'} od {sel.over_under} {sel.stat_type}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
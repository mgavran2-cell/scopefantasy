import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Swords, Clock, Check, X, Trophy, Coins, ChevronRight, BarChart2, Crown } from 'lucide-react';
import DuelLeaderboard from '../components/duels/DuelLeaderboard';
import { toast } from 'sonner';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';

const statusConfig = {
  pending:  { label: 'Na čekanju', color: 'bg-accent/20 text-accent' },
  accepted: { label: 'U tijeku',   color: 'bg-primary/20 text-primary' },
  declined: { label: 'Odbijeno',   color: 'bg-destructive/20 text-destructive' },
  finished: { label: 'Završeno',   color: 'bg-muted text-muted-foreground' },
};

export default function Duels() {
  const { loadBalance } = useOutletContext();
  const [duels, setDuels] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('incoming');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [me, duelData] = await Promise.all([
      base44.auth.me(),
      base44.entities.Duel.list('-created_date', 50),
    ]);
    setUser(me);
    setDuels(duelData);
    setLoading(false);
  };

  const incoming = duels.filter(d => d.opponent_email === user?.email && d.status === 'pending');
  const outgoing = duels.filter(d => d.challenger_email === user?.email);
  const active   = duels.filter(d =>
    (d.challenger_email === user?.email || d.opponent_email === user?.email) &&
    d.status === 'accepted'
  );
  const history  = duels.filter(d =>
    (d.challenger_email === user?.email || d.opponent_email === user?.email) &&
    (d.status === 'finished' || d.status === 'declined')
  );

  const accept = async (duel) => {
    if ((user?.token_balance || 0) < duel.stake_tokens) {
      return toast.error('Nemaš dovoljno tokena za prihvat!');
    }
    setProcessing(duel.id);
    // Deduct stake from opponent
    const newBalance = (user.token_balance || 0) - duel.stake_tokens;
    await base44.auth.updateMe({ token_balance: newBalance });
    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'entry',
      amount: -duel.stake_tokens,
      description: `Duel prihvaćen vs ${duel.challenger_name || duel.challenger_email}`,
      balance_after: newBalance,
    });
    await base44.entities.Duel.update(duel.id, {
      status: 'accepted',
      opponent_name: user.full_name || user.email,
    });
    await base44.entities.Notification.create({
      user_email: duel.challenger_email,
      type: 'duel_accepted',
      title: '⚔️ Duel prihvaćen!',
      body: `${user.full_name || user.email} je prihvatio tvoj duel izazov za natjecanje "${duel.contest_title}".`,
    });
    toast.success('Duel prihvaćen! Pobjednik uzima sve.');
    await loadBalance();
    loadData();
    setProcessing(null);
  };

  const decline = async (duel) => {
    setProcessing(duel.id);
    await base44.entities.Duel.update(duel.id, { status: 'declined' });
    // resolveDuel handles refund when status is declined
    await base44.functions.invoke('resolveDuel', { duel_id: duel.id });
    await base44.entities.Notification.create({
      user_email: duel.challenger_email,
      type: 'duel_declined',
      title: '❌ Duel odbijen',
      body: `${user.full_name || user.email} je odbio tvoj duel izazov. ${duel.stake_tokens} tokena vraćeno.`,
    });
    toast.info('Izazov odbijen.');
    loadData();
    setProcessing(null);
  };

  const resolve = async (duel) => {
    setProcessing(duel.id);
    const res = await base44.functions.invoke('resolveDuel', { duel_id: duel.id });
    if (res.data?.result === 'winner') {
      toast.success(res.data.winner_email === user.email ? '🏆 Pobijedio si!' : '💀 Izgubio si duel.');
    } else if (res.data?.result === 'tie') {
      toast.info('Neriješeno — tokeni vraćeni.');
    } else {
      toast.info(res.data?.message || 'Natjecanje još traje.');
    }
    await loadBalance();
    loadData();
    setProcessing(null);
  };

  const tabs = [
    { key: 'incoming',    label: 'Primljeni', count: incoming.length },
    { key: 'active',      label: 'Aktivni',   count: active.length },
    { key: 'outgoing',    label: 'Poslani',    count: outgoing.filter(d => d.status === 'pending').length },
    { key: 'history',     label: 'Povijest',   count: history.length },
    { key: 'leaderboard', label: '🏆 Ljestvica', count: 0 },
  ];

  const getList = () => {
    if (tab === 'incoming') return incoming;
    if (tab === 'active')   return active;
    if (tab === 'outgoing') return outgoing.filter(d => d.status === 'pending');
    return history;
  };

  const list = getList();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" /> Dueli
          </h1>
          <p className="text-muted-foreground text-sm">Pobjednik uzima cijeli pool tokena.</p>
        </div>
        <Link
          to="/dueli/statistika"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary border border-border/50 text-sm font-semibold hover:bg-secondary/80 transition-all"
        >
          <BarChart2 className="w-4 h-4 text-primary" /> Statistika
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === t.key ? 'bg-white/20' : 'bg-muted'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        <DuelLeaderboard />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Swords className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold">Nema duels ovdje</p>
          <p className="text-sm mt-1">Idi na natjecanje i izazovi prijatelja!</p>
          <Link to="/natjecanja" className="inline-flex items-center gap-1 mt-4 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            Natjecanja <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((duel, i) => {
            const isChallenger = duel.challenger_email === user?.email;
            const opponent = isChallenger
              ? (duel.opponent_name || duel.opponent_email)
              : (duel.challenger_name || duel.challenger_email);
            const sc = statusConfig[duel.status] || statusConfig.pending;
            const iWon = duel.status === 'finished' && duel.winner_email === user?.email;
            const iLost = duel.status === 'finished' && duel.winner_email && duel.winner_email !== user?.email;

            return (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border p-5 bg-card transition-all ${
                  iWon  ? 'border-primary/40 bg-primary/5' :
                  iLost ? 'border-destructive/30 bg-destructive/5' :
                  'border-border/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      <Swords className="w-4 h-4 text-primary" />
                      {isChallenger ? 'vs ' : 'Od: '}
                      <span className="text-foreground">{opponent}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{duel.contest_title}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>

                {/* Stake + pool */}
                <div className="flex items-center gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-accent" />
                    <span className="font-bold">{duel.stake_tokens} tokena</span>
                    <span className="text-muted-foreground">× 2 = </span>
                    <span className="font-black text-primary">{duel.stake_tokens * 2} pool</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {moment(duel.created_date).format('DD.MM HH:mm')}
                  </span>
                </div>

                {duel.message && (
                  <p className="text-xs italic text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2 mb-3">
                    "{duel.message}"
                  </p>
                )}

                {/* Winner badge */}
                {duel.status === 'finished' && (
                  <div className={`flex items-center gap-2 text-sm font-bold ${iWon ? 'text-primary' : 'text-muted-foreground'}`}>
                    {iWon ? (
                      <><Trophy className="w-4 h-4" /> Pobijedio si! +{duel.stake_tokens * 2} tokena</>
                    ) : duel.winner_email ? (
                      <><X className="w-4 h-4 text-destructive" /> Izgubio si duel</>
                    ) : (
                      <><span>Neriješeno — tokeni vraćeni</span></>
                    )}
                  </div>
                )}

                {/* Actions */}
                {tab === 'incoming' && duel.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => accept(duel)}
                      disabled={processing === duel.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {processing === duel.id
                        ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        : <><Check className="w-4 h-4" /> Prihvati (−{duel.stake_tokens})</>
                      }
                    </button>
                    <button
                      onClick={() => decline(duel)}
                      disabled={processing === duel.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-bold hover:text-foreground disabled:opacity-50 transition-all"
                    >
                      <X className="w-4 h-4" /> Odbij
                    </button>
                  </div>
                )}

                {tab === 'active' && (
                  <button
                    onClick={() => resolve(duel)}
                    disabled={processing === duel.id}
                    className="w-full mt-2 py-2.5 rounded-xl bg-secondary text-sm font-bold hover:text-foreground disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {processing === duel.id
                      ? <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      : <><Trophy className="w-4 h-4 text-primary" /> Provjeri rezultat</>
                    }
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
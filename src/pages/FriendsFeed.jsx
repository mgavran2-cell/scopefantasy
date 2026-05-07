import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, Activity, Swords, CheckCircle, XCircle, Clock, Coins, Trophy } from 'lucide-react';
import FollowButton from '../components/social/FollowButton';
import moment from 'moment';
import { toast } from 'sonner';

const statusConfig = {
  active:  { label: 'U tijeku', color: 'text-accent', bg: 'bg-accent/15' },
  won:     { label: 'Pobijedio', color: 'text-primary', bg: 'bg-primary/15' },
  lost:    { label: 'Izgubio', color: 'text-destructive', bg: 'bg-destructive/15' },
  partial: { label: 'Djelomično', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const duelStatusConfig = {
  pending:  { label: 'Čeka odgovor', color: 'text-accent' },
  accepted: { label: 'Prihvaćen', color: 'text-primary' },
  declined: { label: 'Odbijen', color: 'text-destructive' },
  finished: { label: 'Završen', color: 'text-muted-foreground' },
};

export default function FriendsFeed() {
  const [currentUser, setCurrentUser] = useState(null);
  const [follows, setFollows] = useState([]);
  const [friendPicks, setFriendPicks] = useState([]);
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('activity');

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const [followData, duelData] = await Promise.all([
        base44.entities.Follow.filter({ follower_email: user.email }),
        base44.entities.Duel.list('-created_date', 30),
      ]);
      setFollows(followData);
      setDuels(duelData);

      if (followData.length > 0) {
        const friendEmails = followData.map(f => f.following_email);
        const allPicks = await base44.entities.Pick.filter({ is_public: true }, '-created_date', 100);
        setFriendPicks(allPicks.filter(p => friendEmails.includes(p.user_email)));
      }
      setLoading(false);
    })();
  }, []);

  const respondDuel = async (duel, accept) => {
    await base44.entities.Duel.update(duel.id, { status: accept ? 'accepted' : 'declined' });
    setDuels(prev => prev.map(d => d.id === duel.id ? { ...d, status: accept ? 'accepted' : 'declined' } : d));
    toast.success(accept ? 'Izazov prihvaćen!' : 'Izazov odbijen.');
  };

  const myDuels = duels.filter(d => d.challenger_email === currentUser?.email || d.opponent_email === currentUser?.email);
  const pendingForMe = myDuels.filter(d => d.opponent_email === currentUser?.email && d.status === 'pending');

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" /> Prijatelji
        </h1>
        <p className="text-muted-foreground text-sm">Prati aktivnosti prijatelja i prihvati izazove</p>
      </div>

      {/* Pending duels banner */}
      {pendingForMe.length > 0 && (
        <div className="mb-5 p-4 rounded-2xl bg-primary/10 border border-primary/30">
          <p className="font-bold text-sm mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" /> {pendingForMe.length} neriješen{pendingForMe.length > 1 ? 'ih' : ''} izaz{pendingForMe.length > 1 ? 'ova' : 'ov'}!
          </p>
          {pendingForMe.map(duel => (
            <div key={duel.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-3 mb-2 last:mb-0">
              <div>
                <p className="font-bold text-sm">{duel.challenger_name} te izaziva</p>
                <p className="text-xs text-muted-foreground">{duel.contest_title} · {duel.stake_tokens} tokena</p>
                {duel.message && <p className="text-xs text-accent italic mt-0.5">"{duel.message}"</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => respondDuel(duel, true)} className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-all">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => respondDuel(duel, false)} className="p-2 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'activity', label: `Aktivnosti (${friendPicks.length})` }, { key: 'following', label: `Pratim (${follows.length})` }, { key: 'duels', label: `Dvoboji (${myDuels.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Activity tab */}
      {tab === 'activity' && (
        follows.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Ne pratiš nikoga još</h3>
            <p className="text-muted-foreground text-sm">Pronađi igrače na Ljestvici i zaprati ih da vidiš njihove aktivnosti ovdje.</p>
          </div>
        ) : friendPicks.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Igrači koje pratiš još nemaju aktivnosti. Provjeri opet uskoro!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friendPicks.map((pick, i) => {
              const sc = statusConfig[pick.status] || statusConfig.active;
              return (
                <motion.div key={pick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border/50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-black text-sm">{(pick.user_name || pick.user_email)?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{pick.user_name || pick.user_email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {moment(pick.created_date).fromNow()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-accent" /> {pick.tokens_spent} tokena</span>
                    <span>{pick.selections?.length} odabira</span>
                    {pick.tokens_won > 0 && <span className="flex items-center gap-1 font-bold text-primary"><Trophy className="w-3.5 h-3.5" /> +{pick.tokens_won}</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* Following tab */}
      {tab === 'following' && (
        follows.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Još ne pratiš nikoga. Idi na Ljestvicu i pronađi igrače koje želiš pratiti!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {follows.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm">{(f.following_name || f.following_email)?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{f.following_name || f.following_email}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.following_email}</p>
                </div>
                <FollowButton targetEmail={f.following_email} targetName={f.following_name} currentUserEmail={currentUser?.email} />
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Duels tab */}
      {tab === 'duels' && (
        myDuels.length === 0 ? (
          <div className="text-center py-16">
            <Swords className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Nema dvoboja još</h3>
            <p className="text-muted-foreground text-sm">Izazovi prijatelja unutar natjecanja klikom na "Izazovi prijatelja"!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myDuels.map((duel, i) => {
              const isChallenger = duel.challenger_email === currentUser?.email;
              const ds = duelStatusConfig[duel.status];
              return (
                <motion.div key={duel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 bg-card border border-border/50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm">
                        {isChallenger ? `Ti vs ${duel.opponent_name || duel.opponent_email}` : `${duel.challenger_name || duel.challenger_email} vs Ti`}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${ds.color}`}>{ds.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{duel.contest_title} · <span className="text-accent font-semibold">{duel.stake_tokens} tokena</span></p>
                  {duel.message && <p className="text-xs italic text-muted-foreground mt-1">"{duel.message}"</p>}
                  {duel.winner_email && <p className="text-xs font-bold text-primary mt-1">🏆 Pobjednik: {duel.winner_email === currentUser?.email ? 'Ti' : (duel.winner_email)}</p>}
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
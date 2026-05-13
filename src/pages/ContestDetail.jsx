import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Trophy, Users, Clock, Zap, Check, Eye, EyeOff, Swords } from 'lucide-react';
import ContestLiveChat from '../components/contests/ContestLiveChat';
import LiveMatchCenter from '../components/contests/LiveMatchCenter';
import LiveOddsPanel from '../components/contests/LiveOddsPanel';
import DuelModal from '../components/social/DuelModal';
import SponsorBanner from '../components/contests/SponsorBanner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PlayerPickCard from '../components/contests/PlayerPickCard';
import moment from 'moment';
import { awardBadges } from '@/lib/awardBadges';
import BadgeAwardToast from '../components/badges/BadgeAwardToast';

export default function ContestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tokenBalance, loadBalance } = useOutletContext();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [user, setUser] = useState(null);
  const [showDuelModal, setShowDuelModal] = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  useEffect(() => {
    loadContest();
  }, [id]);

  const loadContest = async () => {
    const [data, me] = await Promise.all([
      base44.entities.Contest.list(),
      base44.auth.me(),
    ]);
    const found = data.find(c => c.id === id);
    setContest(found);
    setUser(me);
    setLoading(false);
  };

  const handleSelect = (playerName, choice) => {
    setSelections(prev => {
      if (prev[playerName] === choice) {
        const next = { ...prev };
        delete next[playerName];
        return next;
      }
      return { ...prev, [playerName]: choice };
    });
  };

  const handleSubmit = async () => {
    if (!contest) return;
    const required = contest.picks_required || contest.players?.length || 5;
    const selected = Object.keys(selections).length;

    if (selected < required) {
      toast.error(`Trebaš odabrati ${required} igrača. Odabrano: ${selected}`);
      return;
    }

    if (tokenBalance < contest.entry_cost) {
      toast.error('Nemaš dovoljno tokena!');
      return;
    }

    setSubmitting(true);

    const pickSelections = Object.entries(selections).map(([playerName, choice]) => {
      const player = contest.players?.find(p => p.name === playerName);
      return {
        player_name: playerName,
        team: player?.team || '',
        choice,
        stat_type: player?.stat_type || '',
        over_under: player?.over_under || 0,
      };
    });

    const res = await base44.functions.invoke('submitPick', {
      contest_id: contest.id,
      selections: pickSelections,
      is_public: isPublic,
    });

    if (res.data?.error) {
      toast.error(res.data.error);
      setSubmitting(false);
      return;
    }

    await loadBalance();

    // Check for new badges
    const freshUser = await base44.auth.me();
    const awarded = await awardBadges(freshUser);
    if (awarded.length > 0) {
      setNewBadges(awarded);
    } else {
      toast.success('Listić uspješno podnesen!');
      navigate('/moji-odabiri');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (newBadges.length > 0) {
    return (
      <BadgeAwardToast
        badges={newBadges}
        onDone={() => navigate('/moji-odabiri')}
      />
    );
  }

  if (!contest) {
    return (
      <div className="text-center py-20 px-4">
        <h2 className="text-xl font-bold mb-2">Natjecanje nije pronađeno</h2>
        <Button variant="outline" onClick={() => navigate('/natjecanja')}>Natrag</Button>
      </div>
    );
  }

  const required = contest.picks_required || contest.players?.length || 5;
  const selected = Object.keys(selections).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Natrag</span>
      </button>

      <SponsorBanner contest={contest} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold mb-3 ${
            contest.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'
          }`}>
            {contest.status === 'active' ? '🔴 Uživo' : 'Uskoro'}
          </div>
          <h1 className="text-3xl font-black mb-2">{contest.title}</h1>
          {contest.description && <p className="text-muted-foreground">{contest.description}</p>}

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-accent" />
              <span className="font-bold text-accent">{contest.entry_cost} tokena</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">{contest.prize_pool?.toLocaleString()} nagrada</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{contest.current_participants || 0} igrača</span>
            </div>
            {contest.start_time && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{moment(contest.start_time).format('DD.MM.YYYY HH:mm')}</span>
              </div>
            )}
            {user && contest.status === 'active' && (
              <button onClick={() => setShowDuelModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                <Swords className="w-3.5 h-3.5" /> Izazovi prijatelja
              </button>
            )}
          </div>
        </div>
      </motion.div>
      {showDuelModal && user && contest && (
        <DuelModal contest={contest} currentUser={user} onClose={() => setShowDuelModal(false)} />
      )}

      {/* Progress bar */}
      <div className="mb-6 p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Odabrano: {selected} / {required}</span>
          {selected >= required && (
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              <Check className="w-3.5 h-3.5" /> Sve odabrano
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((selected / required) * 100, 100)}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
      </div>

      {/* Player picks */}
      {contest.players && contest.players.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 mb-8">
          {contest.players.map((player, i) => (
            <PlayerPickCard
              key={player.name}
              player={player}
              selected={selections[player.name]}
              onSelect={handleSelect}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Igrači će uskoro biti dodani u ovo natjecanje.</p>
        </div>
      )}

      {/* Live Odds */}
      {contest.status === 'active' && contest.players?.length > 0 && (
        <LiveOddsPanel contest={contest} selections={selections} />
      )}

      {/* Live Match Center */}
      {contest.status === 'active' && (
        <LiveMatchCenter contest={contest} />
      )}

      {/* Live Chat */}
      {contest.status === 'active' && user && (
        <div className="mb-8">
          <ContestLiveChat contestId={contest.id} currentUser={user} />
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-4 z-30 space-y-2">
        {/* Privacy toggle */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => setIsPublic(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              isPublic
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-secondary border-border/50 text-muted-foreground'
            }`}
          >
            {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isPublic ? 'Javno (vidljivo svima)' : 'Privatno (samo ti vidiš)'}
          </button>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={selected < required || submitting}
          className="w-full py-6 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Pošalji Odabire ({contest.entry_cost} tokena)
            </>
          )}
        </Button>
        </div>
      </div>
      );
      }
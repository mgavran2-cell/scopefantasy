import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Coins, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function ContestWinnersPanel({ contest, onFinished }) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wonSet, setWonSet] = useState(new Set());
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadPicks();
  }, [contest.id]);

  const loadPicks = async () => {
    setLoading(true);
    const data = await base44.entities.Pick.filter({ contest_id: contest.id });
    setPicks(data);
    // Pre-check already-won picks
    const preWon = new Set(data.filter(p => p.status === 'won').map(p => p.id));
    setWonSet(preWon);
    setLoading(false);
  };

  const toggleWon = (pickId) => {
    setWonSet(prev => {
      const next = new Set(prev);
      if (next.has(pickId)) next.delete(pickId);
      else next.add(pickId);
      return next;
    });
  };

  const handlePay = async () => {
    if (wonSet.size === 0) {
      toast.error('Označi barem jednog pobjednika!');
      return;
    }
    if (!confirm(`Isplatit ćeš ${wonSet.size} pobjednika. Ova radnja je nepovratna. Nastavi?`)) return;

    setPaying(true);

    // 1. Update all pick statuses
    for (const pick of picks) {
      const newStatus = wonSet.has(pick.id) ? 'won' : 'lost';
      if (pick.status !== newStatus) {
        await base44.entities.Pick.update(pick.id, { status: newStatus });
      }
    }

    // 2. Call payContestWinners (also auto-resolves parlays)
    const res = await base44.functions.invoke('payContestWinners', { contest_id: contest.id });
    const { paid_count, total_payout, parlay_paid_count, parlay_total_payout } = res.data || {};

    toast.success(`✅ Isplaćeno ${paid_count} pobjednika — ${total_payout} tokena!`);
    if (parlay_paid_count > 0) {
      toast.success(`🎯 Parlay: ${parlay_paid_count} listića — ${parlay_total_payout} tokena!`);
    }
    setPaying(false);
    if (onFinished) onFinished();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (picks.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Nema predanih listića za ovo natjecanje.
      </div>
    );
  }

  const alreadyPaid = picks.filter(p => p.tokens_paid).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-orange-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Označi pobjednike i isplati tokene
        </p>
        <span className="text-xs text-muted-foreground">{picks.length} listića</span>
      </div>

      {alreadyPaid > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-semibold">
          <CheckCircle className="w-3.5 h-3.5" />
          {alreadyPaid} listić(a) već isplaćeno
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {picks.map(pick => {
          const isWon = wonSet.has(pick.id);
          const isPaid = !!pick.tokens_paid;
          return (
            <div
              key={pick.id}
              onClick={() => !isPaid && toggleWon(pick.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                isPaid
                  ? 'border-primary/30 bg-primary/5 cursor-default opacity-70'
                  : isWon
                  ? 'border-primary/50 bg-primary/10 cursor-pointer'
                  : 'border-border/40 bg-secondary/50 cursor-pointer hover:border-border'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                isPaid ? 'border-primary bg-primary' : isWon ? 'border-primary bg-primary' : 'border-muted-foreground/40'
              }`}>
                {(isWon || isPaid) && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {pick.user_name || pick.user_email}
                  {isPaid && <span className="ml-2 text-[10px] text-primary font-black">ISPLAĆENO</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pick.correct_picks || 0}/{pick.total_picks || pick.selections?.length || 0} točnih
                  · predano {moment(pick.created_date).format('DD.MM HH:mm')}
                </p>
              </div>
              <div className="text-right shrink-0">
                {isPaid ? (
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <Coins className="w-3 h-3" /> +{pick.payout_amount || pick.tokens_won}
                  </span>
                ) : isWon ? (
                  <Trophy className="w-4 h-4 text-primary" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          {wonSet.size} označeno kao pobjednici · nagradni fond: {contest.prize_pool?.toLocaleString()} tokena
        </p>
        <button
          onClick={handlePay}
          disabled={paying || wonSet.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {paying
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Isplaćujem...</>
            : <><Trophy className="w-4 h-4" /> Postavi pobjednike i isplati</>
          }
        </button>
      </div>
    </div>
  );
}
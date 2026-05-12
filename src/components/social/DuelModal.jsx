import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Swords, X, Coins, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function DuelModal({ contest, currentUser, onClose, onSent }) {
  const [opponentEmail, setOpponentEmail] = useState('');
  const [stake, setStake] = useState(contest?.entry_cost || 100);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const balance = currentUser?.token_balance || 0;
  const notEnough = stake > balance;

  const send = async () => {
    if (!opponentEmail.trim()) return toast.error('Unesi email protivnika');
    if (opponentEmail.trim() === currentUser.email) return toast.error('Ne možeš izazvati sebe!');
    if (stake < 10) return toast.error('Minimalni ulog je 10 tokena');
    if (notEnough) return toast.error('Nemaš dovoljno tokena!');

    setSubmitting(true);

    const res = await base44.functions.invoke('createDuelChallenge', {
      opponent_email: opponentEmail.trim(),
      contest_id: contest.id,
      stake_tokens: stake,
      message: message.trim() || null,
    });

    if (res.data?.error) {
      toast.error(res.data.error);
      setSubmitting(false);
      return;
    }

    toast.success('Izazov poslan! Tokeni u escrowu.');
    if (onSent) onSent(res.data.new_balance);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="font-black flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" /> Izazovi prijatelja
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-all">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-secondary/50 text-sm">
            <span className="text-muted-foreground">Natjecanje: </span>
            <span className="font-bold">{contest?.title}</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email protivnika</label>
            <input
              value={opponentEmail}
              onChange={e => setOpponentEmail(e.target.value)}
              placeholder="ime@email.com"
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground border border-transparent focus:border-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Ulog (tokeni) — Tvoj balans: <span className={notEnough ? 'text-destructive' : 'text-primary'}>{balance.toLocaleString()}</span>
            </label>
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${notEnough ? 'border-destructive/50 bg-destructive/5' : 'bg-secondary border-transparent focus-within:border-primary/40'}`}>
              <Coins className="w-4 h-4 text-accent shrink-0" />
              <input
                type="number"
                min={10}
                value={stake}
                onChange={e => setStake(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {notEnough && (
              <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                <AlertTriangle className="w-3 h-3" /> Nemaš dovoljno tokena
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Poruka (opcijsko)</label>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Pokaži što znaš! 💪"
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground border border-transparent focus:border-primary/40"
            />
          </div>

          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{stake} tokena bit će odmah skinuto i stavljeno u escrow. Pobjednik dobiva <strong>{stake * 2}</strong> tokena.</span>
          </div>
          <button
            onClick={send}
            disabled={submitting || !opponentEmail.trim() || notEnough}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting
              ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              : <><Swords className="w-4 h-4" /> Pošalji izazov ({stake} tokena)</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
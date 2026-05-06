import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, CheckCircle2, X, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WelcomeBonusBanner({ user, picks = [], onClaimed }) {
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;

  // Already claimed
  if (user.welcome_bonus_claimed) return null;

  // Check if eligible: has at least one won pick with 3+ selections
  const eligiblePick = picks.find(
    p => p.status === 'won' && Array.isArray(p.selections) && p.selections.length >= 3
  );

  const handleClaim = async () => {
    if (claiming || !eligiblePick) return;
    setClaiming(true);
    const newBalance = (user.token_balance || 0) + 5000;
    await base44.auth.updateMe({ token_balance: newBalance, welcome_bonus_claimed: true });
    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'bonus',
      amount: 5000,
      description: 'Bonus dobrodošlice — prvi dobitak!',
      balance_after: newBalance,
    });
    setClaiming(false);
    if (onClaimed) onClaimed();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative mb-4 rounded-2xl border p-4 flex items-center gap-4 ${
          eligiblePick
            ? 'bg-gradient-to-r from-primary/20 to-fuchsia-500/10 border-primary/30'
            : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20'
        }`}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          eligiblePick ? 'bg-primary/20' : 'bg-yellow-500/15'
        }`}>
          <Gift className={`w-5 h-5 ${eligiblePick ? 'text-primary' : 'text-yellow-400'}`} />
        </div>

        <div className="flex-1 min-w-0">
          {eligiblePick ? (
            <>
              <p className="font-black text-sm text-primary">🎉 Osvoji bonus dobrodošlice!</p>
              <p className="text-xs text-muted-foreground">Tvoj prvi dobitak s 3+ pickova je potvrđen. Preuzmi 5000 tokena!</p>
            </>
          ) : (
            <>
              <p className="font-black text-sm text-yellow-400">🎁 Bonus dobrodošlice — 5000 tokena</p>
              <p className="text-xs text-muted-foreground">Osvoji tiket s 3 ili više pickova i preuzmi bonus!</p>
            </>
          )}
        </div>

        {eligiblePick && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-90 transition-all disabled:opacity-60"
          >
            {claiming
              ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              : <><Zap className="w-3.5 h-3.5" /> Preuzmi</>
            }
          </button>
        )}
        {!eligiblePick && (
          <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> U tijeku
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, CheckCircle2, X, Zap, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function WelcomeBonusBanner({ user, picks = [], onClaimed }) {
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;

  // Bonus already claimed — show "iskorišten" for 1 day then hide
  if (user.welcome_bonus_claimed) {
    // Find the bonus transaction date from picks is not possible here,
    // so we just show it briefly if claimed_date exists or hide after mount
    // We'll just not show anything after claimed
    return null;
  }

  // welcome_bonus_eligible defaults to true if not set (existing users)
  const isEligible = user.welcome_bonus_eligible !== false;
  if (!isEligible) return null;

  // Check pick states
  const wonEligiblePick = picks.find(
    p => p.status === 'won' && Array.isArray(p.selections) && p.selections.length >= 3
  );
  const activeEligiblePick = picks.find(
    p => p.status === 'active' && Array.isArray(p.selections) && p.selections.length >= 3
  );

  const handleClaim = async () => {
    if (claiming || !wonEligiblePick) return;
    setClaiming(true);
    const freshUser = await base44.auth.me();
    if (freshUser.welcome_bonus_claimed) {
      setClaiming(false);
      return;
    }
    const newBalance = (freshUser.token_balance || 0) + 5000;
    await base44.auth.updateMe({ token_balance: newBalance, welcome_bonus_claimed: true });
    await base44.entities.TokenTransaction.create({
      user_email: freshUser.email,
      type: 'bonus',
      amount: 5000,
      description: 'Welcome bonus - prvi pobjednički tiket',
      balance_after: newBalance,
    });
    await base44.entities.Notification.create({
      user_email: freshUser.email,
      type: 'reward',
      title: '🎉 Welcome bonus isplaćen!',
      body: 'Bravo! Osvojio si 5000 dodatnih tokena za welcome bonus!',
    });
    setClaiming(false);
    if (onClaimed) onClaimed();
  };

  // Determine banner state
  let state = 'waiting'; // no eligible pick yet
  if (wonEligiblePick) state = 'claimable';
  else if (activeEligiblePick) state = 'pending';

  const configs = {
    waiting: {
      border: 'border-yellow-500/20',
      bg: 'from-yellow-500/8 to-orange-500/5',
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
      icon: Gift,
      title: '🎁 Welcome bonus aktiviran!',
      body: 'Pogodi svoj prvi tiket s 3+ pickova i dobij dodatnih 5000 tokena!',
      badge: null,
    },
    pending: {
      border: 'border-accent/25',
      bg: 'from-accent/8 to-primary/5',
      iconBg: 'bg-accent/15',
      iconColor: 'text-accent',
      icon: Clock,
      title: '⏳ Welcome Challenge u tijeku',
      body: 'Čekamo rezultat tvog tiketa s 3+ pickova...',
      badge: null,
    },
    claimable: {
      border: 'border-primary/30',
      bg: 'from-primary/15 to-fuchsia-500/10',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      icon: Gift,
      title: '🎉 Osvoji bonus dobrodošlice!',
      body: 'Tvoj prvi pobjednički tiket s 3+ pickova je potvrđen. Preuzmi 5000 tokena!',
      badge: null,
    },
  };

  const cfg = configs[state];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`relative mb-4 rounded-2xl border bg-gradient-to-r ${cfg.bg} ${cfg.border} p-4 flex items-center gap-3`}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <p className={`font-black text-sm ${cfg.iconColor}`}>{cfg.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{cfg.body}</p>
        </div>

        {state === 'claimable' && (
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

        {state === 'waiting' && (
          <div className="shrink-0 text-right">
            <span className="text-xs font-black text-yellow-400">+5000</span>
            <p className="text-[10px] text-muted-foreground">tokena</p>
          </div>
        )}

        {state === 'pending' && (
          <div className="shrink-0 flex items-center gap-1 text-xs text-accent font-bold">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            U tijeku
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
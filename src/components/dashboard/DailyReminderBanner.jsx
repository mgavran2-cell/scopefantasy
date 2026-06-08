import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

/**
 * Shows a gentle reminder banner if:
 * 1. Current local hour is between 18 and 23 (evening)
 * 2. The user hasn't claimed their daily login bonus today
 * 3. User hasn't dismissed it this session
 */
export default function DailyReminderBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 18 || hour >= 24) return; // only show in evening

    base44.entities.DailyLoginStreak.list('-created_date', 1).then(records => {
      const streak = records[0];
      const today = new Date().toISOString().split('T')[0];
      const alreadyClaimed = streak?.last_claim_date === today;
      if (!alreadyClaimed) setShow(true);
    });
  }, []);

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-yellow-500/8 to-orange-500/5 p-4 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-orange-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-orange-300">⏰ Ne zaboravi dnevni bonus!</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Večer je — još uvijek možeš preuzeti besplatne tokene danas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/novcanik"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 text-xs font-bold hover:bg-orange-500/30 transition-all whitespace-nowrap"
          >
            Preuzmi <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
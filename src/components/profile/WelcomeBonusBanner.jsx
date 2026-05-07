import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';

export default function WelcomeBonusBanner({ user }) {
  if (!user) return null;
  if (user.welcome_bonus_claimed) return null;
  if (user.welcome_bonus_eligible === false) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Link
        to="/welcome-challenge"
        className="flex items-center gap-3 p-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-fuchsia-500/8 hover:border-primary/50 transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-primary">🎁 Welcome Challenge</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pogodi 3 picka i osvoji 5000 tokena</p>
        </div>
        <span className="text-xs font-black text-primary group-hover:translate-x-0.5 transition-transform">→</span>
      </Link>
    </motion.div>
  );
}
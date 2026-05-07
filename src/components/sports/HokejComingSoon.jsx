import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function HokejComingSoon({ onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.FeatureInterest.create({
      feature_name: 'sport_hokej',
      email: email,
      user_id: user?.id || '',
    });
    setDone(true);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-6 text-center max-w-md mx-auto my-4"
    >
      <div className="text-4xl mb-3">🏒</div>
      <h3 className="text-xl font-black mb-1">Hokej uskoro stiže na ScopeFantasy</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Ostavi email da te obavijestimo kad aktiviramo hokejska natjecanja
      </p>

      {done ? (
        <div className="flex items-center justify-center gap-2 text-primary font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          Odlično! Obavijestit ćemo te čim bude dostupno.
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tvoj@email.com"
            className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !email}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? '...' : 'Obavijesti me'}
          </button>
        </div>
      )}

      {onClose && (
        <button onClick={onClose} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Zatvori
        </button>
      )}
    </motion.div>
  );
}
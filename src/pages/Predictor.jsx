import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Predictor() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotify = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.FeatureInterest.create({
      feature_name: 'ai_predictor',
      email: email.trim(),
      user_id: user?.id || '',
    });
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">Uskoro</span>
        <h1 className="text-4xl font-display font-black tracking-wide mb-3">AI PREDICTOR</h1>
        <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
          Povezujemo s pravim sportskim podacima i AI analizom. Javimo se čim bude spreman.
        </p>
        {submitted ? (
          <div className="px-6 py-3 rounded-xl bg-primary/10 border border-primary/25 text-primary font-semibold text-sm">
            ✓ Hvala! Javit ćemo se.
          </div>
        ) : (
          <div className="flex gap-2 w-full max-w-sm">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNotify()}
              placeholder="tvoj@email.com"
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleNotify}
              disabled={loading || !email.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? '...' : 'Obavijesti me'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
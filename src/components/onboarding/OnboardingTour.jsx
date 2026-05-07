import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ArrowRight, X } from 'lucide-react';

const STEPS = [
  {
    emoji: '🎉',
    title: 'Dobrodošao na ScopeFantasy!',
    body: 'Igraj fantasy sport, predviđaj statistike igrača i osvajaj tokene. Imaš 5000 tokena za start. Hajdemo te provesti kroz osnove.',
    btn: 'Krenimo →',
  },
  {
    emoji: '🎁',
    title: 'Welcome Challenge — 5000 dodatnih tokena',
    body: 'Pogodi sva 3 picka u Welcome Challenge-u i osvoji 5000 dodatnih tokena. Prvi su besplatni — ne troše tvoju blagajnu.',
    btn: 'Idemo dalje →',
  },
  {
    emoji: '🏆',
    title: '3 načina igre',
    body: 'Pick\'em — predvidi ishode igrača. Parlay — kombiniraj više pickova. Izazovi — dnevni zadaci za bonus tokene.',
    btn: 'Idemo dalje →',
  },
  {
    emoji: '🔥',
    title: 'Daily Streak — vraćaj se svaki dan',
    body: 'Svaki dan jedan besplatan pick. Pogodi 7/7 i osvoji 15.000 tokena. Streak se resetira ako preskočiš dan.',
    btn: 'Završi i počni igrati',
  },
];

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const complete = async () => {
    if (completing) return;
    setCompleting(true);
    await base44.auth.updateMe({ onboarding_completed: true });
    onComplete();
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      complete();
    }
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative w-full max-w-md bg-card border border-border/60 rounded-3xl p-8 shadow-2xl"
        >
          {/* Skip button */}
          <button
            onClick={complete}
            disabled={completing}
            className="absolute top-4 right-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
            Preskoči tour
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-4 bg-primary/40' : 'w-4 bg-border'
                }`}
              />
            ))}
            <span className="ml-auto text-xs text-muted-foreground font-semibold">{step + 1}/{STEPS.length}</span>
          </div>

          {/* Content */}
          <div className="text-center">
            <div className="text-5xl mb-5">{current.emoji}</div>
            <h2 className="font-display font-black text-2xl uppercase leading-tight mb-3">{current.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{current.body}</p>
          </div>

          {/* CTA button */}
          <button
            onClick={next}
            disabled={completing}
            className="mt-8 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {completing
              ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              : <>{current.btn} {step < STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}</>
            }
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
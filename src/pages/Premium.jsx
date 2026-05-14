import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Sparkles, Brain, BarChart2, ShieldOff, CheckCircle, Lock } from 'lucide-react';
import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';

function EmailSignup({ featureName, placeholder = 'tvoj@email.com' }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotify = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.FeatureInterest.create({
      feature_name: featureName,
      email: email.trim(),
      user_id: user?.id || '',
    });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="px-5 py-3 rounded-xl bg-primary/10 border border-primary/25 text-primary font-semibold text-sm text-center">
        ✓ Hvala! Javit ćemo se kad bude dostupno.
      </div>
    );
  }

  return (
    <div className="flex gap-2 w-full max-w-sm">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleNotify()}
        placeholder={placeholder}
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
  );
}

export default function Premium() {
  const [user, setUser] = useState(null);
  const [myPicks, setMyPicks] = useState([]);
  const [contestMap, setContestMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Scroll to anchor on mount (for redirects from /predictor, /statistika)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [me, picks, contests] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Pick.list('-created_date', 200),
        base44.entities.Contest.list('-created_date', 200),
      ]);
      setUser(me);
      const myP = picks.filter(p => (p.user_email || p.created_by) === me?.email);
      setMyPicks(myP);
      const cm = {};
      contests.forEach(c => { cm[c.id] = c; });
      setContestMap(cm);
      setLoading(false);
    })();
  }, []);

  const isPremium = user?.subscription_active === true || user?.subscription_active == null;
  const isFree = user?.subscription_active === false;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-black tracking-wide uppercase">Premium</h1>
        </div>
        <p className="text-muted-foreground text-sm">Otključaj napredne funkcije za bolju igru</p>
      </motion.div>

      {/* Status Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
        {isFree ? (
          <div className="rounded-2xl border border-border/60 bg-secondary/60 p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Postani Premium da otključaš AI Coach, AI Analizu, Statistiku timova i ad-free iskustvo.
            </p>
            <button
              disabled
              className="px-5 py-2.5 rounded-xl bg-primary/40 text-primary-foreground font-bold text-sm cursor-not-allowed opacity-70 mb-3 block"
            >
              Pretplati se
            </button>
            <p className="text-xs text-muted-foreground">Pretplata uskoro kroz Stripe — €4,99 mjesečno</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/8 p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm font-semibold text-green-400">Premium aktivan — sve funkcije dostupne</p>
          </div>
        )}
      </motion.div>

      <div className="space-y-8">
        {/* KARTICA 1: AI Coach */}
        <motion.div id="ai-coach" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="font-black text-lg">Tvoj AI Coach</h2>
          </div>
          <AIInsightsWidget myPicks={myPicks} contestMap={contestMap} />
        </motion.div>

        {/* KARTICA 2: AI Analiza statistike */}
        <motion.div id="ai-analiza" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-black text-lg">AI Analiza statistike</h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-accent/20 text-accent uppercase tracking-wider">Uskoro</span>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm leading-relaxed">
                Analiza historijskih podataka igrača i timova. Uskoro dostupno — radimo na integraciji pravih sportskih podataka i naprednoj AI analizi.
              </p>
              <EmailSignup featureName="ai_analiza_statistike" />
            </div>
          </div>
        </motion.div>

        {/* KARTICA 3: Statistika timova */}
        <motion.div id="team-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-5 h-5 text-yellow-400" />
            <h2 className="font-black text-lg">Statistika timova</h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">Uskoro</span>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4">
                <BarChart2 className="w-7 h-7 text-yellow-400" />
              </div>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm leading-relaxed">
                Detaljna statistika ekipa i igrača iz pravih sportskih podataka. Uskoro dostupno — ostavi e-mail i bit ćeš prvi koji sazna.
              </p>
              <EmailSignup featureName="team_stats" />
            </div>
          </div>
        </motion.div>

        {/* KARTICA 4: Ad-free */}
        <motion.div id="ad-free" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="scroll-mt-20 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldOff className="w-5 h-5 text-green-400" />
            <h2 className="font-black text-lg">Ad-free iskustvo</h2>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <ShieldOff className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Premium korisnici ne vide reklame unutar aplikacije.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  {isPremium ? (
                    <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-green-500/15 text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Aktivno
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
                      <Lock className="w-3.5 h-3.5" /> Premium funkcija
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Trenutno nema reklama u beta fazi. Kasnije će free korisnici vidjeti rewarded ads, premium korisnici neće.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
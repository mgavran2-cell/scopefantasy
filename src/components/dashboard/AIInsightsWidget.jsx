import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, RefreshCw, ChevronRight, TrendingUp, AlertTriangle, Lightbulb, Target } from 'lucide-react';

const ICON_MAP = {
  tip: Lightbulb,
  warning: AlertTriangle,
  prediction: Target,
  trend: TrendingUp,
};

const COLOR_MAP = {
  tip:        { bg: 'bg-primary/10',     border: 'border-primary/25',     icon: 'text-primary',     badge: 'bg-primary/15 text-primary' },
  warning:    { bg: 'bg-yellow-500/8',   border: 'border-yellow-500/25',  icon: 'text-yellow-400',  badge: 'bg-yellow-500/15 text-yellow-400' },
  prediction: { bg: 'bg-accent/8',       border: 'border-accent/25',      icon: 'text-accent',      badge: 'bg-accent/15 text-accent' },
  trend:      { bg: 'bg-green-500/8',    border: 'border-green-500/25',   icon: 'text-green-400',   badge: 'bg-green-500/15 text-green-400' },
};

const BADGE_LABELS = { tip: 'Savjet', warning: 'Upozorenje', prediction: 'Predikcija', trend: 'Trend' };

function InsightCard({ insight, index }) {
  const type = insight.type || 'tip';
  const c = COLOR_MAP[type] || COLOR_MAP.tip;
  const Icon = ICON_MAP[type] || Lightbulb;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-xl border p-4 ${c.bg} ${c.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.badge}`}>
              {BADGE_LABELS[type] || type}
            </span>
            {insight.sport && (
              <span className="text-[10px] text-muted-foreground font-semibold">{insight.sport}</span>
            )}
          </div>
          <p className="text-sm font-semibold leading-snug">{insight.title}</p>
          {insight.detail && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.detail}</p>
          )}
          {insight.confidence && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-card overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.icon.replace('text-', 'bg-')}`}
                  style={{ width: `${insight.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">{insight.confidence}% pouzdanost</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// "Coming soon" locked overlay
function LockedOverlay() {
  return (
    <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm z-10">
      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <p className="font-black text-base mb-1">Premium funkcija</p>
      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
        AI analiza biti će dostupna pretplatnicima u sljedećem update-u.
      </p>
      <span className="mt-3 text-[10px] font-black px-3 py-1.5 rounded-full bg-primary/15 text-primary">
        Uskoro — Pretplata
      </span>
    </div>
  );
}

export default function AIInsightsWidget({ myPicks, contestMap, activeContests }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // For now always show as premium (locked = false means it's shown but requires click to generate)
  // Set locked = true when you want hard paywall
  const locked = false;

  const buildContext = () => {
    // Sport win rates
    const sportMap = {};
    myPicks.forEach(p => {
      const sport = contestMap[p.contest_id]?.sport || 'Ostalo';
      if (!sportMap[sport]) sportMap[sport] = { wins: 0, total: 0, tokensWon: 0, tokensSpent: 0 };
      sportMap[sport].total++;
      if (p.status === 'won') sportMap[sport].wins++;
      sportMap[sport].tokensWon += (p.tokens_won || 0);
      sportMap[sport].tokensSpent += (p.tokens_spent || 0);
    });

    const sportStats = Object.entries(sportMap).map(([sport, s]) => ({
      sport,
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
      total: s.total,
      netProfit: s.tokensWon - s.tokensSpent,
    }));

    // Recent form (last 10 picks)
    const recent = myPicks.slice(0, 10);
    const recentWins = recent.filter(p => p.status === 'won').length;
    const recentForm = recent.length > 0 ? Math.round((recentWins / recent.length) * 100) : 0;

    // Upcoming contests
    const upcoming = activeContests.slice(0, 5).map(c => ({
      title: c.title,
      sport: c.sport,
      prize_pool: c.prize_pool,
      entry_cost: c.entry_cost,
    }));

    return { sportStats, recentForm, totalPicks: myPicks.length, upcoming };
  };

  const generate = async () => {
    if (loading) return;
    setLoading(true);

    const ctx = buildContext();

    const prompt = `Si AI sportski analitičar za ScopeFantasy fantasy sports platformu. 
Analiziraj podatke ovog korisnika i vrati 4-5 korisnih uvida na HRVATSKOM jeziku.

Podaci korisnika:
- Ukupno odigranih natjecanja: ${ctx.totalPicks}
- Forma zadnjih 10 listića: ${ctx.recentForm}% pobjeda
- Win rate po sportu: ${JSON.stringify(ctx.sportStats)}
- Nadolazeća natjecanja: ${JSON.stringify(ctx.upcoming)}

Vrati JSON objekt s poljem "insights" koji je array od 4-5 objekata, svaki s:
- type: "tip" | "warning" | "prediction" | "trend"
- title: kratki naslov (maks 60 znakova)
- detail: dulje objašnjenje (maks 120 znakova)
- sport: (opcionalno) koji sport se tiče
- confidence: (samo za prediction) broj 60-95

Primjeri tipova:
- "tip": savjet za poboljšanje strategije
- "warning": upozorenje na lošu naviku ili trend
- "prediction": predikcija za nadolazeće natjecanje
- "trend": pozitivan ili negativan trend iz podataka

Budi konkretan, koristi stvarne podatke korisnika. Ne budi generičan.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                title: { type: 'string' },
                detail: { type: 'string' },
                sport: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
    });

    setInsights(result?.insights || []);
    setGenerated(true);
    setLoading(false);
  };

  const hasEnoughData = myPicks.length >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/3 p-5 mb-8"
    >
      {locked && <LockedOverlay />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm">AI Analiza</h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary">BETA</span>
            </div>
            <p className="text-xs text-muted-foreground">Personalizirani savjeti temeljeni na tvojim listićima</p>
          </div>
        </div>
        {generated && (
          <button onClick={generate} disabled={loading}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Content */}
      {!generated && !loading && (
        <div className="text-center py-6">
          {hasEnoughData ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Klikni za analizu tvojih {myPicks.length} listića i personalizirane savjete.
              </p>
              <button onClick={generate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4" />
                Analiziraj moje listiće
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Odigraj još <strong className="text-foreground">{3 - myPicks.length} natjecanja</strong> kako bi AI mogao analizirati tvoju strategiju.
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
          <p className="text-center text-xs text-muted-foreground pt-1">AI analizira tvoje listiće...</p>
        </div>
      )}

      <AnimatePresence>
        {generated && !loading && insights && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nema uvida za sada. Pokušaj odigrati više natjecanja.</p>
            ) : (
              insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
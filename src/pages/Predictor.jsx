import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Loader2, TrendingUp, AlertCircle } from 'lucide-react';

const sportEmoji = { Nogomet: '⚽', Košarka: '🏀', Tenis: '🎾', 'Formula 1': '🏎️', Hokej: '🏒', MMA: '🥊' };

function ProbabilityBar({ label, probability, color }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold">{label}</span>
        <span className={`font-black ${color}`}>{probability}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${probability}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color === 'text-primary' ? 'bg-primary' : color === 'text-accent' ? 'bg-accent' : 'bg-muted-foreground'}`}
        />
      </div>
    </div>
  );
}

function PlayerPrediction({ player }) {
  return (
    <div className="p-3 rounded-xl bg-secondary/50 border border-border/30">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-bold text-sm">{player.name}</p>
          <p className="text-xs text-muted-foreground">{player.team} · {player.stat_type} {player.over_under}</p>
        </div>
        <span className={`text-xs font-black px-2 py-1 rounded-lg ${player.recommendation === 'OVER' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
          {player.recommendation}
        </span>
      </div>
      <div className="flex gap-3 mb-2">
        <div className="flex-1">
          <ProbabilityBar label="Over" probability={player.over_prob} color="text-primary" />
          <ProbabilityBar label="Under" probability={player.under_prob} color="text-accent" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{player.reasoning}</p>
    </div>
  );
}

export default function Predictor() {
  const [contests, setContests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Contest.filter({ status: 'active' }, '-start_time', 20).then(setContests);
  }, []);

  const predict = async (contest) => {
    setSelected(contest);
    setPrediction(null);
    setLoading(true);

    const playersInfo = contest.players?.map(p =>
      `${p.name} (${p.team}, ${p.position}) - ${p.stat_type} ${p.over_under}`
    ).join('\n') || 'Nema dostupnih igrača';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analiziraj sljedeće sportsko natjecanje i predvidi ishode za svakog igrača.

Natjecanje: ${contest.title}
Sport: ${contest.sport}
Opis: ${contest.description || ''}

Igrači i njihove linije:
${playersInfo}

Za SVAKOG igrača na listi predvidi vjerojatnost OVER i UNDER na temelju:
- Aktualnoj formi igrača
- Statistici u posljednjih 5 utakmica
- Ozljedama i suspenzijama
- Protivniku i stilu igre
- Terenu/domaćinstvu

Vrati JSON s ovim strukturom:
- summary: string (kratka opća analiza natjecanja, 2-3 rečenice na hrvatskom)
- confidence: number (opća pouzdanost analize, 0-100)
- players: array of objects where each has:
  - name: string
  - team: string
  - stat_type: string
  - over_under: number
  - over_prob: number (0-100)
  - under_prob: number (0-100)
  - recommendation: "OVER" or "UNDER"
  - reasoning: string (kratko objašnjenje na hrvatskom, 1-2 rečenice)`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          confidence: { type: 'number' },
          players: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                team: { type: 'string' },
                stat_type: { type: 'string' },
                over_under: { type: 'number' },
                over_prob: { type: 'number' },
                under_prob: { type: 'number' },
                recommendation: { type: 'string' },
                reasoning: { type: 'string' },
              },
            },
          },
        },
      },
    });

    setPrediction(result);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black tracking-wide">AI PREDICTOR</h1>
            <p className="text-muted-foreground text-sm">Predviđanja temeljena na formi, statistici i AI analizi</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2 mb-8 mt-4">
          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-500/90">AI predviđanja su informativne prirode i ne garantiraju ishod. Koristi ih kao dodatni alat pri odlučivanju.</p>
        </div>

        {/* Contest selection */}
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">Odaberi natjecanje</h2>
        <div className="space-y-2 mb-8">
          {contests.length === 0 && (
            <p className="text-muted-foreground text-sm py-6 text-center">Nema aktivnih natjecanja.</p>
          )}
          {contests.map(c => (
            <button
              key={c.id}
              onClick={() => predict(c)}
              disabled={loading && selected?.id === c.id}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                selected?.id === c.id
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/50 bg-card hover:border-primary/30 hover:bg-primary/3'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{sportEmoji[c.sport] || '🏆'}</span>
                <div>
                  <p className="font-bold text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.sport} · {c.players?.length || 0} igrača</p>
                </div>
              </div>
              {loading && selected?.id === c.id
                ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />
              }
            </button>
          ))}
        </div>

        {/* Prediction results */}
        <AnimatePresence>
          {prediction && selected && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Analiza: {selected.title}</h2>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">Pouzdanost: {prediction.confidence}%</span>
                </div>
              </div>

              {/* Summary */}
              {prediction.summary && (
                <div className="p-4 rounded-2xl bg-card border border-border/50 mb-5">
                  <p className="text-sm leading-relaxed">{prediction.summary}</p>
                </div>
              )}

              {/* Players */}
              <div className="space-y-3">
                {prediction.players?.map((player, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <PlayerPrediction player={player} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
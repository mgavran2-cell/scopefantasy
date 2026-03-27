import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, TrendingUp, Swords, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SPORTS = ['Nogomet', 'Košarka', 'Tenis', 'Formula 1', 'Hokej', 'MMA'];

const formColor = (result) => {
  if (result === 'W') return 'bg-primary text-primary-foreground';
  if (result === 'L') return 'bg-destructive text-destructive-foreground';
  return 'bg-muted text-muted-foreground';
};

export default function TeamStats() {
  const [sport, setSport] = useState('Nogomet');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    if (!team1.trim()) { setError('Unesi naziv tima ili igrača.'); return; }
    setError('');
    setLoading(true);
    setStats(null);
    const prompt = `Daj mi detaljnu sportsku statistiku za ${sport}.
Tim/Igrač 1: ${team1}${team2 ? `\nTim/Igrač 2: ${team2}` : ''}

Vrati JSON s ovim poljima:
- team1_name: string
- team2_name: string ili null ako nema drugog tima
- team1_form: array od max 6 zadnjih rezultata, svaki objekt { opponent: string, score: string, result: "W"|"L"|"D", date: string }
- team2_form: isto ili null
- head_to_head: array od max 5 zadnjih međusobnih susreta (samo ako su oba tima unesena), svaki { date: string, score: string, winner: string }
- team1_injuries: array objekata { player: string, injury: string, return_date: string }
- team2_injuries: array ili null
- team1_stats: objekt s ključnim statovima ovisno o sportu (npr. za nogomet: goals_scored, goals_conceded, wins, draws, losses, position; za košarku: ppg, rpg, apg itd.)
- team2_stats: isto ili null
- analysis: string, kratka analiza na hrvatskom jeziku (3-4 rečenice) o formi, prednostima i slabostima`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          team1_name: { type: 'string' },
          team2_name: { type: ['string', 'null'] },
          team1_form: { type: 'array', items: { type: 'object' } },
          team2_form: { type: ['array', 'null'] },
          head_to_head: { type: 'array', items: { type: 'object' } },
          team1_injuries: { type: 'array', items: { type: 'object' } },
          team2_injuries: { type: ['array', 'null'] },
          team1_stats: { type: 'object' },
          team2_stats: { type: ['object', 'null'] },
          analysis: { type: 'string' },
        },
      },
    });
    setStats(result);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-black tracking-wide mb-1">STATISTIKA TIMOVA</h1>
        <p className="text-muted-foreground text-sm mb-6">Provjeri formu, H2H i ozljede igrača prije nego odabereš pick.</p>

        {/* Sport selector */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SPORTS.map(s => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={team1}
              onChange={e => setTeam1(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchStats()}
              placeholder="Tim / Igrač 1 *"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={team2}
              onChange={e => setTeam2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchStats()}
              placeholder="Tim / Igrač 2 (za H2H)"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {error && <p className="text-destructive text-sm mb-3">{error}</p>}

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 mb-8"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {loading ? 'Dohvaćam podatke...' : 'Pretraži'}
        </button>

        {/* Results */}
        <AnimatePresence>
          {stats && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

              {/* Analysis */}
              {stats.analysis && (
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
                  <p className="text-sm leading-relaxed">{stats.analysis}</p>
                </div>
              )}

              {/* Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{ name: stats.team1_name, form: stats.team1_form, statsObj: stats.team1_stats },
                  ...(stats.team2_name ? [{ name: stats.team2_name, form: stats.team2_form, statsObj: stats.team2_stats }] : [])
                ].map((team, idx) => (
                  <div key={idx} className="rounded-2xl bg-card border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-sm">{team.name}</h3>
                    </div>
                    {/* Last form */}
                    {team.form?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Zadnji rezultati</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {team.form.map((f, i) => (
                            <span key={i} title={`${f.opponent} ${f.score}`} className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${formColor(f.result)}`}>
                              {f.result}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 space-y-1">
                          {team.form.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex justify-between text-xs text-muted-foreground">
                              <span>{f.date} vs {f.opponent}</span>
                              <span className="font-semibold text-foreground">{f.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Key stats */}
                    {team.statsObj && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(team.statsObj).slice(0, 6).map(([key, val]) => (
                          <div key={key} className="bg-secondary rounded-lg px-2 py-1.5 text-center">
                            <p className="text-xs font-black text-primary">{val}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Head to Head */}
              {stats.head_to_head?.length > 0 && (
                <div className="rounded-2xl bg-card border border-border/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Swords className="w-4 h-4 text-accent" />
                    <h3 className="font-bold text-sm">Međusobni susreti (H2H)</h3>
                  </div>
                  <div className="space-y-2">
                    {stats.head_to_head.map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <span className="text-xs text-muted-foreground">{h.date}</span>
                        <span className="text-sm font-black">{h.score}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.winner === stats.team1_name ? 'bg-primary/15 text-primary' : h.winner === stats.team2_name ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'}`}>
                          {h.winner === 'draw' || h.winner === 'Draw' ? 'Ner.' : h.winner}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Injuries */}
              {[{ name: stats.team1_name, injuries: stats.team1_injuries }, { name: stats.team2_name, injuries: stats.team2_injuries }]
                .filter(t => t.injuries?.length > 0)
                .map((team, idx) => (
                  <div key={idx} className="rounded-2xl bg-card border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <h3 className="font-bold text-sm">Ozljede — {team.name}</h3>
                    </div>
                    <div className="space-y-2">
                      {team.injuries.map((inj, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-semibold">{inj.player}</span>
                          <span className="text-xs text-muted-foreground">{inj.injury}</span>
                          <span className="text-xs text-destructive/80">{inj.return_date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
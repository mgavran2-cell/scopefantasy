import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Gift, CheckCircle2, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function WelcomeChallenge() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [picks, setPicks] = useState([]);
  const [entry, setEntry] = useState(null);
  const [selections, setSelections] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);

    // Redirect if already claimed
    if (me?.welcome_bonus_claimed) {
      navigate('/');
      return;
    }

    // Fetch active picks
    const activePicks = await base44.entities.WelcomeChallengePick.filter({ is_active: true });
    setPicks(activePicks);

    // Check if user already submitted for this set
    if (activePicks.length > 0) {
      const setId = activePicks[0].admin_set_id;
      const existing = await base44.entities.WelcomeChallengeEntry.filter({
        user_email: me.email,
        admin_set_id: setId,
      });
      if (existing.length > 0) {
        setEntry(existing[0]);
        // Check results if all correct_choice are set
        await checkAndResolve(existing[0], activePicks, me);
      }
    }

    setLoading(false);
  };

  const checkAndResolve = async (entryData, picksData, userData) => {
    // All picks must have correct_choice set
    const allGraded = picksData.every(p => p.correct_choice === 'over' || p.correct_choice === 'under');
    if (!allGraded || entryData.status !== 'pending') return;

    // Check if user won all 3
    const allCorrect = entryData.selections.every(sel => {
      const pick = picksData.find(p => p.id === sel.pick_id);
      return pick && pick.correct_choice === sel.choice;
    });

    const newStatus = allCorrect ? 'won' : 'lost';
    await base44.entities.WelcomeChallengeEntry.update(entryData.id, { status: newStatus });

    if (allCorrect) {
      const freshUser = await base44.auth.me();
      if (!freshUser.welcome_bonus_claimed) {
        const newBalance = (freshUser.token_balance || 0) + 5000;
        await base44.auth.updateMe({ token_balance: newBalance, welcome_bonus_claimed: true });
        await base44.entities.TokenTransaction.create({
          user_email: freshUser.email,
          type: 'bonus',
          amount: 5000,
          description: 'Welcome Challenge - pogodio sva 3 picka',
          balance_after: newBalance,
        });
        await base44.entities.Notification.create({
          user_email: freshUser.email,
          type: 'reward',
          title: '🎉 Welcome bonus isplaćen! +5000 tokena',
          body: 'Bravo! Pogodio si sva 3 picka u Welcome Challengeu!',
        });
        setUser({ ...freshUser, welcome_bonus_claimed: true });
      }
    }

    setEntry({ ...entryData, status: newStatus });
  };

  const handleSelect = (pickId, choice) => {
    if (entry) return; // already submitted
    setSelections(prev => ({ ...prev, [pickId]: choice }));
  };

  const handleSubmit = async () => {
    if (picks.length !== 3 || Object.keys(selections).length < 3) return;
    setSubmitting(true);

    const sels = picks.map(p => ({
      pick_id: p.id,
      player_name: p.player_name,
      stat_type: p.stat_type,
      over_under: p.over_under,
      choice: selections[p.id],
    }));

    const newEntry = await base44.entities.WelcomeChallengeEntry.create({
      user_email: user.email,
      admin_set_id: picks[0].admin_set_id,
      selections: sels,
      status: 'pending',
    });

    // Check immediately if all graded already
    await checkAndResolve(newEntry, picks, user);
    setEntry(newEntry);
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (picks.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
      <h2 className="text-xl font-black mb-2">Nema aktivnog Welcome Challengea</h2>
      <p className="text-muted-foreground text-sm">Admin još nije postavio picke. Provjeri opet uskoro!</p>
    </div>
  );

  const allSelected = picks.every(p => selections[p.id]);
  const isSubmitted = !!entry;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-black uppercase mb-2">Welcome Challenge</h1>
          <p className="text-muted-foreground">
            Pogodi sva 3 picka i osvoji <span className="text-primary font-black">5000 bonus tokena!</span>
          </p>
        </div>

        {/* Result states */}
        {isSubmitted && entry.status === 'won' && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/15 border border-primary/30 text-center">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-black text-primary text-lg">Čestitamo! 🎉</p>
            <p className="text-sm text-muted-foreground">Pogodio si sva 3 picka! +5000 tokena dodano na tvoj račun.</p>
          </div>
        )}
        {isSubmitted && entry.status === 'lost' && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
            <p className="font-black text-destructive text-lg">Nažalost, nisi pogodio ovaj set.</p>
            <p className="text-sm text-muted-foreground mt-1">Čekaj novi set picka od admina za novi pokušaj!</p>
          </div>
        )}
        {isSubmitted && entry.status === 'pending' && (
          <div className="mb-6 p-4 rounded-2xl bg-accent/10 border border-accent/20 text-center">
            <Clock className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="font-bold text-accent">Odabiri poslani! Čekamo rezultate...</p>
            <p className="text-xs text-muted-foreground mt-1">Admin će unijeti rezultate nakon utakmica.</p>
          </div>
        )}

        {/* Pick cards */}
        <div className="space-y-3 mb-6">
          {picks.map((pick, i) => {
            const userChoice = isSubmitted
              ? entry.selections.find(s => s.pick_id === pick.id)?.choice
              : selections[pick.id];
            const isGraded = pick.correct_choice === 'over' || pick.correct_choice === 'under';
            const isCorrect = isGraded && userChoice === pick.correct_choice;

            return (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-2xl border bg-card p-4 ${
                  isGraded && isSubmitted
                    ? isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'
                    : 'border-border/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-sm">{pick.player_name}</p>
                    {pick.team && <p className="text-xs text-muted-foreground">{pick.team}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">{pick.over_under}</p>
                    <p className="text-xs text-muted-foreground">{pick.stat_type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['over', 'under'].map(choice => {
                    const isSelected = userChoice === choice;
                    const isWinChoice = isGraded && pick.correct_choice === choice;
                    return (
                      <button
                        key={choice}
                        onClick={() => handleSelect(pick.id, choice)}
                        disabled={isSubmitted}
                        className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all
                          ${isSelected && isGraded
                            ? isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-destructive/20 text-destructive border border-destructive/40'
                            : isSelected
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : isWinChoice && isSubmitted
                            ? 'bg-green-500/10 text-green-400/60 border border-green-500/20'
                            : 'bg-secondary text-muted-foreground border border-transparent hover:text-foreground hover:border-border'
                          }`}
                      >
                        {choice === 'over'
                          ? <><TrendingUp className="w-4 h-4" /> Više</>
                          : <><TrendingDown className="w-4 h-4" /> Manje</>
                        }
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Submit button */}
        {!isSubmitted && (
          <button
            onClick={handleSubmit}
            disabled={!allSelected || submitting}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            {submitting
              ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Šalje se...</span>
              : '🎁 Pošalji odabire'
            }
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">Besplatno — ne troši tokene</p>
      </motion.div>
    </div>
  );
}
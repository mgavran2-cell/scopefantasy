import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, ArrowRight, Coins, Star } from 'lucide-react';
import ContestCard from '../components/contests/ContestCard';

const sportFilters = ['Svi', 'Nogomet', 'Košarka', 'Tenis', 'Američki nogomet', 'Hokej', 'MMA'];

export default function Home() {
  const { tokenBalance } = useOutletContext();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('Svi');

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    const data = await base44.entities.Contest.list('-created_date', 20);
    setContests(data);
    setLoading(false);
  };

  const filteredContests = activeSport === 'Svi' 
    ? contests 
    : contests.filter(c => c.sport === activeSport);

  const activeContests = filteredContests.filter(c => c.status === 'active');
  const upcomingContests = filteredContests.filter(c => c.status === 'upcoming');

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Besplatno za igranje</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
              Izgradi svoj{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                streak
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Predvidi statistike igrača, osvoji tokene i popni se na ljestvicu. Besplatno zauvijek.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/natjecanja"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
              >
                <Zap className="w-5 h-5" />
                Igraj Sada
              </Link>
              <Link
                to="/kupnja-tokena"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all"
              >
                <Coins className="w-5 h-5 text-accent" />
                Kupi Tokene
              </Link>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-10"
          >
            {[
              { label: 'Aktivna natjecanja', value: contests.filter(c => c.status === 'active').length, icon: Trophy },
              { label: 'Tvoji tokeni', value: tokenBalance?.toLocaleString() ?? 0, icon: Coins },
              { label: 'Nagradni fond', value: contests.reduce((s, c) => s + (c.prize_pool || 0), 0).toLocaleString(), icon: Star },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-card border border-border/50">
                <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-black">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Sport filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {sportFilters.map(sport => (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeSport === sport
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
      </section>

      {/* Active Contests */}
      {activeContests.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Uživo
            </h2>
            <Link to="/natjecanja" className="text-sm text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Vidi sve <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeContests.map((contest, i) => (
              <ContestCard key={contest.id} contest={contest} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingContests.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Nadolazeća natjecanja</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingContests.map((contest, i) => (
              <ContestCard key={contest.id} contest={contest} index={i} />
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!loading && contests.length === 0 && (
        <div className="text-center py-20 px-4">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nema natjecanja</h3>
          <p className="text-muted-foreground">Nova natjecanja uskoro dolaze!</p>
        </div>
      )}
    </div>
  );
}
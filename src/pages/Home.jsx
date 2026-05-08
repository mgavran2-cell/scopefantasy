import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, ArrowRight, Coins, Star } from 'lucide-react';
import ContestCard from '../components/contests/ContestCard';
import HomeDailyChallenges from '../components/home/HomeDailyChallenges';
import WelcomeBonusBanner from '../components/profile/WelcomeBonusBanner';
import HokejComingSoon from '../components/sports/HokejComingSoon';
import PikadoComingSoon from '../components/sports/PikadoComingSoon';

const sportFilters = ['Svi', 'Nogomet', 'Košarka', 'Tenis', 'Formula 1', 'MMA', 'Hokej', 'Pikado'];
const COMING_SOON_SPORTS = ['Hokej', 'Pikado'];

export default function Home() {
  const { tokenBalance, testNewUser } = useOutletContext();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('Svi');
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(me => setCurrentUser(me));
  }, []);

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    const data = await base44.entities.Contest.list('-created_date', 20);
    setContests(data);
    setLoading(false);
  };

  const filteredContests = activeSport === 'Svi' || COMING_SOON_SPORTS.includes(activeSport)
    ? contests 
    : contests.filter(c => c.sport === activeSport);

  const activeContests = filteredContests.filter(c => c.status === 'active');
  const upcomingContests = filteredContests.filter(c => c.status === 'upcoming');
  const allVisible = [...activeContests, ...upcomingContests];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 mb-6">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Besplatno za igranje</span>
            </div>
            <h1 className="font-display font-black uppercase text-5xl sm:text-8xl leading-none tracking-tight mb-4">
              <span className="text-white">IZGRADI</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400">
                STREAK
              </span>
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
              Predvidi statistike igrača, osvoji tokene i popni se na rang-listu. Besplatno zauvijek.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/natjecanja"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/30"
              >
                <Zap className="w-4 h-4" />
                IGRAJ SADA
              </Link>
              <Link
                to="/novcanik"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white/8 border border-white/10 text-white font-bold text-sm hover:bg-white/12 transition-all"
              >
                <Coins className="w-4 h-4 text-primary" />
                Kupi Tokene
              </Link>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-12"
          >
            {[
              { label: 'Aktivna natjecanja', value: contests.filter(c => c.status === 'active').length, icon: Trophy },
              { label: 'Tvoji tokeni', value: tokenBalance?.toLocaleString() ?? 0, icon: Coins },
              { label: 'Ukupni nagradni fond', value: contests.reduce((s, c) => s + (c.prize_pool || 0), 0).toLocaleString(), icon: Star },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-white/4 border border-white/8">
                <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-display font-black">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Welcome Bonus Banner */}
      {currentUser && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-4">
          <WelcomeBonusBanner user={currentUser} forceShow={testNewUser} />
        </div>
      )}

      {/* Daily Challenges */}
      <HomeDailyChallenges user={currentUser} />

      {/* Sport filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sportFilters.map(sport => (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap tracking-wide uppercase transition-all ${
                activeSport === sport
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10'
              }`}
            >
              {sport}
              {COMING_SOON_SPORTS.includes(sport) && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-accent/20 text-accent leading-none">USKORO</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Coming soon sports */}
      {activeSport === 'Hokej' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
          <HokejComingSoon onClose={() => setActiveSport('Svi')} />
        </section>
      )}
      {activeSport === 'Pikado' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
          <PikadoComingSoon onClose={() => setActiveSport('Svi')} />
        </section>
      )}

      {/* All Contests */}
      {allVisible.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Natjecanja
              <span className="text-sm font-normal text-muted-foreground">({allVisible.length})</span>
            </h2>
            <Link to="/natjecanja" className="text-sm text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Vidi sve <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allVisible.map((contest, i) => (
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
          <h3 className="text-lg font-bold mb-2">Nema aktivnih natjecanja</h3>
          <p className="text-muted-foreground">Nova natjecanja uskoro dolaze. Provjeri opet malo kasnije!</p>
        </div>
      )}
    </div>
  );
}
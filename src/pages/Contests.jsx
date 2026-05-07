import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Search, Layers, Zap, ListChecks } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOutletContext } from 'react-router-dom';
import ContestCard from '../components/contests/ContestCard';
import ParlayBuilder from './ParlayBuilder';
import DailyChallengePage from './DailyChallengePage';
import HokejComingSoon from '../components/sports/HokejComingSoon';

const sportFilters = ['Svi', 'Nogomet', 'Košarka', 'Tenis', 'Formula 1', 'MMA', 'Hokej', 'Pikado'];
const COMING_SOON_SPORTS = ['Hokej', 'Pikado'];
const statusFilters = ['Svi', 'active', 'upcoming', 'finished', 'sponsored'];
const statusLabels = { 'Svi': 'Svi', 'active': '🔴 Uživo', 'upcoming': 'Uskoro', 'finished': 'Završeno', 'sponsored': '🏆 Sponzorirano' };

const ALL_TAGS = ['Derbi', 'Ekskluzivno', 'Besplatno', 'Novi', 'Popularno', 'Ograničeno', 'VIP'];
const TAG_STYLE = {
  'Derbi':       'bg-red-500/15 text-red-400 border-red-500/30',
  'Ekskluzivno': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Besplatno':   'bg-green-500/15 text-green-400 border-green-500/30',
  'Novi':        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Popularno':   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Ograničeno':  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'VIP':         'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
};

const TABS = [
  { key: 'pickem', label: 'Pick\'em', icon: ListChecks, desc: 'Predvidi ishode igrača' },
  { key: 'parlay', label: 'Parlay', icon: Layers, desc: 'Kombinirani listić' },
  { key: 'izazovi', label: 'Izazovi', icon: Zap, desc: 'Dnevni zadaci' },
];

function PickEmTab() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('Svi');
  const [status, setStatus] = useState('Svi');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    base44.entities.Contest.list('-created_date', 50).then(data => {
      setContests(data);
      setLoading(false);
    });
  }, []);

  const filtered = COMING_SOON_SPORTS.includes(sport) ? [] : contests.filter(c => {
    if (sport !== 'Svi' && c.sport !== sport) return false;
    if (status === 'sponsored' && !c.is_sponsored) return false;
    if (status !== 'Svi' && status !== 'sponsored' && c.status !== status) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTag && !(c.tags || []).includes(activeTag)) return false;
    return true;
  });

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Pretraži natjecanja..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card border-border/50 rounded-xl"
        />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {sportFilters.map(s => (
          <button key={s} onClick={() => setSport(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            {s}
            {COMING_SOON_SPORTS.includes(s) && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-accent/20 text-accent leading-none">USKORO</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${status === s ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            {statusLabels[s]}
          </button>
        ))}
      </div>
      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTag(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${!activeTag ? 'bg-foreground text-background border-foreground' : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'}`}>
          Svi tagovi
        </button>
        {ALL_TAGS.map(tag => (
          <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeTag === tag ? TAG_STYLE[tag] : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'}`}>
            {tag}
          </button>
        ))}
      </div>

      {COMING_SOON_SPORTS.includes(sport) && (
        <HokejComingSoon onClose={() => setSport('Svi')} />
      )}

      {loading && !COMING_SOON_SPORTS.includes(sport) ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : !loading && !COMING_SOON_SPORTS.includes(sport) && filtered.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nema rezultata</h3>
          <p className="text-muted-foreground">Pokušaj s drugim filterima ili provjeri opet uskoro.</p>
        </div>
      ) : !COMING_SOON_SPORTS.includes(sport) ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contest, i) => (
            <ContestCard key={contest.id} contest={contest} index={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Contests() {
  const [activeTab, setActiveTab] = useState('pickem');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Igraj</h1>
        <p className="text-muted-foreground">Odaberi način igre i kreni!</p>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all font-semibold ${
                isActive
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-bold">{tab.label}</span>
              <span className="text-xs opacity-70 hidden sm:block">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'pickem' && <PickEmTab />}
      {activeTab === 'parlay' && <ParlayBuilder embedded />}
      {activeTab === 'izazovi' && <DailyChallengePage embedded />}
    </div>
  );
}
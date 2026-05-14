import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Search, Layers, Zap, ListChecks, SlidersHorizontal, X, ChevronDown, Flame, Swords } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOutletContext } from 'react-router-dom';
import ContestCard from '../components/contests/ContestCard';
import ParlayBuilder from './ParlayBuilder';
import DailyChallengePage from './DailyChallengePage';
import HokejComingSoon from '../components/sports/HokejComingSoon';
import PikadoComingSoon from '../components/sports/PikadoComingSoon';
import DailyStreakPanel from '../components/panels/DailyStreakPanel';
import DuelsPanel from '../components/panels/DuelsPanel';

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
  { key: 'pickem',       label: 'Pick\'em',     icon: ListChecks, emoji: '🎯' },
  { key: 'parlay',       label: 'Parlay',       icon: Layers,     emoji: '🔗' },
  { key: 'izazovi',      label: 'Izazovi',      icon: Zap,        emoji: '⚡' },
  { key: 'daily-streak', label: 'Daily Streak', icon: Flame,      emoji: '🔥' },
  { key: 'dueli',        label: 'Dueli',        icon: Swords,     emoji: '⚔️' },
];

const STAKE_RANGES = [
  { key: 'svi',    label: 'Svi ulozi' },
  { key: 'free',   label: 'Besplatno',  min: 0,    max: 0 },
  { key: 'low',    label: '1–500',      min: 1,    max: 500 },
  { key: 'mid',    label: '501–2000',   min: 501,  max: 2000 },
  { key: 'high',   label: '2001+',      min: 2001, max: Infinity },
];

const SORT_OPTIONS = [
  { key: 'newest',    label: 'Najnovije' },
  { key: 'oldest',    label: 'Najstarije' },
  { key: 'start_asc', label: 'Početak ↑' },
  { key: 'stake_asc', label: 'Ulog ↑' },
  { key: 'stake_desc',label: 'Ulog ↓' },
  { key: 'prize_desc',label: 'Nagrada ↓' },
];

function PickEmTab() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('Svi');
  const [status, setStatus] = useState('Svi');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [stakeRange, setStakeRange] = useState('svi');
  const [sortBy, setSortBy] = useState('newest');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    base44.entities.Contest.list('-created_date', 50).then(data => {
      setContests(data);
      setLoading(false);
    });
  }, []);

  const activeFilterCount = [
    sport !== 'Svi',
    status !== 'Svi',
    !!activeTag,
    stakeRange !== 'svi',
    sortBy !== 'newest',
  ].filter(Boolean).length;

  const resetAll = () => {
    setSport('Svi'); setStatus('Svi'); setActiveTag(null);
    setStakeRange('svi'); setSortBy('newest'); setSearch('');
  };

  const filtered = COMING_SOON_SPORTS.includes(sport) ? [] : contests.filter(c => {
    if (sport !== 'Svi' && c.sport !== sport) return false;
    if (status === 'sponsored' && !c.is_sponsored) return false;
    if (status !== 'Svi' && status !== 'sponsored' && c.status !== status) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTag && !(c.tags || []).includes(activeTag)) return false;
    const range = STAKE_RANGES.find(r => r.key === stakeRange);
    if (range && range.key !== 'svi') {
      const cost = c.entry_cost ?? 0;
      if (cost < range.min || cost > range.max) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'oldest')     return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === 'start_asc')  return new Date(a.start_time || a.created_date) - new Date(b.start_time || b.created_date);
    if (sortBy === 'stake_asc')  return (a.entry_cost ?? 0) - (b.entry_cost ?? 0);
    if (sortBy === 'stake_desc') return (b.entry_cost ?? 0) - (a.entry_cost ?? 0);
    if (sortBy === 'prize_desc') return (b.prize_pool ?? 0) - (a.prize_pool ?? 0);
    return new Date(b.created_date) - new Date(a.created_date); // newest
  });

  return (
    <div>
      {/* Search + filter toggle row */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži natjecanja..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50 rounded-xl"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
            showAdvanced || activeFilterCount > 0
              ? 'bg-primary/10 border-primary/40 text-primary'
              : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filteri
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {activeFilterCount > 0 && (
          <button onClick={resetAll} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:text-foreground transition-all">
            <X className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Sport pills — always visible */}
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

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 space-y-4">
          {/* Status */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${status === s ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Stake range */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Visina uloga</p>
            <div className="flex flex-wrap gap-2">
              {STAKE_RANGES.map(r => (
                <button key={r.key} onClick={() => setStakeRange(r.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${stakeRange === r.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Sortiraj po</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(o => (
                <button key={o.key} onClick={() => setSortBy(o.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sortBy === o.key ? 'bg-secondary border border-primary/40 text-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Tagovi</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTag(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${!activeTag ? 'bg-foreground text-background border-foreground' : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'}`}>
                Svi
              </button>
              {ALL_TAGS.map(tag => (
                <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeTag === tag ? TAG_STYLE[tag] : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      {!loading && !COMING_SOON_SPORTS.includes(sport) && (
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} {filtered.length === 1 ? 'natjecanje' : filtered.length < 5 ? 'natjecanja' : 'natjecanja'} pronađeno
        </p>
      )}

      {sport === 'Hokej' && <HokejComingSoon onClose={() => setSport('Svi')} />}
      {sport === 'Pikado' && <PikadoComingSoon onClose={() => setSport('Svi')} />}

      {loading && !COMING_SOON_SPORTS.includes(sport) ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : !loading && !COMING_SOON_SPORTS.includes(sport) && filtered.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nema rezultata</h3>
          <p className="text-muted-foreground mb-4">Pokušaj s drugim filterima ili provjeri opet uskoro.</p>
          {activeFilterCount > 0 && (
            <button onClick={resetAll} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              Resetiraj filtere
            </button>
          )}
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
  const { loadBalance } = useOutletContext();

  // Read ?tab= from URL, default to 'pickem'
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = TABS.find(t => t.key === urlParams.get('tab'))?.key || 'pickem';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    const url = new URL(window.location);
    url.searchParams.set('tab', key);
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1">Igraj</h1>
        <p className="text-muted-foreground text-sm">Odaberi način igre i kreni!</p>
      </div>

      {/* Tab bar — horizontally scrollable */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'pickem'       && <PickEmTab />}
      {activeTab === 'parlay'       && <ParlayBuilder embedded />}
      {activeTab === 'izazovi'      && <DailyChallengePage embedded />}
      {activeTab === 'daily-streak' && <DailyStreakPanel loadBalance={loadBalance} />}
      {activeTab === 'dueli'        && <DuelsPanel loadBalance={loadBalance} />}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, ArrowLeft, Swords } from 'lucide-react';
import { RankBadgeSmall, getRank } from '../components/profile/RankBadge';
import FollowButton from '../components/social/FollowButton';

const SPORT_EMOJI = {
  'Nogomet': '⚽', 'Košarka': '🏀', 'Tenis': '🎾', 'Formula 1': '🏎️', 'MMA': '🥊',
};

export default function PublicProfile() {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, won: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    const [me, allUsers, picks] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list(),
      base44.entities.Pick.filter({ user_email: '' }), // we'll filter by user after
    ]);
    setCurrentUser(me);

    const found = allUsers.find(u => u.id === userId);
    setProfileUser(found || null);

    if (found) {
      const userPicks = await base44.entities.Pick.filter({ user_email: found.email });
      const won = userPicks.filter(p => p.status === 'won').length;
      setStats({ total: userPicks.length, won });
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Korisnik nije pronađen.</p>
        <Link to="/" className="inline-flex items-center gap-2 mt-4 text-primary text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Povratak
        </Link>
      </div>
    );
  }

  const rank = getRank(stats.total, 0);
  const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0.0';
  const initials = profileUser.full_name?.charAt(0)?.toUpperCase() || profileUser.email?.charAt(0)?.toUpperCase() || 'U';
  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="-1" onClick={e => { e.preventDefault(); window.history.back(); }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Nazad
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Avatar + name */}
        <div className="flex items-start gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0">
            {profileUser.avatar_url ? (
              <img src={profileUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-black">{profileUser.full_name || 'Igrač'}</h1>
              <RankBadgeSmall rank={rank} />
              {profileUser.favorite_sport && (
                <span>{SPORT_EMOJI[profileUser.favorite_sport]}</span>
              )}
            </div>
            {profileUser.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">{profileUser.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl border border-border/40 bg-card p-4 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-black text-primary">{stats.won}</p>
            <p className="text-xs text-muted-foreground">Pobjede</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-xl font-black text-green-400">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>

        {/* Actions */}
        {!isOwnProfile && currentUser && (
          <div className="flex gap-3">
            <div className="flex-1">
              <FollowButton
                currentUserEmail={currentUser.email}
                targetEmail={profileUser.email}
                targetName={profileUser.full_name || profileUser.email}
              />
            </div>
            <Link
              to="/dueli"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm font-bold hover:bg-secondary/80 transition-all"
            >
              <Swords className="w-4 h-4 text-primary" />
              Izazovi
            </Link>
          </div>
        )}
        {isOwnProfile && (
          <Link to="/profil" className="block text-center py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
            Uredi profil
          </Link>
        )}
      </motion.div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import BadgesSection from '../components/badges/BadgesSection';
import NotificationPreferences from '../components/notifications/NotificationPreferences';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileStatsGrid from '../components/profile/ProfileStatsGrid';
import ProfileSettings from '../components/profile/ProfileSettings';
import RankCard, { getRank } from '../components/profile/RankBadge';
import ReferralSection from '../components/profile/ReferralSection';
import WelcomeBonusBanner from '../components/profile/WelcomeBonusBanner';
import { CheckCircle, Clock, Coins, Trophy, XCircle } from 'lucide-react';
import moment from 'moment';

const statusConfig = {
  active:  { label: 'Aktivno',    color: 'bg-accent/20 text-accent' },
  won:     { label: 'Osvojeno',   color: 'bg-primary/20 text-primary' },
  lost:    { label: 'Izgubljeno', color: 'bg-destructive/20 text-destructive' },
  partial: { label: 'Djelomično', color: 'bg-muted text-muted-foreground' },
};

const TABS = [
  { key: 'history',       label: 'Moji Odabiri' },
  { key: 'stats',         label: 'Statistika' },
  { key: 'badges',        label: '🏅 Dostignuća' },
  { key: 'rank',          label: 'Rang' },
  { key: 'referral',      label: '🎁 Referali' },
  { key: 'settings',      label: '⚙️ Postavke' },
  { key: 'notif_settings',label: '🔔 Obavijesti' },
];

export default function Profile() {
  const { tokenBalance, loadBalance, testNewUser } = useOutletContext();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, tokensWon: 0, tokensSpent: 0 });
  const [picks, setPicks] = useState([]);
  const [contests, setContests] = useState({});
  const [streakCount, setStreakCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  const avatarFileRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const [me, picksData, contestsData, streakData] = await Promise.all([
      base44.auth.me(),
      base44.entities.Pick.list('-created_date', 50),
      base44.entities.Contest.list('-created_date', 100),
      base44.entities.DailyStreakWeek.filter({ user_email: (await base44.auth.me()).email }),
    ]);
    setUser(me);
    setPicks(picksData);

    const contestMap = {};
    contestsData.forEach(c => { contestMap[c.id] = c; });
    setContests(contestMap);

    const s = { total: picksData.length, won: 0, lost: 0, tokensWon: 0, tokensSpent: 0 };
    picksData.forEach(p => {
      if (p.status === 'won') s.won++;
      if (p.status === 'lost') s.lost++;
      s.tokensWon += (p.tokens_won || 0);
      s.tokensSpent += (p.tokens_spent || 0);
    });
    setStats(s);

    // Current week streak correct picks
    const now = new Date();
    const weekStart = moment(now).startOf('isoWeek').format('YYYY-MM-DD');
    const currentWeek = streakData.find(sw => sw.week_start_date === weekStart);
    setStreakCount(currentWeek?.correct_picks || 0);

    setLoading(false);
  };

  const handleAvatarUpdated = (url) => {
    setUser(prev => ({ ...prev, avatar_url: url }));
  };

  const handleSettingsSaved = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : 0;
  const netProfit = stats.tokensWon - stats.tokensSpent;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <WelcomeBonusBanner
        user={user}
        forceShow={testNewUser}
        picks={picks}
        onClaimed={async () => {
          const me = await base44.auth.me();
          setUser(me);
          if (loadBalance) await loadBalance();
        }}
      />

      {/* Hidden file input for avatar (triggered from ProfileSettings) */}
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await base44.auth.updateMe({ avatar_url: file_url });
          handleAvatarUpdated(file_url);
        }}
      />

      {/* A) Header */}
      <ProfileHeader
        user={user}
        stats={stats}
        avatarSize={120}
        onAvatarUpdated={handleAvatarUpdated}
      />

      {/* B) Stats grid */}
      <ProfileStatsGrid
        tokenBalance={tokenBalance}
        stats={stats}
        streakCount={streakCount}
      />

      {/* C) Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Moji Odabiri */}
      {activeTab === 'history' && (
        <div className="space-y-3 mb-8">
          {picks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Još nisi sudjelovao ni u jednom natjecanju</p>
            </div>
          ) : picks.map((pick, i) => {
            const contest = contests[pick.contest_id];
            const sc = statusConfig[pick.status] || statusConfig.active;
            const correct = pick.correct_picks || 0;
            const total = pick.total_picks || pick.selections?.length || 0;
            return (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-border/50 bg-card p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-sm">{contest?.title || 'Natjecanje'}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {moment(pick.created_date).format('DD.MM.YYYY HH:mm')}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>{sc.label}</span>
                </div>
                <div className="flex items-center gap-4 text-xs mt-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    <span>{correct}/{total} točnih</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Coins className="w-3.5 h-3.5 text-accent" />
                    <span>-{pick.tokens_spent}</span>
                  </div>
                  {pick.tokens_won > 0 && (
                    <div className="flex items-center gap-1 font-bold text-primary">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>+{pick.tokens_won}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Tab: Statistika */}
      {activeTab === 'stats' && (
        <div className="space-y-4 mb-8">
          <div className="rounded-2xl bg-card border border-border/50 p-5">
            <h3 className="font-bold mb-4">Statistika uspješnosti</h3>
            <div className="space-y-3">
              {[
                { label: 'Ukupno odigrano', value: stats.total },
                { label: 'Pobjede', value: stats.won },
                { label: 'Porazi', value: stats.lost },
                { label: 'Win rate', value: `${winRate}%` },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="font-bold text-sm">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/50 p-5">
            <h3 className="font-bold mb-4">Statistika tokena</h3>
            <div className="space-y-3">
              {[
                { label: 'Ukupno potrošeno', value: stats.tokensSpent.toLocaleString(), color: 'text-destructive' },
                { label: 'Ukupno zarađeno', value: stats.tokensWon.toLocaleString(), color: 'text-primary' },
                { label: 'Neto zarada', value: (netProfit >= 0 ? '+' : '') + netProfit.toLocaleString(), color: netProfit >= 0 ? 'text-primary' : 'text-destructive' },
                { label: 'Trenutno stanje', value: tokenBalance?.toLocaleString(), color: 'text-accent' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className={`font-bold text-sm ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Win Rate</h3>
              <span className="text-2xl font-black text-primary">{winRate}%</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${winRate}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-400"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats.won} pobjeda</span>
              <span>{stats.lost} poraza</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="mb-8"><BadgesSection userEmail={user?.email} /></div>
      )}

      {activeTab === 'rank' && (
        <div className="mb-8">
          <RankCard totalPicks={stats.total} totalTokensWon={stats.tokensWon} />
        </div>
      )}

      {activeTab === 'referral' && (
        <div className="mb-8">
          <ReferralSection user={user} tokenBalance={tokenBalance} loadBalance={loadBalance} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="mb-8">
          <ProfileSettings
            user={user}
            onSaved={handleSettingsSaved}
            onAvatarClick={() => avatarFileRef.current?.click()}
          />
        </div>
      )}

      {activeTab === 'notif_settings' && (
        <div className="mb-8">
          <NotificationPreferences
            user={user}
            onSaved={(prefs) => setUser(prev => ({ ...prev, notification_preferences: prefs }))}
          />
        </div>
      )}
    </div>
  );
}
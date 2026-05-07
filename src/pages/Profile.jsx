import { useState, useEffect, useRef } from 'react';
import ReferralSection from '../components/profile/ReferralSection';
import RankCard, { RankBadgeSmall, getRank } from '../components/profile/RankBadge';
import WelcomeBonusBanner from '../components/profile/WelcomeBonusBanner';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Coins, Trophy, Target, TrendingUp, LogOut, Camera, CheckCircle, XCircle, Clock, BarChart2, PieChart, Medal } from 'lucide-react';
import BadgesSection from '../components/badges/BadgesSection';
import { Button } from '@/components/ui/button';
import moment from 'moment';

const statusConfig = {
  active:  { label: 'Aktivno',      color: 'bg-accent/20 text-accent' },
  won:     { label: 'Osvojeno',     color: 'bg-primary/20 text-primary' },
  lost:    { label: 'Izgubljeno',   color: 'bg-destructive/20 text-destructive' },
  partial: { label: 'Djelomično',   color: 'bg-muted text-muted-foreground' },
};

export default function Profile() {
  const { tokenBalance, loadBalance } = useOutletContext();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, tokensWon: 0, tokensSpent: 0 });
  const [picks, setPicks] = useState([]);
  const [contests, setContests] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('history');

  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const [me, picksData, contestsData] = await Promise.all([
      base44.auth.me(),
      base44.entities.Pick.list('-created_date', 50),
      base44.entities.Contest.list('-created_date', 100),
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
    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ avatar_url: file_url });
    setUser(prev => ({ ...prev, avatar_url: file_url }));
    setUploadingAvatar(false);
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
        picks={picks}
        onClaimed={async () => {
          const me = await base44.auth.me();
          setUser(me);
          if (loadBalance) await loadBalance();
        }}
      />

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-5 mb-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">
                  {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
            >
              {uploadingAvatar
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-5 h-5 text-white" />
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div>
            <h1 className="text-2xl font-black">{user?.full_name || 'Igrač'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Član od {moment(user?.created_date).format('MMMM YYYY.')}</p>
          </div>
          <div className="ml-auto">
            <RankBadgeSmall rank={getRank(stats.total, stats.tokensWon)} />
          </div>
        </div>

        {/* Token balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-fuchsia-500/5 border border-primary/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Stanje tokena</p>
              <p className="text-4xl font-black text-primary">{tokenBalance?.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/statistika-korisnika"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border/50 font-bold text-sm hover:bg-secondary/80 transition-all"
              >
                <PieChart className="w-4 h-4" />
                Statistika
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border/50 font-bold text-sm hover:bg-secondary/80 transition-all"
              >
                <BarChart2 className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/novcanik"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all"
              >
                <Coins className="w-4 h-4" />
                Kupi Tokene
              </Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Odigrano', value: stats.total, icon: Target, color: 'text-muted-foreground' },
            { label: 'Pobjede', value: stats.won, icon: Trophy, color: 'text-primary' },
            { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-accent' },
            { label: 'Neto zarada', value: (netProfit >= 0 ? '+' : '') + netProfit.toLocaleString(), icon: Coins, color: netProfit >= 0 ? 'text-primary' : 'text-destructive' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl bg-card border border-border/50 text-center"
            >
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'history', label: 'Povijest natjecanja' },
          { key: 'stats', label: 'Statistika' },
          { key: 'badges', label: '🏅 Dostignuća' },
          { key: 'rank', label: 'Rang' },
          { key: 'referral', label: '🎁 Referali' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contest History */}
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

      {/* Detailed Stats */}
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

      {/* Badges tab */}
      {activeTab === 'badges' && (
        <div className="mb-8">
          <BadgesSection userEmail={user?.email} />
        </div>
      )}

      {/* Rank tab */}
      {activeTab === 'rank' && (
        <div className="mb-8">
          <RankCard totalPicks={stats.total} totalTokensWon={stats.tokensWon} />
        </div>
      )}

      {/* Referral tab */}
      {activeTab === 'referral' && (
        <div className="mb-8">
          <ReferralSection user={user} tokenBalance={tokenBalance} loadBalance={loadBalance} />
        </div>
      )}

      <Button variant="outline" className="w-full rounded-xl" onClick={() => base44.auth.logout()}>
        <LogOut className="w-4 h-4 mr-2" />
        Odjava
      </Button>
    </div>
  );
}
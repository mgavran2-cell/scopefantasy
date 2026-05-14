import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Trophy, Gift, Flame, Star, Users, Handshake,
  Plus, TrendingUp, Clock, Ticket, Shield
} from 'lucide-react';

// Import all panel components
import AdminContests from './AdminContests';
import AdminWelcomeChallenge from './AdminWelcomeChallenge';
import AdminDailyStreak from './AdminDailyStreak';
import AdminSponsorDashboard from './AdminSponsorDashboard';
import AdminUsers from './AdminUsers';
import AdminPartneri from './AdminPartneri';

const TABS = [
  { key: 'pregled',    label: 'Pregled',          icon: LayoutDashboard },
  { key: 'natjecanja', label: 'Natjecanja',        icon: Trophy },
  { key: 'welcome',    label: 'Welcome Challenge', icon: Gift },
  { key: 'streak',     label: 'Daily Streak',      icon: Flame },
  { key: 'sponzori',   label: 'Sponzori',          icon: Star },
  { key: 'korisnici',  label: 'Korisnici',         icon: Users },
  { key: 'partneri',   label: 'Partneri',          icon: Handshake },
];

// ── Overview Panel ─────────────────────────────────────────────────────────────
function OverviewPanel({ onTabChange }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [users, contests, vouchers] = await Promise.all([
        base44.entities.User.list('-created_date', 500),
        base44.entities.Contest.list('-created_date', 200),
        base44.entities.PartnerVoucher.list('-created_date', 200),
      ]);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      setStats({
        activeUsers: users.filter(u => u.last_active_date && new Date(u.last_active_date) >= sevenDaysAgo).length,
        premiumUsers: users.filter(u => u.subscription_active === true).length,
        activeContests: contests.filter(c => c.status_internal === 'active').length,
        waitingContests: contests.filter(c => c.status_internal === 'waiting_results').length,
        sponsoredContests: contests.filter(c => c.is_sponsored).length,
        issuedVouchers: vouchers.filter(v => v.status === 'issued').length,
        totalUsers: users.length,
        totalContests: contests.length,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Aktivnih korisnika (7d)', value: stats.activeUsers, icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Premium korisnika', value: stats.premiumUsers, icon: Star, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Aktivnih natjecanja', value: stats.activeContests, icon: Trophy, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Čeka rezultate', value: stats.waitingContests, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Sponzoriranih', value: stats.sponsoredContests, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Vouchera na čekanju', value: stats.issuedVouchers, icon: Ticket, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  ];

  const quickActions = [
    { label: '+ Novo natjecanje', tab: 'natjecanja', color: 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/25' },
    { label: '+ Welcome Challenge', tab: 'welcome', color: 'bg-accent/10 text-accent hover:bg-accent/20 border-accent/25' },
    { label: '+ Pick dana (Streak)', tab: 'streak', color: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/25' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div>
        <h2 className="font-black text-sm uppercase tracking-wider text-muted-foreground mb-4">Statistika platforme</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-black text-sm uppercase tracking-wider text-muted-foreground mb-4">Brze akcije</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((a, i) => (
            <button key={i} onClick={() => onTabChange(a.tab)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-sm transition-all ${a.color}`}>
              <Plus className="w-4 h-4" /> {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Sažetak
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Ukupno korisnika', value: stats.totalUsers },
            { label: 'Ukupno natjecanja', value: stats.totalContests },
            { label: 'Premium korisnici', value: `${stats.premiumUsers} / ${stats.totalUsers}` },
            { label: 'Voucheri u tijeku', value: stats.issuedVouchers },
          ].map((r, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-border/30 last:border-0">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-bold">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pregled');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(me => {
      setUser(me);
      if (me?.role !== 'admin') navigate('/');
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (user?.role !== 'admin') return (
    <div className="text-center py-20 text-muted-foreground">Nemaš pristup ovoj stranici.</div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-black uppercase">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Centralno upravljanje platformom</p>
        </div>
      </div>

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="overflow-x-auto pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'pregled' && <OverviewPanel onTabChange={setActiveTab} />}

        {/* Embed existing admin pages — they render their own content */}
        {activeTab === 'natjecanja' && (
          <div className="-mx-4 sm:mx-0">
            <AdminContests />
          </div>
        )}
        {activeTab === 'welcome' && (
          <div className="-mx-4 sm:mx-0">
            <AdminWelcomeChallenge />
          </div>
        )}
        {activeTab === 'streak' && (
          <div className="-mx-4 sm:mx-0">
            <AdminDailyStreak />
          </div>
        )}
        {activeTab === 'sponzori' && (
          <div className="-mx-4 sm:mx-0">
            <AdminSponsorDashboard />
          </div>
        )}
        {activeTab === 'korisnici' && (
          <div className="-mx-4 sm:mx-0">
            <AdminUsers />
          </div>
        )}
        {activeTab === 'partneri' && (
          <div className="-mx-4 sm:mx-0">
            <AdminPartneri />
          </div>
        )}
      </div>
    </div>
  );
}
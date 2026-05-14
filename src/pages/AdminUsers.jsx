import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isOwner } from '@/lib/permissions';
import { motion } from 'framer-motion';
import { Users, ShieldAlert, Trash2, Play, RefreshCw, Mail, Star } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function AdminUsers() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);
  const [digestRunning, setDigestRunning] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (isOwner(me)) {
      await loadUsers();
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const data = await base44.entities.User.list('-created_date', 500);
    setAllUsers(data);
  };

  const handleRunDigest = async () => {
    setDigestRunning(true);
    const res = await base44.functions.invoke('feedActivityDigest', {});
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`✓ Poslano ${res.data?.digests_sent ?? 0} digesta (od ${res.data?.target_users ?? 0} kandidata)`);
    }
    setDigestRunning(false);
  };

  const handleRunCleanup = async () => {
    setCronRunning(true);
    const res = await base44.functions.invoke('cleanupInactiveUsers', {});
    const { warned, reset, deleted } = res.data || {};
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`Obrađeno: ${warned} warning sent, ${reset} reset, ${deleted} deleted`);
      await loadUsers();
    }
    setCronRunning(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!isOwner(user)) return (
    <div className="text-center py-20 text-muted-foreground">Nemaš pristup ovoj stranici.</div>
  );

  const now = new Date();
  const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeUsers = allUsers.filter(u => {
    const la = u.last_active_date ? new Date(u.last_active_date) : null;
    return la && la >= twelveMonthsAgo;
  });
  const premiumUsers = allUsers.filter(u => u.subscription_active === true);
  const freeUsers = allUsers.filter(u => u.subscription_active !== true);
  const warnedUsers = allUsers.filter(u => u.inactive_warning_sent);
  const pendingDeletion = warnedUsers.filter(u => {
    const wd = u.inactive_warning_date ? new Date(u.inactive_warning_date) : null;
    return wd && wd <= thirtyDaysAgo;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-black uppercase mb-6 flex items-center gap-3">
        <Users className="w-7 h-7 text-primary" /> Admin: Korisnici
      </h1>

      {/* GDPR Cleanup Section */}
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 mb-8">
        <h2 className="font-black text-lg mb-1 flex items-center gap-2 text-yellow-400">
          <ShieldAlert className="w-5 h-5" /> GDPR Cleanup
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          Automatski cron pokreće se 1. u mjesecu u 03:00 UTC. Korisnici neaktivni 12+ mj. dobivaju upozorenje,
          a brišu se 30 dana nakon upozorenja ako se ne vrate.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Aktivnih korisnika', value: activeUsers.length, color: 'text-green-400', icon: Users },
            { label: 'Korisnika s upozorenjem', value: warnedUsers.length, color: 'text-yellow-400', icon: ShieldAlert },
            { label: 'Za brisanje (sljedeći cron)', value: pendingDeletion.length, color: 'text-destructive', icon: Trash2 },
            { label: 'Premium korisnika', value: premiumUsers.length, color: 'text-primary', icon: Star },
            { label: 'Free korisnika', value: freeUsers.length, color: 'text-muted-foreground', icon: Users },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-border/40 bg-card p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRunCleanup}
            disabled={cronRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-500/60 text-yellow-400 text-sm font-bold hover:bg-yellow-500/10 transition-all disabled:opacity-60"
          >
            {cronRunning
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Pokrećem cleanup...</>
              : <><Play className="w-4 h-4" /> Pokreni cleanup cron sada (test)</>
            }
          </button>
          <button
            onClick={handleRunDigest}
            disabled={digestRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-400/60 text-yellow-300 text-sm font-bold hover:bg-yellow-400/10 transition-all disabled:opacity-60"
          >
            {digestRunning
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Šaljem digeste...</>
              : <><Mail className="w-4 h-4" /> Pokreni feed digest cron sada (test)</>
            }
          </button>
        </div>
      </div>

      {/* Warned users list */}
      {warnedUsers.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
              Upozoreni korisnici ({warnedUsers.length})
            </h3>
          </div>
          <div className="divide-y divide-border/30">
            {warnedUsers.map(u => {
              const wd = u.inactive_warning_date ? new Date(u.inactive_warning_date) : null;
              const expiry = wd ? new Date(wd.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
              const isPending = wd && wd <= thirtyDaysAgo;
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <p className="text-muted-foreground">Upozorenje: {wd ? moment(wd).format('DD.MM.YYYY') : '—'}</p>
                    <p className={isPending ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                      {isPending ? '⚠ Za brisanje u sljedećem cronu' : `Brisanje: ${expiry ? moment(expiry).format('DD.MM.YYYY') : '—'}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All users table */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <h3 className="font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Svi korisnici ({allUsers.length})
          </h3>
        </div>
        <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
          {allUsers.map(u => {
            const la = u.last_active_date ? new Date(u.last_active_date) : null;
            const isInactive = !la || la < twelveMonthsAgo;
            const isPremium = u.subscription_active === true;

            const handleTogglePremium = async () => {
              const newActive = !isPremium;
              await base44.entities.User.update(u.id, {
                subscription_active: newActive,
                subscription_tier: newActive ? 'premium' : 'free',
              });
              toast.success(`✓ ${u.full_name || u.email} sad je ${newActive ? 'Premium' : 'Free'}`);
              await loadUsers();
            };

            return (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  isPremium ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                }`}>
                  {isPremium ? 'Premium' : 'Free'}
                </span>
                <div className="text-right text-xs shrink-0">
                  <p className={isInactive ? 'text-yellow-400' : 'text-green-400'}>
                    {la ? moment(la).format('DD.MM.YYYY') : 'Nikad'}
                  </p>
                  <p className="text-muted-foreground">{u.role}</p>
                </div>
                <button
                  onClick={handleTogglePremium}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                    isPremium
                      ? 'border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10'
                      : 'border-primary/40 text-primary hover:bg-primary/10'
                  }`}
                >
                  {isPremium ? '→ Free' : '→ Premium'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
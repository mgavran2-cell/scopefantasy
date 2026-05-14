import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isOwner } from '@/lib/permissions';
import { motion } from 'framer-motion';
import { Star, MousePointerClick, Users, TrendingUp, ExternalLink, Trophy } from 'lucide-react';

export default function AdminSponsorDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [me, contests, clicks, picks] = await Promise.all([
      base44.auth.me(),
      base44.entities.Contest.filter({ is_sponsored: true }, '-created_date', 50),
      base44.entities.SponsorClick.list('-created_date', 1000),
      base44.entities.Pick.list('-created_date', 1000),
    ]);
    setUser(me);

    const combined = contests.map(contest => {
      const contestClicks = clicks.filter(c => c.contest_id === contest.id);
      const contestPicks = picks.filter(p => p.contest_id === contest.id);
      const uniqueUsers = new Set([
        ...contestClicks.map(c => c.user_email).filter(Boolean),
        ...contestPicks.map(p => p.user_email).filter(Boolean),
      ]);
      return {
        contest,
        clicks: contestClicks.length,
        entries: contestPicks.length,
        reach: uniqueUsers.size,
        wonPicks: contestPicks.filter(p => p.status === 'won').length,
      };
    });

    setStats(combined);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!isOwner(user)) return (
    <div className="text-center py-20 text-muted-foreground">Nemaš pristup ovoj stranici.</div>
  );

  const totalClicks = stats.reduce((s, r) => s + r.clicks, 0);
  const totalEntries = stats.reduce((s, r) => s + r.entries, 0);
  const totalReach = stats.reduce((s, r) => s + r.reach, 0);

  const statusColor = { active: 'bg-primary/15 text-primary', upcoming: 'bg-accent/15 text-accent', finished: 'bg-muted text-muted-foreground' };
  const statusLabel = { active: 'Aktivno', upcoming: 'Uskoro', finished: 'Završeno' };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
          <Star className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-black uppercase">Sponsor Dashboard</h1>
          <p className="text-sm text-muted-foreground">{stats.length} sponzoriranih natjecanja</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Ukupno klikova', value: totalClicks, icon: MousePointerClick, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Ukupno prijava', value: totalEntries, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Ukupni doseg', value: totalReach, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border/50 bg-card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-display font-black ${card.color}`}>{card.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Per-contest stats */}
      {stats.length === 0 ? (
        <div className="text-center py-16">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">Nema sponzoriranih natjecanja.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map(({ contest, clicks, entries, reach, wonPicks }, i) => (
            <motion.div key={contest.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-yellow-500/25 bg-card p-5">
              {/* Contest header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {contest.sponsor_logo_url ? (
                    <img src={contest.sponsor_logo_url} alt={contest.sponsor_name} className="w-10 h-10 rounded-xl object-contain bg-secondary" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{contest.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[contest.status]}`}>
                        {statusLabel[contest.status]}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-400 font-semibold">{contest.sponsor_name} · {contest.sport}</p>
                  </div>
                </div>
                {contest.sponsor_url && (
                  <a href={contest.sponsor_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Sponsor link
                  </a>
                )}
              </div>

              {/* Metric row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Klikovi "Saznaj više"', value: clicks, icon: MousePointerClick, color: 'text-primary' },
                  { label: 'Prijave', value: entries, icon: Users, color: 'text-accent' },
                  { label: 'Jedinstveni doseg', value: reach, icon: TrendingUp, color: 'text-yellow-400' },
                  { label: 'Pobjednici', value: wonPicks, icon: Trophy, color: 'text-green-400' },
                ].map((m, j) => (
                  <div key={j} className="rounded-xl bg-secondary/60 p-3 text-center">
                    <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                    <p className={`text-xl font-display font-black ${m.color}`}>{m.value.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* CTR */}
              {entries > 0 && clicks > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((clicks / entries) * 100))}%` }}
                    />
                  </div>
                  <span className="font-semibold text-primary shrink-0">
                    {Math.round((clicks / entries) * 100)}% CTR
                  </span>
                </div>
              )}

              {contest.sponsor_prize_description && (
                <p className="mt-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
                  🎁 <span className="font-semibold text-foreground">Nagrada:</span> {contest.sponsor_prize_description}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow manual trigger by admin OR scheduled cron (no user)
    let callerIsAdmin = false;
    try {
      const me = await base44.auth.me();
      if (me?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
      }
      callerIsAdmin = true;
    } catch (_) {
      // Cron: no user session — proceed with service role
    }

    const now = new Date();
    const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);
    const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
    const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setMonth(now.getMonth() - 12);
    const fiveDaysAgo = new Date(now); fiveDaysAgo.setDate(now.getDate() - 5);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);

    // Filter: inactive 3–90 days (skip >90 days, skip >12 months for cleanup)
    const targetUsers = allUsers.filter(u => {
      if (!u.last_active_date) return false;
      const la = new Date(u.last_active_date);
      if (la >= threeDaysAgo) return false;         // active recently
      if (la < ninetyDaysAgo) return false;          // too inactive
      if (la < twelveMonthsAgo) return false;        // going to cleanup
      // anti-spam: already got digest in last 5 days
      if (u.last_digest_sent_date) {
        const ld = new Date(u.last_digest_sent_date);
        if (ld >= fiveDaysAgo) return false;
      }
      // respect social notification preference
      const prefs = u.notification_preferences || {};
      if (prefs.social === false) return false;
      if (prefs.weekly_digest === false) return false;
      return true;
    });

    let digestCount = 0;

    for (const user of targetUsers) {
      // Dohvati follows
      const follows = await base44.asServiceRole.entities.Follow.filter({ follower_email: user.email });
      const followingEmails = follows.map(f => f.following_email);

      if (followingEmails.length === 0) {
        // Generic re-engagement — no friends
        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'weekly_digest',
          title: '🎯 Vraćaš se?',
          body: 'Vidi što je novo na ScopeFantasy. Nova natjecanja te čekaju!',
          read: false,
        });
        await base44.asServiceRole.entities.User.update(user.id, {
          last_digest_sent_date: now.toISOString(),
        });
        digestCount++;
        continue;
      }

      // Dohvati aktivnosti prijatelja u zadnjih 7 dana
      const [recentPicks, recentParlays, recentDuels, recentStreakWeeks] = await Promise.all([
        base44.asServiceRole.entities.Pick.filter({ status: 'won' }, '-tokens_won', 50),
        base44.asServiceRole.entities.Parlay.filter({ status: 'won' }, '-tokens_won', 50),
        base44.asServiceRole.entities.Duel.filter({ status: 'finished' }, '-created_date', 50),
        base44.asServiceRole.entities.DailyStreakWeek.list('-created_date', 100),
      ]);

      const cutoff = sevenDaysAgo.toISOString();

      // Filter to friends only + last 7 days
      const friendPicks = recentPicks.filter(p =>
        followingEmails.includes(p.user_email) &&
        p.created_date > cutoff
      ).slice(0, 3);

      const friendParlays = recentParlays.filter(p =>
        followingEmails.includes(p.user_email) &&
        p.created_date > cutoff
      ).slice(0, 3);

      const friendDuelWins = recentDuels.filter(d =>
        followingEmails.includes(d.winner_email) &&
        d.created_date > cutoff
      ).slice(0, 2);

      // 7/7 Daily Streak achievers among friends
      const jackpotStreaks = recentStreakWeeks.filter(sw =>
        followingEmails.includes(sw.user_email) &&
        sw.correct_picks >= 7 &&
        sw.week_start_date > sevenDaysAgo.toISOString().split('T')[0]
      );

      // Check if there's any activity to report
      const hasActivity = friendPicks.length > 0 || friendParlays.length > 0 ||
        friendDuelWins.length > 0 || jackpotStreaks.length > 0;

      if (!hasActivity) {
        // Generic nudge even if following but no recent friend activity
        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'weekly_digest',
          title: '🎯 Nedostaje ti nešto?',
          body: 'Tvoji prijatelji su aktivni na ScopeFantasy. Pridruži im se!',
          read: false,
        });
        await base44.asServiceRole.entities.User.update(user.id, {
          last_digest_sent_date: now.toISOString(),
        });
        digestCount++;
        continue;
      }

      // Build digest lines
      const lines = [];
      const totalTokensWon = [
        ...friendPicks.map(p => p.tokens_won || 0),
        ...friendParlays.map(p => p.tokens_won || p.actual_payout || 0),
      ].reduce((s, v) => s + v, 0);

      // Top wins from picks
      for (const pick of friendPicks) {
        const name = pick.user_name || pick.user_email?.split('@')[0] || 'Prijatelj';
        lines.push(`🏆 **${name}** osvojio **${(pick.tokens_won || 0).toLocaleString()} tokena**`);
      }

      // Top parlay wins
      for (const parlay of friendParlays) {
        const name = parlay.user_name || parlay.user_email?.split('@')[0] || 'Prijatelj';
        const payout = parlay.tokens_won || parlay.actual_payout || 0;
        lines.push(`🎰 **${name}** pogodio parlay – **${payout.toLocaleString()} tokena**!`);
      }

      // Duel wins
      for (const duel of friendDuelWins) {
        const name = duel.winner_email?.split('@')[0] || 'Prijatelj';
        lines.push(`⚔️ **${name}** pobijedio u duelu!`);
      }

      // Jackpot streak
      for (const sw of jackpotStreaks) {
        const name = sw.user_email?.split('@')[0] || 'Prijatelj';
        lines.push(`🔥 **${name}** ima 7/7 Daily Streak jackpot!`);
      }

      if (totalTokensWon > 0) {
        lines.push(`\nTvoji prijatelji su zaradili ukupno **${totalTokensWon.toLocaleString()} tokena** ovaj tjedan!`);
      }

      const bodyShort = lines.slice(0, 3).join('\n');
      const fullBody = lines.join('\n') + '\n\nOtvori Zajednicu da vidiš detalje → /feed';

      // In-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: 'weekly_digest',
        title: '🔥 Tjedni digest',
        body: bodyShort,
        read: false,
      });

      // Email digest if opt-in (default false)
      const prefs = user.notification_preferences || {};
      if (prefs.email_digest === true && user.email) {
        const htmlLines = lines.map(l =>
          l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        ).join('<br>');

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#f5f5f5;font-family:Inter,sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#7c3aed;border-radius:12px;padding:10px 20px;">
        <span style="color:white;font-weight:900;font-size:18px;letter-spacing:1px;">SCOPEFANTASY</span>
      </div>
    </div>

    <h1 style="font-size:24px;font-weight:900;margin:0 0 8px 0;">🔥 Tjedni digest</h1>
    <p style="color:#888;margin:0 0 24px 0;font-size:14px;">
      Evo što su tvoji prijatelji radili dok tebe nije bilo...
    </p>

    <div style="background:#111;border:1px solid #222;border-radius:16px;padding:20px;margin-bottom:24px;">
      ${htmlLines}
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://scopefantasy.com/feed"
         style="display:inline-block;background:#7c3aed;color:white;font-weight:700;font-size:15px;
                text-decoration:none;padding:14px 32px;border-radius:12px;">
        Otvori aplikaciju →
      </a>
    </div>

    <p style="color:#555;font-size:11px;text-align:center;margin:0;">
      Primio si ovu poruku jer nisi bio aktivan 3+ dana.<br>
      Možeš isključiti digest u Profil → Postavke obavijesti.
    </p>
  </div>
</body>
</html>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: '🔥 ScopeFantasy: Tvoj tjedni digest',
          body: emailHtml,
        });
      }

      // Update last_digest_sent_date
      await base44.asServiceRole.entities.User.update(user.id, {
        last_digest_sent_date: now.toISOString(),
      });

      digestCount++;
    }

    return Response.json({
      success: true,
      digests_sent: digestCount,
      target_users: targetUsers.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
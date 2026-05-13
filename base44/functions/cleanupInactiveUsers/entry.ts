import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple hash for anonymization
function hashEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual trigger or scheduled cron
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
      }
    } catch (_) { /* scheduled cron — no user context */ }

    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allUsers = await base44.asServiceRole.entities.User.list();

    let warningSentCount = 0;
    let resetCount = 0;
    let deletedCount = 0;

    // ── FAZA 2: Resetiraj korisnike koji su se vratili ──────────────────
    for (const user of allUsers) {
      if (!user.inactive_warning_sent || !user.inactive_warning_date) continue;
      const lastActive = user.last_active_date ? new Date(user.last_active_date) : null;
      const warningDate = new Date(user.inactive_warning_date);
      if (lastActive && lastActive > warningDate) {
        await base44.asServiceRole.entities.User.update(user.id, {
          inactive_warning_sent: false,
          inactive_warning_date: null,
        });
        console.log(`cleanupInactiveUsers: RESET ${user.email} — returned after warning`);
        resetCount++;
      }
    }

    // Re-fetch after resets
    const freshUsers = await base44.asServiceRole.entities.User.list();

    // ── FAZA 3: Briši korisnike kojima je istekao grace period ──────────
    for (const user of freshUsers) {
      if (!user.inactive_warning_sent || !user.inactive_warning_date) continue;
      const warningDate = new Date(user.inactive_warning_date);
      if (warningDate > thirtyDaysAgo) continue; // grace period not expired
      const lastActive = user.last_active_date ? new Date(user.last_active_date) : new Date(0);
      if (lastActive >= twelveMonthsAgo) continue; // user became active

      const anonId = `deleted_user_${hashEmail(user.email)}`;
      console.log(`cleanupInactiveUsers: DELETING ${user.email} → anon ${anonId}`);

      // Anonymize picks
      const picks = await base44.asServiceRole.entities.Pick.filter({ user_email: user.email });
      for (const pick of picks) {
        await base44.asServiceRole.entities.Pick.update(pick.id, { user_email: anonId, user_name: 'Obrisani korisnik' });
      }

      // Anonymize parlays
      const parlays = await base44.asServiceRole.entities.Parlay.filter({ user_email: user.email });
      for (const p of parlays) {
        await base44.asServiceRole.entities.Parlay.update(p.id, { user_email: anonId, user_name: 'Obrisani korisnik' });
      }

      // Anonymize social posts
      const posts = await base44.asServiceRole.entities.SocialPost.filter({ user_email: user.email });
      for (const post of posts) {
        await base44.asServiceRole.entities.SocialPost.update(post.id, { user_email: anonId, user_name: 'Obrisani korisnik' });
      }

      // Anonymize comments
      const comments = await base44.asServiceRole.entities.Comment.filter({ user_email: user.email });
      for (const c of comments) {
        await base44.asServiceRole.entities.Comment.update(c.id, { user_email: anonId, user_name: 'Obrisani korisnik' });
      }

      // Anonymize token transactions
      const txns = await base44.asServiceRole.entities.TokenTransaction.filter({ user_email: user.email });
      for (const t of txns) {
        await base44.asServiceRole.entities.TokenTransaction.update(t.id, { user_email: anonId });
      }

      // Delete associated records
      const [follows1, follows2, notifs, streakEntries, streakWeeks, wcEntries, chalProgress, sponsorClicks, userBadges] = await Promise.all([
        base44.asServiceRole.entities.Follow.filter({ follower_email: user.email }),
        base44.asServiceRole.entities.Follow.filter({ following_email: user.email }),
        base44.asServiceRole.entities.Notification.filter({ user_email: user.email }),
        base44.asServiceRole.entities.DailyStreakEntry.filter({ user_email: user.email }),
        base44.asServiceRole.entities.DailyStreakWeek.filter({ user_email: user.email }),
        base44.asServiceRole.entities.WelcomeChallengeEntry.filter({ user_email: user.email }),
        base44.asServiceRole.entities.ChallengeProgress.filter({ user_email: user.email }),
        base44.asServiceRole.entities.SponsorClick.filter({ user_email: user.email }),
        base44.asServiceRole.entities.UserBadge.filter({ user_email: user.email }),
      ]);

      const toDelete = [
        ...follows1, ...follows2, ...notifs, ...streakEntries,
        ...streakWeeks, ...wcEntries, ...chalProgress, ...sponsorClicks, ...userBadges
      ];

      for (const rec of toDelete) {
        const entityName = rec._entity || null;
        // We delete by calling the right entity — iterate carefully
      }
      // Delete each entity type individually
      await Promise.all([
        ...follows1.map(r => base44.asServiceRole.entities.Follow.delete(r.id)),
        ...follows2.map(r => base44.asServiceRole.entities.Follow.delete(r.id)),
        ...notifs.map(r => base44.asServiceRole.entities.Notification.delete(r.id)),
        ...streakEntries.map(r => base44.asServiceRole.entities.DailyStreakEntry.delete(r.id)),
        ...streakWeeks.map(r => base44.asServiceRole.entities.DailyStreakWeek.delete(r.id)),
        ...wcEntries.map(r => base44.asServiceRole.entities.WelcomeChallengeEntry.delete(r.id)),
        ...chalProgress.map(r => base44.asServiceRole.entities.ChallengeProgress.delete(r.id)),
        ...sponsorClicks.map(r => base44.asServiceRole.entities.SponsorClick.delete(r.id)),
        ...userBadges.map(r => base44.asServiceRole.entities.UserBadge.delete(r.id)),
      ]);

      // Audit log via TokenTransaction (reuse for audit trail)
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_email: anonId,
        type: 'bonus',
        amount: 0,
        description: `GDPR: Obrisani neaktivni korisnik [${anonId}] — ${now.toISOString().split('T')[0]}`,
        balance_after: 0,
      });

      // Delete user
      await base44.asServiceRole.entities.User.delete(user.id);
      console.log(`cleanupInactiveUsers: DELETED ${anonId}`);
      deletedCount++;
    }

    // ── FAZA 1: Upozori nove neaktivne korisnike ────────────────────────
    const currentUsers = await base44.asServiceRole.entities.User.list();
    for (const user of currentUsers) {
      if (user.inactive_warning_sent) continue;
      const lastActive = user.last_active_date ? new Date(user.last_active_date) : new Date(user.created_date || 0);
      if (lastActive >= twelveMonthsAgo) continue;

      // Send email warning
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Upozorenje: Tvoj ScopeFantasy račun je neaktivan',
        body: `Pozdrav ${user.full_name || 'igraču'},\n\nTvoj ScopeFantasy račun je neaktivan već 12+ mjeseci. Bit će trajno obrisan za 30 dana ako se ne prijaviš.\n\nPrijavi se sada na app kako bi zadržao/la račun: https://scopefantasy.base44.app\n\nBudeš li se prijavio/la, upozorenje će biti automatski poništeno.\n\nEkipa ScopeFantasy`,
      });

      // In-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: 'reward',
        title: '⚠️ Tvoj račun će biti obrisan za 30 dana',
        body: 'Prijavii se da zadržiš račun. Neaktivni računi brišu se automatski.',
      });

      // Mark warning sent
      await base44.asServiceRole.entities.User.update(user.id, {
        inactive_warning_sent: true,
        inactive_warning_date: now.toISOString(),
      });

      console.log(`cleanupInactiveUsers: WARNING sent to ${user.email}`);
      warningSentCount++;
    }

    console.log(`cleanupInactiveUsers DONE: warned=${warningSentCount} reset=${resetCount} deleted=${deletedCount}`);
    return Response.json({ success: true, warned: warningSentCount, reset: resetCount, deleted: deletedCount });
  } catch (error) {
    console.error('cleanupInactiveUsers error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
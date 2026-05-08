import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_email } = await req.json();

    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Full new-user reset
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      onboarding_completed: false,
      token_balance: 0,
      welcome_bonus_eligible: true,
      welcome_bonus_claimed: false,
      bio: '',
      favorite_sport: null,
      deletion_requested: false,
    });

    // Delete all picks, token transactions, notifications, streaks, parlays, badges
    const [picks, transactions, notifications, streakWeeks, streakEntries, parlays, userBadges, challengeProgress, welcomeEntries] = await Promise.all([
      base44.asServiceRole.entities.Pick.filter({ user_email: target_email }),
      base44.asServiceRole.entities.TokenTransaction.filter({ user_email: target_email }),
      base44.asServiceRole.entities.Notification.filter({ user_email: target_email }),
      base44.asServiceRole.entities.DailyStreakWeek.filter({ user_email: target_email }),
      base44.asServiceRole.entities.DailyStreakEntry.filter({ user_email: target_email }),
      base44.asServiceRole.entities.Parlay.filter({ user_email: target_email }),
      base44.asServiceRole.entities.UserBadge.filter({ user_email: target_email }),
      base44.asServiceRole.entities.ChallengeProgress.filter({ user_email: target_email }),
      base44.asServiceRole.entities.WelcomeChallengeEntry.filter({ user_email: target_email }),
    ]);

    await Promise.all([
      ...picks.map(r => base44.asServiceRole.entities.Pick.delete(r.id)),
      ...transactions.map(r => base44.asServiceRole.entities.TokenTransaction.delete(r.id)),
      ...notifications.map(r => base44.asServiceRole.entities.Notification.delete(r.id)),
      ...streakWeeks.map(r => base44.asServiceRole.entities.DailyStreakWeek.delete(r.id)),
      ...streakEntries.map(r => base44.asServiceRole.entities.DailyStreakEntry.delete(r.id)),
      ...parlays.map(r => base44.asServiceRole.entities.Parlay.delete(r.id)),
      ...userBadges.map(r => base44.asServiceRole.entities.UserBadge.delete(r.id)),
      ...challengeProgress.map(r => base44.asServiceRole.entities.ChallengeProgress.delete(r.id)),
      ...welcomeEntries.map(r => base44.asServiceRole.entities.WelcomeChallengeEntry.delete(r.id)),
    ]);

    return Response.json({
      success: true,
      message: `Full new-user reset for ${target_email}`,
      deleted: {
        picks: picks.length,
        transactions: transactions.length,
        notifications: notifications.length,
        streakWeeks: streakWeeks.length,
        streakEntries: streakEntries.length,
        parlays: parlays.length,
        userBadges: userBadges.length,
        challengeProgress: challengeProgress.length,
        welcomeEntries: welcomeEntries.length,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
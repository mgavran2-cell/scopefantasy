import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin or scheduled call
    const today = new Date().toISOString().slice(0, 10);

    // Fetch all users and today's relevant data in parallel
    const [allUsers, allStreakWeeks, allStreakEntries] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.DailyStreakWeek.filter({ week_start_date: getWeekStart() }),
      base44.asServiceRole.entities.DailyStreakEntry.filter({ week_start_date: getWeekStart() }),
    ]);

    // Get existing notifications from today to avoid duplicates
    const todayStart = new Date(today + 'T00:00:00.000Z').toISOString();
    const existingNotifs = await base44.asServiceRole.entities.Notification.list('-created_date', 500);
    const todayNotifs = existingNotifs.filter(n => n.created_date >= todayStart);

    const hasNotifToday = (userEmail, titleContains) =>
      todayNotifs.some(n => n.user_email === userEmail && n.title.includes(titleContains));

    const notificationsToCreate = [];

    for (const user of allUsers) {
      if (!user.email) continue;

      const prefs = user.notification_preferences || {};

      // a) Daily gift reminder — users who haven't claimed today's daily bonus
      // We check DailyStreakWeek: if reward_claimed is false and they have an active streak week
      if (prefs.daily_streak !== false) {
        const streakWeek = allStreakWeeks.find(w => w.user_email === user.email);
        const alreadyClaimedToday = streakWeek?.reward_claimed;

        if (!alreadyClaimedToday && !hasNotifToday(user.email, 'poklon')) {
          notificationsToCreate.push({
            user_email: user.email,
            type: 'reward',
            title: '🎁 Dnevni poklon te čeka!',
            body: 'Pokupi svoje dnevne tokene — ne propusti streak!',
            read: false,
          });
        }
      }

      // b) Daily streak pick reminder — users who haven't submitted today's pick
      if (prefs.daily_streak !== false) {
        const dayOfWeek = getDayOfWeek();
        const todayEntry = allStreakEntries.find(
          e => e.user_email === user.email && e.day_number === dayOfWeek
        );

        if (!todayEntry && !hasNotifToday(user.email, 'Pick dana')) {
          notificationsToCreate.push({
            user_email: user.email,
            type: 'new_challenge',
            title: '🔥 Pick dana je objavljen!',
            body: 'Odaberi prije ponoći i nastavi svoj streak!',
            read: false,
          });
        }
      }
    }

    if (notificationsToCreate.length > 0) {
      await Promise.all(
        notificationsToCreate.map(n =>
          base44.asServiceRole.entities.Notification.create(n)
        )
      );
    }

    return Response.json({
      sent: notificationsToCreate.length,
      date: today,
      users_checked: allUsers.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function getDayOfWeek() {
  const day = new Date().getDay();
  // 0=Sun → treat as 7, Mon=1 ... Sat=6
  return day === 0 ? 7 : day;
}
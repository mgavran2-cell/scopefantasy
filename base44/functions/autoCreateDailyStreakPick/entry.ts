import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Compute today's date and week start (Monday)
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // day_number: 1=Mon ... 7=Sun (ISO week day)
  const jsDay = now.getUTCDay(); // 0=Sun
  const dayNumber = jsDay === 0 ? 7 : jsDay;

  // Monday of current week
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - (dayNumber - 1));
  const weekStart = monday.toISOString().slice(0, 10);

  // 1. Check if today's pick already exists (manual override or previous cron run)
  const existing = await base44.asServiceRole.entities.DailyStreakEntry.filter({
    week_start_date: weekStart,
    day_number: dayNumber,
  });
  if (existing && existing.length > 0) {
    return Response.json({ message: 'Pick dana already exists for today', skipped: true });
  }

  // 2. Get active pool players
  const pool = await base44.asServiceRole.entities.DailyStreakPlayerPool.filter({ is_active: true });

  if (!pool || pool.length === 0) {
    // Notify admin — find admin users
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of adminUsers) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: '⚠️ Daily Streak pool je prazan',
        body: `Daily Streak pool je prazan — cron nije kreirao pick dana.\n\nDodaj igrače na: /admin/daily-streak`,
      });
    }
    return Response.json({ message: 'Pool is empty, admin notified', skipped: true });
  }

  // 3. Weighted random selection by priority
  const totalWeight = pool.reduce((sum, p) => sum + (p.priority || 5), 0);
  let rand = Math.random() * totalWeight;
  let selected = pool[0];
  for (const player of pool) {
    rand -= (player.priority || 5);
    if (rand <= 0) {
      selected = player;
      break;
    }
  }

  // 4. Apply random line variation (-2 to +2, rounded to .5)
  const variation = (Math.round((Math.random() * 4 - 2) * 2) / 2);
  const pickLine = Math.max(0.5, selected.typical_line + variation);

  // 5. Get all users to create entries for
  const allUsers = await base44.asServiceRole.entities.User.list();

  const createPromises = allUsers.map(user =>
    base44.asServiceRole.entities.DailyStreakEntry.create({
      user_email: user.email,
      week_start_date: weekStart,
      day_number: dayNumber,
      pick_player: selected.player_name,
      pick_stat: selected.stat_type,
      pick_line: pickLine,
      result: 'pending',
    })
  );
  await Promise.all(createPromises);

  // 6. Send notification to all users
  const notifMessage = `🔥 Pick dana: ${selected.player_name} ${selected.stat_type} ${pickLine}`;
  const notifPromises = allUsers.map(user =>
    base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: 'new_challenge',
      title: '🔥 Pick dana je objavljen!',
      body: notifMessage,
    })
  );
  await Promise.all(notifPromises);

  return Response.json({
    message: 'Daily streak pick created',
    player: selected.player_name,
    stat: selected.stat_type,
    line: pickLine,
    users_count: allUsers.length,
    date: todayStr,
  });
});
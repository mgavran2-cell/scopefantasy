import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REWARD_TABLE = { 4: 500, 5: 1500, 6: 5000, 7: 15000 };

// Get Monday of the current week (UTC)
function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon
  const diff = (day === 0 ? -6 : 1 - day); // days to subtract to get Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin manual trigger and scheduled (no auth for scheduled)
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAdmin = true;
    } catch (_) { /* scheduled cron — no user context */ }

    const weekStart = getCurrentWeekStart();
    console.log(`weeklyStreakRewards: processing week ${weekStart}`);

    // Get all DailyStreakWeek records for this week that aren't claimed yet
    const allWeeks = await base44.asServiceRole.entities.DailyStreakWeek.filter({
      week_start_date: weekStart,
    });
    const unclaimedWeeks = allWeeks.filter(w => !w.reward_claimed);

    // Get all users who have entries this week (to catch missing week records)
    const allEntries = await base44.asServiceRole.entities.DailyStreakEntry.filter({
      week_start_date: weekStart,
    });
    const allUserEmails = [...new Set(allEntries.map(e => e.user_email))];

    // Build set of emails already having a week record
    const emailsWithWeekRecord = new Set(allWeeks.map(w => w.user_email));

    // Create missing DailyStreakWeek records for users without one
    for (const email of allUserEmails) {
      if (emailsWithWeekRecord.has(email)) continue;
      const userEntries = allEntries.filter(e => e.user_email === email);
      const correctPicks = userEntries.filter(e => e.result === 'won').length;
      const reward = REWARD_TABLE[correctPicks] || 0;
      const newWeek = await base44.asServiceRole.entities.DailyStreakWeek.create({
        user_email: email,
        week_start_date: weekStart,
        correct_picks: correctPicks,
        reward_claimed: false,
        reward_amount: reward,
        status: 'completed',
      });
      unclaimedWeeks.push({ ...newWeek, correct_picks: correctPicks });
    }

    let processedCount = 0;
    let totalPayout = 0;

    for (const weekRecord of unclaimedWeeks) {
      try {
        const userEntries = allEntries.filter(e => e.user_email === weekRecord.user_email);
        const correctPicks = weekRecord.correct_picks != null
          ? weekRecord.correct_picks
          : userEntries.filter(e => e.result === 'won').length;

        const reward = REWARD_TABLE[correctPicks] || 0;
        const now = new Date().toISOString();

        if (reward > 0) {
          const userRecords = await base44.asServiceRole.entities.User.filter({ email: weekRecord.user_email });
          const userRecord = userRecords[0];
          if (!userRecord) {
            console.warn(`weeklyStreakRewards: user not found for ${weekRecord.user_email}`);
            continue;
          }

          const newBalance = (userRecord.token_balance || 0) + reward;
          await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

          await base44.asServiceRole.entities.TokenTransaction.create({
            user_email: weekRecord.user_email,
            type: 'bonus',
            amount: reward,
            description: `Daily Streak nagrada ${weekStart} — ${correctPicks}/7 točnih`,
            balance_after: newBalance,
          });

          await base44.asServiceRole.entities.DailyStreakWeek.update(weekRecord.id, {
            reward_claimed: true,
            reward_amount: reward,
            correct_picks: correctPicks,
            status: 'completed',
            claimed_at: now,
            claimed_via: 'auto_cron',
          });

          await base44.asServiceRole.entities.Notification.create({
            user_email: weekRecord.user_email,
            type: 'reward',
            title: '🏆 Daily Streak nagrada isplaćena!',
            body: `Osvojio si ${reward.toLocaleString()} tokena za ${correctPicks}/7 točnih ovog tjedna!`,
          });

          totalPayout += reward;
          console.log(`weeklyStreakRewards: paid ${weekRecord.user_email} ${reward} tokens (${correctPicks}/7)`);
        } else {
          // No reward but still mark as claimed so it doesn't repeat
          await base44.asServiceRole.entities.DailyStreakWeek.update(weekRecord.id, {
            reward_claimed: true,
            reward_amount: 0,
            correct_picks: correctPicks,
            status: 'completed',
            claimed_at: now,
            claimed_via: 'auto_cron',
          });

          await base44.asServiceRole.entities.Notification.create({
            user_email: weekRecord.user_email,
            type: 'reward',
            title: '🔥 Daily Streak završen',
            body: `Imao si ${correctPicks}/7 točnih. Trebaš 4+ za nagradu. Pokušaj sljedeći tjedan!`,
          });
        }

        processedCount++;
      } catch (err) {
        console.error(`weeklyStreakRewards: error for ${weekRecord.user_email}:`, err.message);
      }
    }

    console.log(`weeklyStreakRewards: done — ${processedCount} korisnika, ${totalPayout} tokena ukupno`);
    return Response.json({ success: true, processed: processedCount, total_payout: totalPayout, week: weekStart });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
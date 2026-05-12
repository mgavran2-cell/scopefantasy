import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REWARD_TABLE = { 4: 500, 5: 1500, 6: 5000, 7: 15000 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { week_start_date } = await req.json();
    if (!week_start_date) return Response.json({ error: 'week_start_date required' }, { status: 400 });

    // Check week has ended (week_start_date + 7 days < now)
    const weekEnd = new Date(week_start_date);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (new Date() < weekEnd) {
      return Response.json({ error: 'Tjedan još nije završio' }, { status: 400 });
    }

    // Get or calculate DailyStreakWeek
    const weeks = await base44.entities.DailyStreakWeek.filter({
      user_email: user.email,
      week_start_date,
    });

    let weekRecord = weeks[0];

    // Calculate correct_picks from entries if week record missing
    let correctPicks = weekRecord?.correct_picks || 0;
    if (!weekRecord || weekRecord.correct_picks == null) {
      const entries = await base44.entities.DailyStreakEntry.filter({
        user_email: user.email,
        week_start_date,
      });
      correctPicks = entries.filter(e => e.result === 'won').length;
    }

    // Anti-double-claim
    if (weekRecord?.reward_claimed) {
      return Response.json({ error: 'Nagrada je već preuzeta', already_claimed: true }, { status: 400 });
    }

    const reward = REWARD_TABLE[correctPicks] || 0;

    if (reward > 0) {
      // Get fresh user balance
      const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const userRecord = userRecords[0];
      const newBalance = (userRecord?.token_balance || 0) + reward;

      await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

      await base44.entities.TokenTransaction.create({
        user_email: user.email,
        type: 'bonus',
        amount: reward,
        description: `Daily Streak nagrada tjedna ${week_start_date} — ${correctPicks}/7 točnih`,
        balance_after: newBalance,
      });

      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'reward',
        title: `🔥 Daily Streak nagrada: +${reward} tokena!`,
        body: `Tjedan ${week_start_date}: ${correctPicks}/7 točnih pickova.`,
      });
    }

    // Update week record
    if (weekRecord) {
      await base44.entities.DailyStreakWeek.update(weekRecord.id, {
        reward_claimed: true,
        reward_amount: reward,
        status: 'completed',
      });
    }

    console.log(`claimDailyStreakReward: user=${user.email} week=${week_start_date} correct=${correctPicks} reward=${reward}`);
    return Response.json({ reward, correct_picks: correctPicks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
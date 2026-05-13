import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Progressive streak rewards
const STREAK_REWARDS = [
  { minDay: 1,  maxDay: 2,  tokens: 100,  label: 'Dan 1-2' },
  { minDay: 3,  maxDay: 6,  tokens: 200,  label: 'Dan 3-6' },
  { minDay: 7,  maxDay: 13, tokens: 350,  label: 'Tjedan!' },
  { minDay: 14, maxDay: 20, tokens: 500,  label: '2 tjedna!' },
  { minDay: 21, maxDay: 29, tokens: 750,  label: '3 tjedna!' },
  { minDay: 30, maxDay: 999, tokens: 1000, label: 'Mjesec+!' },
];

function getRewardForStreak(streak) {
  const tier = STREAK_REWARDS.find(r => streak >= r.minDay && streak <= r.maxDay);
  return tier ? { tokens: tier.tokens, label: tier.label } : { tokens: 100, label: 'Dan 1' };
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = todayStr();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get or create streak record
    const streakRecords = await base44.asServiceRole.entities.DailyLoginStreak.filter({ user_email: user.email });
    let streakRecord = streakRecords[0] || null;

    // Already claimed today?
    if (streakRecord?.last_claim_date === today) {
      return Response.json({
        error: 'Dnevni bonus već iskorišten danas',
        already_claimed: true,
        streak: streakRecord,
      }, { status: 400 });
    }

    // Calculate new streak
    const prevDate = streakRecord?.last_claim_date;
    let newStreak;
    if (!prevDate) {
      newStreak = 1; // first ever claim
    } else if (prevDate === yesterday) {
      newStreak = (streakRecord.current_streak || 0) + 1; // continued streak
    } else {
      newStreak = 1; // streak broken — reset
    }

    const { tokens, label } = getRewardForStreak(newStreak);
    const longestStreak = Math.max(streakRecord?.longest_streak || 0, newStreak);

    // Get fresh user balance
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    const newBalance = (userRecord.token_balance || 0) + tokens;
    await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

    // Update or create streak record
    const streakData = {
      user_email: user.email,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_claim_date: today,
      total_days_claimed: (streakRecord?.total_days_claimed || 0) + 1,
      total_tokens_earned: (streakRecord?.total_tokens_earned || 0) + tokens,
    };
    if (streakRecord) {
      await base44.asServiceRole.entities.DailyLoginStreak.update(streakRecord.id, streakData);
    } else {
      await base44.asServiceRole.entities.DailyLoginStreak.create(streakData);
    }

    // TokenTransaction audit
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'bonus',
      amount: tokens,
      description: `Dnevni bonus — Dan ${newStreak} (${label})`,
      balance_after: newBalance,
    });

    // Milestone notification
    const milestones = [7, 14, 21, 30, 60, 100];
    if (milestones.includes(newStreak)) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: 'reward',
        title: `🔥 ${newStreak}-dnevni streak! +${tokens} tokena`,
        body: `Nevjerojatno! ${newStreak} dana zaredom prijavljuješ se svaki dan. Nastavi!`,
      });
    }

    return Response.json({
      success: true,
      reward: tokens,
      streak: newStreak,
      longest_streak: longestStreak,
      new_balance: newBalance,
      label,
      streak_broken: newStreak === 1 && prevDate && prevDate !== yesterday,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
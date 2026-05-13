import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MONTH_NAMES_HR = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'
];

const PLACE_REWARDS = [
  { tokens: 5000, badgeKey: 'champion', badgeEmoji: '🥇', badgeRarity: 'legendary', label: '1. mjesto' },
  { tokens: 2500, badgeKey: 'silver',   badgeEmoji: '🥈', badgeRarity: 'epic',      label: '2. mjesto' },
  { tokens: 1000, badgeKey: 'bronze',   badgeEmoji: '🥉', badgeRarity: 'rare',      label: '3. mjesto' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin trigger and cron (service role)
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    // Previous month
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthNum = prevDate.getMonth(); // 0-indexed
    const prevMonth = `${prevYear}-${String(prevMonthNum + 1).padStart(2, '0')}`;
    const monthName = `${MONTH_NAMES_HR[prevMonthNum]} ${prevYear}`;

    // Idempotency check
    const existing = await base44.asServiceRole.entities.LeaderboardArchive.filter({ month: prevMonth });
    if (existing.length > 0) {
      return Response.json({ message: `Arhiva za ${prevMonth} već postoji`, skipped: true });
    }

    // Date range for previous month
    const startDate = new Date(prevYear, prevMonthNum, 1).toISOString();
    const endDate = new Date(prevYear, prevMonthNum + 1, 1).toISOString();

    // Fetch all picks in that month
    const allPicks = await base44.asServiceRole.entities.Pick.list('-created_date', 2000);
    const monthPicks = allPicks.filter(p => {
      const d = p.created_date;
      return d >= startDate && d < endDate;
    });

    // Also include parlay winnings
    const allParlays = await base44.asServiceRole.entities.Parlay.list('-created_date', 2000);
    const monthParlays = allParlays.filter(p => {
      const d = p.created_date;
      return d >= startDate && d < endDate;
    });

    // Aggregate earnings per user
    const userEarnings = {};
    for (const pick of monthPicks) {
      const email = pick.user_email;
      if (!email || email.startsWith('deleted_user_')) continue;
      if (!userEarnings[email]) userEarnings[email] = { email, name: pick.user_name || email, total: 0 };
      userEarnings[email].total += (pick.tokens_won || 0);
    }
    for (const parlay of monthParlays) {
      const email = parlay.user_email;
      if (!email || email.startsWith('deleted_user_')) continue;
      if (!userEarnings[email]) userEarnings[email] = { email, name: parlay.user_name || email, total: 0 };
      userEarnings[email].total += (parlay.tokens_won || parlay.actual_payout || 0);
    }

    const sorted = Object.values(userEarnings)
      .filter(u => u.total > 0)
      .sort((a, b) => b.total - a.total);

    const top3 = sorted.slice(0, 3);
    const totalActiveUsers = sorted.length;

    // Create archive record
    const archiveData = {
      month: prevMonth,
      year: prevYear,
      total_active_users: totalActiveUsers,
    };
    for (let i = 0; i < 3; i++) {
      const t = top3[i];
      const n = i + 1;
      archiveData[`top_${n}_email`] = t?.email || null;
      archiveData[`top_${n}_name`]  = t?.name  || null;
      archiveData[`top_${n}_zarada`] = t?.total || 0;
    }

    await base44.asServiceRole.entities.LeaderboardArchive.create(archiveData);

    // Award top 3
    let totalTokensAwarded = 0;
    for (let i = 0; i < top3.length; i++) {
      const winner = top3[i];
      const reward = PLACE_REWARDS[i];
      const placeEmoji = reward.badgeEmoji;
      const badgeTitle = `${reward.badgeEmoji} ${reward.label === '1. mjesto' ? 'Prvak' : reward.label === '2. mjesto' ? 'Srebro' : 'Bronca'} ${monthName}`;

      // Fetch user
      const users = await base44.asServiceRole.entities.User.filter({ email: winner.email });
      if (!users.length) continue;
      const u = users[0];

      // Update balance
      const newBalance = (u.token_balance || 0) + reward.tokens;
      await base44.asServiceRole.entities.User.update(u.id, { token_balance: newBalance });

      // TokenTransaction audit
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_email: winner.email,
        amount: reward.tokens,
        type: 'bonus',
        description: `Mjesečna ljestvica: ${reward.label}, ${monthName}`,
        balance_after: newBalance,
      });

      // UserBadge
      await base44.asServiceRole.entities.UserBadge.create({
        user_email: winner.email,
        badge_key: `${reward.badgeKey}_${prevMonth}`,
        badge_title: badgeTitle,
        badge_emoji: placeEmoji,
        badge_rarity: reward.badgeRarity,
        reward_tokens: reward.tokens,
      });

      // Personal notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: winner.email,
        type: 'reward',
        title: `${placeEmoji} Mjesečna ljestvica: ${reward.label}!`,
        body: `Čestitamo! Zaradio si ${winner.total.toLocaleString()} tokena u ${monthName} i ${reward.tokens.toLocaleString()} bonus tokena plus badge na profilu!`,
      });

      totalTokensAwarded += reward.tokens;
    }

    // Broadcast to all active users (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const activeUsers = allUsers.filter(u => u.last_active_date && u.last_active_date >= sevenDaysAgo);

    const winnerNames = top3.map((w, i) => `${PLACE_REWARDS[i].badgeEmoji} ${w.name} (${w.total.toLocaleString()} tok.)`).join(', ');
    const broadcastEmails = new Set(top3.map(w => w.email));

    for (const u of activeUsers) {
      if (broadcastEmails.has(u.email)) continue; // already notified above
      await base44.asServiceRole.entities.Notification.create({
        user_email: u.email,
        type: 'rank_change',
        title: `🏆 Mjesečna ljestvica završena! (${monthName})`,
        body: `Pobjednici: ${winnerNames}`,
      });
    }

    return Response.json({
      success: true,
      month: prevMonth,
      top3: top3.map((w, i) => ({ place: i + 1, ...w, reward: PLACE_REWARDS[i].tokens })),
      total_active_users: totalActiveUsers,
      tokens_awarded: totalTokensAwarded,
      broadcasts_sent: activeUsers.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
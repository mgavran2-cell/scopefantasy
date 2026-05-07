import { base44 } from '@/api/base44Client';
import { BADGE_DEFINITIONS } from './badgeDefinitions';

/**
 * Check and award any new badges to the user.
 * Call this after significant user actions (new pick, win, parlay, referral, etc.)
 * Returns array of newly awarded badges.
 */
export async function awardBadges(user, { picks = null, parlays = null, referrals = null } = {}) {
  if (!user?.email) return [];

  // Fetch data needed for evaluation
  const [allPicks, allParlays, allReferrals, existingBadges] = await Promise.all([
    picks !== null ? Promise.resolve(picks) : base44.entities.Pick.filter({ user_email: user.email }),
    parlays !== null ? Promise.resolve(parlays) : base44.entities.Parlay.filter({ user_email: user.email }),
    referrals !== null ? Promise.resolve(referrals) : base44.entities.ReferralUse.filter({ referrer_email: user.email }),
    base44.entities.UserBadge.filter({ user_email: user.email }),
  ]);

  const earnedKeys = new Set(existingBadges.map(b => b.badge_key));

  const picksCount = allPicks.length;
  const winsCount = allPicks.filter(p => p.status === 'won').length;
  const tokensWon = allPicks.reduce((sum, p) => sum + (p.tokens_won || 0), 0);
  const parlayCount = allParlays.length;
  const referralCount = allReferrals.length;

  const newlyAwarded = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedKeys.has(badge.key)) continue;
    if (badge.condition_type === 'special') continue; // manual only

    let met = false;
    switch (badge.condition_type) {
      case 'picks_count':   met = picksCount >= badge.condition_value; break;
      case 'wins_count':    met = winsCount >= badge.condition_value; break;
      case 'tokens_won':    met = tokensWon >= badge.condition_value; break;
      case 'parlay_count':  met = parlayCount >= badge.condition_value; break;
      case 'referral_count': met = referralCount >= badge.condition_value; break;
      // streak_days is awarded separately by streak system
    }

    if (met) {
      await base44.entities.UserBadge.create({
        user_email: user.email,
        badge_key: badge.key,
        badge_title: badge.title,
        badge_emoji: badge.emoji,
        badge_rarity: badge.rarity,
        reward_tokens: badge.reward_tokens,
      });

      // Give reward tokens
      if (badge.reward_tokens > 0) {
        const newBalance = (user.token_balance || 0) + badge.reward_tokens;
        await Promise.all([
          base44.auth.updateMe({ token_balance: newBalance }),
          base44.entities.TokenTransaction.create({
            user_email: user.email,
            type: 'bonus',
            amount: badge.reward_tokens,
            description: `Dostignuće: ${badge.title}`,
            balance_after: newBalance,
          }),
          base44.entities.Notification.create({
            user_email: user.email,
            type: 'reward',
            title: `🏅 Novo dostignuće: ${badge.title}`,
            body: `${badge.emoji} ${badge.description} — +${badge.reward_tokens} tokena!`,
          }),
        ]);
        user = { ...user, token_balance: newBalance };
      }

      newlyAwarded.push(badge);
    }
  }

  return newlyAwarded;
}
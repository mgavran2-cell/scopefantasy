import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Payout logic (mirrors parlayOdds.js)
const POWER_ODDS = { 2: 3, 3: 5, 4: 10, 5: 20, 6: 35 };
const FLEX_ODDS = {
  3: { 3: 2.25, 2: 1.25 },
  4: { 4: 5, 3: 1.5 },
  5: { 5: 10, 4: 2, 3: 0.4 },
  6: { 6: 25, 5: 2, 4: 0.4 },
};

function calcPayout(parlay) {
  const { play_type, num_picks, num_correct, stake_tokens } = parlay;
  if (play_type === 'power') {
    const mult = POWER_ODDS[num_picks] ?? 0;
    return Math.round(stake_tokens * mult);
  }
  // flex
  const mult = FLEX_ODDS[num_picks]?.[num_correct] ?? 0;
  return Math.round(stake_tokens * mult);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    // Accept single parlay_id or array of parlay_ids
    const ids = body.parlay_ids
      ? body.parlay_ids
      : body.parlay_id
      ? [body.parlay_id]
      : [];

    if (ids.length === 0) {
      return Response.json({ error: 'parlay_id or parlay_ids required' }, { status: 400 });
    }

    const auditLog = [];
    let totalPayout = 0;
    let paidCount = 0;

    for (const parlayId of ids) {
      const parlayRecords = await base44.asServiceRole.entities.Parlay.filter({ id: parlayId });
      const parlay = parlayRecords[0];

      if (!parlay) {
        auditLog.push({ parlay_id: parlayId, skipped: true, reason: 'not found' });
        continue;
      }
      if (parlay.tokens_paid) {
        auditLog.push({ parlay_id: parlayId, skipped: true, reason: 'already paid' });
        continue;
      }
      if (parlay.status !== 'won' && parlay.status !== 'partial') {
        auditLog.push({ parlay_id: parlayId, skipped: true, reason: `status is ${parlay.status}` });
        continue;
      }

      const payout = calcPayout(parlay);
      if (payout <= 0) {
        // Still mark paid to prevent re-processing, just no token transfer
        await base44.asServiceRole.entities.Parlay.update(parlayId, { tokens_paid: true, payout_amount: 0 });
        auditLog.push({ parlay_id: parlayId, skipped: true, reason: 'payout is 0' });
        continue;
      }

      // Get user
      const userRecords = await base44.asServiceRole.entities.User.filter({ email: parlay.user_email });
      const userRecord = userRecords[0];
      if (!userRecord) {
        auditLog.push({ parlay_id: parlayId, skipped: true, reason: 'user not found' });
        continue;
      }

      const newBalance = (userRecord.token_balance || 0) + payout;

      // Update balance
      await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

      // Transaction
      const isFlex = parlay.play_type === 'flex';
      const desc = isFlex
        ? `Flex Play pobjeda: ${parlay.num_correct}/${parlay.num_picks} točnih`
        : `Power Play pobjeda: ${parlay.num_picks}/${parlay.num_picks} točnih`;
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_email: parlay.user_email,
        type: 'winnings',
        amount: payout,
        description: desc,
        balance_after: newBalance,
      });

      // Mark parlay paid
      await base44.asServiceRole.entities.Parlay.update(parlayId, {
        tokens_paid: true,
        payout_amount: payout,
        tokens_won: payout,
        actual_payout: payout,
      });

      // Notification
      const notifTitle = isFlex
        ? `🎯 Flex Play: ${parlay.num_correct}/${parlay.num_picks} točnih, +${payout} tokena!`
        : `✅ Power Play pobjeda: +${payout} tokena!`;
      await base44.asServiceRole.entities.Notification.create({
        user_email: parlay.user_email,
        type: 'pick_won',
        title: notifTitle,
        body: desc,
      });

      totalPayout += payout;
      paidCount++;
      auditLog.push({ parlay_id: parlayId, user: parlay.user_email, payout, newBalance });
    }

    console.log('payParlayWinners audit:', JSON.stringify(auditLog));

    return Response.json({ paid_count: paidCount, total_payout: totalPayout, audit: auditLog });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
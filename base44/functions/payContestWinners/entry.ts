import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parlay payout logic (mirrors parlayOdds.js)
const POWER_ODDS = { 2: 3, 3: 5, 4: 10, 5: 20, 6: 35 };
const FLEX_ODDS = {
  3: { 3: 2.25, 2: 1.25 },
  4: { 4: 5, 3: 1.5 },
  5: { 5: 10, 4: 2, 3: 0.4 },
  6: { 6: 25, 5: 2, 4: 0.4 },
};

async function resolveParlaysForContest(base44, contestId) {
  // Find all active parlays that include a selection from this contest
  const allParlays = await base44.asServiceRole.entities.Parlay.filter({ status: 'active' });
  const relevant = allParlays.filter(p =>
    p.selections?.some(s => s.contest_id === contestId)
  );

  const toPayIds = [];
  for (const parlay of relevant) {
    if (!parlay.selections?.length) continue;

    // Recalculate num_correct from selection results
    const numCorrect = parlay.selections.filter(s => s.result === 'win').length;
    const numPending = parlay.selections.filter(s => s.result === 'pending').length;

    // Only resolve if no more pending selections
    if (numPending > 0) continue;

    const numPicks = parlay.selections.length;
    const isFlex = parlay.play_type === 'flex';
    let newStatus = 'lost';

    if (!isFlex) {
      if (numCorrect === numPicks) newStatus = 'won';
    } else {
      const flexTable = FLEX_ODDS[numPicks] || {};
      const hasPayout = (flexTable[numCorrect] ?? 0) > 0;
      if (hasPayout) newStatus = numCorrect === numPicks ? 'won' : 'partial';
    }

    await base44.asServiceRole.entities.Parlay.update(parlay.id, {
      status: newStatus,
      num_correct: numCorrect,
      num_picks: numPicks,
    });

    if (newStatus === 'won' || newStatus === 'partial') {
      toPayIds.push(parlay.id);
    }
  }
  return toPayIds;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const { contest_id } = await req.json();
    if (!contest_id) {
      return Response.json({ error: 'contest_id required' }, { status: 400 });
    }

    // Fetch contest
    const contests = await base44.asServiceRole.entities.Contest.filter({ id: contest_id });
    const contest = contests[0];
    if (!contest) {
      return Response.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Find all won picks that haven't been paid yet
    const allWonPicks = await base44.asServiceRole.entities.Pick.filter({ contest_id, status: 'won' });
    const unpaidPicks = allWonPicks.filter(p => !p.tokens_paid);

    let totalPayout = 0;
    const auditLog = [];

    for (const pick of unpaidPicks) {
      let payout = pick.tokens_won && pick.tokens_won > 0
        ? pick.tokens_won
        : Math.floor(contest.prize_pool / (unpaidPicks.length || 1));

      if (payout <= 0) {
        auditLog.push({ pick_id: pick.id, user: pick.user_email, skipped: true, reason: 'payout <= 0' });
        continue;
      }

      const userRecords = await base44.asServiceRole.entities.User.filter({ email: pick.user_email });
      const userRecord = userRecords[0];
      if (!userRecord) {
        auditLog.push({ pick_id: pick.id, user: pick.user_email, skipped: true, reason: 'user not found' });
        continue;
      }

      const currentBalance = userRecord.token_balance || 0;
      const newBalance = currentBalance + payout;

      await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

      await base44.asServiceRole.entities.TokenTransaction.create({
        user_email: pick.user_email,
        type: 'winnings',
        amount: payout,
        description: `Pobjeda u natjecanju: ${contest.title}`,
        balance_after: newBalance,
      });

      await base44.asServiceRole.entities.Pick.update(pick.id, {
        tokens_paid: true,
        payout_amount: payout,
        tokens_won: payout,
      });

      await base44.asServiceRole.entities.Notification.create({
        user_email: pick.user_email,
        type: 'pick_won',
        title: `✅ Pobjednički listić: +${payout} tokena!`,
        body: `Natjecanje "${contest.title}" — čestitamo na pobjedi!`,
        contest_id,
        pick_id: pick.id,
      });

      totalPayout += payout;
      auditLog.push({ pick_id: pick.id, user: pick.user_email, payout, newBalance });
    }

    // Mark contest finished
    await base44.asServiceRole.entities.Contest.update(contest_id, {
      status_internal: 'finished',
      status: 'finished',
    });

    // Resolve parlay selections that reference this contest
    // First: update selection results in parlays based on picks
    const allPicks = await base44.asServiceRole.entities.Pick.filter({ contest_id });
    const pickResultMap = {};
    for (const p of allPicks) {
      for (const sel of (p.selections || [])) {
        const key = `${p.user_email}|${sel.player_name}|${sel.choice}`;
        pickResultMap[key] = sel.result;
      }
    }

    // Update parlay selection results
    const activeParlays = await base44.asServiceRole.entities.Parlay.filter({ status: 'active' });
    const relevantParlays = activeParlays.filter(p =>
      p.selections?.some(s => s.contest_id === contest_id)
    );

    for (const parlay of relevantParlays) {
      const updatedSelections = parlay.selections.map(sel => {
        if (sel.contest_id !== contest_id) return sel;
        // Find matching pick for this user+player+choice
        const key = `${parlay.user_email}|${sel.player_name}|${sel.choice}`;
        const result = pickResultMap[key];
        if (result && result !== 'pending') {
          return { ...sel, result: result === 'win' ? 'win' : 'loss' };
        }
        return sel;
      });
      await base44.asServiceRole.entities.Parlay.update(parlay.id, { selections: updatedSelections });
    }

    // Now resolve parlay statuses and pay winners
    const parlayIdsToPlay = await resolveParlaysForContest(base44, contest_id);

    let parlayPaidCount = 0;
    let parlayTotalPayout = 0;
    if (parlayIdsToPlay.length > 0) {
      // Call payParlayWinners inline (same logic, service role)
      for (const parlayId of parlayIdsToPlay) {
        const parlayRecords = await base44.asServiceRole.entities.Parlay.filter({ id: parlayId });
        const parlay = parlayRecords[0];
        if (!parlay || parlay.tokens_paid) continue;

        const isFlex = parlay.play_type === 'flex';
        const numPicks = parlay.num_picks || parlay.selections?.length || 0;
        const numCorrect = parlay.num_correct || 0;
        let parlayPayout = 0;
        if (!isFlex) {
          parlayPayout = Math.round(parlay.stake_tokens * (POWER_ODDS[numPicks] ?? 0));
        } else {
          parlayPayout = Math.round(parlay.stake_tokens * (FLEX_ODDS[numPicks]?.[numCorrect] ?? 0));
        }
        if (parlayPayout <= 0) continue;

        const uRecs = await base44.asServiceRole.entities.User.filter({ email: parlay.user_email });
        const uRec = uRecs[0];
        if (!uRec) continue;

        const newBal = (uRec.token_balance || 0) + parlayPayout;
        await base44.asServiceRole.entities.User.update(uRec.id, { token_balance: newBal });
        await base44.asServiceRole.entities.TokenTransaction.create({
          user_email: parlay.user_email,
          type: 'winnings',
          amount: parlayPayout,
          description: isFlex
            ? `Flex Play pobjeda: ${numCorrect}/${numPicks} točnih`
            : `Power Play pobjeda: ${numPicks}/${numPicks} točnih`,
          balance_after: newBal,
        });
        await base44.asServiceRole.entities.Parlay.update(parlayId, {
          tokens_paid: true,
          payout_amount: parlayPayout,
          tokens_won: parlayPayout,
          actual_payout: parlayPayout,
        });
        await base44.asServiceRole.entities.Notification.create({
          user_email: parlay.user_email,
          type: 'pick_won',
          title: isFlex
            ? `🎯 Flex Play: ${numCorrect}/${numPicks} točnih, +${parlayPayout} tokena!`
            : `✅ Power Play pobjeda: +${parlayPayout} tokena!`,
          body: `Parlay listić je isplaćen.`,
        });
        parlayPaidCount++;
        parlayTotalPayout += parlayPayout;
      }
    }

    console.log('payContestWinners audit:', JSON.stringify(auditLog));

    return Response.json({
      paid_count: auditLog.filter(a => !a.skipped).length,
      total_payout: totalPayout,
      parlay_paid_count: parlayPaidCount,
      parlay_total_payout: parlayTotalPayout,
      audit: auditLog,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
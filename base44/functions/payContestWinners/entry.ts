import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const allWonPicks = await base44.asServiceRole.entities.Pick.filter({
      contest_id,
      status: 'won',
    });

    const unpaidPicks = allWonPicks.filter(p => !p.tokens_paid);

    if (unpaidPicks.length === 0) {
      return Response.json({ paid_count: 0, total_payout: 0, message: 'Nema neisplaćenih pobjednika' });
    }

    const winnerCount = unpaidPicks.length;
    let totalPayout = 0;
    const auditLog = [];

    for (const pick of unpaidPicks) {
      // Determine payout: use pick.tokens_won if set, otherwise split prize pool
      let payout = pick.tokens_won && pick.tokens_won > 0
        ? pick.tokens_won
        : Math.floor(contest.prize_pool / winnerCount);

      if (payout <= 0) {
        auditLog.push({ pick_id: pick.id, user: pick.user_email, skipped: true, reason: 'payout <= 0' });
        continue;
      }

      // Fetch current user balance
      const userRecords = await base44.asServiceRole.entities.User.filter({ email: pick.user_email });
      const userRecord = userRecords[0];
      if (!userRecord) {
        auditLog.push({ pick_id: pick.id, user: pick.user_email, skipped: true, reason: 'user not found' });
        continue;
      }

      const currentBalance = userRecord.token_balance || 0;
      const newBalance = currentBalance + payout;

      // Update user balance
      await base44.asServiceRole.entities.User.update(userRecord.id, {
        token_balance: newBalance,
      });

      // Create transaction record
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_email: pick.user_email,
        type: 'winnings',
        amount: payout,
        description: `Pobjeda u natjecanju: ${contest.title}`,
        balance_after: newBalance,
      });

      // Mark pick as paid
      await base44.asServiceRole.entities.Pick.update(pick.id, {
        tokens_paid: true,
        payout_amount: payout,
        tokens_won: payout,
      });

      // Send notification
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

    // Mark contest as fully finished
    await base44.asServiceRole.entities.Contest.update(contest_id, {
      status_internal: 'finished',
      status: 'finished',
    });

    console.log('payContestWinners audit:', JSON.stringify(auditLog));

    return Response.json({
      paid_count: auditLog.filter(a => !a.skipped).length,
      total_payout: totalPayout,
      audit: auditLog,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
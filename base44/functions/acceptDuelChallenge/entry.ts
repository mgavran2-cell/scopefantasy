import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { duel_id } = await req.json();
    if (!duel_id) return Response.json({ error: 'duel_id required' }, { status: 400 });

    // Get duel
    const duels = await base44.asServiceRole.entities.Duel.filter({ id: duel_id });
    const duel = duels[0];
    if (!duel) return Response.json({ error: 'Duel nije pronađen' }, { status: 404 });

    // Only opponent can accept
    if (duel.opponent_email !== user.email) {
      return Response.json({ error: 'Samo opponent može prihvatiti duel' }, { status: 403 });
    }
    if (duel.status !== 'pending') {
      return Response.json({ error: `Duel je u statusu: ${duel.status}` }, { status: 400 });
    }

    // Fresh balance check
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    if ((userRecord.token_balance || 0) < duel.stake_tokens) {
      return Response.json({ error: 'Nemaš dovoljno tokena za prihvat!' }, { status: 400 });
    }

    const newBalance = userRecord.token_balance - duel.stake_tokens;

    // Deduct escrow from opponent
    await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'entry',
      amount: -duel.stake_tokens,
      description: `Duel prihvaćen vs ${duel.challenger_name || duel.challenger_email}`,
      balance_after: newBalance,
    });

    // Update duel status
    await base44.asServiceRole.entities.Duel.update(duel_id, {
      status: 'accepted',
      opponent_name: user.full_name || user.email,
    });

    // Notify challenger
    await base44.entities.Notification.create({
      user_email: duel.challenger_email,
      type: 'duel_accepted',
      title: '⚔️ Duel prihvaćen!',
      body: `${user.full_name || user.email} je prihvatio tvoj duel izazov za natjecanje "${duel.contest_title}".`,
    });

    console.log(`acceptDuelChallenge: opponent=${user.email} challenger=${duel.challenger_email} stake=${duel.stake_tokens}`);
    return Response.json({ success: true, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
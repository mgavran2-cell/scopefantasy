import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { opponent_email, contest_id, stake_tokens, message } = await req.json();

    // Validation
    if (!opponent_email || !contest_id || !stake_tokens) {
      return Response.json({ error: 'opponent_email, contest_id, stake_tokens required' }, { status: 400 });
    }
    if (opponent_email.trim() === user.email) {
      return Response.json({ error: 'Ne možeš izazvati sebe!' }, { status: 400 });
    }
    if (stake_tokens < 10) {
      return Response.json({ error: 'Minimalni ulog je 10 tokena' }, { status: 400 });
    }

    // Validate contest exists and is active
    const contests = await base44.asServiceRole.entities.Contest.filter({ id: contest_id });
    const contest = contests[0];
    if (!contest) return Response.json({ error: 'Natjecanje nije pronađeno' }, { status: 404 });
    if (contest.status === 'finished') return Response.json({ error: 'Natjecanje je završeno' }, { status: 400 });

    // Fresh balance check
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    if ((userRecord.token_balance || 0) < stake_tokens) {
      return Response.json({ error: 'Nemaš dovoljno tokena!' }, { status: 400 });
    }

    const newBalance = userRecord.token_balance - stake_tokens;

    // Deduct escrow
    await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'entry',
      amount: -stake_tokens,
      description: 'Duel izazov poslan (escrow)',
      balance_after: newBalance,
    });

    // Create duel
    const duel = await base44.entities.Duel.create({
      challenger_email: user.email,
      challenger_name: user.full_name || user.email,
      opponent_email: opponent_email.trim(),
      contest_id,
      contest_title: contest.title,
      stake_tokens,
      message: message?.trim() || null,
      status: 'pending',
    });

    // Notify opponent
    await base44.entities.Notification.create({
      user_email: opponent_email.trim(),
      type: 'new_challenge',
      title: '⚔️ Novi duel izazov!',
      body: `${user.full_name || user.email} te izaziva na duel u "${contest.title}" za ${stake_tokens} tokena!`,
    });

    console.log(`createDuelChallenge: challenger=${user.email} opponent=${opponent_email} stake=${stake_tokens} duel=${duel.id}`);
    return Response.json({ success: true, duel_id: duel.id, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
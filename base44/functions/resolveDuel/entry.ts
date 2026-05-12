import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { duel_id } = await req.json();
    if (!duel_id) return Response.json({ error: 'Missing duel_id' }, { status: 400 });

    const duels = await base44.asServiceRole.entities.Duel.filter({ id: duel_id });
    const duel = duels[0];
    if (!duel) return Response.json({ error: 'Duel not found' }, { status: 404 });
    if (duel.status === 'finished') return Response.json({ message: 'Already finished' });

    // Only challenger or opponent can trigger resolve
    if (duel.challenger_email !== user.email && duel.opponent_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If declined, refund challenger's escrow
    if (duel.status === 'declined') {
      const challRecs = await base44.asServiceRole.entities.User.filter({ email: duel.challenger_email });
      const challenger = challRecs[0];
      if (challenger) {
        const newBal = (challenger.token_balance || 0) + duel.stake_tokens;
        await base44.asServiceRole.entities.User.update(challenger.id, { token_balance: newBal });
        await base44.entities.TokenTransaction.create({
          user_email: duel.challenger_email,
          type: 'refund',
          amount: duel.stake_tokens,
          description: 'Duel odbijen — povrat escrow tokena',
          balance_after: newBal,
        });
      }
      await base44.asServiceRole.entities.Duel.update(duel.id, { status: 'finished', winner_email: null });
      return Response.json({ result: 'refunded' });
    }

    if (duel.status !== 'accepted') return Response.json({ error: 'Duel not accepted yet' }, { status: 400 });

    // Get both picks for the same contest
    const allPicks = await base44.asServiceRole.entities.Pick.filter({ contest_id: duel.contest_id });
    const challengerPick = duel.challenger_pick_id
      ? allPicks.find(p => p.id === duel.challenger_pick_id)
      : allPicks.find(p => p.user_email === duel.challenger_email);
    const opponentPick = duel.opponent_pick_id
      ? allPicks.find(p => p.id === duel.opponent_pick_id)
      : allPicks.find(p => p.user_email === duel.opponent_email);

    if (!challengerPick || !opponentPick) {
      return Response.json({ error: 'Both players must submit picks first' }, { status: 400 });
    }

    // Only resolve if both picks have a final status
    if (challengerPick.status === 'active' || opponentPick.status === 'active') {
      return Response.json({ message: 'Contest still in progress' });
    }

    const cScore = challengerPick.correct_picks || 0;
    const oScore = opponentPick.correct_picks || 0;

    // Tie — refund both
    if (cScore === oScore) {
      const [challRecs, oppRecs] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ email: duel.challenger_email }),
        base44.asServiceRole.entities.User.filter({ email: duel.opponent_email }),
      ]);
      const challenger = challRecs[0];
      const opponent = oppRecs[0];

      if (challenger) {
        const newBal = (challenger.token_balance || 0) + duel.stake_tokens;
        await base44.asServiceRole.entities.User.update(challenger.id, { token_balance: newBal });
        await base44.entities.TokenTransaction.create({
          user_email: duel.challenger_email, type: 'refund',
          amount: duel.stake_tokens, description: 'Duel neriješen — povrat', balance_after: newBal,
        });
      }
      if (opponent) {
        const newBal = (opponent.token_balance || 0) + duel.stake_tokens;
        await base44.asServiceRole.entities.User.update(opponent.id, { token_balance: newBal });
        await base44.entities.TokenTransaction.create({
          user_email: duel.opponent_email, type: 'refund',
          amount: duel.stake_tokens, description: 'Duel neriješen — povrat', balance_after: newBal,
        });
      }

      await base44.asServiceRole.entities.Duel.update(duel.id, { status: 'finished', winner_email: null });
      await Promise.all([
        base44.entities.Notification.create({
          user_email: duel.challenger_email, type: 'duel_accepted',
          title: 'Duel neriješen!',
          body: `Duel s ${duel.opponent_name || duel.opponent_email} je neriješen. Tokeni su vraćeni.`,
        }),
        base44.entities.Notification.create({
          user_email: duel.opponent_email, type: 'duel_accepted',
          title: 'Duel neriješen!',
          body: `Duel s ${duel.challenger_name || duel.challenger_email} je neriješen. Tokeni su vraćeni.`,
        }),
      ]);
      return Response.json({ result: 'tie' });
    }

    // Winner takes all (2x stake)
    const winnerEmail = cScore > oScore ? duel.challenger_email : duel.opponent_email;
    const loserEmail = cScore > oScore ? duel.opponent_email : duel.challenger_email;
    const totalPool = duel.stake_tokens * 2;

    const winnerRecs = await base44.asServiceRole.entities.User.filter({ email: winnerEmail });
    const winner = winnerRecs[0];
    if (winner) {
      const newBalance = (winner.token_balance || 0) + totalPool;
      await base44.asServiceRole.entities.User.update(winner.id, { token_balance: newBalance });
      await base44.entities.TokenTransaction.create({
        user_email: winnerEmail,
        type: 'win',
        amount: totalPool,
        description: `Duel pobjeda vs ${winnerEmail === duel.challenger_email ? (duel.opponent_name || duel.opponent_email) : (duel.challenger_name || duel.challenger_email)}`,
        balance_after: newBalance,
      });
    }

    await base44.asServiceRole.entities.Duel.update(duel.id, { status: 'finished', winner_email: winnerEmail });

    const winnerName = winnerEmail === duel.challenger_email ? (duel.challenger_name || duel.challenger_email) : (duel.opponent_name || duel.opponent_email);
    const loserName = loserEmail === duel.challenger_email ? (duel.challenger_name || duel.challenger_email) : (duel.opponent_name || duel.opponent_email);

    await Promise.all([
      base44.entities.Notification.create({
        user_email: winnerEmail, type: 'pick_won',
        title: '🏆 Pobijedio si duel!',
        body: `Pobijedio si ${loserName} i osvojio ${totalPool} tokena!`,
      }),
      base44.entities.Notification.create({
        user_email: loserEmail, type: 'pick_lost',
        title: '💀 Izgubio si duel',
        body: `${winnerName} te pobijedio u duel izazovu.`,
      }),
    ]);

    return Response.json({ result: 'winner', winner_email: winnerEmail, total_pool: totalPool });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
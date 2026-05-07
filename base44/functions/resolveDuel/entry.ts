import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { duel_id } = await req.json();
    if (!duel_id) return Response.json({ error: 'Missing duel_id' }, { status: 400 });

    const duels = await base44.asServiceRole.entities.Duel.list();
    const duel = duels.find(d => d.id === duel_id);
    if (!duel) return Response.json({ error: 'Duel not found' }, { status: 404 });
    if (duel.status === 'finished') return Response.json({ message: 'Already finished' });

    // If declined, refund challenger's escrow
    if (duel.status === 'declined') {
      const users = await base44.asServiceRole.entities.User.list();
      const challenger = users.find(u => u.email === duel.challenger_email);
      if (challenger) {
        const newBal = (challenger.token_balance || 0) + duel.stake_tokens;
        await base44.asServiceRole.auth.updateUser(challenger.id, { token_balance: newBal });
        await base44.asServiceRole.entities.TokenTransaction.create({
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
    const allPicks = await base44.asServiceRole.entities.Pick.list();
    const challengerPick = allPicks.find(p => p.id === duel.challenger_pick_id);
    const opponentPick = allPicks.find(p => p.id === duel.opponent_pick_id);

    if (!challengerPick || !opponentPick) {
      return Response.json({ error: 'Both players must submit picks first' }, { status: 400 });
    }

    // Only resolve if both picks have a final status
    if (challengerPick.status === 'active' || opponentPick.status === 'active') {
      return Response.json({ message: 'Contest still in progress' });
    }

    const cScore = challengerPick.correct_picks || 0;
    const oScore = opponentPick.correct_picks || 0;

    let winnerEmail, loserEmail;
    if (cScore > oScore) {
      winnerEmail = duel.challenger_email;
      loserEmail = duel.opponent_email;
    } else if (oScore > cScore) {
      winnerEmail = duel.opponent_email;
      loserEmail = duel.challenger_email;
    } else {
      // Tie — refund both
      const users = await base44.asServiceRole.entities.User.list();
      const challenger = users.find(u => u.email === duel.challenger_email);
      const opponent = users.find(u => u.email === duel.opponent_email);

      if (challenger) {
        await base44.asServiceRole.auth.updateUser(challenger.id, {
          token_balance: (challenger.token_balance || 0) + duel.stake_tokens
        });
      }
      if (opponent) {
        await base44.asServiceRole.auth.updateUser(opponent.id, {
          token_balance: (opponent.token_balance || 0) + duel.stake_tokens
        });
      }

      await base44.asServiceRole.entities.Duel.update(duel.id, {
        status: 'finished',
        winner_email: null
      });

      await base44.asServiceRole.entities.Notification.create({
        user_email: duel.challenger_email, type: 'duel_accepted',
        title: 'Duel neriješen!',
        body: `Duel s ${duel.opponent_name || duel.opponent_email} je neriješen. Tokeni su vraćeni.`
      });
      await base44.asServiceRole.entities.Notification.create({
        user_email: duel.opponent_email, type: 'duel_accepted',
        title: 'Duel neriješen!',
        body: `Duel s ${duel.challenger_name || duel.challenger_email} je neriješen. Tokeni su vraćeni.`
      });

      return Response.json({ result: 'tie' });
    }

    // Winner takes all (2x stake)
    const totalPool = duel.stake_tokens * 2;
    const users = await base44.asServiceRole.entities.User.list();
    const winner = users.find(u => u.email === winnerEmail);

    if (winner) {
      const newBalance = (winner.token_balance || 0) + totalPool;
      await base44.asServiceRole.auth.updateUser(winner.id, { token_balance: newBalance });
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_email: winnerEmail,
        type: 'win',
        amount: totalPool,
        description: `Duel pobjeda vs ${winnerEmail === duel.challenger_email ? duel.opponent_name : duel.challenger_name}`,
        balance_after: newBalance
      });
    }

    await base44.asServiceRole.entities.Duel.update(duel.id, {
      status: 'finished',
      winner_email: winnerEmail
    });

    // Notifications
    const winnerName = winnerEmail === duel.challenger_email
      ? (duel.challenger_name || duel.challenger_email)
      : (duel.opponent_name || duel.opponent_email);
    const loserName = loserEmail === duel.challenger_email
      ? (duel.challenger_name || duel.challenger_email)
      : (duel.opponent_name || duel.opponent_email);

    await base44.asServiceRole.entities.Notification.create({
      user_email: winnerEmail, type: 'pick_won',
      title: '🏆 Pobijedio si duel!',
      body: `Pobijedio si ${loserName} i osvoji ${totalPool} tokena!`
    });
    await base44.asServiceRole.entities.Notification.create({
      user_email: loserEmail, type: 'pick_lost',
      title: '💀 Izgubio si duel',
      body: `${winnerName} te pobijedio u duel izazovu.`
    });

    return Response.json({ result: 'winner', winner_email: winnerEmail, total_pool: totalPool });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
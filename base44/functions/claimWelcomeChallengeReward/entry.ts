import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get fresh user record
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];

    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });
    if (userRecord.welcome_bonus_claimed) {
      return Response.json({ error: 'Welcome bonus već iskorišten', already_claimed: true }, { status: 400 });
    }

    // Get active picks
    const activePicks = await base44.entities.WelcomeChallengePick.filter({ is_active: true });
    if (activePicks.length === 0) {
      return Response.json({ error: 'Nema aktivnog seta pickova' }, { status: 400 });
    }

    const setId = activePicks[0].admin_set_id;

    // Validate all picks are graded
    const allGraded = activePicks.every(p => p.correct_choice === 'over' || p.correct_choice === 'under');
    if (!allGraded) {
      return Response.json({ error: 'Pickovi još nisu ocijenjeni' }, { status: 400 });
    }

    // Get user's entry
    const entries = await base44.entities.WelcomeChallengeEntry.filter({
      user_email: user.email,
      admin_set_id: setId,
    });
    const entry = entries[0];
    if (!entry) return Response.json({ error: 'Nema predanog entry-ja' }, { status: 400 });
    if (entry.status === 'lost') return Response.json({ error: 'Nisi pogodio dovoljno pickova', won: false }, { status: 400 });

    // Validate correct answers
    const allCorrect = entry.selections.every(sel => {
      const pick = activePicks.find(p => p.id === sel.pick_id);
      return pick && pick.correct_choice === sel.choice;
    });

    if (!allCorrect) {
      await base44.entities.WelcomeChallengeEntry.update(entry.id, { status: 'lost' });
      return Response.json({ error: 'Nisu svi pickovi točni', won: false }, { status: 400 });
    }

    // Award 5000 tokens
    const newBalance = (userRecord.token_balance || 0) + 5000;
    await base44.asServiceRole.entities.User.update(userRecord.id, {
      token_balance: newBalance,
      welcome_bonus_claimed: true,
    });

    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'bonus',
      amount: 5000,
      description: 'Welcome Challenge - pogodio sva 3 picka',
      balance_after: newBalance,
    });

    await base44.entities.WelcomeChallengeEntry.update(entry.id, { status: 'won' });

    await base44.entities.Notification.create({
      user_email: user.email,
      type: 'reward',
      title: '🎉 Welcome bonus isplaćen! +5000 tokena',
      body: 'Bravo! Pogodio si sva 3 picka u Welcome Challengeu!',
    });

    console.log(`claimWelcomeChallengeReward: user=${user.email} awarded 5000 tokens`);
    return Response.json({ won: true, reward: 5000 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
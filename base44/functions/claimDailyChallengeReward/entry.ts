import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { challenge_id } = await req.json();
    if (!challenge_id) return Response.json({ error: 'challenge_id required' }, { status: 400 });

    // Get challenge
    const challenges = await base44.entities.DailyChallenge.filter({ id: challenge_id });
    const challenge = challenges[0];
    if (!challenge) return Response.json({ error: 'Challenge not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];

    // Get progress record
    const progresses = await base44.entities.ChallengeProgress.filter({
      user_email: user.email,
      challenge_id,
      date: today,
    });
    const progress = progresses[0];

    if (!progress) return Response.json({ error: 'Nema napretka za ovaj izazov' }, { status: 400 });
    if (!progress.completed) return Response.json({ error: 'Izazov nije dovršen' }, { status: 400 });
    if (progress.reward_claimed) return Response.json({ error: 'Nagrada već preuzeta', already_claimed: true }, { status: 400 });

    const reward = challenge.reward_tokens;

    // Get fresh user balance
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    const newBalance = (userRecord.token_balance || 0) + reward;

    await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

    await base44.entities.ChallengeProgress.update(progress.id, { reward_claimed: true });

    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'bonus',
      amount: reward,
      description: `Dnevni izazov: ${challenge.title}`,
      balance_after: newBalance,
    });

    await base44.entities.Notification.create({
      user_email: user.email,
      type: 'reward',
      title: `🎉 Izazov ispunjen!`,
      body: `Zaradio si ${reward} tokena za: ${challenge.title}`,
    });

    console.log(`claimDailyChallengeReward: user=${user.email} challenge=${challenge_id} reward=${reward}`);
    return Response.json({ reward, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
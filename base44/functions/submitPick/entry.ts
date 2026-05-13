import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contest_id, selections, is_public } = await req.json();

    if (!contest_id || !selections || !Array.isArray(selections)) {
      return Response.json({ error: 'contest_id i selections su obavezni' }, { status: 400 });
    }

    // Validate contest
    const contests = await base44.asServiceRole.entities.Contest.filter({ id: contest_id });
    const contest = contests[0];
    if (!contest) return Response.json({ error: 'Natjecanje nije pronađeno' }, { status: 404 });
    if (contest.status === 'finished' || contest.status_internal === 'finished' || contest.status_internal === 'waiting_results') {
      return Response.json({ error: 'Natjecanje je završeno ili čeka rezultate' }, { status: 400 });
    }

    // Validate selections count
    const required = contest.picks_required || contest.players?.length || 5;
    if (selections.length < required) {
      return Response.json({ error: `Trebas ${required} odabira, poslan ${selections.length}` }, { status: 400 });
    }

    // Validate each selection has required fields
    for (const sel of selections) {
      if (!sel.player_name || !sel.choice || !['over', 'under'].includes(sel.choice)) {
        return Response.json({ error: 'Svaki odabir mora imati player_name i choice (over/under)' }, { status: 400 });
      }
    }

    // Fresh balance check
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    if ((userRecord.token_balance || 0) < contest.entry_cost) {
      return Response.json({ error: 'Nemaš dovoljno tokena!' }, { status: 400 });
    }

    const newBalance = userRecord.token_balance - contest.entry_cost;

    // Create Pick (user_email from auth, not from input)
    const pick = await base44.entities.Pick.create({
      contest_id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      selections: selections.map(sel => ({ ...sel, result: 'pending' })),
      tokens_spent: contest.entry_cost,
      total_picks: selections.length,
      status: 'active',
      is_public: is_public !== false,
      tokens_paid: false,
      payout_amount: 0,
    });

    // Deduct tokens + update last_active_date
    await base44.asServiceRole.entities.User.update(userRecord.id, {
      token_balance: newBalance,
      last_active_date: new Date().toISOString(),
    });

    // Audit log
    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'entry',
      amount: -contest.entry_cost,
      description: `Ulaz: ${contest.title}`,
      contest_id,
      balance_after: newBalance,
    });

    // Increment participant count
    const currentParticipants = contest.current_participants || 0;
    await base44.asServiceRole.entities.Contest.update(contest_id, {
      current_participants: currentParticipants + 1,
    });

    // Notify user
    await base44.entities.Notification.create({
      user_email: user.email,
      type: 'pick_finished',
      title: `Ulaz potvrđen: ${contest.title}`,
      body: 'Tvoji odabiri su zaprimljeni. Čekaj rezultate natjecanja!',
      contest_id,
      pick_id: pick.id,
    });

    console.log(`submitPick: user=${user.email} contest=${contest_id} cost=${contest.entry_cost} pick=${pick.id} newBalance=${newBalance}`);
    return Response.json({ success: true, pick_id: pick.id, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
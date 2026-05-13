import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const POWER_ODDS = { 2: 3, 3: 5, 4: 10, 5: 20, 6: 35 };
const FLEX_ODDS = {
  3: { 3: 2.25, 2: 1.25 },
  4: { 4: 5, 3: 1.5 },
  5: { 5: 10, 4: 2, 3: 0.4 },
  6: { 6: 25, 5: 2, 4: 0.4 },
};

function calcRiskLevel(playType, numPicks) {
  if (playType === 'flex') return 'low';
  if (numPicks <= 2) return 'low';
  if (numPicks <= 4) return 'medium';
  return 'high';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { selections, play_type, stake_tokens } = await req.json();

    if (!selections || !Array.isArray(selections) || !play_type || !stake_tokens) {
      return Response.json({ error: 'selections, play_type i stake_tokens su obavezni' }, { status: 400 });
    }

    const numPicks = selections.length;

    // Validate pick count
    if (play_type === 'power' && numPicks < 2) {
      return Response.json({ error: 'Power Play zahtijeva minimalno 2 odabira' }, { status: 400 });
    }
    if (play_type === 'flex' && numPicks < 3) {
      return Response.json({ error: 'Flex Play zahtijeva minimalno 3 odabira' }, { status: 400 });
    }
    if (numPicks > 6) {
      return Response.json({ error: 'Maksimalno 6 odabira' }, { status: 400 });
    }
    if (stake_tokens <= 0) {
      return Response.json({ error: 'Ulog mora biti veći od 0' }, { status: 400 });
    }

    // Validate each selection
    for (const sel of selections) {
      if (!sel.player_name || !sel.choice || !['over', 'under'].includes(sel.choice)) {
        return Response.json({ error: 'Svaki odabir mora imati player_name i choice' }, { status: 400 });
      }
      if (!sel.contest_id) {
        return Response.json({ error: 'Svaki odabir mora imati contest_id' }, { status: 400 });
      }
    }

    // Validate all referenced contests are active
    const contestIds = [...new Set(selections.map(s => s.contest_id))];
    for (const cid of contestIds) {
      const records = await base44.asServiceRole.entities.Contest.filter({ id: cid });
      const c = records[0];
      if (!c) return Response.json({ error: `Natjecanje ${cid} nije pronađeno` }, { status: 404 });
      if (c.status === 'finished') return Response.json({ error: `Natjecanje "${c.title}" je završeno` }, { status: 400 });
    }

    // Calculate odds and potential win
    const totalOdds = POWER_ODDS[numPicks] || 0;
    let potentialWin = 0;
    if (play_type === 'power') {
      potentialWin = Math.round(stake_tokens * totalOdds);
    } else {
      // Flex: max payout scenario (all correct)
      const flexTable = FLEX_ODDS[numPicks] || {};
      const maxMult = flexTable[numPicks] || 0;
      potentialWin = Math.round(stake_tokens * maxMult);
    }

    // Fresh balance check
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    if ((userRecord.token_balance || 0) < stake_tokens) {
      return Response.json({ error: 'Nemaš dovoljno tokena!' }, { status: 400 });
    }

    const newBalance = userRecord.token_balance - stake_tokens;

    // Create Parlay (user_email from auth)
    const parlay = await base44.entities.Parlay.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      selections: selections.map(sel => ({ ...sel, result: 'pending' })),
      play_type,
      num_picks: numPicks,
      total_odds: totalOdds,
      stake_tokens,
      potential_win: potentialWin,
      status: 'active',
      tokens_won: 0,
      tokens_paid: false,
      risk_level: calcRiskLevel(play_type, numPicks),
    });

    // Deduct tokens
    await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

    // Audit log
    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'entry',
      amount: -stake_tokens,
      description: `${play_type === 'flex' ? 'Flex' : 'Power'} Parlay (${numPicks} odabira)`,
      balance_after: newBalance,
    });

    console.log(`submitParlay: user=${user.email} play_type=${play_type} picks=${numPicks} stake=${stake_tokens} parlay=${parlay.id} newBalance=${newBalance}`);
    return Response.json({ success: true, parlay_id: parlay.id, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
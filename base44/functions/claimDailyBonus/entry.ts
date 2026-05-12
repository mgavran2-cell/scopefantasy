import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if daily bonus already claimed in last 24h via TokenTransaction audit
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentTxs = await base44.asServiceRole.entities.TokenTransaction.filter({
      user_email: user.email,
      type: 'bonus',
      description: 'Dnevni bonus',
    });

    const claimedToday = recentTxs.some(tx => new Date(tx.created_date) > new Date(yesterday));
    if (claimedToday) {
      return Response.json({ error: 'Dnevni bonus već iskorišten danas', already_claimed: true }, { status: 400 });
    }

    // Get fresh user balance
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    const newBalance = (userRecord.token_balance || 0) + 500;

    await base44.asServiceRole.entities.User.update(userRecord.id, { token_balance: newBalance });

    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'bonus',
      amount: 500,
      description: 'Dnevni bonus',
      balance_after: newBalance,
    });

    console.log(`claimDailyBonus: user=${user.email} new_balance=${newBalance}`);
    return Response.json({ success: true, reward: 500, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
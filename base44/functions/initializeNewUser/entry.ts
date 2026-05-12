import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get fresh user record from DB
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    // Permanent flag — once set, never grant again
    if (userRecord.welcome_bonus_initialized) {
      // Still may need referral_code if missing
      if (!userRecord.referral_code) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await base44.asServiceRole.entities.User.update(userRecord.id, { referral_code: code });
      }
      return Response.json({ already_initialized: true });
    }

    // Generate referral code
    const referralCode = userRecord.referral_code || Math.random().toString(36).substring(2, 8).toUpperCase();

    // Initialize user
    await base44.asServiceRole.entities.User.update(userRecord.id, {
      token_balance: 5000,
      referral_code: referralCode,
      onboarding_completed: false,
      welcome_bonus_initialized: true,
    });

    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: 'bonus',
      amount: 5000,
      description: 'Bonus dobrodošlice',
      balance_after: 5000,
    });

    console.log(`initializeNewUser: user=${user.email} initialized with 5000 tokens`);
    return Response.json({
      success: true,
      token_balance: 5000,
      referral_code: referralCode,
      needs_onboarding: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
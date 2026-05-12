import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REFERRAL_BONUS = 200;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { referral_code } = await req.json();
    if (!referral_code) return Response.json({ error: 'referral_code required' }, { status: 400 });

    const code = referral_code.trim().toUpperCase();

    // Get fresh user record
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    // Anti-double-use
    if (userRecord.referred_by) {
      return Response.json({ error: 'Već si koristio/la referalni kod', already_used: true }, { status: 400 });
    }

    // Anti-self-referral
    if (userRecord.referral_code === code) {
      return Response.json({ error: 'Ne možeš koristiti vlastiti referalni kod' }, { status: 400 });
    }

    // Find referrer
    const referrers = await base44.asServiceRole.entities.User.filter({ referral_code: code });
    if (!referrers || referrers.length === 0) {
      return Response.json({ error: 'Referalni kod nije pronađen' }, { status: 404 });
    }
    const referrer = referrers[0];

    // Award bonus to current user
    const myNewBalance = (userRecord.token_balance || 0) + REFERRAL_BONUS;
    await base44.asServiceRole.entities.User.update(userRecord.id, {
      token_balance: myNewBalance,
      referred_by: code,
    });

    // Award bonus to referrer
    const referrerNewBalance = (referrer.token_balance || 0) + REFERRAL_BONUS;
    await base44.asServiceRole.entities.User.update(referrer.id, { token_balance: referrerNewBalance });

    // Audit record
    await base44.entities.ReferralUse.create({
      referrer_email: referrer.email,
      referred_email: user.email,
      referred_name: user.full_name || user.email,
      bonus_tokens: REFERRAL_BONUS,
    });

    // Transactions for both
    await Promise.all([
      base44.entities.TokenTransaction.create({
        user_email: user.email,
        type: 'bonus',
        amount: REFERRAL_BONUS,
        description: `Referalni bonus — koristio/la kod: ${code}`,
        balance_after: myNewBalance,
      }),
      base44.entities.TokenTransaction.create({
        user_email: referrer.email,
        type: 'bonus',
        amount: REFERRAL_BONUS,
        description: `Referalni bonus — prijatelj se pridružio: ${user.full_name || user.email}`,
        balance_after: referrerNewBalance,
      }),
    ]);

    // Notifications for both
    await Promise.all([
      base44.entities.Notification.create({
        user_email: user.email,
        type: 'reward',
        title: `🎉 Referalni bonus: +${REFERRAL_BONUS} tokena!`,
        body: `Koristio/la si kod ${code} i zaradio/la bonus!`,
      }),
      base44.entities.Notification.create({
        user_email: referrer.email,
        type: 'reward',
        title: `🎁 Prijatelj se pridružio! +${REFERRAL_BONUS} tokena`,
        body: `${user.full_name || user.email} se registrirao/la uz tvoj referalni kod.`,
      }),
    ]);

    console.log(`claimReferralBonus: referred=${user.email} referrer=${referrer.email} bonus=${REFERRAL_BONUS}`);
    return Response.json({ success: true, bonus: REFERRAL_BONUS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
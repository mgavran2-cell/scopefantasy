import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// HMAC-SHA256 using Web Crypto API (async)
async function signPayload(secret, body) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Unique voucher code: SF-[PREFIX]-[8 random alphanumeric]
function generateCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  arr.forEach(b => { random += chars[b % chars.length]; });
  const safePrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return `SF-${safePrefix}-${random}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      partner_id,
      user_email,
      voucher_type,
      voucher_value,
      voucher_description,
      contest_id,
      expires_in_days = 90,
    } = body;

    if (!partner_id || !user_email || !voucher_type || !voucher_value || voucher_value <= 0) {
      return Response.json({ error: 'Nedostaju obavezni parametri' }, { status: 400 });
    }

    // Load partner
    const partners = await base44.asServiceRole.entities.Partner.filter({ id: partner_id });
    const partner = partners[0];
    if (!partner || !partner.is_active) {
      return Response.json({ error: 'Partner ne postoji ili nije aktivan' }, { status: 404 });
    }

    // Load user record
    const userRecords = await base44.asServiceRole.entities.User.filter({ email: user_email });
    const userRecord = userRecords[0];
    if (!userRecord) return Response.json({ error: 'Korisnik ne postoji' }, { status: 404 });

    // Generate unique voucher code (collision check)
    let voucher_code;
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateCode(partner.name);
      const existing = await base44.asServiceRole.entities.PartnerVoucher.filter({ voucher_code: candidate });
      if (!existing.length) { voucher_code = candidate; break; }
      attempts++;
    }
    if (!voucher_code) return Response.json({ error: 'Nije moguće generirati kod' }, { status: 500 });

    const now = new Date();
    const issued_date = now.toISOString();
    const expires_date = new Date(now.getTime() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

    // Create voucher record
    const voucher = await base44.asServiceRole.entities.PartnerVoucher.create({
      partner_id,
      partner_name: partner.name,
      voucher_code,
      voucher_value,
      voucher_type,
      voucher_description: voucher_description || `${partner.name} voucher`,
      issued_to_email: user_email,
      issued_to_name: userRecord.full_name || user_email,
      issued_date,
      expires_date,
      status: 'issued',
      tokens_spent: 0,
      contest_id: contest_id || null,
      partner_webhook_sent: false,
    });

    // Send webhook to partner (if configured)
    let webhook_status = 'none';
    if (partner.webhook_url) {
      try {
        const webhookBody = JSON.stringify({
          voucher_code,
          value: voucher_value,
          voucher_type,
          description: voucher_description,
          expires_date,
          user_email,
          issued_date,
        });

        const headers = { 'Content-Type': 'application/json' };
        if (partner.webhook_secret) {
          headers['X-Signature'] = `sha256=${await signPayload(partner.webhook_secret, webhookBody)}`;
        }

        const whRes = await fetch(partner.webhook_url, {
          method: 'POST',
          headers,
          body: webhookBody,
          signal: AbortSignal.timeout(8000),
        });
        const responseText = await whRes.text();
        webhook_status = whRes.ok ? 'sent' : 'failed';

        await base44.asServiceRole.entities.PartnerVoucher.update(voucher.id, {
          partner_webhook_sent: whRes.ok,
          partner_webhook_response: `${whRes.status}: ${responseText.slice(0, 500)}`,
        });
      } catch (whErr) {
        webhook_status = 'failed';
        await base44.asServiceRole.entities.PartnerVoucher.update(voucher.id, {
          partner_webhook_sent: false,
          partner_webhook_response: `Error: ${whErr.message}`,
        });
      }
    }

    // Send email to user
    const expiresFormatted = new Date(expires_date).toLocaleDateString('hr-HR');
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: `🎁 Tvoj ScopeFantasy voucher: ${partner.name}`,
      body: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0a0a0a;color:#f5f5f5;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
            ${partner.logo_url ? `<img src="${partner.logo_url}" alt="${partner.name}" style="height:48px;margin-bottom:16px;border-radius:8px;" />` : ''}
            <h1 style="margin:0;font-size:28px;font-weight:900;">🎁 Čestitamo!</h1>
            <p style="margin:8px 0 0;opacity:0.85;">Osvoji/la si nagradu od ${partner.name}</p>
          </div>
          <div style="padding:32px;text-align:center;">
            <p style="color:#a1a1aa;margin-bottom:8px;font-size:14px;">Tvoj voucher kod:</p>
            <div style="background:#1a1a1a;border:2px dashed #7c3aed;border-radius:12px;padding:20px 24px;display:inline-block;margin-bottom:24px;">
              <span style="font-family:monospace;font-size:28px;font-weight:900;letter-spacing:4px;color:#a855f7;">${voucher_code}</span>
            </div>
            <p style="margin:0 0 8px;font-weight:700;">${voucher_description || `${partner.name} voucher`}</p>
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 24px;">Vrijednost: <strong style="color:#f5f5f5;">${voucher_type === 'cash' ? `€${voucher_value}` : voucher_value}</strong></p>
            <p style="color:#a1a1aa;font-size:12px;border-top:1px solid #222;padding-top:16px;margin:0;">
              Voucher vrijedi do: <strong style="color:#f5f5f5;">${expiresFormatted}</strong><br/>
              Za iskorištenje, pokaži ovaj kod na blagajni ili ga unesi pri online kupnji na stranicama partnera.
            </p>
          </div>
          <div style="background:#111;padding:16px;text-align:center;">
            <p style="color:#52525b;font-size:11px;margin:0;">ScopeFantasy · Ovo je automatski generirani email.</p>
          </div>
        </div>
      `,
    });

    // In-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_email,
      type: 'reward',
      title: `🎁 Tvoj voucher je spreman!`,
      body: `Osvoji/la si: ${voucher_description || partner.name + ' voucher'}. Kod: ${voucher_code}. Provjeri email za detalje.`,
    });

    // Update partner stats
    await base44.asServiceRole.entities.Partner.update(partner.id, {
      total_vouchers_issued: (partner.total_vouchers_issued || 0) + 1,
      total_value_issued: (partner.total_value_issued || 0) + voucher_value,
    });

    console.log(`partnerVoucherIssuance: issued ${voucher_code} to ${user_email} (partner: ${partner.name}, webhook: ${webhook_status})`);

    return Response.json({
      success: true,
      voucher_code,
      partner_name: partner.name,
      value: voucher_value,
      expires_date,
      webhook_status,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
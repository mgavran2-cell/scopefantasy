import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_email } = await req.json();

    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      onboarding_completed: false,
    });

    return Response.json({ success: true, message: `Reset onboarding for ${target_email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
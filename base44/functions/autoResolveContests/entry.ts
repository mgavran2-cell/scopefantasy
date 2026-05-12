import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no auth) and admin manual trigger
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (_) {
      // scheduled call — no user context, proceed with service role
    }

    const now = new Date();
    const allContests = await base44.asServiceRole.entities.Contest.list('-created_date', 200);

    const toResolve = allContests.filter(c =>
      c.end_time &&
      c.status_internal !== 'finished' &&
      c.status_internal !== 'waiting_results' &&
      c.status === 'active' &&
      new Date(c.end_time) < now
    );

    // Escalation: waiting_results for 24+ hours without admin action
    const toEscalate = allContests.filter(c =>
      c.status_internal === 'waiting_results' &&
      c.end_time &&
      (now - new Date(c.end_time)) > 24 * 60 * 60 * 1000
    );

    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmails = adminUsers.map(u => u.email);

    // Process newly ended contests
    for (const contest of toResolve) {
      // Update status
      await base44.asServiceRole.entities.Contest.update(contest.id, {
        status_internal: 'waiting_results',
      });

      // Notify admins
      for (const adminEmail of adminEmails) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: adminEmail,
          type: 'new_contest',
          title: `📊 Natjecanje "${contest.title}" je završilo`,
          body: `Treba unijeti rezultate. Idi na /admin/natjecanja`,
          contest_id: contest.id,
        });
      }

      // Notify users who submitted picks
      const picks = await base44.asServiceRole.entities.Pick.filter({ contest_id: contest.id });
      const uniqueEmails = [...new Set(picks.map(p => p.user_email))];
      for (const email of uniqueEmails) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: 'pick_finished',
          title: `⏳ Tvoj listić čeka rezultate`,
          body: `Natjecanje "${contest.title}" je završilo. Rezultati stižu uskoro!`,
          contest_id: contest.id,
        });
      }
    }

    // Escalate 24h reminders
    for (const contest of toEscalate) {
      for (const adminEmail of adminEmails) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: adminEmail,
          type: 'new_contest',
          title: `🔴 Podsjetnik: "${contest.title}" čeka rezultate 24h+`,
          body: `Natjecanje čeka unos rezultata već više od 24 sata. /admin/natjecanja`,
          contest_id: contest.id,
        });
      }
    }

    return Response.json({
      resolved: toResolve.length,
      escalated: toEscalate.length,
      contests: toResolve.map(c => c.title),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
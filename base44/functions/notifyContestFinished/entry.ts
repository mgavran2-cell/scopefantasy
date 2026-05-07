import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const contestId = body?.event?.entity_id || body?.data?.id;
    if (!contestId) {
      return Response.json({ error: 'Missing contest id' }, { status: 400 });
    }

    // Fetch the contest (in case payload_too_large or to get fresh data)
    let contest = body.data;
    if (!contest || body.payload_too_large) {
      contest = await base44.asServiceRole.entities.Contest.get(contestId);
    }

    if (contest.status !== 'finished') {
      return Response.json({ skipped: true, reason: 'Contest is not finished' });
    }

    // Find all picks for this contest
    const picks = await base44.asServiceRole.entities.Pick.filter({ contest_id: contestId });

    if (picks.length === 0) {
      return Response.json({ sent: 0 });
    }

    // Deduplicate by user_email
    const seen = new Set();
    const uniquePicks = picks.filter(p => {
      if (seen.has(p.user_email)) return false;
      seen.add(p.user_email);
      return true;
    });

    // Send notification to each participant
    const notifications = uniquePicks.map(pick => {
      const statusLabel = pick.status === 'won' ? '🏆 Pobijedio si' : pick.status === 'lost' ? '😔 Izgubio si' : '📊 Rezultati su dostupni';
      return base44.asServiceRole.entities.Notification.create({
        user_email: pick.user_email,
        type: 'pick_finished',
        title: `${statusLabel} — ${contest.title}`,
        body: `Natjecanje "${contest.title}" je završilo. Klikni da vidiš svoje rezultate.`,
        contest_id: contestId,
        pick_id: pick.id,
        read: false,
      });
    });

    await Promise.all(notifications);

    return Response.json({ sent: uniquePicks.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
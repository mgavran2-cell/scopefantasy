import { base44 } from '@/api/base44Client';

export async function notifyUser(userEmail, type, title, body = '', extras = {}) {
  await base44.entities.Notification.create({
    user_email: userEmail,
    type,
    title,
    body,
    read: false,
    ...extras,
  });
}

export async function notifyNewContest(contest, allUserEmails) {
  await Promise.all(
    allUserEmails.map(email =>
      notifyUser(email, 'new_contest', `Novo natjecanje: ${contest.title}`, `Sport: ${contest.sport} · Ulaz: ${contest.entry_cost} tokena`, { contest_id: contest.id })
    )
  );
}
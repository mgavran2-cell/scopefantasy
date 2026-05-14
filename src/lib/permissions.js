// Hardkodirana lista vlasnika platforme. Samo ovi emailovi
// imaju pravo pristupa Admin Panelu, neovisno o user.role polju.
const OWNER_EMAILS = [
  'marko.gavran@outlook.com',
];

export function isOwner(user) {
  if (!user || !user.email) return false;
  return OWNER_EMAILS.includes(user.email.toLowerCase());
}
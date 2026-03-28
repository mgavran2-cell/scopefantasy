import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useBrowserNotifications } from './useBrowserNotifications';
import { notifyUser } from './useNotifications';

const BIG_WIN_THRESHOLD = 500; // tokens

export function useNotificationWatcher(currentUser) {
  const { showBrowserNotif } = useBrowserNotifications();
  const initialized = useRef(false);

  useEffect(() => {
    if (!currentUser?.email || initialized.current) return;
    initialized.current = true;

    // 1. Watch in-app Notifications → trigger browser notification
    const unsubNotif = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        const n = event.data;
        if (n.user_email === currentUser.email) {
          showBrowserNotif(n.title, n.body || '');
        }
      }
    });

    // 2. Watch SocialPosts → notify current user when friend posts big win
    const unsubSocial = base44.entities.SocialPost.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const post = event.data;
      // Skip own posts
      if (post.user_email === currentUser.email) return;
      // Only big wins
      if (post.pick_status === 'won' && (post.tokens_won || 0) >= BIG_WIN_THRESHOLD) {
        await notifyUser(
          currentUser.email,
          'friend_win',
          `🏆 ${post.user_name || 'Prijatelj'} je osvojio ${post.tokens_won} tokena!`,
          `U natjecanju: ${post.contest_title || 'Nepoznato'} (${post.correct_picks}/${post.total_picks} točnih odabira)`,
        );
      }
    });

    // 3. Watch Picks → notify when pick is resolved (won/lost)
    const seenPickStatuses = {};
    const unsubPick = base44.entities.Pick.subscribe(async (event) => {
      if (event.type !== 'update') return;
      const pick = event.data;
      if (pick.user_email !== currentUser.email) return;
      const prev = seenPickStatuses[pick.id];
      seenPickStatuses[pick.id] = pick.status;
      if (prev === pick.status) return; // no change

      if (pick.status === 'won') {
        await notifyUser(
          currentUser.email,
          'pick_won',
          `🏆 Pick pobijedio!`,
          `Točnih odabira: ${pick.correct_picks}/${pick.total_picks} · Zarada: +${pick.tokens_won} tokena`,
          { pick_id: pick.id }
        );
      } else if (pick.status === 'lost') {
        await notifyUser(
          currentUser.email,
          'pick_lost',
          `❌ Pick izgubljen`,
          `Točnih odabira: ${pick.correct_picks}/${pick.total_picks}`,
          { pick_id: pick.id }
        );
      } else if (pick.status === 'partial') {
        await notifyUser(
          currentUser.email,
          'pick_finished',
          `⚡ Djelomičan rezultat`,
          `Točnih odabira: ${pick.correct_picks}/${pick.total_picks} · Zarada: +${pick.tokens_won} tokena`,
          { pick_id: pick.id }
        );
      }
    });

    // 4. Watch Contests → notify when new contest goes active or finishes
    const unsubContest = base44.entities.Contest.subscribe(async (event) => {
      if (event.type !== 'create' && event.type !== 'update') return;
      const contest = event.data;
      if (contest.status === 'active') {
        await notifyUser(
          currentUser.email,
          'new_contest',
          `⚡ Novo natjecanje: ${contest.title}`,
          `${contest.sport} · Ulaz: ${contest.entry_cost} tokena · Nagradni fond: ${contest.prize_pool?.toLocaleString()} tokena`,
          { contest_id: contest.id }
        );
      } else if (contest.status === 'finished') {
        // Only notify if user has a pick in this contest
        const userPicks = await base44.entities.Pick.filter({ user_email: currentUser.email, contest_id: contest.id });
        if (userPicks.length > 0) {
          await notifyUser(
            currentUser.email,
            'pick_finished',
            `🏁 Natjecanje završilo: ${contest.title}`,
            `Provjeri rezultate svojih odabira!`,
            { contest_id: contest.id }
          );
        }
      }
    });

    return () => {
      unsubNotif();
      unsubSocial();
      unsubPick();
      unsubContest();
      initialized.current = false;
    };
  }, [currentUser?.email]);
}
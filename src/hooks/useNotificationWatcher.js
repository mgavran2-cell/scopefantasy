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

    // 3. Watch Contests → notify when new contest goes active
    const unsubContest = base44.entities.Contest.subscribe(async (event) => {
      if (event.type !== 'create' && event.type !== 'update') return;
      const contest = event.data;
      if (contest.status === 'active') {
        // Check sport interest (user has picks in this sport)
        await notifyUser(
          currentUser.email,
          'new_contest',
          `⚡ Novo natjecanje: ${contest.title}`,
          `${contest.sport} · Ulaz: ${contest.entry_cost} tokena · Nagradni fond: ${contest.prize_pool?.toLocaleString()} tokena`,
          { contest_id: contest.id }
        );
      }
    });

    return () => {
      unsubNotif();
      unsubSocial();
      unsubContest();
      initialized.current = false;
    };
  }, [currentUser?.email]);
}
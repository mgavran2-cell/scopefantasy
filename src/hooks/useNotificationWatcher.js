import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useBrowserNotifications } from './useBrowserNotifications';
import { notifyUser } from './useNotifications';

const BIG_WIN_THRESHOLD = 500;

// Check if user's pref allows this category
function prefAllowed(user, category) {
  const prefs = user?.notification_preferences;
  if (!prefs) return true; // default ON
  if (prefs[category] === false) return false;
  return true;
}

export function useNotificationWatcher(currentUser) {
  const { showBrowserNotif } = useBrowserNotifications();
  const initialized = useRef(false);

  useEffect(() => {
    if (!currentUser?.email || initialized.current) return;
    initialized.current = true;

    // Helper: notify with pref check + optional browser push
    const notify = async (category, email, type, title, body = '', extras = {}) => {
      if (!prefAllowed(currentUser, category)) return;
      await notifyUser(email, type, title, body, extras);
      if (prefAllowed(currentUser, 'browser_push') && currentUser.notification_preferences?.browser_push) {
        showBrowserNotif(title, body);
      }
    };

    // 1. Watch in-app Notifications → browser push only (if enabled)
    const unsubNotif = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        const n = event.data;
        if (n.user_email === currentUser.email && currentUser.notification_preferences?.browser_push) {
          showBrowserNotif(n.title, n.body || '');
        }
      }
    });

    // 2. Watch SocialPosts → friend big win
    const unsubSocial = base44.entities.SocialPost.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const post = event.data;
      if (post.user_email === currentUser.email) return;
      if (post.pick_status === 'won' && (post.tokens_won || 0) >= BIG_WIN_THRESHOLD) {
        await notify('social', currentUser.email, 'friend_win',
          `🏆 ${post.user_name || 'Prijatelj'} je osvojio ${post.tokens_won} tokena!`,
          `U natjecanju: ${post.contest_title || 'Nepoznato'} (${post.correct_picks}/${post.total_picks} točnih)`);
      }
    });

    // 3. Watch Comments → notify pick owner
    const unsubComment = base44.entities.Comment.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const comment = event.data;
      if (comment.user_email === currentUser.email) return;
      // Check if the post belongs to current user
      const posts = await base44.entities.SocialPost.filter({ user_email: currentUser.email });
      const ownPost = posts.find(p => p.id === comment.post_id);
      if (ownPost) {
        await notify('social', currentUser.email, 'friend_win',
          `💬 ${comment.user_name || 'Netko'} je komentirao tvoj post`,
          comment.content?.slice(0, 80) || '');
      }
    });

    // 4. Watch Follows → notify when someone follows
    const unsubFollow = base44.entities.Follow.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const follow = event.data;
      if (follow.following_email !== currentUser.email) return;
      await notify('social', currentUser.email, 'friend_win',
        `👥 ${follow.follower_email} te zaprati`,
        'Provjeri njihov profil i zaprati ih natrag!');
    });

    // 5. Watch Picks → pick results
    const seenPickStatuses = {};
    const unsubPick = base44.entities.Pick.subscribe(async (event) => {
      if (event.type !== 'update') return;
      const pick = event.data;
      if (pick.user_email !== currentUser.email) return;
      const prev = seenPickStatuses[pick.id];
      seenPickStatuses[pick.id] = pick.status;
      if (prev === pick.status) return;

      if (pick.status === 'won') {
        await notify('pick_results', currentUser.email, 'pick_won',
          `✅ Pobjednički listić: +${pick.tokens_won} tokena`,
          `${pick.correct_picks}/${pick.total_picks} točnih odabira`,
          { pick_id: pick.id });
      } else if (pick.status === 'lost') {
        await notify('pick_results', currentUser.email, 'pick_lost',
          `❌ Listić izgubljen`,
          `${pick.correct_picks}/${pick.total_picks} točnih odabira`,
          { pick_id: pick.id });
      } else if (pick.status === 'partial') {
        await notify('pick_results', currentUser.email, 'pick_finished',
          `🎯 Flex Play: ${pick.correct_picks}/${pick.total_picks} točnih, +${pick.tokens_won} tokena`,
          `Djelomična zarada na tvom listiću`,
          { pick_id: pick.id });
      }
    });

    // 6. Watch Contests → new active / finished
    const unsubContest = base44.entities.Contest.subscribe(async (event) => {
      if (event.type !== 'create' && event.type !== 'update') return;
      const contest = event.data;
      if (contest.status === 'active') {
        await notify('system', currentUser.email, 'new_contest',
          `🆕 Novo natjecanje aktivno: ${contest.title}`,
          `${contest.sport} · Ulaz: ${contest.entry_cost} tokena`,
          { contest_id: contest.id });
      } else if (contest.status === 'finished') {
        const userPicks = await base44.entities.Pick.filter({ user_email: currentUser.email, contest_id: contest.id });
        if (userPicks.length > 0) {
          await notify('system', currentUser.email, 'pick_finished',
            `🏁 Natjecanje ${contest.title} je završilo`,
            `Provjeri rezultate svojih odabira!`,
            { contest_id: contest.id });
        }
      }
    });

    // 7. Watch Duels
    const seenDuelStatuses = {};
    const unsubDuel = base44.entities.Duel.subscribe(async (event) => {
      const duel = event.data;
      if (event.type === 'create' && duel.opponent_email === currentUser.email) {
        await notify('social', currentUser.email, 'duel_accepted',
          `⚔️ ${duel.challenger_name || duel.challenger_email} te izazvao na dvoboj!`,
          `Natjecanje: ${duel.contest_title} · Ulog: ${duel.stake_tokens} tokena${duel.message ? ` · "${duel.message}"` : ''}`);
        return;
      }
      if (event.type === 'update') {
        const prev = seenDuelStatuses[duel.id];
        seenDuelStatuses[duel.id] = duel.status;
        if (prev === duel.status) return;
        if (duel.challenger_email === currentUser.email) {
          if (duel.status === 'accepted') {
            await notify('social', currentUser.email, 'duel_accepted',
              `✅ ${duel.opponent_name || duel.opponent_email} je prihvatio tvoj izazov!`,
              `Natjecanje: ${duel.contest_title} · Ulog: ${duel.stake_tokens} tokena`);
          } else if (duel.status === 'declined') {
            await notify('social', currentUser.email, 'duel_declined',
              `❌ ${duel.opponent_name || duel.opponent_email} je odbio tvoj izazov`,
              `Natjecanje: ${duel.contest_title}`);
          } else if (duel.status === 'finished') {
            const won = duel.winner_email === currentUser.email;
            await notify('pick_results', currentUser.email, won ? 'pick_won' : 'pick_lost',
              won ? `🏆 Pobijedio si dvoboj! +${duel.stake_tokens * 2} tokena` : `💀 Izgubio si dvoboj`,
              `${duel.contest_title} · Ulog: ${duel.stake_tokens} tokena`);
          }
        }
      }
    });

    // 8. Watch DailyChallenges → new challenge
    const unsubChallenge = base44.entities.DailyChallenge.subscribe(async (event) => {
      if (event.type !== 'create') return;
      const c = event.data;
      await notify('daily_streak', currentUser.email, 'new_challenge',
        `🔥 Pick dana je objavljen — ${c.title}`,
        `Nagrada: ${c.reward_tokens} tokena${c.description ? ` · ${c.description}` : ''}`);
    });

    // 9. Watch DailyStreakWeek → reward earned
    const unsubStreakWeek = base44.entities.DailyStreakWeek.subscribe(async (event) => {
      if (event.type !== 'update') return;
      const sw = event.data;
      if (sw.user_email !== currentUser.email) return;
      if (sw.status === 'completed' && sw.reward_amount > 0) {
        await notify('daily_streak', currentUser.email, 'reward',
          `🏆 Daily Streak završen: ${sw.correct_picks}/7 točnih, +${sw.reward_amount} tokena`,
          'Klikni da preuzmeš svoju nagradu!');
      }
    });

    // 10. Leaderboard rank check every 5min
    let lastRank = null;
    const checkRank = async () => {
      if (!prefAllowed(currentUser, 'system')) return;
      const picks = await base44.entities.Pick.list('-created_date', 500);
      const userStats = {};
      picks.forEach(p => {
        const e = p.user_email || p.created_by;
        if (!userStats[e]) userStats[e] = { tokensWon: 0 };
        userStats[e].tokensWon += (p.tokens_won || 0);
      });
      const sorted = Object.entries(userStats).sort((a, b) => b[1].tokensWon - a[1].tokensWon);
      const myRank = sorted.findIndex(([e]) => e === currentUser.email) + 1;
      if (myRank > 0 && lastRank !== null && myRank < lastRank) {
        await notifyUser(currentUser.email, 'rank_change',
          `📈 Napredovao si na ljestvici!`,
          `Nova pozicija: #${myRank} (prethodno: #${lastRank})`);
      }
      lastRank = myRank;
    };
    checkRank();
    const rankInterval = setInterval(checkRank, 5 * 60 * 1000);

    return () => {
      unsubNotif();
      unsubSocial();
      unsubComment();
      unsubFollow();
      unsubPick();
      unsubContest();
      unsubDuel();
      unsubChallenge();
      unsubStreakWeek();
      clearInterval(rankInterval);
      initialized.current = false;
    };
  }, [currentUser?.email]);
}
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Trophy, Star, X, CheckCheck, Swords, Zap, TrendingUp, CheckCircle2, Users, Flame, Gift, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const typeConfig = {
  new_contest:   { icon: Star,        color: 'text-accent',        bg: 'bg-accent/15',        label: 'Sustav' },
  pick_won:      { icon: Trophy,      color: 'text-primary',       bg: 'bg-primary/15',       label: 'Pick' },
  pick_lost:     { icon: X,           color: 'text-destructive',   bg: 'bg-destructive/15',   label: 'Pick' },
  pick_finished: { icon: CheckCircle2,color: 'text-primary',       bg: 'bg-primary/15',       label: 'Pick' },
  reward:        { icon: Gift,        color: 'text-yellow-400',    bg: 'bg-yellow-400/15',    label: 'Daily' },
  friend_win:    { icon: Trophy,      color: 'text-fuchsia-400',   bg: 'bg-fuchsia-400/15',   label: 'Social' },
  duel_accepted: { icon: Swords,      color: 'text-green-400',     bg: 'bg-green-400/15',     label: 'Social' },
  duel_declined: { icon: Swords,      color: 'text-destructive',   bg: 'bg-destructive/15',   label: 'Social' },
  new_challenge: { icon: Zap,         color: 'text-orange-400',    bg: 'bg-orange-400/15',    label: 'Daily' },
  rank_change:   { icon: TrendingUp,  color: 'text-primary',       bg: 'bg-primary/15',       label: 'Sustav' },
};

// Map notification type → route
const typeRoute = {
  pick_won:      '/moji-odabiri',
  pick_lost:     '/moji-odabiri',
  pick_finished: '/moji-odabiri',
  reward:        '/streak',
  new_challenge: '/streak',
  friend_win:    '/prijatelji',
  duel_accepted: '/dueli',
  duel_declined: '/dueli',
  new_contest:   '/natjecanja',
  rank_change:   '/ljestvica',
};

function getDateGroup(date) {
  const now = moment();
  const d = moment(date);
  if (d.isSame(now, 'day')) return 'Danas';
  if (d.isSame(now.clone().subtract(1, 'day'), 'day')) return 'Jučer';
  if (d.isAfter(now.clone().subtract(7, 'days'))) return 'Ovaj tjedan';
  return 'Starije';
}

const GROUP_ORDER = ['Danas', 'Jučer', 'Ovaj tjedan', 'Starije'];

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') setNotifications(prev => [event.data, ...prev]);
      if (event.type === 'update') setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      if (event.type === 'delete') setNotifications(prev => prev.filter(n => n.id !== event.id));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadNotifications = async () => {
    const data = await base44.entities.Notification.list('-created_date', 50);
    setNotifications(data);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    const route = typeRoute[n.type];
    if (route) {
      setOpen(false);
      navigate(route);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Group notifications by date
  const grouped = {};
  notifications.forEach(n => {
    const g = getDateGroup(n.created_date);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(n);
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-all"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-sm">
                Obavijesti
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">{unreadCount} nepročitanih</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <CheckCheck className="w-3.5 h-3.5" /> Označi sve
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Nema obavijesti
                </div>
              ) : (
                GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
                  <div key={group}>
                    {/* Group header */}
                    <div className="px-4 py-2 bg-secondary/40 border-b border-border/30">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{group}</p>
                    </div>
                    {grouped[group].map(n => {
                      const cfg = typeConfig[n.type] || typeConfig.pick_finished;
                      const Icon = cfg.icon;
                      const hasRoute = !!typeRoute[n.type];
                      return (
                        <button
                          key={n.id}
                          onClick={() => markRead(n)}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-all text-left border-b border-border/20 last:border-0 ${
                            !n.read ? 'bg-primary/4' : ''
                          } ${hasRoute ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold leading-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {n.title}
                              </p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                            <p className="text-xs text-muted-foreground/50 mt-1">{moment(n.created_date).fromNow()}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
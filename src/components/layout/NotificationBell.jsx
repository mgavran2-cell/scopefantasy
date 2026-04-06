import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Trophy, Star, X, CheckCheck, Swords, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

const typeConfig = {
  new_contest:   { icon: Star,       color: 'text-accent',       bg: 'bg-accent/15' },
  pick_won:      { icon: Trophy,     color: 'text-primary',      bg: 'bg-primary/15' },
  pick_lost:     { icon: Bell,       color: 'text-destructive',  bg: 'bg-destructive/15' },
  pick_finished: { icon: Bell,       color: 'text-muted-foreground', bg: 'bg-muted' },
  reward:        { icon: Trophy,     color: 'text-yellow-400',   bg: 'bg-yellow-400/15' },
  friend_win:    { icon: Trophy,     color: 'text-fuchsia-400',  bg: 'bg-fuchsia-400/15' },
  duel_accepted: { icon: Swords,     color: 'text-green-400',    bg: 'bg-green-400/15' },
  duel_declined: { icon: Swords,     color: 'text-destructive',  bg: 'bg-destructive/15' },
  new_challenge: { icon: Zap,        color: 'text-accent',       bg: 'bg-accent/15' },
  rank_change:   { icon: TrendingUp, color: 'text-primary',      bg: 'bg-primary/15' },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
    const data = await base44.entities.Notification.list('-created_date', 30);
    setNotifications(data);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (n) => {
    if (n.read) return;
    await base44.entities.Notification.update(n.id, { read: true });
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-sm">Obavijesti</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1 hover:opacity-70">
                    <CheckCheck className="w-3.5 h-3.5" /> Označi sve
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Nema obavijesti
                </div>
              ) : notifications.map(n => {
                const cfg = typeConfig[n.type] || typeConfig.pick_finished;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-all text-left border-b border-border/30 last:border-0 ${!n.read ? 'bg-primary/3' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-1">{moment(n.created_date).fromNow()}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, ListChecks, Users, User, Coins, Menu, X, Activity, Sparkles, Wallet, Heart, Flame, Rss, Shield, Star, Swords, ChevronDown } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const primaryNav = [
  { path: '/', label: 'Početna', icon: Home },
  { path: '/natjecanja', label: 'Natjecanja', icon: Trophy },
  { path: '/moji-odabiri', label: 'Odabiri', icon: ListChecks },
  { path: '/ljestvica', label: 'Ljestvica', icon: Users },
  { path: '/feed', label: 'Zajednica', icon: Rss },
  { path: '/novcanik', label: 'Novčanik', icon: Wallet },
];

const moreNav = [
  { path: '/statistika', label: 'Statistika', icon: Activity },
  { path: '/predictor', label: 'AI Predictor', icon: Sparkles },
  { path: '/streak', label: 'Daily Streak', icon: Flame },
  { path: '/dueli', label: 'Dueli', icon: Swords },
  { path: '/prijatelji', label: 'Prijatelji', icon: Heart },
  { path: '/profil', label: 'Profil', icon: User },
];

const allNav = [...primaryNav, ...moreNav];

export default function Navbar({ tokenBalance }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isMoreActive = moreNav.some(item => location.pathname === item.path);

  return (
    <>
      {/* Desktop nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-display font-black text-sm">SF</span>
              </div>
              <span className="font-display font-black text-xl tracking-wide hidden lg:block">SCOPEFANTASY</span>
            </Link>

            {/* Primary nav links */}
            <div className="hidden md:flex items-center gap-0.5">
              {primaryNav.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}

              {/* More dropdown */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isMoreActive || moreOpen
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  Više
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      {moreNav.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <div className="hidden md:flex items-center gap-1">
                  <Link
                    to="/admin/natjecanja"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      location.pathname.startsWith('/admin') ? 'bg-yellow-500/20 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10'
                    }`}
                  >
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                </div>
              )}
              <NotificationBell />
              <Link
                to="/novcanik"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25 hover:bg-primary/25 transition-all"
              >
                <Coins className="w-4 h-4 text-primary" />
                <span className="font-bold text-primary text-sm">{tokenBalance?.toLocaleString() ?? 0}</span>
              </Link>
              <button
                className="md:hidden p-2 rounded-lg hover:bg-secondary"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border md:hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="p-4 space-y-1">
              {isAdmin && (
                <>
                  <Link
                    to="/admin/natjecanja"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location.pathname.startsWith('/admin') ? 'bg-yellow-500/10 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400 hover:bg-secondary'
                    }`}
                  >
                    <Shield className="w-5 h-5" /> Admin Panel
                  </Link>
                </>
              )}
              {allNav.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
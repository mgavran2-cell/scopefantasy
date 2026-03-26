import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, ListChecks, Users, User, Coins, Menu, X, BarChart2, Rss, ShoppingCart } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/', label: 'Početna', icon: Home },
  { path: '/natjecanja', label: 'Natjecanja', icon: Trophy },
  { path: '/moji-odabiri', label: 'Moji Odabiri', icon: ListChecks },
  { path: '/ljestvica', label: 'Ljestvica', icon: Users },
  { path: '/feed', label: 'Feed', icon: Rss },
  { path: '/trgovina', label: 'Trgovina', icon: ShoppingCart },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { path: '/profil', label: 'Profil', icon: User },
];

export default function Navbar({ tokenBalance }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-display font-black text-sm">SF</span>
              </div>
              <span className="font-display font-black text-xl tracking-wide hidden sm:block">SCOPEFANTASY</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
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
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link
                to="/kupnja-tokena"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25 hover:bg-primary/25 transition-all"
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
            className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border md:hidden"
          >
            <div className="p-4 space-y-1">
              {navItems.map(item => {
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
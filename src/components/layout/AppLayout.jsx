import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { base44 } from '@/api/base44Client';
import { useNotificationWatcher } from '../../hooks/useNotificationWatcher';
import BrowserNotifBanner from './BrowserNotifBanner';
import OnboardingTour from '../onboarding/OnboardingTour';

export default function AppLayout() {
  const [tokenBalance, setTokenBalance] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [testNewUser, setTestNewUser] = useState(false);

  useNotificationWatcher(currentUser);

  useEffect(() => {
    loadBalance();
  }, []);

  const forceOnboarding = () => {
    setTestNewUser(true);
    setShowOnboarding(true);
  };

  const loadBalance = async () => {
    // auth.me() may be cached — use it only for identity
    const authUser = await base44.auth.me();
    if (!authUser) return null;

    // Read fresh fields directly from User entity (not cached)
    const userRecords = await base44.entities.User.filter({ email: authUser.email });
    const freshData = userRecords?.[0] || {};
    // SDK returns custom fields at top level on auth.me but entity returns them nested; merge both
    const user = { ...authUser, ...freshData };

    const updates = {};

    // New user: token_balance was never set (null/undefined)
    const isNewUser = user.token_balance === null || user.token_balance === undefined;

    // Needs onboarding: explicitly false (new user or after reset)
    const needsOnboarding = user.onboarding_completed === false;

    if (isNewUser) {
      updates.token_balance = 5000;
      updates.onboarding_completed = false;
    }
    if (!user.referral_code) {
      updates.referral_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (Object.keys(updates).length > 0) {
      await base44.auth.updateMe(updates);
      if (isNewUser) {
        await base44.entities.TokenTransaction.create({
          user_email: authUser.email,
          type: 'bonus',
          amount: 5000,
          description: 'Bonus dobrodošlice',
          balance_after: 5000,
        });
      }
      // Re-read after update
      const updatedRecords = await base44.entities.User.filter({ email: authUser.email });
      const updatedData = updatedRecords?.[0] || {};
      const updatedUser = { ...authUser, ...updatedData };
      setCurrentUser(updatedUser);
      setTokenBalance(updatedUser.token_balance ?? 0);
    } else {
      setCurrentUser(user);
      setTokenBalance(user.token_balance ?? 0);
    }

    if (needsOnboarding || updates.onboarding_completed === false) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }

    return user;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showOnboarding && (
        <OnboardingTour onComplete={() => {
          setShowOnboarding(false);
          if (!testNewUser) base44.auth.me().then(me => setCurrentUser(me));
        }} />
      )}
      {currentUser?.role === 'admin' && !showOnboarding && !testNewUser && (
        <button
          onClick={forceOnboarding}
          className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-yellow-500 text-black text-xs font-bold rounded-full shadow-lg hover:bg-yellow-400 transition-all"
        >
          🧪 Test Onboarding
        </button>
      )}
      {currentUser?.role === 'admin' && testNewUser && (
        <button
          onClick={() => { setTestNewUser(false); setShowOnboarding(false); }}
          className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-red-400 transition-all"
        >
          ✕ Izlaz iz test moda
        </button>
      )}
      <Navbar tokenBalance={tokenBalance} />
      <BrowserNotifBanner />
      <main className="pt-16 flex-1">
        <Outlet context={{ tokenBalance, setTokenBalance, loadBalance, currentUser, setCurrentUser, testNewUser }} />
      </main>
      <footer className="border-t border-white/5 py-5 text-center text-[12px] text-muted-foreground px-4">
        <p>ScopeFantasy Beta v0.1 — Aplikacija je u testnoj fazi. Sve funkcionalnosti mogu se mijenjati.</p>
        <p>Tokeni su virtualna valuta bez stvarne novčane vrijednosti. Nije kockanje.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2">
          <a href="/pravila" className="hover:text-foreground transition-colors underline underline-offset-2">Pravila korištenja</a>
          <span className="text-border">|</span>
          <a href="/privatnost" className="hover:text-foreground transition-colors underline underline-offset-2">Privatnost</a>
          <span className="text-border">|</span>
          <a href="/kako-igrati" className="hover:text-foreground transition-colors underline underline-offset-2">Kako igrati</a>
          <span className="text-border">|</span>
          Kontakt:{' '}
          <a href="mailto:marko.gavran@outlook.com" className="hover:text-foreground transition-colors underline underline-offset-2">
            marko.gavran@outlook.com
          </a>
        </div>
      </footer>
    </div>
  );
}
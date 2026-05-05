import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { base44 } from '@/api/base44Client';
import { useNotificationWatcher } from '../../hooks/useNotificationWatcher';
import BrowserNotifBanner from './BrowserNotifBanner';

export default function AppLayout() {
  const [tokenBalance, setTokenBalance] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  useNotificationWatcher(currentUser);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const user = await base44.auth.me();
    const updates = {};
    const isNewUser = !user?.token_balance && user?.token_balance !== 0;
    if (isNewUser) {
      updates.token_balance = 5000;
    }
    if (!user?.referral_code) {
      updates.referral_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    if (Object.keys(updates).length > 0) {
      await base44.auth.updateMe(updates);
      if (isNewUser) {
        await base44.entities.TokenTransaction.create({
          user_email: user.email,
          type: 'bonus',
          amount: 5000,
          description: 'Bonus dobrodošlice',
          balance_after: 5000,
        });
      }
    }
    const fresh = Object.keys(updates).length > 0 ? await base44.auth.me() : user;
    setCurrentUser(fresh);
    setTokenBalance(fresh?.token_balance ?? 5000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar tokenBalance={tokenBalance} />
      <BrowserNotifBanner />
      <main className="pt-16 flex-1">
        <Outlet context={{ tokenBalance, setTokenBalance, loadBalance }} />
      </main>
      <footer className="border-t border-white/5 py-5 text-center text-[12px] text-muted-foreground px-4">
        <p>ScopeFantasy Beta v0.1 — Aplikacija je u testnoj fazi.</p>
        <p>Tokeni su virtualna valuta bez stvarne novčane vrijednosti. Nije igra na sreću.</p>
        <p className="mt-1">
          Kontakt:{' '}
          <a href="mailto:marko.gavran@outlook.com" className="hover:text-foreground transition-colors underline underline-offset-2">
            marko.gavran@outlook.com
          </a>
        </p>
      </footer>
    </div>
  );
}
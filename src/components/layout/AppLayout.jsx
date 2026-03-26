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
    if (!user?.token_balance && user?.token_balance !== 0) {
      updates.token_balance = 1000;
    }
    if (!user?.referral_code) {
      updates.referral_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    if (Object.keys(updates).length > 0) {
      await base44.auth.updateMe(updates);
    }
    const fresh = Object.keys(updates).length > 0 ? await base44.auth.me() : user;
    setCurrentUser(fresh);
    setTokenBalance(fresh?.token_balance ?? 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar tokenBalance={tokenBalance} />
      <BrowserNotifBanner />
      <main className="pt-16">
        <Outlet context={{ tokenBalance, setTokenBalance, loadBalance }} />
      </main>
    </div>
  );
}
import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { base44 } from '@/api/base44Client';

export default function AppLayout() {
  const [tokenBalance, setTokenBalance] = useState(0);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const user = await base44.auth.me();
    setTokenBalance(user?.token_balance || 1000); // New users get 1000 tokens
    if (!user?.token_balance && user?.token_balance !== 0) {
      await base44.auth.updateMe({ token_balance: 1000 });
      setTokenBalance(1000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar tokenBalance={tokenBalance} />
      <main className="pt-16">
        <Outlet context={{ tokenBalance, setTokenBalance, loadBalance }} />
      </main>
    </div>
  );
}
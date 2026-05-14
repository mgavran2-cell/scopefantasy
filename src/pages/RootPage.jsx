import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Dashboard from './Dashboard';
import Home from './Home';

export default function RootPage() {
  const [isAuth, setIsAuth] = useState(null); // null = loading

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuth);
  }, []);

  if (isAuth === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return isAuth ? <Dashboard /> : <Home />;
}
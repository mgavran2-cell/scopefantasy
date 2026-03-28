import { Toaster } from "@/components/ui/toaster"
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Contests from './pages/Contests';
import ContestDetail from './pages/ContestDetail';
import MyPicks from './pages/MyPicks';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import BuyTokens from './pages/BuyTokens';
import Dashboard from './pages/Dashboard';
import SocialFeed from './pages/SocialFeed';
import Store from './pages/Store';
import TeamStats from './pages/TeamStats';
import Predictor from './pages/Predictor';
import DailyChallengePage from './pages/DailyChallengePage';
import WalletPage from './pages/Wallet';
import ParlayBuilder from './pages/ParlayBuilder';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/natjecanja" element={<Contests />} />
        <Route path="/natjecanje/:id" element={<ContestDetail />} />
        <Route path="/moji-odabiri" element={<MyPicks />} />
        <Route path="/ljestvica" element={<Leaderboard />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/kupnja-tokena" element={<BuyTokens />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/feed" element={<SocialFeed />} />
        <Route path="/trgovina" element={<Store />} />
        <Route path="/statistika" element={<TeamStats />} />
        <Route path="/predictor" element={<Predictor />} />
        <Route path="/izazovi" element={<DailyChallengePage />} />
        <Route path="/novcanik" element={<WalletPage />} />
        <Route path="/parlay" element={<ParlayBuilder />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
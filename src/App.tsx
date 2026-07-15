import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Suspense, lazy } from 'react';

const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const LeagueHub = lazy(() => import('./pages/LeagueHub'));
const LeagueDashboard = lazy(() => import('./pages/LeagueDashboard'));
const LeagueAdminPanel = lazy(() => import('./pages/LeagueAdminPanel'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const BetsHistoryPage = lazy(() => import('./pages/BetsHistoryPage'));
const ChallengesHistoryPage = lazy(() => import('./pages/ChallengesHistoryPage'));
const LeagueLayout = lazy(() => import('./components/LeagueLayout'));

const Loader = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-500 font-bold text-xl animate-pulse">
    Caricamento...
  </div>
);

const ProtectedRoute = ({ requireDbUser = true }: { requireDbUser?: boolean }) => {
  const { firebaseUser, dbUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-500 font-bold text-xl">Caricamento...</div>;
  }

  // Se non c'è l'utente Firebase (Google/Apple), vai al login
  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  // Se la rotta richiede il documento DbUser (es. LeagueHub) e manca, vai a onboarding
  if (requireDbUser && !dbUser) {
    return <Navigate to="/onboarding" replace />;
  }

  // Se la rotta NON richiede DbUser (es. sei già in onboarding) ma il DbUser c'è già, vai all'hub (non serve l'onboarding se hai già l'username)
  if (!requireDbUser && dbUser) {
    return <Navigate to="/hub" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute requireDbUser={false} />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>

            <Route element={<ProtectedRoute requireDbUser={true} />}>
              <Route path="/hub" element={<LeagueHub />} />
              
              <Route element={<LeagueLayout />}>
                <Route path="/league/:leagueId/dashboard" element={<LeagueDashboard />} />
                <Route path="/league/:leagueId/leaderboard" element={<LeaderboardPage />} />
                <Route path="/league/:leagueId/bets" element={<BetsHistoryPage />} />
                <Route path="/league/:leagueId/history" element={<ChallengesHistoryPage />} />
                <Route path="/league/:leagueId/rules" element={<RulesPage />} />
                <Route path="/league/:leagueId/admin" element={<LeagueAdminPanel />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

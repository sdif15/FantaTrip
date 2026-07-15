import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Onboarding from './components/Onboarding';
import LeagueHub from './pages/LeagueHub';
import LeagueDashboard from './pages/LeagueDashboard';
import LeagueAdminPanel from './pages/LeagueAdminPanel';

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
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute requireDbUser={false} />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>

          <Route element={<ProtectedRoute requireDbUser={true} />}>
            <Route path="/hub" element={<LeagueHub />} />
            <Route path="/league/:leagueId/dashboard" element={<LeagueDashboard />} />
            <Route path="/league/:leagueId/admin" element={<LeagueAdminPanel />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

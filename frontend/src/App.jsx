import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FirePlanner from './pages/FirePlanner';
import HealthScore from './pages/HealthScore';
import TaxWizard from './pages/TaxWizard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';

function OnboardingGuard({ children }) {
  const { user } = useAuth();
  if (user && !user.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function OnboardingRoute() {
  const { user } = useAuth();
  if (user && user.onboarding_complete) {
    return <Navigate to="/" replace />;
  }
  return <Onboarding />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingRoute />
          </ProtectedRoute>
        } />
        <Route path="/*" element={
          <ProtectedRoute>
            <OnboardingGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/fire" element={<FirePlanner />} />
                  <Route path="/health" element={<HealthScore />} />
                  <Route path="/tax" element={<TaxWizard />} />
                <Route path="/profile" element={<Profile />} />
                </Routes>
              </Layout>
            </OnboardingGuard>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

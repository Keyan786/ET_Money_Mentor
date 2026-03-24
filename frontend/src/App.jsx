import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FirePlanner from './pages/FirePlanner';
import HealthScore from './pages/HealthScore';
import TaxWizard from './pages/TaxWizard';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fire" element={<FirePlanner />} />
        <Route path="/health" element={<HealthScore />} />
        <Route path="/tax" element={<TaxWizard />} />
      </Routes>
    </Layout>
  );
}

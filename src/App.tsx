/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Nodes from './pages/Nodes';
import Incidents from './pages/Incidents';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Workflow from './pages/Workflow';
import Layout from './components/Layout';
import PlaceholderPage from './pages/PlaceholderPage';
import Infrastructure from './pages/Infrastructure';
import { MonitoringProvider } from './context/MonitoringContext';
import { UserProvider } from './context/UserContext';

export default function App() {
  return (
    <UserProvider>
      <MonitoringProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="workflow" element={<Workflow />} />
              <Route path="nodes" element={<Nodes />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="infrastructure" element={<Infrastructure />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<PlaceholderPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MonitoringProvider>
    </UserProvider>
  );
}

import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardOverview from './pages/Terminal/DashboardOverview';
import MonitoringPage from './pages/Terminal/MonitoringPage';
import AlertsPage from './pages/Terminal/AlertsPage';
import ForecastsPage from './pages/Terminal/ForecastsPage';
import SimulatorPage from './pages/Terminal/SimulatorPage';
import ComparePage from './pages/Terminal/ComparePage';
import AboutPage from './pages/Terminal/AboutPage';
import NotificationsPage from './pages/Terminal/NotificationsPage';
import ChatPage from './pages/Terminal/ChatPage';
import BasePage from './pages/Terminal/BasePage';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<DashboardOverview />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="forecasts" element={<ForecastsPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="base" element={<BasePage />} />
        <Route path="about" element={<AboutPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

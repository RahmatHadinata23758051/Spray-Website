import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { Page } from './navigation';
import { legacyPageToPath } from './navigation';
import type { Test } from '../domain/types';
import type { FinalAnalysisReport } from '../domain/analysis';
import { tests } from '../data/mockSpraybotRepository';

// Layout
import { AppShell } from './components/layout/AppShell';

// Pages
import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { CapturePage } from './pages/Tests/CapturePage';
import { AnalysisPage } from './pages/Tests/AnalysisPage';
import { ResultPage } from './pages/Tests/ResultPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { ProductsPage } from './pages/Products/ProductsPage';
import { CalibrationPage } from './pages/Calibration/CalibrationPage';
import { UsersPage } from './pages/Users/UsersPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';

import { BatchesPage } from './pages/Batches/BatchesPage';
import { NewBatchPage } from './pages/Batches/NewBatchPage';
import { BatchDetailPage } from './pages/Batches/BatchDetailPage';
import { BatchCapturePage } from './pages/Batches/BatchCapturePage';

export { createFinalReportCsv } from './pages/Tests/ResultPage';

export function App() {
  const [selected, setSelected] = useState<Test>(tests[0]);
  const [finalReport, setFinalReport] = useState<FinalAnalysisReport | null>(null);
  const navigate = useNavigate();

  const setPage = (nextPage: Page) => {
    navigate(legacyPageToPath[nextPage] || '/dashboard');
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage setPage={setPage} />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Shell-wrapped application routes */}
      <Route element={<AppShell selected={selected} />}>
        <Route path="/dashboard" element={<DashboardPage setPage={setPage} setSelected={setSelected} finalReport={finalReport} />} />
        
        {/* New Canonical Batch Routes */}
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/batches/new" element={<NewBatchPage />} />
        <Route path="/batches/:batchId" element={<BatchDetailPage />} />
        <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />

        {/* Legacy redirect routes */}
        <Route path="/new-test" element={<Navigate to="/batches/new" replace />} />
        <Route path="/history" element={<Navigate to="/batches" replace />} />

        {/* Temporary Legacy Routes */}
        <Route path="/capture" element={<CapturePage setPage={setPage} />} />
        <Route path="/analysis" element={<AnalysisPage test={selected} setPage={setPage} finalReport={finalReport} setFinalReport={setFinalReport} />} />
        <Route path="/result" element={<ResultPage test={selected} finalReport={finalReport} setPage={setPage} />} />
        
        <Route path="/reports" element={<ReportsPage finalReport={finalReport} />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/calibration" element={<CalibrationPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage setPage={setPage} />} />
      </Route>
    </Routes>
  );
}

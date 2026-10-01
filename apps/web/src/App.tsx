import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { Page } from './presentation/navigation';
import { legacyPageToPath } from './presentation/navigation';
import type { Test } from '@spray-paragon/domain';
import type { FinalAnalysisReport } from '@spray-paragon/domain';
import { tests } from './data';

// Layout
import { AppShell } from './presentation/components/layout/AppShell';

// Pages
import { LoginPage } from './presentation/pages/Login/LoginPage';
import { DashboardPage } from './presentation/pages/Dashboard/DashboardPage';
import { CapturePage } from './presentation/pages/Tests/CapturePage';
import { AnalysisPage } from './presentation/pages/Tests/AnalysisPage';
import { ResultPage } from './presentation/pages/Tests/ResultPage';
import { ReportsPage } from './presentation/pages/Reports/ReportsPage';
import { ProductsPage } from './presentation/pages/Products/ProductsPage';
import { CalibrationPage } from './presentation/pages/Calibration/CalibrationPage';
import { UsersPage } from './presentation/pages/Users/UsersPage';
import { SettingsPage } from './presentation/pages/Settings/SettingsPage';
import { NotFoundPage } from './presentation/pages/NotFound/NotFoundPage';

import { BatchesPage } from './presentation/pages/Batches/BatchesPage';
import { NewBatchPage } from './presentation/pages/Batches/NewBatchPage';
import { BatchDetailPage } from './presentation/pages/Batches/BatchDetailPage';
import { BatchCapturePage } from './presentation/pages/Batches/BatchCapturePage';

export { createFinalReportCsv } from './presentation/pages/Tests/ResultPage';

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

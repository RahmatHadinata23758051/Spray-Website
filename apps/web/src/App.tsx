import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import { AppShell } from './presentation/components/layout/AppShell';

// Pages
import { LoginPage } from './presentation/pages/Login/LoginPage';
import { DashboardPage } from './presentation/pages/Dashboard/DashboardPage';
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
import { BatchAnalysisPage } from './presentation/pages/Batches/BatchAnalysisPage';
import { BatchResultPage } from './presentation/pages/Batches/BatchResultPage';
import { CameraTestPage } from './presentation/pages/CameraTest/CameraTestPage';

export { createFinalReportCsv } from './application/reporting/createFinalReportCsv';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/camera-test" element={<CameraTestPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Shell-wrapped application routes */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Canonical Batch Routes */}
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/batches/new" element={<NewBatchPage />} />
        <Route path="/batches/:batchId" element={<BatchDetailPage />} />
        <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
        <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        <Route path="/batches/:batchId/result" element={<BatchResultPage />} />

        {/* Legacy redirect routes */}
        <Route path="/new-test" element={<Navigate to="/batches/new" replace />} />
        <Route path="/history" element={<Navigate to="/batches" replace />} />
        <Route path="/capture" element={<Navigate to="/batches" replace />} />
        <Route path="/analysis" element={<Navigate to="/batches" replace />} />
        <Route path="/result" element={<Navigate to="/batches" replace />} />
        
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/calibration" element={<CalibrationPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

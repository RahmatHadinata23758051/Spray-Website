import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  kodePengujianRepository,
} from '../../../application/services';
import type { KodePengujian, TestRun, Sample } from '@spray-paragon/domain';
import { TestRunRealSideAnalysisWorkspace } from './TestRunRealSideAnalysisWorkspace';
import { TestRunSimulationAnalysisWorkspace } from './TestRunSimulationAnalysisWorkspace';

export function TestRunAnalysisPage() {
  const { kpId, sampleId, runId } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState<{ kp: KodePengujian; sample: Sample; testRun: TestRun } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kpId || !sampleId || !runId) {
      setError('Parameter URL tidak lengkap');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadContext = async () => {
      try {
        const kp = await kodePengujianRepository.get(kpId);
        if (cancelled) return;
        if (!kp) {
          setError(`Kode Pengujian ${kpId} tidak ditemukan`);
          return;
        }
        const sample = kp.samples.find(s => s.id === sampleId);
        if (!sample) {
          setError(`Sampel ${sampleId} tidak ditemukan dalam Kode Pengujian ${kpId}`);
          return;
        }
        const testRun = kp.testRuns.find(t => t.id === runId && t.sampleId === sampleId);
        if (!testRun) {
          setError(`Pengujian ${runId} tidak ditemukan untuk Sampel ${sampleId}`);
          return;
        }
        // Only allow analysis for CAPTURING or ANALYZING status (or REVIEW_REQUIRED/FINALIZED for viewing)
        if (!['CAPTURING', 'ANALYZING', 'REVIEW_REQUIRED', 'FINALIZED'].includes(testRun.status)) {
          setError(`Pengujian ${runId} belum siap untuk analisis (status: ${testRun.status})`);
          return;
        }
        // Validate capture session exists
        if (!testRun.captureSession) {
          setError('Sesi capture tidak ditemukan. Capture harus diselesaikan terlebih dahulu.');
          return;
        }
        // Validate capture session data based on mode
        const isRealCapture = testRun.captureSession.captureMode === 'real';
        if (isRealCapture) {
          if (!testRun.captureSession.realSideBaseline) {
            setError('Baseline pra-spray belum dipilih. Pilih baseline di halaman Pengambilan Data terlebih dahulu.');
            return;
          }
          if (!testRun.captureSession.realSideFrames?.length) {
            setError('Tidak ada frame Side yang tertangkap.');
            return;
          }
        } else {
          // Simulation mode
          if (!testRun.captureSession.synchronizedMoments?.length) {
            setError('Tidak ada momen sinkron yang tersedia untuk analisis simulasi.');
            return;
          }
        }
        setContext({ kp, sample, testRun });
      } catch (loadError) {
        if (cancelled) return;
        console.error('Failed to load test run analysis context', loadError);
        setError('Gagal memuat konteks analisis pengujian');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [kpId, sampleId, runId]);

  const handleBack = useCallback(() => {
    if (context) {
      navigate(`/kode-pengujian/${context.kp.id}`);
    } else if (kpId) {
      navigate(`/kode-pengujian/${kpId}`);
    }
  }, [context, kpId, navigate]);

  const handleTestRunUpdated = useCallback((updatedTr: TestRun) => {
    setContext((c) => (c ? { ...c, testRun: updatedTr } : null));
  }, []);

  if (loading) return <div className="p-4 text-sm text-text-secondary">Memuat analisis...</div>;
  if (error && !context) {
    return (
      <div className="space-y-4 max-w-md mx-auto p-6">
        <h1 className="text-xl font-bold text-text-primary">Kesalahan Analisis</h1>
        <p className="text-sm text-text-secondary">{error}</p>
        <button onClick={handleBack} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Kode Pengujian
        </button>
      </div>
    );
  }
  if (!context) return null;

  const { kp, sample, testRun } = context;

  return (
    <div className="flex flex-col h-full max-w-[1440px] mx-auto w-full">
      {testRun.captureSession?.captureMode === 'real' ? (
        <TestRunRealSideAnalysisWorkspace
          kp={kp}
          sample={sample}
          testRun={testRun}
          onBack={handleBack}
          onTestRunUpdated={handleTestRunUpdated}
        />
      ) : (
        <TestRunSimulationAnalysisWorkspace
          kp={kp}
          sample={sample}
          testRun={testRun}
          onBack={handleBack}
          onTestRunUpdated={handleTestRunUpdated}
        />
      )}
    </div>
  );
}
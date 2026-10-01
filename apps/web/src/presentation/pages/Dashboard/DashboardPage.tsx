import { useNavigate } from 'react-router-dom';
import type { Page } from '../../navigation';
import type { Test } from '@spray-paragon/domain';
import type { FinalAnalysisReport } from '@spray-paragon/domain';
import { getUserFacingTestStatus } from '@spray-paragon/domain';
import { simulationService } from '../../../application/services';
const tests = simulationService.getTests();
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { Table } from '../../components/ui/Table';

export function DashboardPage({ 
  setPage, 
  setSelected, 
  finalReport 
}: { 
  setPage: (p: Page) => void; 
  setSelected: (t: Test) => void; 
  finalReport: FinalAnalysisReport | null;
}) {
  const navigate = useNavigate();
  const latestTest = tests[0];
  const latestStatus = latestTest ? getUserFacingTestStatus(latestTest, finalReport) : null;

  const awaitingReviewTests = tests.filter(t => {
    const s = getUserFacingTestStatus(t, finalReport);
    return s === 'Captured' || s === 'Ready for Review';
  });

  const finalizedTests = tests.filter(t => getUserFacingTestStatus(t, finalReport) === 'Finalized');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="text-xs text-text-muted flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span>Simulation environment · Hardware not connected</span>
        </div>
        <button 
          onClick={() => navigate('/batches/new')} 
          className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          New Batch
        </button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Panel title="Current / Latest Test">
          {!latestTest ? (
            <p className="p-4 text-sm text-text-secondary">No tests yet.</p>
          ) : (
            <div className="space-y-4 p-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-lg font-bold text-text-primary">{latestTest.id}</div>
                  <div className="text-sm font-medium text-text-secondary">{latestTest.productName}</div>
                  <div className="font-mono text-xs text-text-muted">{latestTest.sampleId}</div>
                </div>
                <Status tone={latestStatus === 'Finalized' ? 'success' : latestStatus === 'Failed' ? 'danger' : latestStatus === 'Ready for Review' ? 'warning' : 'neutral'}>
                  {latestStatus}
                </Status>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-border-subtle py-3 text-xs">
                <div>
                  <span className="text-text-muted">Created</span>
                  <div className="font-medium text-text-primary mt-0.5">
                    {new Date(latestTest.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Operator</span>
                  <div className="font-medium text-text-primary mt-0.5">{latestTest.operatorName}</div>
                </div>
              </div>

              <div>
                {latestStatus === 'Finalized' ? (
                  <button
                    onClick={() => { setSelected(latestTest); setPage('Result'); }}
                    className="w-full rounded-sm bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    View Result
                  </button>
                ) : latestStatus === 'Draft' ? (
                  <button
                    onClick={() => { setSelected(latestTest); navigate('/batches/new'); }}
                    className="w-full rounded-sm bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Continue Setup
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelected(latestTest); setPage('Analysis'); }}
                    className="w-full rounded-sm bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Review Analysis
                  </button>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel title={`Awaiting review (${awaitingReviewTests.length})`}>
          {awaitingReviewTests.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No tests are waiting for review.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {awaitingReviewTests.map(t => {
                const s = getUserFacingTestStatus(t, finalReport);
                return (
                  <div key={t.id} className="flex items-center justify-between py-2.5 px-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-text-primary">{t.id}</div>
                      <div className="truncate text-xs text-text-secondary">{t.productName}</div>
                      <div className="text-[11px] text-text-muted">{s} · {new Date(t.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <button
                      onClick={() => { setSelected(t); setPage('Analysis'); }}
                      className="ml-3 shrink-0 rounded-sm border border-border-default bg-white px-2.5 py-1 text-xs font-medium text-primary hover:bg-subtle"
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent Finalized Tests">
        {finalizedTests.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No finalized tests.</p>
        ) : (
          <Table>
            <thead className="bg-subtle">
              <tr>
                {['Test ID', 'Product', 'Operator', 'Finalized', 'Primary Capture', 'Action'].map(h => (
                  <th className="px-3 py-2 text-left font-semibold text-xs text-text-muted" key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default bg-surface text-xs">
              {finalizedTests.map(t => {
                const isFinal = finalReport && finalReport.testId === t.id;
                const finalizedAtText = isFinal
                  ? new Date(finalReport.finalizedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '—';
                const primaryCaptureText = isFinal
                  ? `#${String(finalReport.primaryCapture.frameIndex).padStart(3, '0')} · ${finalReport.primaryCapture.timestampMs} ms`
                  : '—';

                return (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-mono font-medium">{t.id}</td>
                    <td className="px-3 py-2">{t.productName}</td>
                    <td className="px-3 py-2">{t.operatorName}</td>
                    <td className="px-3 py-2 text-text-secondary">{finalizedAtText}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary">{primaryCaptureText}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => { setSelected(t); setPage('Result'); }}
                        className="text-primary hover:underline font-medium"
                      >
                        Open Result
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

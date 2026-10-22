import type {
  KodePengujianRemoteRepository,
} from '../../application/ports/sync';
import type { RemoteSyncPayload, RemoteSyncResponse } from '@spray-paragon/contracts';
import type { KodePengujian } from '@spray-paragon/domain';

export class MockKodePengujianRemoteRepository implements KodePengujianRemoteRepository {
  private online = true;
  private serverStore = new Map<string, { payload: RemoteSyncPayload; serverUpdatedAt: string }>();

  setOnline(status: boolean) {
    this.online = status;
  }

  async isOnline(): Promise<boolean> {
    return this.online;
  }

  async push(payload: RemoteSyncPayload): Promise<RemoteSyncResponse> {
    if (!this.online) {
      return {
        success: false,
        error: 'Remote server unavailable (offline)',
      };
    }

    const existing = this.serverStore.get(payload.kp.id);
    const now = new Date().toISOString();

    if (existing) {
      const existingKp = existing.payload.kp as unknown as KodePengujian;
      const incomingKp = payload.kp as unknown as KodePengujian;

      // Conflict Check 1: Immutable Finalized TestRun protection
      // If server has a FINALIZED TestRun, local cannot overwrite or demote it
      const conflicts: Array<{
        entity: 'kodePengujian' | 'sample' | 'testRun';
        id: string;
        serverVersion: unknown;
        localVersion: unknown;
        reason: string;
      }> = [];

      for (const serverTr of existingKp.testRuns) {
        if (serverTr.status === 'FINALIZED') {
          const incomingTr = incomingKp.testRuns.find(t => t.id === serverTr.id);
          if (!incomingTr || incomingTr.status !== 'FINALIZED') {
            conflicts.push({
              entity: 'testRun',
              id: serverTr.id,
              serverVersion: serverTr,
              localVersion: incomingTr,
              reason: `Finalized TestRun ${serverTr.id} is immutable and cannot be reverted or removed.`,
            });
          } else if (
            serverTr.finalReport &&
            incomingTr.finalReport &&
            JSON.stringify(serverTr.finalReport) !== JSON.stringify(incomingTr.finalReport)
          ) {
            conflicts.push({
              entity: 'testRun',
              id: serverTr.id,
              serverVersion: serverTr.finalReport,
              localVersion: incomingTr.finalReport,
              reason: `Finalized report for TestRun ${serverTr.id} cannot be altered.`,
            });
          }
        }
      }

      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts,
          error: `Sync conflict: ${conflicts.map(c => c.reason).join('; ')}`,
        };
      }
    }

    // Persist to mock remote storage
    this.serverStore.set(payload.kp.id, {
      payload,
      serverUpdatedAt: now,
    });

    return {
      success: true,
      serverUpdatedAt: now,
    };
  }

  async fetch(id: string): Promise<{ kp: KodePengujian; serverUpdatedAt: string } | null> {
    if (!this.online) {
      return null;
    }
    const record = this.serverStore.get(id);
    if (!record) return null;
    return {
      kp: record.payload.kp as unknown as KodePengujian,
      serverUpdatedAt: record.serverUpdatedAt,
    };
  }

  clear() {
    this.serverStore.clear();
  }
}
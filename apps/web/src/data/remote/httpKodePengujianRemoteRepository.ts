import type {
  KodePengujianRemoteRepository,
} from '../../application/ports/sync';
import type {
  KodePengujian,
  KodePengujianStatus,
  Sample,
  TestRun,
  SyncMetadata,
} from '@spray-paragon/domain';
import type { RemoteSyncPayload, RemoteSyncResponse } from '@spray-paragon/contracts';

const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? 'http://localhost:3001';

interface ServerKodePengujian {
  id: string;
  status: KodePengujianStatus;
  productId: string;
  productSnapshot: { productCode: string; productName: string };
  defaultRecipeId?: string;
  defaultRecipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  testPeriod?: string;
  operatorId: string;
  operatorName: string;
  calculationStandard?: string;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  sync?: SyncMetadata;
  samples: Sample[];
  testRuns: TestRun[];
  createdAt: string;
  updatedAt: string;
  version?: number;
}

async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function mapServerKpToDomain(serverKp: ServerKodePengujian): KodePengujian {
  return {
    id: serverKp.id,
    status: serverKp.status,
    productId: serverKp.productId,
    productSnapshot: serverKp.productSnapshot,
    defaultRecipeId: serverKp.defaultRecipeId,
    defaultRecipeSnapshot: serverKp.defaultRecipeSnapshot,
    productLot: serverKp.productLot,
    testPeriod: serverKp.testPeriod,
    operatorId: serverKp.operatorId,
    operatorName: serverKp.operatorName,
    calculationStandard: serverKp.calculationStandard,
    storageCondition: serverKp.storageCondition,
    bottlePosition: serverKp.bottlePosition,
    notes: serverKp.notes,
    metadata: serverKp.metadata,
    sync: serverKp.sync,
    samples: serverKp.samples ?? [],
    testRuns: serverKp.testRuns ?? [],
    createdAt: serverKp.createdAt,
    updatedAt: serverKp.updatedAt,
    version: serverKp.version ?? 1,
  };
}

export class HttpKodePengujianRemoteRepository implements KodePengujianRemoteRepository {
  async push(payload: RemoteSyncPayload): Promise<RemoteSyncResponse> {
    try {
      const response = await fetchWithAuth<RemoteSyncResponse>(`/api/kode-pengujian/${payload.kp.id}/sync`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response;
    } catch (e) {
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        return { success: false, error: 'Authentication required' };
      }
      return { success: false, error: e instanceof Error ? e.message : 'Sync failed' };
    }
  }

  async fetch(id: string): Promise<{ kp: KodePengujian; serverUpdatedAt: string } | null> {
    try {
      const serverKp = await fetchWithAuth<ServerKodePengujian>(`/api/kode-pengujian/${id}`);
      return {
        kp: mapServerKpToDomain(serverKp),
        serverUpdatedAt: serverKp.updatedAt,
      };
    } catch (e) {
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        throw new Error('Authentication required');
      }
      if (e instanceof Error && e.message.includes('404')) {
        return null;
      }
      throw e;
    }
  }

  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`, { method: 'HEAD', credentials: 'include' });
      return response.ok;
    } catch {
      return false;
    }
  }

  clear(): void {
    // No-op for HTTP implementation (test helper only for mock)
  }

  setOnline(_status: boolean): void {
    // No-op for HTTP implementation (test helper only for mock)
  }
}
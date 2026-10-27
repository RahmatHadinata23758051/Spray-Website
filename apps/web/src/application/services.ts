import {
  batchRepository as batchRepoImpl,
  productRepository as productRepoImpl,
  mockSpraybotService,
  IndexedDbCaptureAssetStore,
  LocalStorageKodePengujianRepository,
  MockKodePengujianRemoteRepository,
  MockCaptureMediaRemoteStore,
} from '../data';
import { HttpKodePengujianRemoteRepository } from '../data/remote/httpKodePengujianRemoteRepository';
import type { BatchRepository } from './ports/batchRepository';
import type { ProductRepository } from './ports/productRepository';
import type { SimulationService } from './ports/simulationService';
import type { CaptureAssetStore } from './ports/captureAssetStore';
import type { KodePengujianRepository } from './ports/kodePengujianRepository';
import type { KodePengujianRemoteRepository } from './ports/sync';
import type { SyncService } from './ports/sync';
import { CaptureAssetResolver } from './captureAssets';
import { DefaultSyncService } from './sync/syncService';

export const batchRepository: BatchRepository = batchRepoImpl;
export const productRepository: ProductRepository = productRepoImpl;
export const simulationService: SimulationService = mockSpraybotService;
export const captureAssetStore: CaptureAssetStore = new IndexedDbCaptureAssetStore();
export const captureAssetResolver = new CaptureAssetResolver(captureAssetStore);
export const kodePengujianRepository: KodePengujianRepository = new LocalStorageKodePengujianRepository();

// Export mock for test access
export const mockRemoteKodePengujianRepository = new MockKodePengujianRemoteRepository();
export const mockRemoteCaptureMediaStore = new MockCaptureMediaRemoteStore();
export const httpRemoteKodePengujianRepository = new HttpKodePengujianRemoteRepository();

interface RuntimeEnv {
  VITEST?: string | boolean;
  VITE_USE_MOCK_REMOTE?: string;
  VITE_API_BASE_URL?: string;
  MODE?: string;
}

const env = (typeof import.meta !== 'undefined' ? (import.meta as { env?: RuntimeEnv }).env : undefined) ?? {};

// Runtime configuration: select remote repository based on environment
// - test: mock (vitest env)
// - development/offline when explicitly selected: mock
// - connected runtime (production, staging, or dev with VITE_API_BASE_URL): HTTP
function getRemoteRepository(): KodePengujianRemoteRepository {
  // In test environment (vitest), always use mock
  if (env.VITEST) {
    return mockRemoteKodePengujianRepository;
  }

  // If explicitly configured to use mock in development
  if (env.VITE_USE_MOCK_REMOTE === 'true') {
    return mockRemoteKodePengujianRepository;
  }

  // If API base URL is configured or in production mode, use HTTP repository
  if (env.VITE_API_BASE_URL || env.MODE === 'production') {
    return httpRemoteKodePengujianRepository;
  }

  // Default to mock for local offline development
  return mockRemoteKodePengujianRepository;
}

export const remoteKodePengujianRepository: KodePengujianRemoteRepository = getRemoteRepository();
export const remoteCaptureMediaStore = mockRemoteCaptureMediaStore;

export const syncService: SyncService = new DefaultSyncService(
  kodePengujianRepository,
  remoteKodePengujianRepository,
  remoteCaptureMediaStore,
  captureAssetStore,
);

export { getCaptureSavePolicy, setCaptureSavePolicy } from './settings';

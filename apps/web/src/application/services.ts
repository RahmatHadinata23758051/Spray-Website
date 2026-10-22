import {
  batchRepository as batchRepoImpl,
  productRepository as productRepoImpl,
  mockSpraybotService,
  IndexedDbCaptureAssetStore,
  LocalStorageKodePengujianRepository,
  MockKodePengujianRemoteRepository,
  MockCaptureMediaRemoteStore,
} from '../data';
import type { BatchRepository } from './ports/batchRepository';
import type { ProductRepository } from './ports/productRepository';
import type { SimulationService } from './ports/simulationService';
import type { CaptureAssetStore } from './ports/captureAssetStore';
import type { KodePengujianRepository } from './ports/kodePengujianRepository';
import type { SyncService } from './ports/sync';
import { CaptureAssetResolver } from './captureAssets';
import { DefaultSyncService } from './sync/syncService';

export const batchRepository: BatchRepository = batchRepoImpl;
export const productRepository: ProductRepository = productRepoImpl;
export const simulationService: SimulationService = mockSpraybotService;
export const captureAssetStore: CaptureAssetStore = new IndexedDbCaptureAssetStore();
export const captureAssetResolver = new CaptureAssetResolver(captureAssetStore);
export const kodePengujianRepository: KodePengujianRepository = new LocalStorageKodePengujianRepository();

export const remoteKodePengujianRepository = new MockKodePengujianRemoteRepository();
export const remoteCaptureMediaStore = new MockCaptureMediaRemoteStore();

export const syncService: SyncService = new DefaultSyncService(
  kodePengujianRepository,
  remoteKodePengujianRepository,
  remoteCaptureMediaStore,
  captureAssetStore,
);

export { getCaptureSavePolicy, setCaptureSavePolicy } from './settings';

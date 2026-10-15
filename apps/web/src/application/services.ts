import { batchRepository as batchRepoImpl, productRepository as productRepoImpl, mockSpraybotService, IndexedDbCaptureAssetStore } from '../data';
import type { BatchRepository } from './ports/batchRepository';
import type { ProductRepository } from './ports/productRepository';
import type { SimulationService } from './ports/simulationService';
import type { CaptureAssetStore } from './ports/captureAssetStore';
import { CaptureAssetResolver } from './captureAssets';

export const batchRepository: BatchRepository = batchRepoImpl;
export const productRepository: ProductRepository = productRepoImpl;
export const simulationService: SimulationService = mockSpraybotService;
export const captureAssetStore: CaptureAssetStore = new IndexedDbCaptureAssetStore();
export const captureAssetResolver = new CaptureAssetResolver(captureAssetStore);

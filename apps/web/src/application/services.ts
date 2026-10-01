import { batchRepository as batchRepoImpl, productRepository as productRepoImpl, mockSpraybotService } from '../data';
import type { BatchRepository } from './ports/batchRepository';
import type { ProductRepository } from './ports/productRepository';
import type { SimulationService } from './ports/simulationService';

export const batchRepository: BatchRepository = batchRepoImpl;
export const productRepository: ProductRepository = productRepoImpl;
export const simulationService: SimulationService = mockSpraybotService;

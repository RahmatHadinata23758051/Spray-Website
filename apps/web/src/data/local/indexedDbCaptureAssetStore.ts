import type { CaptureAssetStore } from '../../application/ports/captureAssetStore';

const DATABASE_NAME = 'spraybot.capture-assets.v1';
const DATABASE_VERSION = 1;
const STORE_NAME = 'assets';
const BATCH_INDEX = 'batchId';

/**
 * Bytes are stored explicitly instead of the Blob itself: structured-clone
 * support for Blob varies between environments, ArrayBuffer never does.
 */
type StoredCaptureAsset = {
  assetId: string;
  batchId: string;
  type: string;
  data: ArrayBuffer;
};

const memoryAssets = new Map<string, StoredCaptureAsset>();
let databasePromise: Promise<IDBDatabase | null> | null = null;

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(STORE_NAME)
          ? request.transaction?.objectStore(STORE_NAME)
          : database.createObjectStore(STORE_NAME, { keyPath: 'assetId' });
        if (store && !store.indexNames.contains(BATCH_INDEX)) store.createIndex(BATCH_INDEX, 'batchId', { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('Capture asset IndexedDB is unavailable; using in-memory fallback.', request.error);
        resolve(null);
      };
      request.onblocked = () => resolve(null);
    } catch (error) {
      console.warn('Capture asset IndexedDB could not be opened; using in-memory fallback.', error);
      resolve(null);
    }
  });
  return databasePromise;
}

function readBlobBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Capture asset could not be read'));
    reader.readAsArrayBuffer(blob);
  });
}

async function runTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    let result: T | null = null;
    let request: IDBRequest<T>;
    try {
      request = operation(transaction.objectStore(STORE_NAME));
    } catch (error) {
      reject(error);
      return;
    }
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function toBlob(record: StoredCaptureAsset | undefined): Blob | null {
  if (!record || !record.data || typeof record.data.byteLength !== 'number') return null;
  return new Blob([record.data], { type: record.type || 'application/octet-stream' });
}

export class IndexedDbCaptureAssetStore implements CaptureAssetStore {
  async save(assetId: string, batchId: string, blob: Blob): Promise<void> {
    const record: StoredCaptureAsset = { assetId, batchId, type: blob.type, data: await readBlobBytes(blob) };
    const database = await openDatabase();
    if (!database) {
      memoryAssets.set(assetId, record);
      return;
    }
    await runTransaction('readwrite', (store) => store.put(record));
  }

  async get(assetId: string): Promise<Blob | null> {
    const database = await openDatabase();
    if (!database) return toBlob(memoryAssets.get(assetId));
    return toBlob(await runTransaction<StoredCaptureAsset | undefined>('readonly', (store) => store.get(assetId)) ?? undefined);
  }

  async delete(assetId: string): Promise<void> {
    const database = await openDatabase();
    if (!database) {
      memoryAssets.delete(assetId);
      return;
    }
    await runTransaction('readwrite', (store) => store.delete(assetId));
  }

  async deleteBatch(batchId: string): Promise<void> {
    const database = await openDatabase();
    if (!database) {
      for (const [assetId, record] of memoryAssets) if (record.batchId === batchId) memoryAssets.delete(assetId);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).index(BATCH_INDEX).openCursor(IDBKeyRange.only(batchId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB batch asset cleanup failed'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB batch cleanup failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB batch cleanup aborted'));
    });
  }
}

import type { ModelTestRun } from './types';

const STORAGE_KEY = 'spraybot.modelTesting.v1';

function readAll(): ModelTestRun[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse model testing store from localStorage', err);
    return [];
  }
}

function writeAll(runs: ModelTestRun[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (err) {
    console.warn('Failed to save model testing store to localStorage', err);
  }
}

export const modelTestingRepository = {
  async list(): Promise<ModelTestRun[]> {
    const items = readAll();
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async get(id: string): Promise<ModelTestRun | null> {
    const items = readAll();
    return items.find((item) => item.id === id) || null;
  },

  async create(data: Omit<ModelTestRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelTestRun> {
    const items = readAll();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seq = String(items.length + 1).padStart(4, '0');
    const id = `MDL-${yy}${mm}${dd}-${seq}`;

    const newRun: ModelTestRun = {
      ...data,
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    items.push(newRun);
    writeAll(items);
    return newRun;
  },

  async update(id: string, patch: Partial<ModelTestRun>): Promise<ModelTestRun> {
    const items = readAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`ModelTestRun not found: ${id}`);
    }

    const updated: ModelTestRun = {
      ...items[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    writeAll(items);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const items = readAll().filter((item) => item.id !== id);
    writeAll(items);
  },
};

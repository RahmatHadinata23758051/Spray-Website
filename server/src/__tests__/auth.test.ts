import { describe, it, expect, beforeEach } from 'vitest';
import argon2 from 'argon2';
import { buildApp, type AuthStore, type AuthUser } from '../app';

class MemoryAuthStore implements AuthStore {
  users = new Map<string, AuthUser>();
  sessions = new Map<string, { userId: string; expiresAt: Date }>();

  async findUser(email: string) {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }
  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }
  async findSession(tokenHash: string) {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= new Date()) return undefined;
    return Array.from(this.users.values()).find((u) => u.id === s.userId);
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
}

describe('Fastify Auth Backend', () => {
  let store: MemoryAuthStore;

  beforeEach(async () => {
    process.env.SESSION_SECRET = 'a-very-long-secret-key-that-is-at-least-32-chars';
    store = new MemoryAuthStore();
    const hash = await argon2.hash('correct-password');
    store.users.set('usr_1', {
      id: 'usr_1',
      email: 'admin@local.test',
      displayName: 'Local Admin',
      passwordHash: hash,
      role: 'admin',
      isActive: true,
    });
  });

  it('health endpoint returns ok', async () => {
    const app = await buildApp(store);
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, mode: 'auth-only' });
  });

  it('rejects invalid login', async () => {
    const app = await buildApp(store);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@local.test', password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts valid login, sets session cookie, and returns user session', async () => {
    const app = await buildApp(store);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@local.test', password: 'correct-password' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('admin@local.test');
    const cookieHeader = res.headers['set-cookie'] as string;
    expect(cookieHeader).toBeDefined();

    const sessionRes = await app.inject({
      method: 'GET',
      url: '/auth/session',
      headers: { cookie: cookieHeader.split(';')[0] },
    });
    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.json().user.email).toBe('admin@local.test');

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookieHeader.split(';')[0] },
    });
    expect(logoutRes.statusCode).toBe(200);

    const expiredSessionRes = await app.inject({
      method: 'GET',
      url: '/auth/session',
      headers: { cookie: cookieHeader.split(';')[0] },
    });
    expect(expiredSessionRes.statusCode).toBe(401);
  });
});

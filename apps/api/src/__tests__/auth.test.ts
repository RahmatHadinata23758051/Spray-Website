import { describe, it, expect, beforeEach } from 'vitest';
import argon2 from 'argon2';
import { buildApp } from '../app';
import type { AuthRepository, AuthUser } from '../application/ports/authRepository';

class MemoryAuthRepository implements AuthRepository {
  users = new Map<string, AuthUser>();
  sessions = new Map<string, { userId: string; expiresAt: Date }>();

  async findUserByEmail(email: string) {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }
  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }
  async findUserBySessionTokenHash(tokenHash: string) {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= new Date()) return undefined;
    return Array.from(this.users.values()).find((u) => u.id === s.userId);
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
}

describe('Fastify Auth Backend', () => {
  let repo: MemoryAuthRepository;

  beforeEach(async () => {
    process.env.SESSION_SECRET = 'a-very-long-secret-key-that-is-at-least-32-chars';
    repo = new MemoryAuthRepository();
    const passwordHash = await argon2.hash('correct-horse-battery-staple');
    repo.users.set('1', {
      id: '1',
      email: 'operator@spraybot.local',
      displayName: 'Operator One',
      passwordHash,
      role: 'operator',
      isActive: true,
    });
  });

  it('health endpoint returns ok', async () => {
    const app = await buildApp(repo);
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.mode).toBe('auth-only');
    expect(body.requestId).toBeDefined();
  });

  it('successful login sets session cookie', async () => {
    const app = await buildApp(repo);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'operator@spraybot.local', password: 'correct-horse-battery-staple' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.data.user.email).toBe('operator@spraybot.local');
    expect(body.requestId).toBeDefined();
    const cookie = res.cookies.find((c) => c.name === 'spraybot_session');
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
  });

  it('failed login returns 401 envelope with error code', async () => {
    const app = await buildApp(repo);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'operator@spraybot.local', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.requestId).toBeDefined();
  });
});

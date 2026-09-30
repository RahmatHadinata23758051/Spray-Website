import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { db as database } from './db';
import { sessions, users } from '../../db/schema';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'operator' | 'analyst' | 'admin';
  isActive: boolean;
};

export interface AuthStore {
  findUser(email: string): Promise<AuthUser | undefined>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<AuthUser | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
}

export function createPostgresAuthStore(db: typeof database): AuthStore {
  return {
    async findUser(email) {
      return (await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1))[0];
    },
    async createSession(userId, tokenHash, expiresAt) {
      await db.insert(sessions).values({ userId, tokenHash, expiresAt });
    },
    async findSession(tokenHash) {
      const row = (await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()), eq(users.isActive, true))).limit(1))[0];
      return row?.user;
    },
    async deleteSession(tokenHash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
  };
}

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = ({ id, email, displayName, role }: AuthUser) => ({ id, email, displayName, role });

export async function buildApp(store?: AuthStore) {
  if (!store) {
    const { db } = await import('./db');
    store = createPostgresAuthStore(db);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');

  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  await app.register(cookie, { secret });
  await app.register(rateLimit, { max: 10, timeWindow: '1 minute' });

  app.get('/health', async () => ({ ok: true, mode: 'auth-only' }));
  app.post('/auth/login', async (request, reply) => {
    const body = request.body as Partial<{ email: string; password: string }>;
    if (typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }
    const user = await store.findUser(body.email.trim());
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, body.password))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const maxAge = 60 * 60 * 8;
    await store.createSession(user.id, hashToken(token), new Date(Date.now() + maxAge * 1000));
    reply.setCookie('spraybot_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    return { user: publicUser(user) };
  });
  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies.spraybot_session;
    if (token) await store.deleteSession(hashToken(token));
    reply.clearCookie('spraybot_session', { path: '/' });
    return { ok: true };
  });
  app.get('/auth/session', async (request, reply) => {
    const token = request.cookies.spraybot_session;
    const user = token ? await store.findSession(hashToken(token)) : undefined;
    if (!user) return reply.code(401).send({ error: 'No session' });
    return { user: publicUser(user) };
  });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '127.0.0.1' });
}

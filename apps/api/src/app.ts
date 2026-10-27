import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import crypto from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { AuthRepository } from './application/ports/authRepository';
import type { KodePengujianRepository } from './application/ports/kodePengujianRepository';
import type { db as database } from './data/postgres/client';
import { PostgresAuthRepository } from './data/postgres/repositories/authRepository';
import { PostgresKodePengujianRepository } from './data/postgres/repositories/kodePengujianRepository';
import { MemoryKodePengujianRepository } from './data/memory/kodePengujianRepository';
import authRoutes from './presentation/routes/authRoutes';
import healthRoutes from './presentation/routes/healthRoutes';
import { createKodePengujianRoutes } from './presentation/routes/kodePengujianRoutes';
import { hashToken } from './presentation/middleware/auth';

export type BuildAppOptions = {
  authRepository?: AuthRepository;
  kpRepository?: KodePengujianRepository;
  db?: typeof database;
};

export async function buildApp(optionsOrAuthRepo?: AuthRepository | BuildAppOptions) {
  let authRepo: AuthRepository | undefined;
  let kpRepo: KodePengujianRepository | undefined;

  if (optionsOrAuthRepo && 'findUserByEmail' in optionsOrAuthRepo) {
    authRepo = optionsOrAuthRepo;
    kpRepo = new MemoryKodePengujianRepository();
  } else if (optionsOrAuthRepo) {
    authRepo = optionsOrAuthRepo.authRepository;
    kpRepo = optionsOrAuthRepo.kpRepository;
  }

  if (!authRepo || !kpRepo) {
    const { db: defaultDb } = await import('./data/postgres/client');
    const database = (optionsOrAuthRepo && 'db' in optionsOrAuthRepo ? optionsOrAuthRepo.db : undefined) ?? defaultDb;
    if (!authRepo) authRepo = new PostgresAuthRepository(database);
    if (!kpRepo) kpRepo = new PostgresKodePengujianRepository(database);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');

  const app = Fastify({ 
    logger: process.env.NODE_ENV !== 'test',
    genReqId: () => `req-${crypto.randomBytes(8).toString('hex')}`
  });

  await app.register(cookie, { secret });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const authMiddleware = {
    async requireAuth(request: FastifyRequest) {
      const token = request.cookies.spraybot_session;
      if (!token) return null;
      const user = await authRepo.findUserBySessionTokenHash(hashToken(token));
      return user ?? null;
    }
  };

  // Register routes with prefixes
  await app.register(healthRoutes());
  await app.register(authRoutes(authRepo), { prefix: '/auth' });
  await app.register((fastify) => createKodePengujianRoutes(fastify, kpRepo, authMiddleware));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '127.0.0.1' });
}
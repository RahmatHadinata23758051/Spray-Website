import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import crypto from 'node:crypto';
import type { AuthRepository } from './application/ports/authRepository';
import { PostgresAuthRepository } from './data/postgres/repositories/authRepository';
import authRoutes from './presentation/routes/authRoutes';
import healthRoutes from './presentation/routes/healthRoutes';

export async function buildApp(repo?: AuthRepository) {
  if (!repo) {
    const { db } = await import('./data/postgres/client');
    repo = new PostgresAuthRepository(db);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');

  const app = Fastify({ 
    logger: process.env.NODE_ENV !== 'test',
    genReqId: () => `req-${crypto.randomBytes(8).toString('hex')}`
  });

  await app.register(cookie, { secret });
  await app.register(rateLimit, { max: 10, timeWindow: '1 minute' });

  // Register routes with prefixes
  await app.register(healthRoutes());
  await app.register(authRoutes(repo), { prefix: '/auth' });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '127.0.0.1' });
}

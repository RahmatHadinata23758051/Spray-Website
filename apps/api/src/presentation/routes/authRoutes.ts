import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import type { AuthRepository } from '../../application/ports/authRepository';
import { sendError } from '../middleware/errorHandler';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export default function authRoutes(repo: AuthRepository): FastifyPluginAsync {
  return async (app) => {
    
    app.post('/login', async (request, reply) => {
      const body = request.body as Partial<{ email: string; password: string }>;
      const reqId = request.id;
      
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Email and password are required', reqId);
      }
      
      const user = await repo.findUserByEmail(body.email.trim());
      if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, body.password))) {
        return sendError(reply, 401, 'UNAUTHORIZED', 'Invalid credentials', reqId);
      }
      
      const token = crypto.randomBytes(32).toString('base64url');
      const maxAge = 60 * 60 * 8;
      await repo.createSession(user.id, hashToken(token), new Date(Date.now() + maxAge * 1000));
      
      reply.setCookie('spraybot_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
      
      return { 
        ok: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role
          }
        },
        requestId: reqId
      };
    });

    app.post('/logout', async (request, reply) => {
      const token = request.cookies.spraybot_session;
      if (token) await repo.deleteSession(hashToken(token));
      reply.clearCookie('spraybot_session', { path: '/' });
      
      return { ok: true, data: {}, requestId: request.id };
    });

    app.get('/session', async (request, reply) => {
      const token = request.cookies.spraybot_session;
      const user = token ? await repo.findUserBySessionTokenHash(hashToken(token)) : undefined;
      
      if (!user) {
        return sendError(reply, 401, 'UNAUTHORIZED', 'No session', request.id);
      }
      
      return { 
        ok: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role
          }
        },
        requestId: request.id
      };
    });
  };
}
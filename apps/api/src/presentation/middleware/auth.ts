import type { FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import type { AuthRepository } from '../../application/ports/authRepository';

export function createAuthMiddleware(repo: AuthRepository) {
  const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

  return {
    async getCurrentUser(request: FastifyRequest) {
      const token = request.cookies.spraybot_session;
      if (!token) return null;
      return await repo.findUserBySessionTokenHash(hashToken(token));
    },

    async requireAuth(request: FastifyRequest) {
      const user = await this.getCurrentUser(request);
      if (!user) throw new Error('Unauthorized');
      return user;
    }
  };
}

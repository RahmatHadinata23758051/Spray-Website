import type { FastifyPluginAsync } from 'fastify';

export default function healthRoutes(): FastifyPluginAsync {
  return async (app) => {
    app.get('/health', async (request) => {
      return {
        ok: true,
        data: {
          status: 'healthy',
          mode: 'auth-only',
          timestamp: new Date().toISOString()
        },
        requestId: request.id
      };
    });
  };
}
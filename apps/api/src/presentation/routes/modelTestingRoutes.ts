import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ModelRunner, type FrameInferenceRequest } from './modelRunner';

export function createModelTestingRoutes(fastify: FastifyInstance) {
  const runner = ModelRunner.getInstance();

  fastify.addHook('onClose', (_instance, done) => {
    runner.shutdown();
    done();
  });

  // Check if model file and python environment are ready
  fastify.get('/api/model-testing/model-status', async (_req: FastifyRequest, reply: FastifyReply) => {
    const status = runner.getStatus();
    return reply.send(status);
  });

  // Inference runner endpoint for a single frame
  fastify.post<{
    Body: FrameInferenceRequest;
  }>(
    '/api/model-testing/infer-frame',
    {
      schema: {
        body: {
          type: 'object',
          required: ['frameIndex', 'timestampMs', 'imageBase64'],
          properties: {
            frameIndex: { type: 'number' },
            timestampMs: { type: 'number' },
            imageBase64: { type: 'string' },
          },
        },
      },
      bodyLimit: 25 * 1024 * 1024, // 25 MB max per frame payload
    },
    async (req, reply) => {
      const { frameIndex, timestampMs, imageBase64 } = req.body;

      try {
        const result = await runner.inferFrame({
          frameIndex,
          timestampMs,
          imageBase64,
        });

        return reply.send(result);
      } catch (err: unknown) {
        fastify.log.warn({ err }, 'Infer frame error, fallback will be used');
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({
          frameIndex,
          timestampMs,
          status: 'error',
          message,
        });
      }
    }
  );
}

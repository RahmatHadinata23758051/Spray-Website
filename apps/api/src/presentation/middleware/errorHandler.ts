import type { FastifyReply } from 'fastify';
import type { ApiErrorEnvelope } from '@spray-paragon/contracts';

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown
) {
  const envelope: ApiErrorEnvelope = {
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    requestId,
  };
  return reply.code(statusCode).send(envelope);
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { KodePengujianRepository } from '../../application/ports/kodePengujianRepository';
import {
  CreateKodePengujianRequestSchema,
  UpdateKodePengujianRequestSchema,
  CreateSampleRequestSchema,
  UpdateSampleRequestSchema,
  CreateTestRunRequestSchema,
  UpdateTestRunRequestSchema,
  RemoteSyncPayloadSchema,
} from '@spray-paragon/contracts';
import { DomainInvariantError } from '@spray-paragon/domain';

interface AuthenticatedRequest extends FastifyRequest {
  user: { id: string; email: string; displayName: string; role: string };
}

interface VersionedEntity {
  version?: number;
}

function errorResponse(reply: FastifyReply, status: number, code: string, message: string, details?: Record<string, unknown>) {
  return reply.status(status).send({ code, message, details });
}

export function createKodePengujianRoutes(
  app: FastifyInstance,
  repo: KodePengujianRepository,
  authMiddleware: { requireAuth: (request: FastifyRequest) => Promise<AuthenticatedRequest['user'] | null> }
) {
  const auth = async (request: FastifyRequest) => authMiddleware.requireAuth(request);

  app.get('/api/kode-pengujian', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const kps = await repo.list();
    const listItems = kps
      .filter(kp => kp.operatorId === user.id || user.role === 'admin')
      .map(kp => ({
        id: kp.id,
        status: kp.status,
        productId: kp.productId,
        productSnapshot: kp.productSnapshot,
        productLot: kp.productLot,
        testPeriod: kp.testPeriod,
        operatorName: kp.operatorName,
        sampleCount: kp.samples.length,
        testRunCount: kp.testRuns.length,
        finalizedRunCount: kp.testRuns.filter(tr => tr.status === 'FINALIZED').length,
        createdAt: kp.createdAt,
        updatedAt: kp.updatedAt,
        version: (kp as VersionedEntity).version ?? 1,
        sync: kp.sync,
      }));
    return reply.send(listItems);
  });

  app.get('/api/kode-pengujian/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { id } = request.params;
    const kp = await repo.get(id);
    if (!kp) return errorResponse(reply, 404, 'NOT_FOUND', 'KodePengujian not found');
    if (kp.operatorId !== user.id && user.role !== 'admin') {
      return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
    }
    return reply.send(kp);
  });

  app.post('/api/kode-pengujian', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const parseResult = CreateKodePengujianRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const input = { ...parseResult.data, operatorId: user.id, operatorName: user.displayName };
    try {
      const kp = await repo.create(input);
      return reply.status(201).send(kp);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        return errorResponse(reply, 409, 'CONFLICT', e.message);
      }
      throw e;
    }
  });

  app.patch('/api/kode-pengujian/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { id } = request.params;
    const parseResult = UpdateKodePengujianRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const kp = await repo.get(id);
    if (!kp) return errorResponse(reply, 404, 'NOT_FOUND', 'KodePengujian not found');
    if (kp.operatorId !== user.id && user.role !== 'admin') {
      return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
    }

    const { version, ...patch } = parseResult.data;
    if ((kp as VersionedEntity).version !== version) {
      return errorResponse(reply, 409, 'VERSION_CONFLICT', 'KodePengujian has been modified by another client. Please refresh and retry.');
    }

    try {
      const updated = await repo.updateParentMetadata(id, patch);
      return reply.send(updated);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        return errorResponse(reply, 409, 'CONFLICT', e.message);
      }
      throw e;
    }
  });

  app.post('/api/kode-pengujian/:kpId/samples', async (request: FastifyRequest<{ Params: { kpId: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { kpId } = request.params;
    const parseResult = CreateSampleRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const kp = await repo.get(kpId);
    if (!kp) return errorResponse(reply, 404, 'NOT_FOUND', 'KodePengujian not found');
    if (kp.operatorId !== user.id && user.role !== 'admin') {
      return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
    }

    try {
      const result = await repo.addSample(kpId, parseResult.data);
      return reply.status(201).send(result);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        return errorResponse(reply, 409, 'CONFLICT', e.message);
      }
      throw e;
    }
  });

  app.patch('/api/kode-pengujian/:kpId/samples/:sampleId', async (request: FastifyRequest<{ Params: { kpId: string; sampleId: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { kpId, sampleId } = request.params;
    const parseResult = UpdateSampleRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const kp = await repo.get(kpId);
    if (!kp) return errorResponse(reply, 404, 'NOT_FOUND', 'KodePengujian not found');
    if (kp.operatorId !== user.id && user.role !== 'admin') {
      return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
    }

    const patch = { ...parseResult.data };
    delete (patch as { version?: number }).version;
    // Note: Sample version check would require fetching sample version - simplified for now

    try {
      const updated = await repo.updateSample(kpId, sampleId, patch);
      return reply.send(updated);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        return errorResponse(reply, 409, 'CONFLICT', e.message);
      }
      throw e;
    }
  });

  app.post('/api/kode-pengujian/:kpId/test-runs', async (request: FastifyRequest<{ Params: { kpId: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { kpId } = request.params;
    const parseResult = CreateTestRunRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const kp = await repo.get(kpId);
    if (!kp) return errorResponse(reply, 404, 'NOT_FOUND', 'KodePengujian not found');
    if (kp.operatorId !== user.id && user.role !== 'admin') {
      return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
    }

    const sample = kp.samples.find(s => s.id === parseResult.data.sampleId);
    if (!sample) return errorResponse(reply, 404, 'NOT_FOUND', 'Sample not found in this KodePengujian');

    try {
      const result = await repo.addTestRun(kpId, { ...parseResult.data, operatorId: user.id, operatorName: user.displayName });
      return reply.status(201).send(result);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        return errorResponse(reply, 409, 'CONFLICT', e.message);
      }
      throw e;
    }
  });

  app.patch('/api/kode-pengujian/:kpId/test-runs/:runId', async (request: FastifyRequest<{ Params: { kpId: string; runId: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { kpId, runId } = request.params;
    const parseResult = UpdateTestRunRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid request body', parseResult.error.flatten().fieldErrors);
    }

    const kp = await repo.get(kpId);
    if (!kp) return errorResponse(reply, 404, 'NOT_FOUND', 'KodePengujian not found');
    if (kp.operatorId !== user.id && user.role !== 'admin') {
      return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
    }

    const tr = kp.testRuns.find(t => t.id === runId);
    if (!tr) return errorResponse(reply, 404, 'NOT_FOUND', 'TestRun not found');

    const { version, ...patch } = parseResult.data;
    if ((tr as VersionedEntity).version !== version) {
      return errorResponse(reply, 409, 'VERSION_CONFLICT', 'TestRun has been modified by another client. Please refresh and retry.');
    }

    try {
      const updated = await repo.updateTestRun(kpId, runId, patch as unknown as Partial<import('../../application/ports/kodePengujianRepository').UpdateTestRunInput>);
      return reply.send(updated);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        return errorResponse(reply, 409, 'CONFLICT', e.message);
      }
      throw e;
    }
  });

  app.post('/api/kode-pengujian/:id/sync', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await auth(request);
    if (!user) return errorResponse(reply, 401, 'UNAUTHORIZED', 'Authentication required');

    const { id } = request.params;

    // Validate the sync payload
    const parseResult = RemoteSyncPayloadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'Invalid sync payload', parseResult.error.flatten().fieldErrors);
    }

    const payload = parseResult.data;

    // Verify the ID matches
    if (payload.kp.id !== id) {
      return errorResponse(reply, 400, 'VALIDATION_ERROR', 'KodePengujian ID mismatch');
    }

    // Verify authorization
    const existingKp = await repo.get(id);
    if (existingKp) {
      if (existingKp.operatorId !== user.id && user.role !== 'admin') {
        return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
      }
    } else {
      // New KP - verify operator matches
      if (payload.kp.operatorId !== user.id && user.role !== 'admin') {
        return errorResponse(reply, 403, 'FORBIDDEN', 'Access denied');
      }
    }

    const response = await repo.syncAggregate(payload);

    if (!response.success) {
      return reply.status(409).send(response);
    }

    return reply.send(response);
  });
}
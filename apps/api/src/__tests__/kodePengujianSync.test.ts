import { describe, it, expect, beforeEach } from 'vitest';
import argon2 from 'argon2';
import { buildApp } from '../app';
import type { AuthRepository, AuthUser } from '../application/ports/authRepository';
import { MemoryKodePengujianRepository } from '../data/memory/kodePengujianRepository';
import type { RemoteSyncPayload } from '@spray-paragon/contracts';
import type { FinalAnalysisReport } from '@spray-paragon/domain';

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

describe('Phase P6.1 — Server Persistence for KodePengujian Metadata & Sync', () => {
  let authRepo: MemoryAuthRepository;
  let kpRepo: MemoryKodePengujianRepository;
  let sessionCookie: string;
  const operatorId = 'user-op-1';
  const otherOperatorId = 'user-op-2';

  const mockFinalReport: FinalAnalysisReport = {
    status: 'finalized',
    analysisSource: 'simulation',
    perspectives: ['side', 'front'],
    test: {
      testId: 'TR-01',
      sampleId: 'SMP-01',
      product: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
      recipe: { name: 'Standard Actuation', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
      operator: 'Operator One',
      testTimestamp: '2026-10-20T10:00:00.000Z',
      setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
    },
    testId: 'TR-01',
    primaryCaptureMomentId: 'moment-01',
    supportingCaptureMomentIds: ['moment-02'],
    primaryCapture: {
      frameIndex: 5,
      timestampMs: 166,
      phase: 'stable',
    },
    side: {
      frameId: 'frame-side-01',
      frame: { frameId: 'frame-side-01', timestampMs: 166, phase: 'stable' },
      calibration: {
        pixelsPerMm: 10,
        sprayOrigin: { x: 100, y: 50 },
        referencePlaneY: 200,
        pixelResolution: { width: 640, height: 480 },
        confidence: 0.98,
        calibratedAt: '2026-10-20T10:00:00.000Z',
      },
      autoGeometry: {
        plumeAngleDeg: 42.5,
        sprayLengthMm: 85.2,
        patternWidthMm: 38.4,
        sprayAngleDeg: 42.5,
        verticalSpreadMm: 60.1,
      },
      finalGeometry: {
        plumeAngleDeg: 42.5,
        sprayLengthMm: 85.2,
        patternWidthMm: 38.4,
        sprayAngleDeg: 42.5,
        verticalSpreadMm: 60.1,
      },
      sprayLength: { auto: 85.2, final: 85.2, adjusted: false },
      sprayAngle: { auto: 42.5, final: 42.5, adjusted: false },
      plumeAngle: { auto: 42.5, final: 42.5, adjusted: false },
      patternWidth: { auto: 38.4, final: 38.4, adjusted: false },
      verticalSpread: { auto: 60.1, final: 60.1, adjusted: false },
    },
    supportingCaptures: [],
    finalizedBy: 'Operator One',
    finalizedAt: '2026-10-20T10:05:00.000Z',
  };

  beforeEach(async () => {
    process.env.SESSION_SECRET = 'secret-key-at-least-32-characters-long!';
    authRepo = new MemoryAuthRepository();
    kpRepo = new MemoryKodePengujianRepository();

    const passwordHash = await argon2.hash('password123');
    authRepo.users.set(operatorId, {
      id: operatorId,
      email: 'operator@spraybot.local',
      displayName: 'Operator One',
      passwordHash,
      role: 'operator',
      isActive: true,
    });
    authRepo.users.set(otherOperatorId, {
      id: otherOperatorId,
      email: 'other@spraybot.local',
      displayName: 'Operator Two',
      passwordHash,
      role: 'operator',
      isActive: true,
    });

    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'operator@spraybot.local', password: 'password123' },
    });
    const cookie = loginRes.cookies.find(c => c.name === 'spraybot_session');
    sessionCookie = `spraybot_session=${cookie?.value}`;
  });

  it('1. auth required: unauthenticated requests are rejected with 401', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const listRes = await app.inject({ method: 'GET', url: '/api/kode-pengujian' });
    expect(listRes.statusCode).toBe(401);

    const getRes = await app.inject({ method: 'GET', url: '/api/kode-pengujian/KP-TEST-01' });
    expect(getRes.statusCode).toBe(401);

    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-TEST-01/sync',
      payload: { kp: { id: 'KP-TEST-01' } },
    });
    expect(syncRes.statusCode).toBe(401);
  });

  it('2. create KP locally then sync to API/Postgres persists full metadata', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const payload: RemoteSyncPayload = {
      kp: {
        id: 'KP-LOCAL-01',
        status: 'ACTIVE',
        productId: 'prod-01',
        productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
        defaultRecipeId: 'rec-01',
        defaultRecipeSnapshot: { name: 'Standard Actuation', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
        productLot: 'LOT-2026-A',
        testPeriod: '2026-Q4',
        operatorId,
        operatorName: 'Operator One',
        calculationStandard: 'ISO-2026',
        storageCondition: '25C / 60% RH',
        bottlePosition: 'Tegak',
        notes: 'Initial test run batch',
        metadata: { env: 'simulation' },
        samples: [],
        testRuns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sync: { status: 'pending', localUpdatedAt: new Date().toISOString() },
      },
      mediaManifest: [],
      pushedAt: new Date().toISOString(),
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-LOCAL-01/sync',
      headers: { cookie: sessionCookie },
      payload,
    });

    expect(syncRes.statusCode).toBe(200);
    const body = syncRes.json();
    expect(body.success).toBe(true);
    expect(body.serverUpdatedAt).toBeDefined();

    // Verify persisted on server
    const fetchRes = await app.inject({
      method: 'GET',
      url: '/api/kode-pengujian/KP-LOCAL-01',
      headers: { cookie: sessionCookie },
    });
    expect(fetchRes.statusCode).toBe(200);
    const serverKp = fetchRes.json();
    expect(serverKp.id).toBe('KP-LOCAL-01');
    expect(serverKp.productLot).toBe('LOT-2026-A');
    expect(serverKp.operatorId).toBe(operatorId);
    expect(serverKp.status).toBe('ACTIVE');
  });

  it('3. Sample and TestRun persistence with recipe, setpoints, and status', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const now = new Date().toISOString();
    const payload: RemoteSyncPayload = {
      kp: {
        id: 'KP-RUNS-01',
        status: 'ACTIVE',
        productId: 'prod-01',
        productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
        operatorId,
        operatorName: 'Operator One',
        samples: [
          {
            id: 'SMP-01',
            kodePengujianId: 'KP-RUNS-01',
            sampleCode: 'SMP-A',
            positionInRun: 1,
            status: 'TESTED',
            createdAt: now,
            updatedAt: now,
          },
        ],
        testRuns: [
          {
            id: 'TR-01',
            kodePengujianId: 'KP-RUNS-01',
            sampleId: 'SMP-01',
            recipeId: 'rec-01',
            recipeSnapshot: { name: 'Standard Actuation', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            fixture: 'nominal-01',
            operatorId,
            operatorName: 'Operator One',
            status: 'ANALYZING',
            notes: 'Run 1 captured',
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
        sync: { status: 'pending', localUpdatedAt: now },
      },
      mediaManifest: [],
      pushedAt: now,
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-RUNS-01/sync',
      headers: { cookie: sessionCookie },
      payload,
    });
    expect(syncRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/kode-pengujian/KP-RUNS-01',
      headers: { cookie: sessionCookie },
    });
    const kp = getRes.json();
    expect(kp.samples).toHaveLength(1);
    expect(kp.samples[0].id).toBe('SMP-01');
    expect(kp.samples[0].status).toBe('TESTED');
    expect(kp.testRuns).toHaveLength(1);
    expect(kp.testRuns[0].id).toBe('TR-01');
    expect(kp.testRuns[0].status).toBe('ANALYZING');
    expect(kp.testRuns[0].setpoints.forceSetpointN).toBe(25);
  });

  it('4. finalized result persistence stores immutable final report', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const now = new Date().toISOString();
    const payload: RemoteSyncPayload = {
      kp: {
        id: 'KP-FINAL-01',
        status: 'ACTIVE',
        productId: 'prod-01',
        productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
        operatorId,
        operatorName: 'Operator One',
        samples: [
          {
            id: 'SMP-01',
            kodePengujianId: 'KP-FINAL-01',
            positionInRun: 1,
            status: 'TESTED',
            createdAt: now,
            updatedAt: now,
          },
        ],
        testRuns: [
          {
            id: 'TR-01',
            kodePengujianId: 'KP-FINAL-01',
            sampleId: 'SMP-01',
            recipeId: 'rec-01',
            recipeSnapshot: { name: 'Standard', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            fixture: 'nominal-01',
            operatorId,
            operatorName: 'Operator One',
            status: 'FINALIZED',
            finalReport: mockFinalReport,
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
        sync: { status: 'pending', localUpdatedAt: now },
      },
      mediaManifest: [],
      pushedAt: now,
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-FINAL-01/sync',
      headers: { cookie: sessionCookie },
      payload,
    });
    expect(syncRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/kode-pengujian/KP-FINAL-01',
      headers: { cookie: sessionCookie },
    });
    const kp = getRes.json();
    const tr = kp.testRuns[0];
    expect(tr.status).toBe('FINALIZED');
    expect(tr.finalReport).toBeDefined();
    expect(tr.finalReport.side.sprayLength.final).toBe(85.2);
    expect(tr.finalReport.side.sprayAngle.final).toBe(42.5);
    expect(tr.finalReport.finalizedBy).toBe('Operator One');
  });

  it('5. finalized result cannot be overwritten or demoted server-side', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const now = new Date().toISOString();
    // 1. First sync with FINALIZED report
    const initialPayload: RemoteSyncPayload = {
      kp: {
        id: 'KP-IMMUTABLE-01',
        status: 'ACTIVE',
        productId: 'prod-01',
        productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
        operatorId,
        operatorName: 'Operator One',
        samples: [],
        testRuns: [
          {
            id: 'TR-IMM-01',
            kodePengujianId: 'KP-IMMUTABLE-01',
            sampleId: 'SMP-01',
            recipeId: 'rec-01',
            recipeSnapshot: { name: 'Standard', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            fixture: 'nominal-01',
            operatorId,
            operatorName: 'Operator One',
            status: 'FINALIZED',
            finalReport: mockFinalReport,
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
        sync: { status: 'pending', localUpdatedAt: now },
      },
      mediaManifest: [],
      pushedAt: now,
    };

    await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-IMMUTABLE-01/sync',
      headers: { cookie: sessionCookie },
      payload: initialPayload,
    });

    // 2. Attempt to demote status back to PENDING
    const demotePayload: RemoteSyncPayload = {
      ...initialPayload,
      kp: {
        ...initialPayload.kp,
        testRuns: [
          {
            ...initialPayload.kp.testRuns[0],
            status: 'PENDING',
          },
        ],
      },
    };

    const demoteRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-IMMUTABLE-01/sync',
      headers: { cookie: sessionCookie },
      payload: demotePayload,
    });

    expect(demoteRes.statusCode).toBe(409);
    const demoteBody = demoteRes.json();
    expect(demoteBody.success).toBe(false);
    expect(demoteBody.error).toContain('Finalized TestRun TR-IMM-01 is immutable');

    // 3. Attempt to alter final report values
    const alterPayload: RemoteSyncPayload = {
      ...initialPayload,
      kp: {
        ...initialPayload.kp,
        testRuns: [
          {
            ...initialPayload.kp.testRuns[0],
            finalReport: {
              ...mockFinalReport,
              side: {
                ...mockFinalReport.side,
                sprayLength: { auto: 85.2, final: 999.9, adjusted: true },
              },
            },
          },
        ],
      },
    };

    const alterRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-IMMUTABLE-01/sync',
      headers: { cookie: sessionCookie },
      payload: alterPayload,
    });

    expect(alterRes.statusCode).toBe(409);
    const alterBody = alterRes.json();
    expect(alterBody.success).toBe(false);
    expect(alterBody.error).toContain('Finalized report for TestRun TR-IMM-01 cannot be altered');
  });

  it('6. stale revision conflict: server rejects stale version updates', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const now = new Date().toISOString();
    const payload: RemoteSyncPayload = {
      kp: {
        id: 'KP-STALE-01',
        status: 'ACTIVE',
        productId: 'prod-01',
        productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
        operatorId,
        operatorName: 'Operator One',
        samples: [],
        testRuns: [],
        createdAt: now,
        updatedAt: now,
        sync: { status: 'pending', localUpdatedAt: now },
      },
      mediaManifest: [],
      pushedAt: now,
    };

    // First push creates version 1
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-STALE-01/sync',
      headers: { cookie: sessionCookie },
      payload,
    });
    expect(res1.statusCode).toBe(200);

    // Patch KP to increment server version to 2
    await app.inject({
      method: 'PATCH',
      url: '/api/kode-pengujian/KP-STALE-01',
      headers: { cookie: sessionCookie },
      payload: { notes: 'Updated on server', version: 1 },
    });

    // Attempt sync with stale version 1
    const stalePayload: RemoteSyncPayload = {
      ...payload,
      kp: {
        ...payload.kp,
        notes: 'Local update from stale client',
        sync: { ...payload.kp.sync, localUpdatedAt: new Date().toISOString() },
        version: 1,
      } as typeof payload.kp & { version: number },
    };

    const staleRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-STALE-01/sync',
      headers: { cookie: sessionCookie },
      payload: stalePayload,
    });

    expect(staleRes.statusCode).toBe(409);
    const body = staleRes.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Version conflict');
    expect(body.conflicts[0].entity).toBe('kodePengujian');
  });

  it('7. media references persist without sending or storing binary Blobs', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const now = new Date().toISOString();
    const payload: RemoteSyncPayload = {
      kp: {
        id: 'KP-MEDIA-01',
        status: 'ACTIVE',
        productId: 'prod-01',
        productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
        operatorId,
        operatorName: 'Operator One',
        samples: [],
        testRuns: [
          {
            id: 'TR-MEDIA-01',
            kodePengujianId: 'KP-MEDIA-01',
            sampleId: 'SMP-01',
            recipeId: 'rec-01',
            recipeSnapshot: { name: 'Standard', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            fixture: 'nominal-01',
            operatorId,
            operatorName: 'Operator One',
            status: 'ANALYZING',
            captureSession: {
              scenario: 'nominal-01',
              startedAt: now,
              realSideFrames: [
                { frameIndex: 1, capturedAt: now, assetId: 'asset-frame-01' },
                { frameIndex: 2, capturedAt: now, assetId: 'asset-frame-02' },
              ],
              realSideVideo: {
                assetId: 'asset-video-01',
                mimeType: 'video/webm',
                sizeBytes: 1024 * 250,
                durationMs: 400,
                startedAt: now,
              },
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
        sync: { status: 'pending', localUpdatedAt: now },
      },
      mediaManifest: [
        {
          assetId: 'asset-frame-01',
          kind: 'frame',
          mimeType: 'image/jpeg',
          sizeBytes: 51200,
          scope: { kind: 'testRun', kpId: 'KP-MEDIA-01', sampleId: 'SMP-01', runId: 'TR-MEDIA-01' },
          localCreatedAt: now,
        },
        {
          assetId: 'asset-video-01',
          kind: 'video',
          mimeType: 'video/webm',
          sizeBytes: 256000,
          scope: { kind: 'testRun', kpId: 'KP-MEDIA-01', sampleId: 'SMP-01', runId: 'TR-MEDIA-01' },
          localCreatedAt: now,
        },
      ],
      pushedAt: now,
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-MEDIA-01/sync',
      headers: { cookie: sessionCookie },
      payload,
    });

    expect(syncRes.statusCode).toBe(200);
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/kode-pengujian/KP-MEDIA-01',
      headers: { cookie: sessionCookie },
    });
    const kp = getRes.json();
    const session = kp.testRuns[0].captureSession;
    expect(session.realSideFrames[0].assetId).toBe('asset-frame-01');
    expect(session.realSideVideo.assetId).toBe('asset-video-01');
    // Ensure no binary base64 or blob data was stored
    expect(JSON.stringify(kp)).not.toContain('data:image');
    expect(JSON.stringify(kp)).not.toContain('data:video');
  });

  it('8. isolation: one KP does not affect another and operator cannot access others KP', async () => {
    const app = await buildApp({ authRepository: authRepo, kpRepository: kpRepo });

    const now = new Date().toISOString();
    // Operator 1 creates KP-A
    await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-A/sync',
      headers: { cookie: sessionCookie },
      payload: {
        kp: {
          id: 'KP-A',
          status: 'ACTIVE',
          productId: 'prod-01',
          productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
          operatorId,
          operatorName: 'Operator One',
          samples: [],
          testRuns: [],
          createdAt: now,
          updatedAt: now,
          sync: { status: 'pending', localUpdatedAt: now },
        },
        mediaManifest: [],
        pushedAt: now,
      },
    });

    // Operator 2 logs in
    const op2Login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'other@spraybot.local', password: 'password123' },
    });
    const op2Cookie = `spraybot_session=${op2Login.cookies.find(c => c.name === 'spraybot_session')?.value}`;

    // Operator 2 attempts to view Operator 1's KP
    const forbiddenGet = await app.inject({
      method: 'GET',
      url: '/api/kode-pengujian/KP-A',
      headers: { cookie: op2Cookie },
    });
    expect(forbiddenGet.statusCode).toBe(403);

    // Operator 2 cannot sync or overwrite Operator 1's KP
    const forbiddenSync = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian/KP-A/sync',
      headers: { cookie: op2Cookie },
      payload: {
        kp: {
          id: 'KP-A',
          status: 'ACTIVE',
          productId: 'prod-01',
          productSnapshot: { productCode: 'P-01', productName: 'Paragon Spray 100ml' },
          operatorId: otherOperatorId,
          operatorName: 'Operator Two',
          samples: [],
          testRuns: [],
          createdAt: now,
          updatedAt: now,
          sync: { status: 'pending', localUpdatedAt: now },
        },
        mediaManifest: [],
        pushedAt: now,
      },
    });
    expect(forbiddenSync.statusCode).toBe(403);
  });
});
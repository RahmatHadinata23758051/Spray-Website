import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import argon2 from 'argon2';
import { PostgresKodePengujianRepository } from '../data/postgres/repositories/kodePengujianRepository';
import { PostgresAuthRepository } from '../data/postgres/repositories/authRepository';
import { buildApp } from '../app';
import { users } from '../data/postgres/schema';
import type { RemoteSyncPayload } from '@spray-paragon/contracts';
import type { FinalAnalysisReport } from '@spray-paragon/domain';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/spraybot';

describe('Real PostgreSQL Integration & Verification (P6.1)', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repo: PostgresKodePengujianRepository;
  let authRepo: PostgresAuthRepository;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let sessionCookieA: string;
  let sessionCookieB: string;

  const userA = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'operator-a@spraybot.local',
    displayName: 'Operator A',
    role: 'operator' as const,
  };

  const userB = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'operator-b@spraybot.local',
    displayName: 'Operator B',
    role: 'operator' as const,
  };

  const mockFinalReport: FinalAnalysisReport = {
    status: 'finalized',
    analysisSource: 'simulation',
    perspectives: ['side', 'front'],
    test: {
      testId: 'TR-REAL-01',
      sampleId: 'SMP-REAL-01',
      product: { productCode: 'PRD-REAL', productName: 'Paragon Spray Real' },
      recipe: { name: 'Standard Actuation', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
      operator: 'Operator A',
      testTimestamp: '2026-10-27T10:00:00.000Z',
      setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
    },
    testId: 'TR-REAL-01',
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
        calibratedAt: '2026-10-27T10:00:00.000Z',
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
    finalizedBy: 'Operator A',
    finalizedAt: '2026-10-27T10:05:00.000Z',
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'secret-key-at-least-32-characters-long!';
    process.env.DATABASE_URL = DATABASE_URL;

    client = postgres(DATABASE_URL);
    db = drizzle(client);
    repo = new PostgresKodePengujianRepository(db as unknown as typeof import('../data/postgres/client').db);
    authRepo = new PostgresAuthRepository(db as unknown as typeof import('../data/postgres/client').db);

    // Clean tables before test run
    await client`DELETE FROM media_references`;
    await client`DELETE FROM final_results`;
    await client`DELETE FROM test_runs`;
    await client`DELETE FROM samples`;
    await client`DELETE FROM kode_pengujian`;
    await client`DELETE FROM sessions`;
    await client`DELETE FROM users`;

    // Seed test users
    const passwordHash = await argon2.hash('password123');
    await db.insert(users).values([
      {
        id: userA.id,
        email: userA.email,
        displayName: userA.displayName,
        passwordHash,
        role: userA.role,
        isActive: true,
      },
      {
        id: userB.id,
        email: userB.email,
        displayName: userB.displayName,
        passwordHash,
        role: userB.role,
        isActive: true,
      },
    ]);

    app = await buildApp({
      authRepository: authRepo,
      kpRepository: repo,
      db: db as unknown as typeof import('../data/postgres/client').db,
    });

    // Login user A
    const loginResA = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: userA.email, password: 'password123' },
    });
    sessionCookieA = loginResA.headers['set-cookie'] as string;

    // Login user B
    const loginResB = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: userB.email, password: 'password123' },
    });
    sessionCookieB = loginResB.headers['set-cookie'] as string;
  });

  afterAll(async () => {
    await app.close();
    await client.end();
  });

  it('1. Persistence Roundtrip: create KP, Sample, TestRun, sync to PostgreSQL and read back from fresh repository', async () => {
    const kpId = 'KP-REAL-ROUNDTRIP-01';
    const sampleId = 'SMP-REAL-ROUNDTRIP-01';
    const testRunId = 'TR-REAL-ROUNDTRIP-01';

    const now = new Date().toISOString();
    const payload: RemoteSyncPayload = {
      kp: {
        id: kpId,
        status: 'ACTIVE',
        productId: 'PRD-MIST-01',
        productSnapshot: { productCode: 'PRD-MIST-01', productName: 'Hydra Mist 50ml' },
        defaultRecipeId: 'rcp-1',
        defaultRecipeSnapshot: { name: 'Methodology A', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 10 },
        productLot: 'LOT-2026-X',
        testPeriod: 'Initial Release',
        operatorId: userA.id,
        operatorName: userA.displayName,
        calculationStandard: 'standard-a',
        storageCondition: 'ambient',
        bottlePosition: 'upright',
        notes: 'Roundtrip real test',
        createdAt: now,
        updatedAt: now,
        version: 1,
        sync: {
          status: 'local',
          localUpdatedAt: now,
          serverUpdatedAt: now,
          retryCount: 0,
        },
        samples: [
          {
            id: sampleId,
            kodePengujianId: kpId,
            sampleCode: 'SMP-001',
            positionInRun: 1,
            status: 'CREATED',
            createdAt: now,
            updatedAt: now,
          },
        ],
        testRuns: [
          {
            id: testRunId,
            kodePengujianId: kpId,
            sampleId,
            recipeId: 'rcp-1',
            recipeSnapshot: { name: 'Methodology A', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 10 },
            setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 10 },
            fixture: 'nominal-01',
            operatorId: userA.id,
            operatorName: userA.displayName,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      mediaManifest: [],
      pushedAt: now,
    };

    // Sync via HTTP Fastify API endpoint with session cookie
    const syncRes = await app.inject({
      method: 'POST',
      url: `/api/kode-pengujian/${kpId}/sync`,
      headers: { cookie: sessionCookieA },
      payload,
    });

    expect(syncRes.statusCode).toBe(200);
    const syncBody = JSON.parse(syncRes.payload);
    expect(syncBody.success).toBe(true);

    // Instantiate a brand-new repository instance pointing to the same Postgres DB
    const freshRepo = new PostgresKodePengujianRepository(db as unknown as typeof import('../data/postgres/client').db);
    const restoredKp = await freshRepo.get(kpId);

    expect(restoredKp).not.toBeNull();
    expect(restoredKp?.id).toBe(kpId);
    expect(restoredKp?.productId).toBe('PRD-MIST-01');
    expect(restoredKp?.productSnapshot.productName).toBe('Hydra Mist 50ml');
    expect(restoredKp?.defaultRecipeSnapshot?.name).toBe('Methodology A');
    expect(restoredKp?.samples).toHaveLength(1);
    expect(restoredKp?.samples[0].id).toBe(sampleId);
    expect(restoredKp?.samples[0].sampleCode).toBe('SMP-001');
    expect(restoredKp?.testRuns).toHaveLength(1);
    expect(restoredKp?.testRuns[0].id).toBe(testRunId);
    expect(restoredKp?.testRuns[0].recipeSnapshot.forceSetpointN).toBe(20);
    expect(restoredKp?.testRuns[0].fixture).toBe('nominal-01');
  });

  it('2. Optimistic Concurrency: version conflict on stale write against Real Postgres', async () => {
    const kpId = 'KP-REAL-CONCURRENCY-01';

    // 1. Create KP
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian',
      headers: { cookie: sessionCookieA },
      payload: {
        id: kpId,
        productId: 'PRD-MIST-01',
        productSnapshot: { productCode: 'PRD-MIST-01', productName: 'Hydra Mist 50ml' },
      },
    });
    expect(createRes.statusCode).toBe(201);

    // Client A and Client B read version 1
    const readA = await app.inject({
      method: 'GET',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieA },
    });
    const kpDataA = JSON.parse(readA.payload);
    expect(kpDataA.version).toBe(1);

    // Client A updates with version 1 -> server updates to version 2
    const patchResA = await app.inject({
      method: 'PATCH',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieA },
      payload: {
        version: 1,
        notes: 'Updated by Client A',
      },
    });
    expect(patchResA.statusCode).toBe(200);

    // Client B attempts stale update using original version 1
    const patchResB = await app.inject({
      method: 'PATCH',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieA },
      payload: {
        version: 1, // Stale!
        notes: 'Conflicting update by Client B',
      },
    });
    expect(patchResB.statusCode).toBe(409);
    const errorBody = JSON.parse(patchResB.payload);
    expect(errorBody.code).toBe('VERSION_CONFLICT');

    // Verify server state preserved Client A's update
    const freshRead = await app.inject({
      method: 'GET',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieA },
    });
    const freshData = JSON.parse(freshRead.payload);
    expect(freshData.notes).toBe('Updated by Client A');
    expect(freshData.version).toBe(2);

    // Fresh retry with updated version 2 succeeds
    const retryRes = await app.inject({
      method: 'PATCH',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieA },
      payload: {
        version: 2,
        notes: 'Retry with fresh version succeeded',
      },
    });
    expect(retryRes.statusCode).toBe(200);
  });

  it('3. FINALIZED Server Immutability: rejected mutations on finalized TestRun and final results', async () => {
    const kpId = 'KP-REAL-IMMUTABLE-01';
    const sampleId = 'SMP-REAL-IMMUTABLE-01';
    const testRunId = 'TR-REAL-IMMUTABLE-01';

    const now = new Date().toISOString();
    // 1. Create KP, sample, test run and finalize it
    const payload: RemoteSyncPayload = {
      kp: {
        id: kpId,
        status: 'ACTIVE',
        productId: 'PRD-MIST-01',
        productSnapshot: { productCode: 'PRD-MIST-01', productName: 'Hydra Mist 50ml' },
        operatorId: userA.id,
        operatorName: userA.displayName,
        createdAt: now,
        updatedAt: now,
        version: 1,
        sync: {
          status: 'local',
          localUpdatedAt: now,
          serverUpdatedAt: now,
          retryCount: 0,
        },
        samples: [
          {
            id: sampleId,
            kodePengujianId: kpId,
            sampleCode: 'SMP-IMMUTABLE',
            positionInRun: 1,
            status: 'TESTED',
            createdAt: now,
            updatedAt: now,
          },
        ],
        testRuns: [
          {
            id: testRunId,
            kodePengujianId: kpId,
            sampleId,
            recipeId: 'rcp-1',
            recipeSnapshot: { name: 'Standard Actuation', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            fixture: 'nominal-01',
            operatorId: userA.id,
            operatorName: userA.displayName,
            status: 'FINALIZED',
            finalReport: mockFinalReport,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      mediaManifest: [],
      pushedAt: now,
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: `/api/kode-pengujian/${kpId}/sync`,
      headers: { cookie: sessionCookieA },
      payload,
    });
    expect(syncRes.statusCode).toBe(200);

    // Check Postgres final_results table was populated
    const frRows = await client`SELECT * FROM final_results WHERE test_run_id = ${testRunId}`;
    expect(frRows).toHaveLength(1);
    expect(frRows[0].analysis_source).toBe('simulation');

    // Attempt 1: Try to demote status via API PATCH
    const demoteRes = await app.inject({
      method: 'PATCH',
      url: `/api/kode-pengujian/${kpId}/test-runs/${testRunId}`,
      headers: { cookie: sessionCookieA },
      payload: {
        version: 1,
        status: 'ANALYZING',
      },
    });
    expect(demoteRes.statusCode).toBe(409);

    // Attempt 2: Try to alter recipe setpoints via API PATCH
    const setpointsRes = await app.inject({
      method: 'PATCH',
      url: `/api/kode-pengujian/${kpId}/test-runs/${testRunId}`,
      headers: { cookie: sessionCookieA },
      payload: {
        version: 1,
        setpoints: { forceSetpointN: 99, pressDurationMs: 999, strokeMm: 99 },
      },
    });
    expect(setpointsRes.statusCode).toBe(409);

    // Attempt 3: Try to alter final report via sync payload
    const alteredPayload: RemoteSyncPayload = {
      ...payload,
      kp: {
        ...payload.kp,
        testRuns: [
          {
            ...payload.kp.testRuns[0],
            finalReport: {
              ...mockFinalReport,
              side: {
                ...mockFinalReport.side,
                sprayLength: { auto: 999, final: 999, adjusted: true },
              },
            },
          },
        ],
      },
    };

    const conflictSync = await app.inject({
      method: 'POST',
      url: `/api/kode-pengujian/${kpId}/sync`,
      headers: { cookie: sessionCookieA },
      payload: alteredPayload,
    });
    expect(conflictSync.statusCode).toBe(409);
    const conflictBody = JSON.parse(conflictSync.payload);
    expect(conflictBody.success).toBe(false);
  });

  it('4. Cascade & Delete Audit: Foreign key prevents deletion of Sample or TestRun with FINALIZED results', async () => {
    const testRunId = 'TR-REAL-IMMUTABLE-01';
    const sampleId = 'SMP-REAL-IMMUTABLE-01';

    // Direct database level check: RESTRICT foreign key blocks deleting sample or testRun when final_results exist
    await expect(async () => {
      await client`DELETE FROM test_runs WHERE id = ${testRunId}`;
    }).rejects.toThrow(/violates foreign key constraint/);

    await expect(async () => {
      await client`DELETE FROM samples WHERE id = ${sampleId}`;
    }).rejects.toThrow(/violates foreign key constraint/);
  });

  it('5. Authorization: unauthenticated rejected, and Operator A cannot access or mutate Operator B data', async () => {
    const kpId = 'KP-REAL-AUTH-01';

    // 1. Unauthenticated request rejected
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/api/kode-pengujian',
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Create KP for Operator A
    const createA = await app.inject({
      method: 'POST',
      url: '/api/kode-pengujian',
      headers: { cookie: sessionCookieA },
      payload: {
        id: kpId,
        productId: 'PRD-MIST-01',
        productSnapshot: { productCode: 'PRD-MIST-01', productName: 'Hydra Mist 50ml' },
      },
    });
    expect(createA.statusCode).toBe(201);

    // 3. Operator B attempts to read Operator A's KP
    const readB = await app.inject({
      method: 'GET',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieB },
    });
    expect(readB.statusCode).toBe(403);

    // 4. Operator B attempts to mutate Operator A's KP
    const patchB = await app.inject({
      method: 'PATCH',
      url: `/api/kode-pengujian/${kpId}`,
      headers: { cookie: sessionCookieB },
      payload: {
        version: 1,
        notes: 'Malicious modification by Operator B',
      },
    });
    expect(patchB.statusCode).toBe(403);

    const authNow = new Date().toISOString();
    // 5. Operator B attempts to push sync on Operator A's KP
    const syncB = await app.inject({
      method: 'POST',
      url: `/api/kode-pengujian/${kpId}/sync`,
      headers: { cookie: sessionCookieB },
      payload: {
        kp: {
          id: kpId,
          status: 'ACTIVE',
          productId: 'PRD-MIST-01',
          productSnapshot: { productCode: 'PRD-MIST-01', productName: 'Hydra Mist 50ml' },
          operatorId: userB.id,
          operatorName: userB.displayName,
          createdAt: authNow,
          updatedAt: authNow,
          version: 1,
          sync: {
            status: 'local',
            localUpdatedAt: authNow,
            serverUpdatedAt: authNow,
            retryCount: 0,
          },
          samples: [],
          testRuns: [],
        },
        mediaManifest: [],
        pushedAt: authNow,
      },
    });
    expect(syncB.statusCode).toBe(403);
  });

  it('6. Media References: DB stores only metadata (assetId, kind, mimeType, sizeBytes) without Blobs or Base64', async () => {
    const kpId = 'KP-REAL-MEDIA-01';
    const sampleId = 'SMP-REAL-MEDIA-01';
    const testRunId = 'TR-REAL-MEDIA-01';
    const assetId = 'asset-side-f005-test';

    const mediaNow = new Date().toISOString();
    const payload: RemoteSyncPayload = {
      kp: {
        id: kpId,
        status: 'ACTIVE',
        productId: 'PRD-MIST-01',
        productSnapshot: { productCode: 'PRD-MIST-01', productName: 'Hydra Mist 50ml' },
        operatorId: userA.id,
        operatorName: userA.displayName,
        createdAt: mediaNow,
        updatedAt: mediaNow,
        version: 1,
        sync: {
          status: 'local',
          localUpdatedAt: mediaNow,
          serverUpdatedAt: mediaNow,
          retryCount: 0,
        },
        samples: [
          {
            id: sampleId,
            kodePengujianId: kpId,
            sampleCode: 'SMP-MEDIA',
            positionInRun: 1,
            status: 'TESTED',
            createdAt: mediaNow,
            updatedAt: mediaNow,
          },
        ],
        testRuns: [
          {
            id: testRunId,
            kodePengujianId: kpId,
            sampleId,
            recipeId: 'rcp-1',
            recipeSnapshot: { name: 'Standard Actuation', forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            setpoints: { forceSetpointN: 25, pressDurationMs: 400, strokeMm: 12 },
            fixture: 'nominal-01',
            operatorId: userA.id,
            operatorName: userA.displayName,
            status: 'FINALIZED',
            finalReport: mockFinalReport,
            createdAt: mediaNow,
            updatedAt: mediaNow,
          },
        ],
      },
      mediaManifest: [
        {
          assetId,
          kind: 'frame',
          mimeType: 'image/jpeg',
          sizeBytes: 45120,
          scope: {
            kind: 'testRun',
            kpId,
            sampleId,
            runId: testRunId,
          },
          localCreatedAt: '2026-10-27T10:02:00.000Z',
        },
      ],
      pushedAt: mediaNow,
    };

    const syncRes = await app.inject({
      method: 'POST',
      url: `/api/kode-pengujian/${kpId}/sync`,
      headers: { cookie: sessionCookieA },
      payload,
    });
    expect(syncRes.statusCode).toBe(200);

    // Verify row in media_references table
    const mediaRows = await client`SELECT * FROM media_references WHERE asset_id = ${assetId}`;
    expect(mediaRows).toHaveLength(1);
    const mediaRow = mediaRows[0];
    expect(mediaRow.test_run_id).toBe(testRunId);
    expect(mediaRow.asset_id).toBe(assetId);
    expect(mediaRow.kind).toBe('frame');
    expect(mediaRow.mime_type).toBe('image/jpeg');
    expect(mediaRow.size_bytes).toBe(45120);

    // Verify that NO blob or base64 columns exist on media_references
    const columns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'media_references'
    `;
    const columnNames = columns.map(c => c.column_name);
    expect(columnNames).not.toContain('blob');
    expect(columnNames).not.toContain('data');
    expect(columnNames).not.toContain('payload');
    expect(columnNames).not.toContain('binary');
    expect(columnNames).not.toContain('base64');
  });
});

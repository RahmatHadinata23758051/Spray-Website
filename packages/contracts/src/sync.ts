import { z } from 'zod';

/**
 * Synchronization status for entities that participate in hybrid sync.
 * - local: only exists locally, never synced
 * - pending: local changes waiting for successful sync
 * - synced: local state matches server
 * - failed: sync attempted but failed
 */
export const SyncStateSchema = z.enum([
  'local',
  'pending',
  'synced',
  'failed',
]);

export type SyncState = z.infer<typeof SyncStateSchema>;

export const SyncMetadataSchema = z.object({
  status: SyncStateSchema,
  localUpdatedAt: z.string().datetime(),
  serverUpdatedAt: z.string().datetime().optional(),
  lastSyncError: z.string().optional(),
  retryCount: z.number().int().nonnegative().optional(),
});

export type SyncMetadata = z.infer<typeof SyncMetadataSchema>;

/**
 * Media descriptor for remote sync - references asset IDs only, never binary data.
 */
export const RemoteMediaDescriptorSchema = z.object({
  assetId: z.string(),
  kind: z.enum(['frame', 'video']),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  scope: z.object({
    kind: z.enum(['testRun']),
    kpId: z.string(),
    sampleId: z.string(),
    runId: z.string(),
  }),
  localCreatedAt: z.string().datetime(),
});

export type RemoteMediaDescriptor = z.infer<typeof RemoteMediaDescriptorSchema>;

/**
 * Full sync payload for a KodePengujian aggregate.
 * Contains metadata + media manifest (no binary blobs).
 */
export const RemoteSyncPayloadSchema = z.object({
  kp: z.object({
    id: z.string(),
    status: z.string(),
    productId: z.string(),
    productSnapshot: z.object({
      productCode: z.string(),
      productName: z.string(),
    }),
    defaultRecipeId: z.string().optional(),
    defaultRecipeSnapshot: z
      .object({
        name: z.string(),
        forceSetpointN: z.number(),
        pressDurationMs: z.number(),
        strokeMm: z.number(),
      })
      .optional(),
    productLot: z.string().optional(),
    testPeriod: z.string().optional(),
    operatorId: z.string(),
    operatorName: z.string(),
    calculationStandard: z.string().optional(),
    storageCondition: z.string().optional(),
    bottlePosition: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    samples: z.array(z.unknown()),
    testRuns: z.array(z.unknown()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.number().int().positive().optional(),
    sync: SyncMetadataSchema,
  }),
  mediaManifest: z.array(RemoteMediaDescriptorSchema),
  pushedAt: z.string().datetime(),
});

export type RemoteSyncPayload = z.infer<typeof RemoteSyncPayloadSchema>;

export const RemoteSyncResponseSchema = z.object({
  success: z.boolean(),
  serverUpdatedAt: z.string().datetime().optional(),
  conflicts: z
    .array(
      z.object({
        entity: z.enum(['kodePengujian', 'sample', 'testRun']),
        id: z.string(),
        serverVersion: z.unknown(),
        localVersion: z.unknown(),
        reason: z.string(),
      })
    )
    .optional(),
  mediaUploadUrls: z
    .record(z.string()) // assetId -> upload URL
    .optional(),
  error: z.string().optional(),
});

export type RemoteSyncResponse = z.infer<typeof RemoteSyncResponseSchema>;
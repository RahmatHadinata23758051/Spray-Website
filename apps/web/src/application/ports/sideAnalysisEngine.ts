import type { SideAnalysisRequest, SideAnalysisResponse } from '@spray-paragon/contracts';

/**
 * ============================================================
 * SIDE ANALYSIS ENGINE PORT
 * ============================================================
 * Application port for executing real Side analysis.
 * Implementation may call Python process, HTTP service, or message queue.
 * Presentation layer MUST NOT call Python/process directly.
 * ============================================================
 */

export interface SideAnalysisEngine {
  /**
   * Execute Side analysis for one or more source frames.
   * Returns results for all requested frames.
   *
   * @throws {SideAnalysisError} on service failure, invalid output, missing assets
   */
  analyze(request: SideAnalysisRequest): Promise<SideAnalysisResponse>;

  /**
   * Check if the analysis service is available.
   * Used for UI readiness indicators.
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Structured error codes for Side analysis failures.
 * Allows UI to present actionable messages and enable retry.
 */
export class SideAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'SERVICE_UNAVAILABLE'
      | 'INVALID_OUTPUT'
      | 'MISSING_ASSET'
      | 'STALE_REQUEST'
      | 'VALIDATION_FAILED'
      | 'PIPELINE_ERROR',
    public readonly cause?: Error,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SideAnalysisError';
  }
}

/**
 * No-op implementation for environments without analysis service.
 * Returns SERVICE_UNAVAILABLE — NOT for production use.
 */
export class UnavailableSideAnalysisEngine implements SideAnalysisEngine {
  async analyze(_request: SideAnalysisRequest): Promise<SideAnalysisResponse> {
    throw new SideAnalysisError(
      'Side analysis service not configured',
      'SERVICE_UNAVAILABLE'
    );
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
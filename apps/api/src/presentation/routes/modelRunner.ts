import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export interface FrameInferenceRequest {
  frameIndex: number;
  timestampMs: number;
  imageBase64: string;
}

export interface FrameInferenceResponse {
  frameIndex: number;
  timestampMs: number;
  plumeDetected: boolean;
  confidence: number;
  plumeAreaPx: number;
  bbox: [number, number, number, number] | null;
  maskImageUrl?: string;
  overlayImageUrl?: string;
  status: 'success' | 'error';
  modelUsed: string;
  message?: string;
}

interface PendingRequest {
  resolve: (res: FrameInferenceResponse) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'models', 'segmentation'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function getScriptPath(): string {
  const root = findProjectRoot();
  return path.join(root, 'models', 'segmentation', 'infer.py');
}

export class ModelRunner {
  private static instance: ModelRunner | null = null;
  private proc: ChildProcess | null = null;
  private stdoutBuffer = '';
  private isReady = false;
  private spawnPromise: Promise<void> | null = null;
  private requestQueue: PendingRequest[] = [];

  public static getInstance(): ModelRunner {
    if (!ModelRunner.instance) {
      ModelRunner.instance = new ModelRunner();
    }
    return ModelRunner.instance;
  }

  public getModelPath(): { exists: boolean; path: string; fileName: string } {
    const rootDir = findProjectRoot();
    const candidatePaths = [
      path.join(rootDir, 'models', 'segmentation', 'spraybot_seg_video_finetuned.pt'),
      path.join(rootDir, 'models', 'segmentation', 'model.pt'),
      path.join(rootDir, 'models', 'segmentation', 'model.onnx'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return { exists: true, path: p, fileName: path.basename(p) };
      }
    }

    return {
      exists: false,
      path: path.join(rootDir, 'models', 'segmentation', 'spraybot_seg_video_finetuned.pt'),
      fileName: 'spraybot_seg_video_finetuned.pt',
    };
  }

  public getStatus() {
    const modelInfo = this.getModelPath();
    const scriptPath = getScriptPath();
    const hasScript = fs.existsSync(scriptPath);

    return {
      modelFound: modelInfo.exists,
      modelFileName: modelInfo.fileName,
      architecture: 'YOLOv8s-seg',
      classNames: ['spray_plume'],
      imgsz: 1024,
      scriptFound: hasScript,
      isProcessWarm: this.isReady && this.proc !== null && !this.proc.killed,
      activeMode: modelInfo.exists ? 'yolo_finetuned' : 'cv_fallback_engine',
    };
  }

  private async ensureProcess(): Promise<void> {
    if (this.isReady && this.proc && !this.proc.killed) {
      return;
    }

    if (this.spawnPromise) {
      return this.spawnPromise;
    }

    this.spawnPromise = new Promise<void>((resolve, reject) => {
      const scriptPath = getScriptPath();
      const modelInfo = this.getModelPath();

      if (!fs.existsSync(scriptPath)) {
        this.spawnPromise = null;
        return reject(new Error(`Script infer.py tidak ditemukan di: ${scriptPath}`));
      }

      if (!modelInfo.exists) {
        this.spawnPromise = null;
        return reject(new Error(`File model .pt tidak ditemukan di: ${modelInfo.path}`));
      }

      const pythonCmd = process.env.PYTHON_PATH || 'python';
      const child = spawn(
        pythonCmd,
        [scriptPath, '--stdin', '--model-path', modelInfo.path],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );

      this.proc = child;
      this.stdoutBuffer = '';
      this.isReady = false;

      let startupTimer: NodeJS.Timeout | null = setTimeout(() => {
        startupTimer = null;
        this.cleanupProcess();
        reject(new Error('Waktu muat model Python melebihi batas (timeout 25 detik).'));
      }, 25000);

      child.stdout.on('data', (chunk: Buffer) => {
        this.stdoutBuffer += chunk.toString('utf-8');
        const lines = this.stdoutBuffer.split('\n');
        this.stdoutBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Check handshake line
          if (!this.isReady) {
            try {
              const handshake = JSON.parse(trimmed);
              if (handshake.status === 'ready') {
                this.isReady = true;
                if (startupTimer) {
                  clearTimeout(startupTimer);
                  startupTimer = null;
                }
                this.spawnPromise = null;
                resolve();
                continue;
              }
            } catch {
              // Ignore non-json startup logs
            }
          }

          // Handle response to queued requests
          const nextReq = this.requestQueue.shift();
          if (nextReq) {
            clearTimeout(nextReq.timer);
            try {
              const parsed = JSON.parse(trimmed) as FrameInferenceResponse;
              nextReq.resolve({
                ...parsed,
                modelUsed: modelInfo.fileName,
              });
            } catch (parseErr) {
              nextReq.reject(new Error(`Format respons JSON inferensi tidak valid: ${parseErr}`));
            }
          }
        }
      });

      child.stderr.on('data', (_chunk: Buffer) => {
        // Ultralytics prints warnings or loading messages to stderr; ignore or log if debugging
      });

      child.on('error', (err) => {
        if (startupTimer) {
          clearTimeout(startupTimer);
          startupTimer = null;
        }
        this.cleanupProcess();
        reject(err);
      });

      child.on('close', () => {
        if (startupTimer) {
          clearTimeout(startupTimer);
          startupTimer = null;
        }
        this.cleanupProcess();
      });
    });

    return this.spawnPromise;
  }

  private cleanupProcess() {
    this.isReady = false;
    this.spawnPromise = null;
    if (this.proc) {
      try {
        if (!this.proc.killed) {
          this.proc.kill();
        }
      } catch {
        // ignore
      }
      this.proc = null;
    }
    // Reject any remaining queued requests
    while (this.requestQueue.length > 0) {
      const req = this.requestQueue.shift();
      if (req) {
        clearTimeout(req.timer);
        req.reject(new Error('Proses inferensi Python terhenti tiba-tiba.'));
      }
    }
  }

  public async inferFrame(request: FrameInferenceRequest): Promise<FrameInferenceResponse> {
    await this.ensureProcess();

    const activeProc = this.proc;
    if (!activeProc || !activeProc.stdin || !this.isReady) {
      throw new Error('Inference process tidak siap menerima request.');
    }

    const procStdin = activeProc.stdin;

    return new Promise<FrameInferenceResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.requestQueue.findIndex((q) => q.resolve === resolve);
        if (idx !== -1) {
          this.requestQueue.splice(idx, 1);
        }
        reject(new Error(`Inference frame ${request.frameIndex} timeout (15 detik)`));
      }, 15000);

      this.requestQueue.push({ resolve, reject, timer });

      try {
        const payload = JSON.stringify({
          frameIndex: request.frameIndex,
          timestampMs: request.timestampMs,
          imageBase64: request.imageBase64,
        }) + '\n';
        procStdin.write(payload);
      } catch (err) {
        clearTimeout(timer);
        const idx = this.requestQueue.findIndex((q) => q.resolve === resolve);
        if (idx !== -1) {
          this.requestQueue.splice(idx, 1);
        }
        reject(err as Error);
      }
    });
  }

  public shutdown() {
    if (this.proc && !this.proc.killed) {
      try {
        this.proc.stdin?.write('QUIT\n');
      } catch {
        // ignore
      }
    }
    this.cleanupProcess();
  }
}

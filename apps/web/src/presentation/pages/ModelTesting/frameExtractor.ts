export interface ExtractedRawFrame {
  frameIndex: number;
  timestampMs: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

export interface VideoMetadata {
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number;
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
}

export async function extractFramesFromVideo(
  videoFile: File,
  options: {
    targetFps?: number;
    maxFrames?: number;
    onProgress?: (percent: number, current: number, total: number) => void;
  } = {}
): Promise<{ metadata: VideoMetadata; frames: ExtractedRawFrame[] }> {
  const targetFps = options.targetFps ?? 20; // 20 frames per second = 50ms interval
  const maxFrames = options.maxFrames ?? 60; // Max 60 frames for optimal client responsiveness

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    video.onloadedmetadata = async () => {
      try {
        const duration = Math.max(0.5, video.duration || 3);
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        // Calculate total frames to sample
        const theoreticalFrames = Math.floor(duration * targetFps);
        const totalFrames = Math.min(maxFrames, Math.max(5, theoreticalFrames));
        const intervalSeconds = duration / totalFrames;

        const metadata: VideoMetadata = {
          fileName: videoFile.name,
          fileSizeBytes: videoFile.size,
          durationSeconds: Number(duration.toFixed(2)),
          fps: targetFps,
          totalFrames,
          width,
          height,
        };

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context is not available');
        }

        const extractedFrames: ExtractedRawFrame[] = [];

        for (let i = 0; i < totalFrames; i++) {
          const targetTime = i * intervalSeconds;
          
          await new Promise<void>((seekResolve, seekReject) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onSeekError);
              seekResolve();
            };
            const onSeekError = (e: Event) => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onSeekError);
              seekReject(e);
            };

            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onSeekError);
            video.currentTime = targetTime;
          });

          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, width, height);

          // Clone to persistent canvas for this frame
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = width;
          frameCanvas.height = height;
          const frameCtx = frameCanvas.getContext('2d')!;
          frameCtx.drawImage(canvas, 0, 0);

          const dataUrl = frameCanvas.toDataURL('image/jpeg', 0.85);

          extractedFrames.push({
            frameIndex: i,
            timestampMs: Math.round(targetTime * 1000),
            canvas: frameCanvas,
            dataUrl,
          });

          if (options.onProgress) {
            const percent = Math.round(((i + 1) / totalFrames) * 100);
            options.onProgress(percent, i + 1, totalFrames);
          }
        }

        URL.revokeObjectURL(objectUrl);
        resolve({ metadata, frames: extractedFrames });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = (_e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load video file: ${videoFile.name}`));
    };
  });
}

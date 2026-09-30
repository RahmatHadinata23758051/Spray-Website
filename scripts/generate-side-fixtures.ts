import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const width = 960;
const height = 480;
const outDir = path.resolve('public/fixtures');
fs.mkdirSync(outDir, { recursive: true });

type RGBA = [number, number, number, number];

function hash(x: number, y: number, seed = 0): number {
  let h = Math.imul(x + seed * 1013, 374761393) ^ Math.imul(y + seed * 1619, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x: number, y: number, scale: number, seed: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const tx = sx - x0;
  const ty = sy - y0;
  const ease = (v: number) => v * v * (3 - 2 * v);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  const u = ease(tx);
  const v = ease(ty);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function plumeField(x: number, y: number): number {
  const nozzleX = 146;
  const nozzleY = 255;
  const dx = x - nozzleX;
  if (dx < -4 || dx > 755) return 0;

  const progress = Math.max(0, Math.min(1, dx / 755));
  const center = nozzleY - 4 * progress + 10 * Math.sin(progress * 5.2) + 4 * (smoothNoise(x, 0, 90, 8) - 0.5);
  const halfWidth = 9 + 81 * Math.pow(progress, 0.72) + 10 * (smoothNoise(x, y, 78, 3) - 0.5);
  const radial = Math.abs(y - center) / Math.max(1, halfWidth);
  const core = Math.max(0, 1 - radial * radial);
  const edge = (smoothNoise(x, y, 17, 11) - 0.5) * 0.34 + (smoothNoise(x, y, 43, 5) - 0.5) * 0.24;
  const taper = Math.pow(1 - progress, 0.42) * 0.82 + 0.12;
  return Math.max(0, core * taper + edge - progress * 0.035);
}

function maskPixel(x: number, y: number): RGBA {
  const background = 5 + Math.floor(hash(x, y, 31) * 4);
  let field = plumeField(x, y);
  const progress = Math.max(0, Math.min(1, (x - 146) / 755));
  const granular = smoothNoise(x, y, 5, 17) * 0.28 + smoothNoise(x, y, 12, 23) * 0.23;
  field += granular - 0.23 - progress * 0.06;

  const detached = [
    [265, 182, 4], [319, 324, 3], [405, 170, 5], [518, 343, 4], [605, 157, 3], [704, 334, 3], [777, 178, 2], [835, 310, 3],
  ].some(([cx, cy, radius]) => (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2);

  const foreground = field > 0.38 || detached;
  if (!foreground) return [background, background + 2, background + 3, 255];
  const speckle = Math.floor(hash(x, y, 47) * 38);
  const value = Math.min(244, 190 + speckle);
  return [value, value + 2, Math.min(255, value + 5), 255];
}

function originalPixel(x: number, y: number): RGBA {
  const vignette = Math.hypot((x - width / 2) / width, (y - height / 2) / height);
  const sensorNoise = (hash(x, y, 71) - 0.5) * 13 + (smoothNoise(x, y, 3, 73) - 0.5) * 5;
  let base = 15 - vignette * 8 + sensorNoise;
  let r = base * 0.78;
  let g = base * 0.93;
  let b = base * 1.08;

  // Subtle vertical experiment-wall banding.
  const band = Math.sin(x * 0.19) * 0.8 + Math.sin(x * 0.047) * 1.2;
  r += band; g += band; b += band;

  const field = plumeField(x, y);
  if (field > 0) {
    const grain = smoothNoise(x, y, 6, 41) * 0.48 + smoothNoise(x, y, 19, 43) * 0.36 + hash(x, y, 79) * 0.16;
    const progress = Math.max(0, Math.min(1, (x - 146) / 755));
    const density = Math.max(0, field * (0.56 + grain * 0.8) * (1 - progress * 0.36));
    r += 135 * density;
    g += 151 * density;
    b += 164 * density;
  }

  // Fine droplets, deterministic and sparse toward outer plume.
  if (x > 150 && x < 900) {
    const dropletNoise = hash(Math.floor(x / 2), Math.floor(y / 2), 97);
    const local = plumeField(x, y);
    if (local > 0.05 && dropletNoise > 0.987) {
      r += 90; g += 105; b += 116;
    }
  }

  return [clamp(r), clamp(g), clamp(b), 255];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function png(pixel: (x: number, y: number) => RGBA): Buffer {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (buffer: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
    return Buffer.concat([length, typeBuffer, data, checksum]);
  };

  const raw = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const value = pixel(x, y);
      raw[offset++] = value[0]; raw[offset++] = value[1]; raw[offset++] = value[2]; raw[offset++] = value[3];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync(path.join(outDir, 'side-original.png'), png(originalPixel));
fs.writeFileSync(path.join(outDir, 'side-mask.png'), png(maskPixel));
console.log('Generated deterministic side camera fixtures in public/fixtures');

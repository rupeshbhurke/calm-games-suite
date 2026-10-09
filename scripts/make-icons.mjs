// Generates the PWA icons (PNG) with no dependencies: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAGE = [0x9d, 0xb8, 0xa8];
const MIST = [0xee, 0xf3, 0xf1];
const SAND = [0xe6, 0xd5, 0xb8];

function crc32(buf) {
  let c;
  let crc = ~0;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Sage field with two mist rings and a sand stone; `scale` shrinks the art for maskable safe zones. */
function render(size, scale) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const c = size / 2;
  const unit = (size / 2) * scale;
  const ring = (d, radius, width) =>
    Math.min(1, Math.max(0, (width / 2 - Math.abs(d - radius)) * unit + 0.7));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / unit;
      const w = 0.07;
      let px = SAGE;
      const mix = (to, a) => (px = px.map((v, i) => Math.round(v + (to[i] - v) * a)));
      mix(MIST, ring(d, 0.78, w));
      mix(MIST, ring(d, 0.5, w));
      mix(SAND, Math.min(1, Math.max(0, (0.17 - d) * unit + 0.5)));
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, 0.92));
writeFileSync('public/icons/icon-512.png', render(512, 0.92));
writeFileSync('public/icons/icon-maskable-512.png', render(512, 0.62));
console.log('Icons written to public/icons');

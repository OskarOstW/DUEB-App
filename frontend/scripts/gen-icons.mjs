/**
 * gen-icons.mjs — erzeugt die PWA-Icons ohne externe Abhängigkeiten.
 *
 * Reines Node (zlib + manueller PNG-Encoder). Zeichnet das DUEB-Branding:
 * Navy-Hintergrund (#0d1b2a) mit rotem Kreuz (#be1622). Für maskable-Icons
 * bleibt das Kreuz in der inneren Safe-Zone (~60 %).
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const NAVY = [13, 27, 42, 255]; // #0d1b2a
const RED = [190, 22, 34, 255]; // #be1622

// --- CRC32 ---------------------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Scanlines mit Filterbyte 0.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Zeichnet Navy-BG + zentriertes rotes Kreuz. armRatio = halbe Balkenbreite / size. */
function draw(size, crossSpan) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const arm = size * crossSpan; // halbe Länge eines Kreuzarms
  const thick = size * crossSpan * 0.42; // halbe Balkenstärke

  const set = (x, y, rgba) => {
    const i = (y * size + x) * 4;
    px[i] = rgba[0];
    px[i + 1] = rgba[1];
    px[i + 2] = rgba[2];
    px[i + 3] = rgba[3];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x + 0.5 - cx);
      const dy = Math.abs(y + 0.5 - cy);
      const inVertical = dx <= thick && dy <= arm;
      const inHorizontal = dy <= thick && dx <= arm;
      set(x, y, inVertical || inHorizontal ? RED : NAVY);
    }
  }
  return px;
}

const targets = [
  { name: 'icon-192.png', size: 192, span: 0.32 },
  { name: 'icon-512.png', size: 512, span: 0.32 },
  { name: 'maskable-512.png', size: 512, span: 0.22 }, // Safe-Zone für maskable
  { name: 'apple-touch-icon-180.png', size: 180, span: 0.32 },
];

for (const t of targets) {
  const png = encodePng(t.size, draw(t.size, t.span));
  writeFileSync(join(OUT, t.name), png);
  console.log(`✓ ${t.name} (${t.size}×${t.size}, ${png.length} bytes)`);
}

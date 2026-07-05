// Genera icon-180.png e icon-512.png (ábaco estilizado, fondo oscuro) sin dependencias.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---- PNG mínimo ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function pngFromRGBA(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- dibujo ----
function draw(s) {
  const px = Buffer.alloc(s * s * 4);
  // fondo: degradado vertical oscuro
  for (let y = 0; y < s; y++) {
    const t = y / (s - 1);
    const r = Math.round(46 + (13 - 46) * t);
    const g = Math.round(46 + (13 - 46) * t);
    const b = Math.round(60 + (19 - 60) * t);
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  const over = (i, col, a) => {
    if (a <= 0) return;
    const iA = 1 - a;
    px[i]     = Math.round(col[0] * a + px[i] * iA);
    px[i + 1] = Math.round(col[1] * a + px[i + 1] * iA);
    px[i + 2] = Math.round(col[2] * a + px[i + 2] * iA);
  };
  // cápsula vertical: centro X, de Y0 a Y1, radio R (coords en píxeles)
  const capsule = (X, Y0, Y1, R, col, alpha = 1) => {
    const x0 = Math.max(0, Math.floor(X - R - 2)), x1 = Math.min(s - 1, Math.ceil(X + R + 2));
    const y0 = Math.max(0, Math.floor(Y0 - R - 2)), y1 = Math.min(s - 1, Math.ceil(Y1 + R + 2));
    for (let y = y0; y <= y1; y++) {
      const cy = Math.min(Math.max(y + 0.5, Y0), Y1);
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - X, y + 0.5 - cy) - R;
        const cov = Math.min(1, Math.max(0, 0.5 - d));
        over((y * s + x) * 4, col, cov * alpha);
      }
    }
  };
  const circle = (X, Y, R, col, alpha = 1) => {
    const x0 = Math.max(0, Math.floor(X - R - 2)), x1 = Math.min(s - 1, Math.ceil(X + R + 2));
    const y0 = Math.max(0, Math.floor(Y - R - 2)), y1 = Math.min(s - 1, Math.ceil(Y + R + 2));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - X, y + 0.5 - Y) - R;
        const cov = Math.min(1, Math.max(0, 0.5 - d));
        over((y * s + x) * 4, col, cov * alpha);
      }
    }
  };

  // varillas
  for (const rx of [0.28, 0.50, 0.72]) {
    capsule(rx * s, 0.18 * s, 0.82 * s, 0.020 * s, [96, 96, 110]);
  }
  // cuentas (bolas) con brillo
  const beads = [
    [0.28, 0.30, [10, 132, 255]], [0.28, 0.47, [10, 132, 255]],
    [0.50, 0.38, [48, 209, 88]],  [0.50, 0.72, [48, 209, 88]],
    [0.72, 0.26, [255, 159, 10]], [0.72, 0.58, [255, 159, 10]],
  ];
  for (const [bx, by, col] of beads) {
    circle(bx * s, by * s, 0.075 * s, col);
    circle((bx - 0.022) * s, (by - 0.024) * s, 0.030 * s, [255, 255, 255], 0.22);
  }
  return px;
}

for (const s of [180, 512]) {
  const png = pngFromRGBA(s, s, draw(s));
  const out = path.join(__dirname, `icon-${s}.png`);
  fs.writeFileSync(out, png);
  console.log(out, png.length, 'bytes');
}

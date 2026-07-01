// 生成 build/icon.ico（256x256），无外部依赖。
// 用途：electron-builder Windows 打包所需的应用图标。
// 运行：node scripts/gen-icon.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;

// 简单的书本图标：蓝色圆角背景 + 白色页面 + 三条文字线
function renderPixels() {
  const w = SIZE, h = SIZE;
  const buf = Buffer.alloc(w * h * 4); // RGBA

  const bg = [59, 130, 246, 255];       // 蓝
  const page = [255, 255, 255, 255];    // 白
  const line = [156, 163, 175, 255];    // 灰

  const rounded = (x, y, x0, y0, x1, y1, r) => {
    // 点是否在圆角矩形内
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = bg;
      // 页面区域
      const px0 = 56, py0 = 48, px1 = 199, py1 = 207, pr = 12;
      if (rounded(x, y, px0, py0, px1, py1, pr)) {
        c = page;
        // 三条文字线
        const lines = [88, 128, 168];
        for (const ly of lines) {
          if (y >= ly && y <= ly + 6 && x >= px0 + 18 && x <= px1 - 18) {
            c = line;
          }
        }
      }
      const o = (y * w + x) * 4;
      buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = c[3];
    }
  }
  return buf;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  // 每行前置 filter byte 0
  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIco(png) {
  // ICONDIR
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type = icon
  dir.writeUInt16LE(1, 4); // count
  // ICONDIRENTRY
  const entry = Buffer.alloc(16);
  entry[0] = SIZE >= 256 ? 0 : SIZE; // width (0 => 256)
  entry[1] = SIZE >= 256 ? 0 : SIZE; // height
  entry[2] = 0;                       // color count
  entry[3] = 0;                       // reserved
  entry.writeUInt16LE(1, 4);          // planes
  entry.writeUInt16LE(32, 6);         // bit count
  entry.writeUInt32LE(png.length, 8); // bytes in res
  entry.writeUInt32LE(6 + 16, 12);    // image offset
  return Buffer.concat([dir, entry, png]);
}

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
const png = encodePng(renderPixels());
const ico = encodeIco(png);
const outPath = path.join(outDir, 'icon.ico');
fs.writeFileSync(outPath, ico);
console.log('Wrote', outPath, '(' + ico.length + ' bytes)');

import sharp from 'sharp';

// Background-model matting: fits a smooth quadratic surface per RGB channel
// from a border sample band (the backdrop is a smooth studio gradient/glow,
// not a flat color), then classifies each pixel by its deviation from the
// PREDICTED background color at that (x,y) — not by chaining neighbor-to-
// neighbor tolerance, which tunnels straight through smooth low-contrast
// gradients into the subject.
//
// Two-threshold zone-limited classification: a strict CORE threshold builds
// a safe, leak-free silhouette via seed-flood-fill from the max-deviation
// pixel; a looser threshold (needed to recover low-contrast parts like a
// black pump on a dark backdrop) is only trusted INSIDE a small dilation
// zone around that core — never in the open background far from the object,
// which is what caused a low threshold alone to silently merge with a large
// chunk of the backdrop (invisible on a coincidentally similar test bg, but
// a visible rectangular ghost box on any other background).
//
// Usage: node scripts/matte-cutout.mjs <src> <out> <coreThreshold> [featherPx] [cropLeft] [marginPx] [closeRadius] [looseThreshold] [zoneUp] [zoneSide] [zoneDown] [clampBox: x0,y0,x1,y1]

const [, , SRC, OUT, coreThresholdArg, featherArg, cropLeftArg, marginArg, closeArg, looseThresholdArg, zoneUpArg, zoneSideArg, zoneDownArg, clampArg] = process.argv;
const CORE_THRESHOLD = parseFloat(coreThresholdArg || '35');
const FEATHER = parseFloat(featherArg || '2');
const CROP_LEFT = parseInt(cropLeftArg || '0', 10);
const MARGIN = parseInt(marginArg || '14', 10);
const CLOSE_RADIUS = parseInt(closeArg || '4', 10);
const LOOSE_THRESHOLD = parseFloat(looseThresholdArg || String(CORE_THRESHOLD));
const ZONE_UP = parseInt(zoneUpArg || '0', 10);
const ZONE_SIDE = parseInt(zoneSideArg || '0', 10);
const ZONE_DOWN = parseInt(zoneDownArg || '0', 10);
// Hard rectangular clamp: forces alpha=0 OUTSIDE this box, no matter what
// the model says. The background in these renders isn't a pure smooth
// gradient — it has real light-streak/reflection texture that can bridge a
// connected-component flood-fill all the way out to distant corners even at
// a fairly strict threshold. A manually-checked bounding box is the
// reliable backstop against that.
const CLAMP = clampArg ? clampArg.split(',').map(Number) : null;
// Explicit manual rectangle (x0,y0,x1,y1) where the LOOSE threshold is
// trusted — set via env because this is a precision, per-image knob, not
// meant to be guessed at automatically (auto-derived zones kept leaking
// into distant background through the source's own light-streak texture).
const ZONE_BOX = process.env.ZONE_BOX ? process.env.ZONE_BOX.split(',').map(Number) : null;

function boxFilter(mask, width, height, radius, useMax) {
  const tmp = new Uint8Array(width * height);
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = useMax ? 0 : 255;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const val = mask[y * width + nx];
        v = useMax ? Math.max(v, val) : Math.min(v, val);
      }
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = useMax ? 0 : 255;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        const val = tmp[ny * width + x];
        v = useMax ? Math.max(v, val) : Math.min(v, val);
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

function floodFrom(seedIdx, isFg, width, height) {
  const keep = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let sp = 0;
  stack[sp++] = seedIdx;
  keep[seedIdx] = 1;
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % width, y = (i / width) | 0;
    const neigh = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of neigh) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (isFg[ni] && !keep[ni]) { keep[ni] = 1; stack[sp++] = ni; }
    }
  }
  return keep;
}

function solve6(A, b) {
  const n = 6;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const pv = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

function terms(x, y) { return [1, x, y, x * y, x * x, y * y]; }

async function run() {
  let img = sharp(SRC).removeAlpha();
  if (CROP_LEFT > 0) {
    const meta = await sharp(SRC).metadata();
    img = sharp(SRC).removeAlpha().extract({ left: CROP_LEFT, top: 0, width: meta.width - CROP_LEFT, height: meta.height });
  }
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const smoothed = await sharp(data, { raw: { width, height, channels: 3 } })
    .blur(3.5)
    .raw()
    .toBuffer();

  const samples = [];
  const inBand = (x, y) => x < MARGIN || y < MARGIN || x >= width - MARGIN || y >= height - MARGIN;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (inBand(x, y)) samples.push([x / width, y / height, x, y]);
    }
  }

  const AtA = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const AtbR = new Array(6).fill(0), AtbG = new Array(6).fill(0), AtbB = new Array(6).fill(0);
  for (const [nx, ny, x, y] of samples) {
    const t = terms(nx, ny);
    const idx = (y * width + x) * 3;
    const r = smoothed[idx], g = smoothed[idx + 1], b = smoothed[idx + 2];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) AtA[i][j] += t[i] * t[j];
      AtbR[i] += t[i] * r; AtbG[i] += t[i] * g; AtbB[i] += t[i] * b;
    }
  }
  const coeffR = solve6(AtA, AtbR);
  const coeffG = solve6(AtA, AtbG);
  const coeffB = solve6(AtA, AtbB);

  const distArr = new Float32Array(width * height);
  const isCore = new Uint8Array(width * height);
  const isLoose = new Uint8Array(width * height);
  let seedIdx = 0, seedDist = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = terms(x / width, y / height);
      let pr = 0, pg = 0, pb = 0;
      for (let i = 0; i < 6; i++) { pr += t[i] * coeffR[i]; pg += t[i] * coeffG[i]; pb += t[i] * coeffB[i]; }
      const idx = (y * width + x) * 3;
      const dr = smoothed[idx] - pr, dg = smoothed[idx + 1] - pg, db = smoothed[idx + 2] - pb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      const i = y * width + x;
      distArr[i] = dist;
      isCore[i] = dist > CORE_THRESHOLD ? 1 : 0;
      isLoose[i] = dist > LOOSE_THRESHOLD ? 1 : 0;
      if (dist > seedDist) { seedDist = dist; seedIdx = i; }
    }
  }

  // Safe core silhouette: only pixels connected to the max-deviation seed
  // through other CORE pixels — cannot leak broadly into open background.
  let keep = floodFrom(seedIdx, isCore, width, height);
  if (process.env.MATTE_DEBUG) {
    let c = 0, bx0 = width, bx1 = 0, by0 = height, by1 = 0;
    for (let i = 0; i < width * height; i++) {
      if (keep[i]) { c++; const x = i % width, y = (i / width) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    }
    console.error('core-only keep count:', c, 'bbox x:', bx0, bx1, 'y:', by0, by1);
  }

  if (ZONE_BOX && LOOSE_THRESHOLD < CORE_THRESHOLD) {
    const [zx0, zy0, zx1, zy1] = ZONE_BOX;
    const combined = new Uint8Array(width * height);
    for (let y = Math.max(0, zy0); y <= Math.min(height - 1, zy1); y++) {
      for (let x = Math.max(0, zx0); x <= Math.min(width - 1, zx1); x++) {
        const i = y * width + x;
        combined[i] = isLoose[i] ? 1 : 0;
      }
    }
    // Also keep everything already in the safe core (union, never lose it)
    for (let i = 0; i < width * height; i++) if (keep[i]) combined[i] = 1;
    keep = floodFrom(seedIdx, combined, width, height);
  } else if ((ZONE_UP > 0 || ZONE_SIDE > 0 || ZONE_DOWN > 0) && LOOSE_THRESHOLD < CORE_THRESHOLD) {
    // Recover low-contrast appendages (e.g. a black pump directly ABOVE a
    // bottle body, on a dark backdrop) using the looser threshold, but only
    // within an axis-aligned rectangle around the core's own bounding box —
    // a directional allowance (reach further up than sideways), not an
    // isotropic radius. An isotropic dilation was found to leak into open
    // background to the sides of the object just as easily as it reached
    // upward to a real appendage, producing a visible ghost-cloud there.
    let minY = height, maxY = 0;
    for (let i = 0; i < width * height; i++) {
      if (keep[i]) { const y = (i / width) | 0; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    // X-range comes ONLY from core pixels near the TOP edge of the core
    // silhouette (a thin band), not the full core bounding box — the core
    // can be much wider lower down (glow bloom, wide body), which would
    // otherwise balloon the side margin far past the narrow neck/appendage
    // actually being bridged and let the loose threshold leak sideways.
    const band = 30;
    let minXtop = width, maxXtop = 0;
    for (let y = minY; y < Math.min(height, minY + band); y++) {
      for (let x = 0; x < width; x++) {
        if (keep[y * width + x]) { if (x < minXtop) minXtop = x; if (x > maxXtop) maxXtop = x; }
      }
    }
    if (process.env.MATTE_DEBUG) console.error('core Y', minY, maxY, 'top-band X', minXtop, maxXtop, 'of', width, height);
    const zx0 = Math.max(0, minXtop - ZONE_SIDE), zx1 = Math.min(width - 1, maxXtop + ZONE_SIDE);
    const zy0 = Math.max(0, minY - ZONE_UP), zy1 = Math.min(height - 1, maxY + ZONE_DOWN);
    const combined = new Uint8Array(width * height);
    for (let y = zy0; y <= zy1; y++) {
      for (let x = zx0; x <= zx1; x++) {
        const i = y * width + x;
        combined[i] = isLoose[i] ? 1 : 0;
      }
    }
    keep = floodFrom(seedIdx, combined, width, height);
  }

  let alpha = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = keep[i] ? 255 : 0;

  if (CLAMP) {
    const [cx0, cy0, cx1, cy1] = CLAMP;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x < cx0 || x > cx1 || y < cy0 || y > cy1) alpha[y * width + x] = 0;
      }
    }
  }

  if (process.env.MATTE_DEBUG) {
    let c = 0; for (let i = 0; i < width * height; i++) if (alpha[i] > 128) c++;
    console.error('pre-close alpha count:', c);
  }

  if (CLOSE_RADIUS > 0) {
    const dilated = boxFilter(alpha, width, height, CLOSE_RADIUS, true);
    const closed = boxFilter(dilated, width, height, CLOSE_RADIUS, false);
    alpha = Buffer.from(closed.map((v, i) => Math.max(v, alpha[i])));
    if (process.env.MATTE_DEBUG) {
      let c = 0; for (let i = 0; i < width * height; i++) if (alpha[i] > 128) c++;
      console.error('post-close alpha count:', c);
    }
  }

  if (process.env.MATTE_DEBUG) {
    await sharp(alpha, { raw: { width, height, channels: 1 } }).png().toFile(OUT + '.premask.png');
  }

  // NOTE: sharp silently returns 3 channels here even though the input is
  // declared channels:1 — .toColourspace('b-w') forces true single-channel
  // raw output. Without it, the returned buffer is 3x too long and every
  // alphaBlurred[i] read below is reading a misaligned byte from a totally
  // different pixel, which was the real cause of large, seemingly-random
  // "leaks" that had nothing to do with the classification/zone logic.
  const alphaBlurred = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .blur(Math.max(0.3, FEATHER))
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = alphaBlurred[i];
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(OUT);
  let keptCount = 0; for (let i = 0; i < width * height; i++) if (keep[i]) keptCount++;
  console.log('OK', OUT, width + 'x' + height, 'fgPixels:', keptCount, 'seed:', seedIdx % width, (seedIdx / width) | 0, 'seedDist:', seedDist.toFixed(1));
}

run().catch((e) => { console.error(e); process.exit(1); });

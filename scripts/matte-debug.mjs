import sharp from 'sharp';

const [, , SRC, OUTDIR, cropLeftArg, marginArg] = process.argv;
const CROP_LEFT = parseInt(cropLeftArg || '0', 10);
const MARGIN = parseInt(marginArg || '14', 10);

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
  const smoothed = await sharp(data, { raw: { width, height, channels: 3 } }).blur(3.5).raw().toBuffer();

  const samples = [];
  const inBand = (x, y) => x < MARGIN || y < MARGIN || x >= width - MARGIN || y >= height - MARGIN;
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) if (inBand(x, y)) samples.push([x / width, y / height, x, y]);

  const AtA = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const AtbR = new Array(6).fill(0), AtbG = new Array(6).fill(0), AtbB = new Array(6).fill(0);
  for (const [nx, ny, x, y] of samples) {
    const t = terms(nx, ny);
    const idx = (y * width + x) * 3;
    const r = smoothed[idx], g = smoothed[idx + 1], b = smoothed[idx + 2];
    for (let i = 0; i < 6; i++) { for (let j = 0; j < 6; j++) AtA[i][j] += t[i] * t[j]; AtbR[i] += t[i] * r; AtbG[i] += t[i] * g; AtbB[i] += t[i] * b; }
  }
  const coeffR = solve6(AtA, AtbR), coeffG = solve6(AtA, AtbG), coeffB = solve6(AtA, AtbB);

  const predicted = Buffer.alloc(width * height * 3);
  const distMap = Buffer.alloc(width * height);
  let maxDist = 0;
  const dists = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = terms(x / width, y / height);
      let pr = 0, pg = 0, pb = 0;
      for (let i = 0; i < 6; i++) { pr += t[i] * coeffR[i]; pg += t[i] * coeffG[i]; pb += t[i] * coeffB[i]; }
      const i3 = (y * width + x) * 3;
      predicted[i3] = Math.max(0, Math.min(255, pr));
      predicted[i3 + 1] = Math.max(0, Math.min(255, pg));
      predicted[i3 + 2] = Math.max(0, Math.min(255, pb));
      const idx = (y * width + x) * 3;
      const dr = smoothed[idx] - pr, dg = smoothed[idx + 1] - pg, db = smoothed[idx + 2] - pb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      dists[y * width + x] = dist;
      maxDist = Math.max(maxDist, dist);
    }
  }
  for (let i = 0; i < width * height; i++) distMap[i] = Math.round(Math.min(255, dists[i]));

  await sharp(predicted, { raw: { width, height, channels: 3 } }).png().toFile(OUTDIR + '/debug-predicted.png');
  await sharp(distMap, { raw: { width, height, channels: 1 } }).png().toFile(OUTDIR + '/debug-distmap.png');

  // print histogram of distances
  const bins = new Array(20).fill(0);
  for (let i = 0; i < dists.length; i++) bins[Math.min(19, Math.floor(dists[i] / 10))]++;
  console.log('maxDist', maxDist.toFixed(1));
  console.log('histogram (bin=10, count):', bins.map((c, i) => `${i * 10}-${i * 10 + 9}:${c}`).join(' '));
}
run().catch((e) => { console.error(e); process.exit(1); });

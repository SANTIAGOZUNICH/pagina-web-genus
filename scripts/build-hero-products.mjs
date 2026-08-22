import sharp from 'sharp';

const SRC = 'assets/redesign/01_brand/productos_naturales.png';
const W = 900;

async function feather(w, h, inset) {
  const bg = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toBuffer();
  const fg = await sharp({ create: { width: w - inset * 2, height: h - inset * 2, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
  const mask = await sharp(bg)
    .composite([{ input: fg, left: inset, top: inset }])
    .blur(Math.max(6, inset * 0.9))
    .greyscale()
    .toColourspace('b-w')
    .toBuffer();
  return mask;
}

// Lee el color promedio de una pequeña zona (para construir un degradado
// que imite la curvatura del envase en vez de un parche plano).
async function sampleColor(buf, region) {
  const { data } = await sharp(buf).extract(region).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = data.length / 3;
  for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
}

async function run() {
  let buf = await sharp(SRC)
    .resize(W, null, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.8 })
    .removeAlpha()
    .toBuffer();

  // ---- Pote de crema: parche chico y ajustado al texto exacto, con el
  // relleno tomado de una franja inmediatamente arriba (misma zona local
  // de luz de la curva del pote, a solo unos px de distancia — así el
  // degradado coincide en vez de traer tono de otra parte del envase). ----
  {
    const region = { left: 148, top: 446, width: 132, height: 52 };
    const source = { left: 148, top: 430, width: 132, height: 12 };
    const fill = await sharp(buf).extract(source).blur(3).resize(region.width, region.height, { fit: 'fill' }).blur(4).toBuffer();
    const mask = await feather(region.width, region.height, 6);
    const feathered = await sharp(fill).removeAlpha().joinChannel(mask).png().toBuffer();
    buf = await sharp(buf).composite([{ input: feathered, left: region.left, top: region.top }]).removeAlpha().toBuffer();
  }

  // ---- Tubo: franja limpia debajo de la etiqueta (superficie plana,
  // aquí sí alcanza con estirar una tira porque no hay curvatura fuerte). ----
  {
    const region = { left: 300, top: 156, width: 126, height: 96 };
    const source = { left: 300, top: 248, width: 126, height: 12 };
    const fill = await sharp(buf).extract(source).blur(4).resize(region.width, region.height, { fit: 'fill' }).blur(5).toBuffer();
    const mask = await feather(region.width, region.height, 8);
    const feathered = await sharp(fill).removeAlpha().joinChannel(mask).png().toBuffer();
    buf = await sharp(buf).composite([{ input: feathered, left: region.left, top: region.top }]).removeAlpha().toBuffer();
  }

  await sharp(buf).toFile('assets/redesign/01_brand/hero_products_clean.png');
  console.log('clean base OK');

  const meta = await sharp(buf).metadata();
  const w = meta.width, h = meta.height;
  const raw = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const out = Buffer.alloc(w * h * 4);
  const fadeBand = 0.30;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2 - 1;
      const ny = (y / (h - 1)) * 2 - 1;
      const dEll = Math.sqrt(nx * nx * 0.85 + ny * ny * 1.1);
      let a;
      const start = 1 - fadeBand;
      if (dEll <= start) a = 255;
      else if (dEll >= 1) a = 0;
      else {
        const t = (dEll - start) / (1 - start);
        const s = t * t * (3 - 2 * t);
        a = Math.round(255 * (1 - s));
      }
      const si = (y * w + x) * info.channels, di = (y * w + x) * 4;
      out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = a;
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile('assets/redesign/01_brand/hero_products_vignette.png');
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 88 }).toFile('assets/redesign/01_brand/hero_products_vignette.webp');
  console.log('vignette OK', w, h);
}

run().catch((e) => { console.error(e); process.exit(1); });

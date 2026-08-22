import sharp from 'sharp';

const SRC = 'assets/redesign/07_creamy/creamy_original_referencia.png';
const OUT = 'assets/redesign/07_creamy/creamy_hero_clean.png';

// Región del logo falso (círculo + "LABORATORIO GENUS"), con margen
// generoso — se recorta sola contra la silueta real del envase más abajo,
// así que no hace falta medirla al pixel.
const region = { left: 290, top: 862, width: 530, height: 186 };
const source = { left: 290, top: 838, width: 530, height: 10 };
const inset = 22;

async function run() {
  // 1) Relleno: franja limpia inmediatamente arriba, estirada solo en
  //    vertical (conserva el degradado horizontal real del envase).
  const fill = await sharp(SRC)
    .extract(source)
    .blur(3)
    .resize(region.width, region.height, { fit: 'fill' })
    .blur(5)
    .removeAlpha()
    .toBuffer();

  // 2) Máscara de pluma (opaca al centro, se desvanece a los bordes).
  const featherBg = await sharp({ create: { width: region.width, height: region.height, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toBuffer();
  const featherFg = await sharp({ create: { width: region.width - inset * 2, height: region.height - inset * 2, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
  const featherMask = await sharp(featherBg)
    .composite([{ input: featherFg, left: inset, top: inset }])
    .blur(Math.max(6, inset * 0.9))
    .greyscale()
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  // 3) Máscara real del envase en esa región (su propio canal alfa) — así
  //    el parche NUNCA pinta más allá de la silueta de Creamy, sin
  //    importar si el rectángulo de arriba se pasa un poco del cuerpo.
  const silhouette = await sharp(SRC)
    .extract(region)
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer();

  // 4) Combinar ambas máscaras (mínimo de las dos) y aplicarla como alfa.
  const combined = Buffer.alloc(region.width * region.height);
  for (let i = 0; i < combined.length; i++) {
    combined[i] = Math.min(featherMask[i], silhouette[i]);
  }
  const maskPng = await sharp(combined, { raw: { width: region.width, height: region.height, channels: 1 } }).png().toBuffer();

  const feathered = await sharp(fill).joinChannel(maskPng).png().toBuffer();

  await sharp(SRC)
    .composite([{ input: feathered, left: region.left, top: region.top }])
    .png()
    .toFile(OUT);

  console.log('OK ->', OUT);
}

run().catch((e) => { console.error(e); process.exit(1); });

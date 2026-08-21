import sharp from 'sharp';

const SRC = 'assets/redesign/07_creamy/creamy_original_referencia.png';
const OUT = 'assets/redesign/07_creamy/creamy_hero_clean.png';

// Región del logo falso (círculo + "LABORATORIO GENUS").
const region = { left: 145, top: 868, width: 615, height: 210 };

// En vez de intentar "borrar" el logo de forma invisible, seguimos el mismo
// lenguaje visual que ya usa el resto del sitio (mockups.js): una etiqueta
// blanca lisa, sin texto, sobre el envase — igual que los frascos "TU MARCA"
// del resto de los assets. Es una solución de diseño, no un parche oculto.
const labelSvg = `
<svg width="${region.width}" height="${region.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f4f7f8"/>
    </linearGradient>
  </defs>
  <rect x="24" y="14" width="${region.width - 48}" height="${region.height - 32}" rx="16"
        fill="url(#g)" stroke="#d8e2e6" stroke-width="2"/>
</svg>`;

async function run() {
  const labelPng = await sharp(Buffer.from(labelSvg)).png().toBuffer();

  await sharp(SRC)
    .composite([{ input: labelPng, left: region.left, top: region.top }])
    .png()
    .toFile(OUT);

  console.log('OK ->', OUT);
}

run().catch((e) => { console.error(e); process.exit(1); });

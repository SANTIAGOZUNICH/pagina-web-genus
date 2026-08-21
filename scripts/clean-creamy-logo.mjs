import sharp from 'sharp';

const SRC = 'assets/redesign/07_creamy/creamy_original_referencia.png';
const OUT = 'assets/redesign/07_creamy/creamy_hero_clean.png';

// Región del logo falso (círculo + "LABORATORIO GENUS").
const region = { left: 145, top: 868, width: 615, height: 210 };

// Mismo lenguaje visual que el resto de los assets del sitio (mockups.js
// y las fotos de producto): una etiqueta "TU MARCA" — no una etiqueta en
// blanco vacía, que se leía como un parche. Esto además es coherente con
// que Creamy ES uno de los envases de la marca dentro de la escena.
const labelW = region.width - 48;
const labelH = region.height - 40;
const labelX = Math.round((region.width - labelW) / 2);
const labelY = Math.round((region.height - labelH) / 2);

const labelSvg = `
<svg width="${region.width}" height="${region.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f6f8f9"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0a1e2e" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}" rx="10"
        fill="url(#g)" filter="url(#soft)"/>
  <text x="${region.width / 2}" y="${labelY + labelH * 0.6}" text-anchor="middle"
        font-family="'Helvetica Neue',Arial,sans-serif" font-size="${Math.round(labelH * 0.36)}"
        font-weight="600" letter-spacing="2.5" fill="#1a2a35">TU MARCA</text>
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

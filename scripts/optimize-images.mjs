import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = 'assets/opt';
fs.mkdirSync(OUT, { recursive: true });
const products = ['serums','facial','capilar','cremas','corporal','geles'];
const widths = [480, 768, 1024];

async function encode(input, base, widths, heightRatio = 2/3) {
  for (const w of widths) {
    const h = Math.round(w * heightRatio);
    await sharp(input).resize({ width: w, height: h, fit: 'cover', withoutEnlargement: true }).avif({ quality: 55, effort: 6 }).toFile(path.join(OUT, `${base}-${w}.avif`));
    await sharp(input).resize({ width: w, height: h, fit: 'cover', withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(OUT, `${base}-${w}.webp`));
    await sharp(input).resize({ width: w, height: h, fit: 'cover', withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${base}-${w}.jpg`));
  }
}

// Re-run only if originals exist under assets/_src/
console.log('Use assets/_src/*.png as inputs if regenerating.');

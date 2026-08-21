import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const files = [
  'assets/redesign/02_categorias/capilares.png',
  'assets/redesign/02_categorias/styling.png',
  'assets/redesign/02_categorias/faciales.png',
  'assets/redesign/02_categorias/serums.png',
  'assets/redesign/02_categorias/limpieza.png',
  'assets/redesign/02_categorias/corporales.png',
  'assets/redesign/02_categorias/brumas_sprays.png',
  'assets/redesign/02_categorias/otro_producto.png',
  'assets/redesign/04_composiciones/linea_completa_04.png',
  'assets/redesign/05_texturas/pedestal_blanco.png',
  'assets/redesign/05_texturas/pedestal_azul.png',
  'assets/redesign/05_texturas/fondo_laboratorio_01.png',
  'assets/redesign/05_texturas/fondo_laboratorio_02.png',
  'assets/redesign/01_brand/laboratorio_gotero.png',
];

let totalBefore = 0, totalAfter = 0;

for (const file of files) {
  const before = fs.statSync(file).size;
  const out = file.replace(/\.png$/, '.webp');
  await sharp(file).webp({ quality: 82 }).toFile(out);
  const after = fs.statSync(out).size;
  totalBefore += before;
  totalAfter += after;
  console.log(path.basename(file), before, '->', after, 'bytes');
}

console.log('TOTAL', totalBefore, '->', totalAfter, 'bytes', '(' + Math.round((1 - totalAfter/totalBefore) * 100) + '% menos)');

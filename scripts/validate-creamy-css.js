#!/usr/bin/env node
/**
 * Valida que creamy.css use solo propiedades CSS estándar en inglés.
 */
import fs from 'fs';

const css = fs.readFileSync('assets/creamy/creamy.css', 'utf-8');
const js = fs.readFileSync('assets/creamy/creamy.js', 'utf-8');

// Solo propiedades inválidas en español (no confundir con inglés válido como cursor, content, block)
const SPANISH_PROPERTIES = [
  'posición', 'parte inferior', 'parte-superior',
  'ancho', 'anchura', 'opacidad', 'transformar',
  'radio de borde', 'radio-de-borde',
  'tamaño de fuente', 'tamaño-de-fuente',
  'alinear-elementos', 'alinear-elemento',
  'justificar-contenido',
  'peso de fuente', 'peso-de-fuente',
  'familia de fuente', 'familia-de-fuente',
  'desbordamiento', 'transición', 'animación',
  'sombra de caja', 'sombra-de-caja',
  'relleno', 'fondo', 'ninguno', 'pantalla', 'flexible',
  'visualización', 'relativo', 'fijo', 'absoluto',
];

const REQUIRED_PROPERTIES = [
  'position', 'bottom', 'right', 'width', 'height', 'display', 'flex',
  'opacity', 'transform', 'border-radius', 'background', 'padding',
  'margin', 'font-size', 'font-weight', 'align-items', 'justify-content',
  'overflow', 'transition', 'animation', 'box-shadow',
];

const REQUIRED_CLASSES = [
  'creamy-widget', 'creamy-fab', 'creamy-window', 'creamy-hidden',
  'creamy-header', 'creamy-messages', 'creamy-message', 'creamy-bubble',
  'creamy-input-area', 'creamy-textarea', 'creamy-send-btn',
  'creamy-greeting-bubble', 'creamy-backdrop', 'creamy-typing',
  'creamy-chips', 'creamy-chip', 'creamy-action-buttons', 'creamy-action-btn',
];

let errors = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`✅ ${msg}`);
}

for (const prop of SPANISH_PROPERTIES) {
  const regex = new RegExp(`\\b${prop.replace(/ /g, '[\\s-]+')}\\s*:`, 'i');
  if (regex.test(css)) {
    fail(`Propiedad CSS en español detectada: "${prop}"`);
  }
}

for (const prop of REQUIRED_PROPERTIES) {
  if (!css.includes(prop)) {
    fail(`Falta propiedad requerida: ${prop}`);
  } else {
    pass(`Propiedad presente: ${prop}`);
  }
}

for (const cls of REQUIRED_CLASSES) {
  if (!css.includes(`.${cls}`) && !css.includes(`#${cls}`)) {
    fail(`Falta clase en CSS: .${cls}`);
  }
  if (!js.includes(cls)) {
    fail(`Clase en CSS pero no en JS: ${cls}`);
  }
}

// Parse básico: detectar líneas propiedad:valor con caracteres no ASCII en la propiedad
const propLines = css.match(/^\s*([a-zA-Z-]+)\s*:/gm) || [];
for (const line of propLines) {
  const prop = line.trim().replace(':', '');
  if (/[^a-zA-Z0-9-]/.test(prop)) {
    fail(`Nombre de propiedad inválido: "${prop}"`);
  }
}

if (errors === 0) {
  console.log('\n✅ creamy.css — CSS válido en inglés');
  process.exit(0);
} else {
  console.log(`\n❌ ${errors} error(es) encontrados`);
  process.exit(1);
}

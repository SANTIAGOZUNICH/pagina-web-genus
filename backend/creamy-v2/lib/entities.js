/**
 * Extracción de productos y activos mencionados en el texto del usuario.
 */

const EXTRA_PRODUCT_TERMS = [
  'serum', 'sérum', 'crema', 'shampoo', 'champú', 'champu', 'gel', 'mascarilla',
  'protector solar', 'aceite', 'loción', 'locion', 'limpiador', 'tónico', 'tonico',
  'contorno', 'barba', 'capilar', 'facial', 'corporal', 'bálsamo', 'balsamo', 'pomada',
  'jabón', 'jabon', 'exfoliante', 'desodorante', 'after sun', 'autobronceante',
];

const ACTIVE_ALIASES = {
  niacinamida: ['niacinamida', 'vitamina b3', 'vit b3'],
  acido_hialuronico: ['ácido hialurónico', 'acido hialuronico', 'hialurónico', 'hialuronico', 'hyaluronic'],
  retinol: ['retinol', 'retinal', 'retinoides', 'retinoide'],
  vitamina_c: ['vitamina c', 'vit c', 'ácido ascórbico', 'acido ascorbico', 'ascorbil', 'map '],
  peptidos: ['péptido', 'peptido', 'péptidos', 'peptidos'],
  cafeina: ['cafeína', 'cafeina'],
};

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function extractMentionedEntities(text, knowledge) {
  const t = normalize(text);
  const products = [];

  const fromKnowledge = (knowledge?.lineas_producto || []).map((p) => p.toLowerCase());
  for (const term of [...fromKnowledge, ...EXTRA_PRODUCT_TERMS]) {
    const n = normalize(term);
    if (n.length >= 3 && t.includes(n)) products.push(term);
  }

  const actives = [];
  for (const [key, aliases] of Object.entries(ACTIVE_ALIASES)) {
    if (aliases.some((a) => t.includes(normalize(a)))) actives.push(key);
  }

  return {
    producto_mencionado: [...new Set(products)].slice(0, 8).join(', '),
    activos_mencionados: [...new Set(actives)].slice(0, 8).join(', '),
  };
}

export const CTA_LABELS = {
  WHATSAPP: 'WhatsApp',
  COTIZACION: 'Cotización',
  CONFIGURADOR: 'Crear producto',
  REUNION: 'Reunión',
};

export const CTA_EVENT_TYPES = {
  WHATSAPP: 'whatsapp_click',
  COTIZACION: 'cotizacion_click',
  CONFIGURADOR: 'crear_producto_click',
  REUNION: 'reunion_click',
};

export function ctaToEventType(ctaKey) {
  return CTA_EVENT_TYPES[ctaKey] || 'cta_click';
}

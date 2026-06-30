#!/usr/bin/env node
/**
 * Tests unitarios — Google Sheets logging + entidades + evento CTA
 */
import { buildSheetRow, rowToValues, isSheetsConfigured, SHEET_HEADERS } from '../backend/creamy-v2/lib/sheets.js';
import { extractMentionedEntities, formatCtaEvent } from '../backend/creamy-v2/lib/entities.js';
import eventHandler from '../api/creamy-v2/event.js';
import { loadKnowledge } from '../backend/creamy-v2/lib/knowledge.js';

let errors = 0;
function check(name, ok, detail = '') {
  if (!ok) { console.error(`❌ ${name}${detail ? ': ' + detail : ''}`); errors++; }
  else console.log(`✅ ${name}`);
}

const knowledge = loadKnowledge();
const entities = extractMentionedEntities('Quiero un serum con niacinamida y ácido hialurónico', knowledge);
check('Detecta serum', entities.producto_mencionado.toLowerCase().includes('serum'));
check('Detecta niacinamida', entities.activos_mencionados.includes('niacinamida'));
check('Detecta ácido hialurónico', entities.activos_mencionados.includes('acido_hialuronico'));

const row = buildSheetRow({
  session_id: 'cv2_test',
  user_name: 'María',
  page_key: 'index',
  user_message: 'Hola',
  assistant_reply: 'Hola María',
  intent: 'consulta_tecnica',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  used_ai: true,
  used_fallback: false,
  evento_cta: 'WhatsApp',
});
check('Row tiene 15 columnas lógicas', Object.keys(row).length >= 15);
check('Row nombre', row.nombre === 'María');
check('Row usó IA', row['si usó IA'] === 'sí');
check('Row usó fallback no', row['si usó fallback'] === 'no');
check('Headers alineados', rowToValues(row).length === SHEET_HEADERS.length);
check('CTA label WhatsApp', formatCtaEvent('WHATSAPP') === 'WhatsApp');

check('Sheets config detect (sin env)', isSheetsConfigured() === false);

function mockRes() {
  return { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() {} };
}

async function testEvent() {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      session_id: 'cv2_evt',
      user_name: 'Juan',
      page_key: 'cotizador',
      cta: 'WHATSAPP',
      context_message: 'Quiero cotizar',
    },
  };
  const res = mockRes();
  await eventHandler(req, res);
  check('Event endpoint 204', res.statusCode === 204);
}

await testEvent();

if (errors) process.exit(1);
console.log('\n✅ Sheets logging tests OK\n');

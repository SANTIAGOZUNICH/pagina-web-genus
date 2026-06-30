#!/usr/bin/env node
/**
 * Tests — Google Sheets logging + onboard events
 */
import fs from 'fs';
import { buildSheetRow, rowToValues, isSheetsConfigured, SHEET_HEADERS } from '../backend/creamy-v2/lib/sheets.js';
import { extractMentionedEntities, ctaToEventType } from '../backend/creamy-v2/lib/entities.js';
import eventHandler from '../api/creamy-v2/event.js';
import { loadKnowledge } from '../backend/creamy-v2/lib/knowledge.js';
import { StorageAdapter } from '../backend/creamy-v2/lib/storage.js';

let errors = 0;
function check(name, ok, detail = '') {
  if (!ok) { console.error(`❌ ${name}${detail ? ': ' + detail : ''}`); errors++; }
  else console.log(`✅ ${name}`);
}

const knowledge = loadKnowledge();
const entities = extractMentionedEntities('Quiero un serum con niacinamida y ácido hialurónico', knowledge);
check('Detecta serum', entities.producto_mencionado.toLowerCase().includes('serum'));
check('Detecta niacinamida', entities.activos_mencionados.includes('niacinamida'));

const row = buildSheetRow({
  session_id: 'cv2_test',
  user_first_name: 'María',
  user_last_name: 'García',
  page_key: 'index',
  tipo_evento: 'visitor_registered',
  user_agent: 'test-agent',
});
check('Row nombre', row.nombre === 'María');
check('Row apellido', row.apellido === 'García');
check('Row tipo_evento', row.tipo_evento === 'visitor_registered');
check('Headers 17 columnas', SHEET_HEADERS.length === 17);
check('Headers alineados', rowToValues(row).length === SHEET_HEADERS.length);
check('CTA whatsapp_click', ctaToEventType('WHATSAPP') === 'whatsapp_click');
check('CTA crear_producto_click', ctaToEventType('CONFIGURADOR') === 'crear_producto_click');
check('Sheets config detect (sin env)', isSheetsConfigured() === false);

check('logChatTurn no lanza', typeof StorageAdapter.logChatTurn === 'function');
StorageAdapter.logChatTurn({
  session_id: 't',
  user_first_name: 'Ana',
  user_last_name: 'López',
  page_key: 'index',
  user_message: 'Hola',
  assistant_reply: 'Hola Ana',
  intent: 'consulta_tecnica',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  used_ai: true,
  used_fallback: false,
});

function mockRes() {
  return { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() {} };
}

async function testVisitorEvent() {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      event_type: 'visitor_registered',
      session_id: 'cv2_evt',
      user_first_name: 'Juan',
      user_last_name: 'Pérez',
      page_key: 'cotizador',
      user_agent: 'Mozilla/test',
    },
  };
  const res = mockRes();
  await eventHandler(req, res);
  check('visitor_registered 204', res.statusCode === 204);
}

async function testCtaEvent() {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      session_id: 'cv2_evt',
      user_first_name: 'Juan',
      user_last_name: 'Pérez',
      page_key: 'cotizador',
      cta: 'WHATSAPP',
      context_message: 'Quiero cotizar',
    },
  };
  const res = mockRes();
  await eventHandler(req, res);
  check('whatsapp_click 204', res.statusCode === 204);
}

await testVisitorEvent();
await testCtaEvent();

const js = fs.readFileSync('assets/creamy-v2/creamy.js', 'utf-8');
check('Formulario onboard en JS', js.includes('cv2-onboard-form'));
check('sessionStorage visitor', js.includes('cv2_visitor'));
check('user_first_name en payload', js.includes('user_first_name'));
check('Saludo personalizado', js.includes('Hola, ${this._esc(this.firstName)}'));
check('Sin intercept conversacional', !js.includes('_promptForName'));

if (errors) process.exit(1);
console.log('\n✅ Sheets + onboard tests OK\n');

#!/usr/bin/env node
/**
 * Tests — CRM Sheets + onboarding premium
 */
import fs from 'fs';
import { buildSheetRow, rowToValues, isSheetsConfigured, SHEET_HEADERS } from '../backend/creamy-v2/lib/sheets.js';
import { extractMentionedEntities, ctaToEventType } from '../backend/creamy-v2/lib/entities.js';
import {
  registerVisitorSession,
  recordUserMessage,
  recordCtaEvent,
  crmSnapshot,
} from '../backend/creamy-v2/lib/session-crm.js';
import eventHandler from '../api/creamy-v2/event.js';
import { loadKnowledge } from '../backend/creamy-v2/lib/knowledge.js';
import { StorageAdapter } from '../backend/creamy-v2/lib/storage.js';

let errors = 0;
function check(name, ok, detail = '') {
  if (!ok) { console.error(`❌ ${name}${detail ? ': ' + detail : ''}`); errors++; }
  else console.log(`✅ ${name}`);
}

const knowledge = loadKnowledge();
const entities = extractMentionedEntities('Quiero un serum con niacinamida', knowledge);
check('Detecta serum', entities.producto_mencionado.toLowerCase().includes('serum'));

registerVisitorSession('crm_test');
recordUserMessage('crm_test', entities);
const snap = crmSnapshot('crm_test');
check('CRM question_count', snap.question_count === 1);
check('CRM primary_product', snap.primary_product.toLowerCase().includes('serum'));

recordCtaEvent('crm_test', 'whatsapp_click');
check('CRM whatsapp flag', crmSnapshot('crm_test').opened_whatsapp === 'sí');

const row = buildSheetRow({
  session_id: 'cv2_test',
  user_first_name: 'María',
  user_last_name: 'García',
  page_key: 'index',
  page_url: 'https://www.laboratoriogenus.com.ar/',
  tipo_evento: 'visitor_registered',
  conversation_duration_sec: 42,
  question_count: 3,
  opened_whatsapp: 'sí',
});
check('Headers 24 columnas', SHEET_HEADERS.length === 24);
check('Row url', row.url.includes('laboratoriogenus'));
check('CTA crear_producto_click', ctaToEventType('CONFIGURADOR') === 'crear_producto_click');
check('Sheets sin env', isSheetsConfigured() === false);

StorageAdapter.logChatTurn({
  session_id: 'crm_test',
  user_first_name: 'Ana',
  user_last_name: 'López',
  page_key: 'index',
  page_url: 'https://example.com',
  user_message: 'Hola',
  assistant_reply: 'Hola Ana',
  intent: 'consulta_tecnica',
  producto_mencionado: 'serum',
  activos_mencionados: 'niacinamida',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  used_ai: true,
  used_fallback: false,
});

function mockRes() {
  return { statusCode: 0, headers: {}, setHeader() {}, end() {} };
}

async function testVisitorEvent() {
  const res = mockRes();
  await eventHandler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      event_type: 'visitor_registered',
      session_id: 'cv2_evt',
      user_first_name: 'Juan',
      user_last_name: 'Pérez',
      page_key: 'cotizador',
      page_url: 'https://www.laboratoriogenus.com.ar/cotizador',
      user_agent: 'Mozilla/test',
    },
  }, res);
  check('visitor_registered 204', res.statusCode === 204);
}

await testVisitorEvent();

const js = fs.readFileSync('assets/creamy-v2/creamy.js', 'utf-8');
const css = fs.readFileSync('assets/creamy-v2/creamy.css', 'utf-8');
check('Onboard ¡Bienvenido!', js.includes('¡Bienvenido!'));
check('Comenzar conversación', js.includes('Comenzar conversación'));
check('Saludo humano', js.includes('¿En qué te gustaría que empecemos?'));
check('Header Atendiendo a', js.includes('Atendiendo a'));
check('Validación sin números', js.includes('/\\d/.test(t)'));
check('CSS onboard premium', css.includes('cv2-onboard-lead'));
check('Animación onboard', css.includes('cv2-onboard-in'));

if (errors) process.exit(1);
console.log('\n✅ CRM + premium onboard tests OK\n');

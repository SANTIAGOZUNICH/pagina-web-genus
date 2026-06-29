#!/usr/bin/env node
/**
 * Validación obligatoria — Creamy V2 con Gemini
 * Uso: GEMINI_API_KEY=... npm run validate:creamy-gemini
 */
import fs from 'fs';
import handler from '../api/creamy-v2/chat.js';
import { probeAIProvider } from '../backend/creamy-v2/lib/ai/provider.js';

const TESTS = [
  'Quiero hacer un serum de niacinamida.',
  '¿Me recomendás agregar ácido hialurónico?',
  'Quiero hacer un shampoo con biotina.',
  '¿Qué activo recomendás para piel grasa?',
  'Quiero lanzar una marca desde cero.',
  '¿Cuál es el mínimo de producción?',
  '¿Trabajan con retinol?',
  '¿Qué tendencia ves en cosmética?',
];

function mockRes() {
  return { statusCode: 0, headers: {}, setHeader() {}, end(body) { this.body = body; } };
}

async function call(message, history = []) {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { message, conversation_history: history, session_id: 'val_gemini', page_key: 'index' },
  };
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, data: JSON.parse(res.body) };
}

async function main() {
  console.log('\n🔬 Validación Gemini — Creamy V2\n');

  const probe = await probeAIProvider('gemini');
  console.log('Debug probe:', JSON.stringify({
    provider: probe.provider,
    model: probe.model,
    gemini_key_present: probe.gemini_key_present,
    can_connect: probe.can_connect,
    status: probe.status,
    last_error: probe.last_error,
  }, null, 2));

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error('\n❌ GEMINI_API_KEY no configurada\n');
    process.exit(1);
  }

  if (probe.status !== 'ok') {
    console.error('\n❌ Probe Gemini falló — ver last_error arriba\n');
    process.exit(1);
  }

  let failures = 0;
  const results = [];

  for (let i = 0; i < TESTS.length; i++) {
    const q = TESTS[i];
    console.log(`\n--- ${i + 1}. "${q}" ---`);
    const { status, data } = await call(q);
    const meta = data.meta || {};
    const reply = data.reply || data.message || data.error || '';
    const ok = status === 200 && meta.provider === 'gemini' && meta.used_ai === true && meta.used_fallback === false;

    console.log(`HTTP: ${status} | provider: ${meta.provider} | used_ai: ${meta.used_ai} | model: ${meta.model}`);
    console.log(`Respuesta: ${reply.slice(0, 160)}...`);
    console.log(ok ? '✅ PASS' : '❌ FAIL');
    if (!ok) failures++;
    results.push({ query: q, status, meta, pass: ok });
    await new Promise((r) => setTimeout(r, 500));
  }

  fs.writeFileSync('/tmp/creamy-gemini-validation.json', JSON.stringify({ probe, results, failures }, null, 2));

  if (failures) {
    console.error(`\n❌ ${failures} prueba(s) fallaron\n`);
    process.exit(1);
  }
  console.log('\n✅ Todas las consultas usaron Gemini (provider: gemini, used_ai: true)\n');
}

main().catch((e) => { console.error(e); process.exit(1); });

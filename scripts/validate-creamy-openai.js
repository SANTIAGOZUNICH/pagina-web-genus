#!/usr/bin/env node
/**
 * Validación obligatoria — evidencia de OpenAI real en 8 consultas.
 * Requiere OPENAI_API_KEY válida en el entorno.
 *
 * Uso: OPENAI_API_KEY=sk-... npm run validate:creamy-openai
 */
import fs from 'fs';
import handler from '../api/creamy-v2/chat.js';

const TESTS = [
  'Quiero hacer un shampoo con biotina.',
  'Qué activo me recomendás para piel grasa.',
  'Quiero un body splash.',
  'Puedo mezclar retinol con vitamina C.',
  'Quiero hacer un serum de Niaciniamida.',
  'me recomendas con acido hialuronico?',
  'cuantas unidades minimo?',
  'quiero lanzar mi marca desde cero.',
];

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(body) { this.body = body; },
  };
}

async function call(message, history = []) {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      message,
      conversation_history: history,
      session_id: 'validate_' + Date.now(),
      page_key: 'index',
      page_url: 'https://test/index.html',
      page_title: 'Test',
    },
  };
  const res = mockRes();
  await handler(req, res);
  const data = res.body ? JSON.parse(res.body) : {};
  return { status: res.statusCode, data };
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  console.log('\n🔬 Validación OpenAI real — Creamy V2\n');
  console.log(`OPENAI_API_KEY presente: ${!!key}`);
  if (key) console.log(`OPENAI_API_KEY prefix: ${key.slice(0, 7)}...`);
  else {
    console.error('\n❌ OPENAI_API_KEY no configurada. No se puede validar used_openai:true\n');
    process.exit(1);
  }

  const results = [];
  let failures = 0;

  for (let i = 0; i < TESTS.length; i++) {
    const q = TESTS[i];
    console.log(`\n--- Test ${i + 1}: "${q}" ---`);
    const { status, data } = await call(q);
    const meta = data.meta || {};
    const reply = data.reply || data.message || data.error || '';
    const ok = status === 200 && meta.used_openai === true && meta.used_fallback === false && reply.length > 50;

    console.log(`HTTP status:     ${status}`);
    console.log(`meta.used_openai:    ${meta.used_openai}`);
    console.log(`meta.used_fallback:  ${meta.used_fallback}`);
    console.log(`meta.intent:         ${meta.intent}`);
    console.log(`meta.model:          ${meta.model}`);
    console.log(`meta.openai_status:  ${meta.openai_status}`);
    console.log(`meta.openai_error:   ${meta.openai_error_code || '—'}`);
    console.log(`meta.tokens_used:    ${meta.tokens_used || '—'}`);
    console.log(`Respuesta (${reply.length} chars): ${reply.slice(0, 180)}...`);
    console.log(ok ? '✅ PASS' : '❌ FAIL');

    if (!ok) failures++;
    results.push({ query: q, status, meta, reply_preview: reply.slice(0, 300), pass: ok });
    await new Promise((r) => setTimeout(r, 400));
  }

  // Follow-up test
  console.log('\n--- Test 9: Follow-up conversacional ---');
  const t1 = await call('Quiero hacer un serum de niacinamida');
  const history = [
    { role: 'user', content: 'Quiero hacer un serum de niacinamida' },
    { role: 'assistant', content: t1.data.reply || t1.data.message || '' },
  ];
  const t2 = await call('pero decís que con hialurónico va a ser mejor?', history);
  const m2 = t2.data.meta || {};
  const followOk = t2.status === 200 && m2.used_openai === true && m2.used_fallback === false;
  console.log(`HTTP status:     ${t2.status}`);
  console.log(`meta.used_openai:    ${m2.used_openai}`);
  console.log(`meta.used_fallback:  ${m2.used_fallback}`);
  console.log(`Respuesta: ${(t2.data.reply || '').slice(0, 200)}...`);
  console.log(followOk ? '✅ PASS follow-up' : '❌ FAIL follow-up');
  if (!followOk) failures++;
  results.push({ query: 'follow-up hialurónico', status: t2.status, meta: m2, pass: followOk });

  const report = { timestamp: new Date().toISOString(), key_present: true, failures, results };
  fs.writeFileSync('/tmp/creamy-openai-validation.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Reporte: /tmp/creamy-openai-validation.json`);

  if (failures) {
    console.error(`\n❌ ${failures} prueba(s) fallaron — used_openai debe ser true en todas\n`);
    process.exit(1);
  }
  console.log('\n✅ Todas las pruebas usaron OpenAI real (used_openai: true)\n');
}

main().catch((e) => { console.error(e); process.exit(1); });

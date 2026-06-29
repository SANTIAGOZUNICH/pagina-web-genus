#!/usr/bin/env node
/**
 * Auditoría completa del flujo OpenAI — Creamy V2
 * Ejecutar: node scripts/audit-creamy-openai.js
 * Con key:  OPENAI_API_KEY=sk-... node scripts/audit-creamy-openai.js
 */
import handler from '../api/creamy-v2/chat.js';
import { probeOpenAI } from '../backend/creamy-v2/lib/openai-debug.js';
import { loadKnowledge } from '../backend/creamy-v2/lib/knowledge.js';
import { buildSystemPrompt } from '../backend/creamy-v2/lib/prompt.js';
import { chatCompletion } from '../backend/creamy-v2/lib/openai-client.js';

const MODEL = 'gpt-4o-mini';

function section(n, title) {
  console.log(`\n${'─'.repeat(60)}\n${n}. ${title}\n${'─'.repeat(60)}`);
}

function mockRes() {
  return { statusCode: 0, headers: {}, setHeader() {}, end(body) { this.body = body; } };
}

async function auditChatHandler(message, history = []) {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { message, conversation_history: history, session_id: 'audit', page_key: 'index' },
  };
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, data: JSON.parse(res.body) };
}

async function main() {
  console.log('\n🔍 AUDITORÍA CREAMY V2 — FLUJO OPENAI\n');
  console.log(`Fecha: ${new Date().toISOString()}`);
  console.log(`NODE: ${process.version}`);
  console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || '(no set)'}`);

  // ── 1-3, 5-9: Debug probe ──
  section(1, '¿/api/creamy-v2/chat llama a OpenAI?');
  console.log('Sí, cuando OPENAI_API_KEY está presente → chat.js línea 184-192 llama chatCompletion().');
  console.log('Si key ausente → retorna 503 SIN llamar a OpenAI (openai_error_code: missing_openai_key).');

  section(2, '¿OPENAI_API_KEY llega al runtime?');
  const probe = await probeOpenAI(MODEL);
  console.log(JSON.stringify({
    openai_key_present: probe.openai_key_present,
    openai_key_prefix: probe.openai_key_prefix,
    openai_key_has_whitespace: probe.openai_key_has_whitespace,
    openai_key_length: probe.openai_key_length,
    environment: probe.environment,
  }, null, 2));

  section(3, '¿gpt-4o-mini responde?');
  section(4, 'Status HTTP exacto de OpenAI');
  section(5, 'Body del error (sanitizado)');
  section(6, '¿Timeout?');
  section(7, '¿Rate limit?');
  section(8, '¿Permisos proyecto OpenAI?');
  console.log(JSON.stringify({
    can_connect_to_openai: probe.can_connect_to_openai,
    openai_status: probe.openai_status,
    last_error: probe.last_error,
    openai_error_body: probe.openai_error_body || null,
    chat_probe_reply: probe.chat_probe_reply || null,
    models_probe_latency_ms: probe.models_probe_latency_ms,
    chat_probe_latency_ms: probe.chat_probe_latency_ms,
    diagnosis: probe.diagnosis,
  }, null, 2));

  section(9, '¿Problema es Vercel?');
  console.log(JSON.stringify(probe.vercel, null, 2));
  if (!probe.openai_key_present && !process.env.VERCEL_ENV) {
    console.log('→ En local sin key: esperado. En Vercel Preview debe existir OPENAI_API_KEY para Preview scope.');
  }

  section(10, '¿Problema es el código?');
  if (probe.can_connect_to_openai && probe.openai_status === 'ok') {
    console.log('Probe mínimo OK → código de conexión OpenAI funciona.');
    const knowledge = loadKnowledge();
    const systemPrompt = buildSystemPrompt({ knowledge, pageKey: 'index', pageUrl: '', pageTitle: '' });
    console.log(`System prompt size: ${systemPrompt.length} chars (~${Math.ceil(systemPrompt.length / 4)} tokens est.)`);
    try {
      const full = await chatCompletion({
        apiKey: process.env.OPENAI_API_KEY.trim(),
        model: MODEL,
        systemPrompt,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 10,
        temperature: 0,
      });
      console.log('✅ chatCompletion con system prompt completo: OK');
      console.log(`   reply: ${full.reply?.slice(0, 40)}`);
      console.log(`   tokens: ${full.usage?.total_tokens}`);
    } catch (e) {
      console.log('❌ chatCompletion con system prompt completo FALLÓ');
      console.log(`   status: ${e.status} code: ${e.code} msg: ${e.message}`);
    }
  } else {
    console.log('No se puede probar chatCompletion completo — falló probe base.');
    console.log(`DIAGNÓSTICO: ${probe.diagnosis}`);
  }

  // Handler end-to-end
  section('→', 'Handler /api/creamy-v2/chat (mensaje real)');
  const h1 = await auditChatHandler('Quiero hacer un shampoo con biotina');
  console.log('Mensaje 1:');
  console.log(JSON.stringify({
    http_status: h1.status,
    used_openai: h1.data.meta?.used_openai,
    used_fallback: h1.data.meta?.used_fallback,
    openai_error_code: h1.data.meta?.openai_error_code,
    openai_status: h1.data.meta?.openai_status,
    reply_len: (h1.data.reply || h1.data.error || '').length,
  }, null, 2));

  if (h1.data.reply) {
    const history = [
      { role: 'user', content: 'Quiero hacer un shampoo con biotina' },
      { role: 'assistant', content: h1.data.reply },
    ];
    const h2 = await auditChatHandler('y con keratina también?', history);
    console.log('Mensaje 2 (con historial):');
    console.log(JSON.stringify({
      http_status: h2.status,
      used_openai: h2.data.meta?.used_openai,
      used_fallback: h2.data.meta?.used_fallback,
      openai_error_code: h2.data.meta?.openai_error_code,
      openai_status: h2.data.meta?.openai_status,
      history_messages: h2.data.meta?.history_messages,
    }, null, 2));
  }

  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSIÓN');
  console.log('='.repeat(60));
  console.log(probe.diagnosis);
  console.log('\nEndpoint debug: GET /api/creamy-v2/debug');
  console.log('='.repeat(60) + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });

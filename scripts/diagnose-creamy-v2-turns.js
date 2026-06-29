#!/usr/bin/env node
/**
 * Diagnóstico: comparar payload y respuesta mensaje 1 vs mensaje 2
 * Replica exactamente la lógica del frontend (creamy.js _api)
 */
import fs from 'fs';
import handler from '../api/creamy-v2/chat.js';
import { loadKnowledge } from '../backend/creamy-v2/lib/knowledge.js';
import { buildSystemPrompt } from '../backend/creamy-v2/lib/prompt.js';
import { chatCompletion } from '../backend/creamy-v2/lib/openai-client.js';

const MSG1 = 'Quiero hacer un serum de niacinamida';
const MSG2 = 'pero decís que con hialurónico va a ser mejor?';

function buildPayload(userMessage, history, sessionId, page = {}) {
  return {
    message: userMessage,
    conversation_history: history.slice(-24),
    session_id: sessionId,
    page_url: page.page_url || 'https://pagina-web-genus.vercel.app/index.html',
    page_title: page.page_title || 'Laboratorio Genus',
    page_key: page.page_key || 'index',
  };
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(body) { this.body = body; },
  };
}

async function callHandler(payload) {
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload };
  const res = mockRes();
  await handler(req, res);
  const data = res.body ? JSON.parse(res.body) : {};
  return { status: res.statusCode, data, raw: res.body };
}

function summarizePayload(label, payload) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PAYLOAD ${label}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(payload, null, 2));
  console.log(`\nTamaño JSON: ${JSON.stringify(payload).length} bytes`);
  console.log(`Historial: ${payload.conversation_history.length} mensajes`);
  payload.conversation_history.forEach((m, i) => {
    console.log(`  [${i}] role=${m.role} len=${(m.content || '').length} preview="${String(m.content).slice(0, 80)}..."`);
  });
}

async function probeOpenAIDirect(history, userMessage, pageKey = 'index') {
  const knowledge = loadKnowledge();
  const systemPrompt = buildSystemPrompt({
    knowledge,
    pageKey,
    pageUrl: 'https://test/index.html',
    pageTitle: 'Test',
  });
  const messages = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: userMessage },
  ];

  const openaiBody = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 1100,
    temperature: 0.58,
  };

  console.log('\n--- OpenAI request directo ---');
  console.log(`system prompt chars: ${systemPrompt.length}`);
  console.log(`messages count: ${messages.length}`);
  console.log(`total body bytes (approx): ${JSON.stringify(openaiBody).length}`);
  messages.forEach((m, i) => {
    const validRole = m.role === 'user' || m.role === 'assistant';
    const validContent = typeof m.content === 'string' && m.content.length > 0;
    console.log(`  msg[${i}] role=${m.role} validRole=${validRole} validContent=${validContent} len=${m.content?.length}`);
  });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.log('OPENAI_API_KEY: NO configurada en este entorno');
    return { skipped: true };
  }
  console.log(`OPENAI_API_KEY: presente (prefix ${apiKey.slice(0, 7)}...)`);

  try {
    const result = await chatCompletion({
      apiKey,
      model: 'gpt-4o-mini',
      systemPrompt,
      messages,
      maxTokens: 1100,
      temperature: 0.58,
    });
    return { ok: true, reply: result.reply, tokens: result.usage?.total_tokens };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      status: err.status,
      code: err.code,
    };
  }
}

async function main() {
  const sessionId = 'diag_' + Date.now();
  const history = [];

  // --- Mensaje 1 (como frontend: history vacío al enviar) ---
  const payload1 = buildPayload(MSG1, history, sessionId);
  summarizePayload('MENSAJE 1 (frontend → /api/creamy-v2/chat)', payload1);

  const res1 = await callHandler(payload1);
  console.log(`\nRESPUESTA MENSAJE 1: HTTP ${res1.status}`);
  console.log(JSON.stringify({
    reply_preview: (res1.data.reply || res1.data.error || '').slice(0, 200),
    meta: res1.data.meta,
    fallback: res1.data.meta?.fallback,
    error: res1.data.error,
    code: res1.data.code,
  }, null, 2));

  if (res1.status === 200 && res1.data.reply) {
    // Replica frontend: push después de respuesta exitosa
    history.push({ role: 'user', content: MSG1 });
    history.push({ role: 'assistant', content: res1.data.reply });
  } else {
    console.error('\n⚠️  Mensaje 1 falló — no se puede continuar diagnóstico msg2');
    process.exit(1);
  }

  // --- Mensaje 2 ---
  const payload2 = buildPayload(MSG2, history, sessionId);
  summarizePayload('MENSAJE 2 (frontend → /api/creamy-v2/chat)', payload2);

  const res2 = await callHandler(payload2);
  console.log(`\nRESPUESTA MENSAJE 2: HTTP ${res2.status}`);
  console.log(JSON.stringify({
    reply_preview: (res2.data.reply || res1.data.error || '').slice(0, 300),
    meta: res2.data.meta,
    fallback: res2.data.meta?.fallback,
    error: res2.data.error,
    code: res2.data.code,
    fallback_flag: res2.data.fallback,
  }, null, 2));

  // --- Diff clave ---
  console.log(`\n${'='.repeat(60)}`);
  console.log('DIFERENCIAS CLAVE ENTRE LLAMADA 1 Y 2');
  console.log('='.repeat(60));
  console.log(`| conversation_history | ${payload1.conversation_history.length} → ${payload2.conversation_history.length} |`);
  console.log(`| payload bytes        | ${JSON.stringify(payload1).length} → ${JSON.stringify(payload2).length} |`);
  console.log(`| HTTP status          | ${res1.status} → ${res2.status} |`);
  console.log(`| source msg1          | ${res1.data.meta?.fallback || res1.data.meta?.model || 'error'} |`);
  console.log(`| source msg2          | ${res2.data.meta?.fallback || res2.data.meta?.model || res2.data.code || 'error'} |`);

  // --- OpenAI directo msg2 ---
  const direct = await probeOpenAIDirect(history, MSG2);
  if (direct.skipped) {
    console.log('\nOpenAI directo msg2: omitido (sin API key)');
  } else if (direct.ok) {
    console.log(`\nOpenAI directo msg2: OK tokens=${direct.tokens}`);
    console.log(`reply: ${direct.reply.slice(0, 250)}...`);
  } else {
    console.log(`\nOpenAI directo msg2: FALLO`);
    console.log(`  status: ${direct.status}`);
    console.log(`  code: ${direct.code}`);
    console.log(`  message: ${direct.error}`);
  }

  // Knowledge fallback removed — OpenAI is primary
  console.log(`\nKnowledge pattern fallback: ELIMINADO (OpenAI es fuente principal)`);

  const out = {
    payload1,
    payload2,
    response1: { status: res1.status, data: res1.data },
    response2: { status: res2.status, data: res2.data },
    openaiDirectMsg2: direct,
  };
  fs.writeFileSync('/tmp/creamy-v2-diagnose.json', JSON.stringify(out, null, 2));
  console.log('\n📄 Reporte completo: /tmp/creamy-v2-diagnose.json');
}

main().catch((e) => { console.error(e); process.exit(1); });

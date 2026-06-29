#!/usr/bin/env node
/**
 * Prueba unitaria del handler /api/creamy-v2/chat
 */
import handler from '../api/creamy-v2/chat.js';
import { loadKnowledge } from '../backend/creamy-v2/lib/knowledge.js';
import { getKnowledgeFallback } from '../backend/creamy-v2/lib/request.js';
import { detectIntents } from '../backend/creamy-v2/lib/intents.js';

let errors = 0;
function check(name, ok, detail = '') {
  if (!ok) { console.error(`❌ ${name}${detail ? ': ' + detail : ''}`); errors++; }
  else console.log(`✅ ${name}`);
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(body) { this.body = body; },
    status(code) { this.statusCode = code; return this; },
  };
}

async function callHandler(payload, env = {}) {
  const prev = process.env.OPENAI_API_KEY;
  if (env.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
  };
  const res = mockRes();
  await handler(req, res);
  if (env.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = prev;
  const data = res.body ? JSON.parse(res.body) : {};
  return { status: res.statusCode, data };
}

async function main() {
  const knowledge = loadKnowledge();

  // Knowledge fallbacks
  const moq = getKnowledgeFallback('Cuál es la cantidad mínima', knowledge);
  check('Fallback MOQ', /500/.test(moq || ''));
  const serum = getKnowledgeFallback('Quiero hacer un serum de niacinamida', knowledge);
  check('Fallback serum consultivo', /excelente elección/i.test(serum || ''));
  const retinol = getKnowledgeFallback('Puedo mezclar retinol con vitamina C', knowledge);
  check('Fallback retinol+VitC', /no recomendaría/i.test(retinol || ''));

  // Intents — no WhatsApp on generic serum
  const intents = detectIntents('Quiero hacer un serum de niacinamida', serum, 1);
  check('Sin WhatsApp en consulta técnica', !intents.includes('WHATSAPP'));
  const intentsHuman = detectIntents('Quiero hablar por whatsapp con un asesor', '', 1);
  check('WhatsApp si pide humano', intentsHuman.includes('WHATSAPP'));

  // Handler without API key — should use knowledge fallback for MOQ
  const noKey = await callHandler({
    message: 'Cuál es la cantidad mínima',
    conversation_history: [],
    session_id: 'test_no_key',
    page_key: 'index',
  }, { OPENAI_API_KEY: '' });

  check('Handler MOQ sin API key → 200', noKey.status === 200, `status ${noKey.status}`);
  check('Handler MOQ reply', /500/.test(noKey.data.reply || ''));

  // Handler with API key if available
  if (process.env.OPENAI_API_KEY) {
    const live = await callHandler({
      message: 'Quiero hacer un serum de niacinamida',
      conversation_history: [],
      session_id: 'test_live',
      page_key: 'index',
    });
    check('Handler OpenAI → 200', live.status === 200, `status ${live.status}`);
    check('Handler reply sustanciosa', (live.data.reply || '').length > 100);
    console.log(`   Preview: ${(live.data.reply || '').slice(0, 120)}...`);
  } else {
    console.log('⏭️  OpenAI live test omitido (sin OPENAI_API_KEY)');
  }

  if (errors) {
    console.error(`\n❌ ${errors} error(es)\n`);
    process.exit(1);
  }
  console.log('\n✅ API tests OK\n');
}

main().catch((e) => { console.error(e); process.exit(1); });

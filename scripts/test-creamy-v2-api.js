#!/usr/bin/env node
/**
 * Prueba unitaria del handler /api/creamy-v2/chat
 */
import handler from '../api/creamy-v2/chat.js';
import { sanitizeHistory, normalizeUserMessage } from '../backend/creamy-v2/lib/request.js';
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
  };
}

async function callHandler(payload, env = {}) {
  const prev = process.env.OPENAI_API_KEY;
  if (env.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload };
  const res = mockRes();
  await handler(req, res);
  if (env.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = prev;
  const data = res.body ? JSON.parse(res.body) : {};
  return { status: res.statusCode, data };
}

async function main() {
  check('normalize niaciniamida', normalizeUserMessage('serum de Niaciniamida').includes('niacinamida'));
  check('normalize hialuronico', normalizeUserMessage('acido hialuronico').includes('hialurónico'));
  check('sanitize history', sanitizeHistory([{ role: 'user', content: 'hola' }, { role: 'bad', content: 'x' }]).length === 1);

  const intents = detectIntents('Quiero hacer un serum de niacinamida', '', 1);
  check('Sin WhatsApp en consulta técnica', !intents.includes('WHATSAPP'));

  const noKey = await callHandler({
    message: 'Cuál es la cantidad mínima',
    conversation_history: [],
    session_id: 'test_no_key',
    page_key: 'index',
  }, { OPENAI_API_KEY: '' });

  check('Sin API key → 503', noKey.status === 503, `status ${noKey.status}`);
  check('Sin API key → used_fallback true', noKey.data.meta?.used_fallback === true);
  check('Sin API key → used_openai false', noKey.data.meta?.used_openai === false);
  check('Sin API key → NO knowledge pattern 200', noKey.status !== 200);

  if (process.env.OPENAI_API_KEY?.trim()) {
    console.log('⏭️  Para validación OpenAI completa: npm run validate:creamy-openai');
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

#!/usr/bin/env node
import handler from '../api/creamy-v2/chat.js';
import { getActiveProviderName } from '../backend/creamy-v2/lib/ai/provider.js';

let errors = 0;
function check(n, ok, d = '') { if (!ok) { console.error(`❌ ${n}${d ? ': ' + d : ''}`); errors++; } else console.log(`✅ ${n}`); }

function mockRes() {
  return { statusCode: 0, headers: {}, setHeader() {}, end(body) { this.body = body; } };
}

async function callHandler(payload, env = {}) {
  const prevG = process.env.GEMINI_API_KEY;
  const prevP = process.env.CREAMY_AI_PROVIDER;
  if (env.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env.CREAMY_AI_PROVIDER !== undefined) process.env.CREAMY_AI_PROVIDER = env.CREAMY_AI_PROVIDER;
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload };
  const res = mockRes();
  await handler(req, res);
  if (env.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = prevG;
  if (env.CREAMY_AI_PROVIDER !== undefined) process.env.CREAMY_AI_PROVIDER = prevP;
  return { status: res.statusCode, data: JSON.parse(res.body) };
}

async function main() {
  check('Proveedor default gemini', getActiveProviderName() === 'gemini');

  const noKey = await callHandler({
    message: 'test', conversation_history: [], session_id: 't', page_key: 'index',
  }, { GEMINI_API_KEY: '', CREAMY_AI_PROVIDER: 'gemini' });

  check('Sin GEMINI_API_KEY → 503', noKey.status === 503);
  check('meta.provider gemini', noKey.data.meta?.provider === 'gemini');
  check('used_ai false sin key', noKey.data.meta?.used_ai === false);

  if (process.env.GEMINI_API_KEY?.trim()) {
    console.log('⏭️  Validación completa: npm run validate:creamy-gemini');
  } else {
    console.log('⏭️  Sin GEMINI_API_KEY — probe live omitido');
  }

  if (errors) process.exit(1);
  console.log('\n✅ API tests OK\n');
}

main().catch((e) => { console.error(e); process.exit(1); });

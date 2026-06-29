/**
 * Creamy V2 — Health check
 * GET /api/creamy-v2/health
 */

import { loadKnowledge } from '../../backend/creamy-v2/lib/knowledge.js';
import { loadSystemPromptBase } from '../../backend/creamy-v2/lib/prompt.js';
import { getActiveProviderName, getKeyInfo, getProviderModel } from '../../backend/creamy-v2/lib/ai/provider.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const provider = getActiveProviderName();
  const model = getProviderModel(provider);
  const keyInfo = getKeyInfo(provider);

  const checks = {
    knowledge: false,
    system_prompt: false,
    provider,
    model,
    key_present: keyInfo.key_present || keyInfo.gemini_key_present || false,
    key_prefix: keyInfo.key_prefix,
    key_env: keyInfo.key_env,
    knowledge_as: 'context_only',
  };

  if (provider === 'gemini') {
    checks.gemini_key_present = keyInfo.gemini_key_present;
  }

  try {
    const knowledge = loadKnowledge();
    checks.knowledge = !!knowledge?.version;
  } catch (err) {
    checks.knowledge_error = err.message;
  }

  try {
    const prompt = loadSystemPromptBase();
    checks.system_prompt = prompt.length > 100;
  } catch (err) {
    checks.system_prompt_error = err.message;
  }

  const ready = checks.knowledge && checks.system_prompt && checks.key_present;

  return json(res, ready ? 200 : 503, {
    service: 'creamy-v2',
    status: ready ? 'ready' : 'degraded',
    version: '2.0.0',
    provider,
    model,
    checks,
    timestamp: new Date().toISOString(),
  });
}

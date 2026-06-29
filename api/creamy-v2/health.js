/**
 * Creamy V2 — Health check
 * GET /api/creamy-v2/health
 */

import { loadKnowledge } from '../../backend/creamy-v2/lib/knowledge.js';
import { loadSystemPromptBase } from '../../backend/creamy-v2/lib/prompt.js';

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

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const checks = {
    knowledge: false,
    system_prompt: false,
    openai_key: !!apiKey,
    openai_key_prefix: apiKey ? apiKey.slice(0, 7) + '...' : null,
    mode: 'openai_primary',
    knowledge_as: 'context_only',
  };

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

  const ready = checks.knowledge && checks.system_prompt && checks.openai_key;

  return json(res, ready ? 200 : 503, {
    service: 'creamy-v2',
    status: ready ? 'ready' : 'degraded',
    version: '2.0.0',
    checks,
    timestamp: new Date().toISOString(),
  });
}

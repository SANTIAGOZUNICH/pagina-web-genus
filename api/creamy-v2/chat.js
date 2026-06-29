/**
 * Creamy V2 — API Chat
 * POST /api/creamy-v2/chat
 */

import { loadKnowledge } from '../../backend/creamy-v2/lib/knowledge.js';
import { buildSystemPrompt } from '../../backend/creamy-v2/lib/prompt.js';
import { chatCompletion } from '../../backend/creamy-v2/lib/openai-client.js';
import { detectIntents } from '../../backend/creamy-v2/lib/intents.js';
import { StorageAdapter } from '../../backend/creamy-v2/lib/storage.js';

const MODEL = 'gpt-4o-mini';
const MAX_HISTORY = 24;
const RATE_LIMIT = { max: 40, windowMs: 3600000 };
const rateMap = new Map();

function rateLimit(ip) {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT.windowMs) {
    entry = { start: now, count: 0 };
    rateMap.set(ip, entry);
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT.max;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return json(res, 429, { error: 'Demasiadas consultas. Esperá unos minutos e intentá de nuevo.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: 'JSON inválido' });
  }

  const message = (body.message || '').trim();
  if (!message || message.length > 4000) {
    return json(res, 400, { error: 'Mensaje vacío o demasiado largo' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[CreamyV2] OPENAI_API_KEY no configurada en el entorno');
    return json(res, 503, {
      error: 'Estoy teniendo un problema técnico momentáneo. Escribinos por WhatsApp y te respondemos enseguida.',
      code: 'missing_openai_key',
      fallback: true,
    });
  }

  const sessionId = body.session_id || `sess_${Date.now()}`;
  const history = Array.isArray(body.conversation_history) ? body.conversation_history.slice(-MAX_HISTORY) : [];
  const pageKey = body.page_key || 'index';
  const pageUrl = body.page_url || '';
  const pageTitle = body.page_title || '';

  let knowledge;
  let systemPrompt;
  try {
    knowledge = loadKnowledge();
    systemPrompt = buildSystemPrompt({ knowledge, pageKey, pageUrl, pageTitle });
  } catch (err) {
    console.error('[CreamyV2] Error cargando knowledge/prompt:', err.message);
    return json(res, 500, {
      error: 'Tuve un inconveniente interno. Intentá de nuevo en unos segundos o escribinos por WhatsApp.',
      code: 'knowledge_load_error',
    });
  }

  const messages = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: message },
  ];

  const callOpenAI = () =>
    chatCompletion({
      apiKey,
      model: MODEL,
      systemPrompt,
      messages,
      maxTokens: 900,
      temperature: 0.55,
    });

  try {
    let result;
    try {
      result = await callOpenAI();
    } catch (firstErr) {
      const retryable = !firstErr.status || firstErr.status >= 500 || firstErr.code === 'ECONNRESET';
      if (retryable) {
        await new Promise((r) => setTimeout(r, 600));
        result = await callOpenAI();
      } else {
        throw firstErr;
      }
    }

    const actions = detectIntents(message, result.reply, history.length + 1);

    await StorageAdapter.saveConversation(sessionId, {
      message_count: history.length + 1,
      page_key: pageKey,
      last_user_preview: message.slice(0, 80),
    });

    if (actions.length) {
      await StorageAdapter.trackMetric('creamy_v2_lead_signal', { actions, sessionId });
    }

    return json(res, 200, {
      reply: result.reply,
      message: result.reply,
      actions,
      meta: {
        model: result.model || MODEL,
        tokens_used: result.usage?.total_tokens,
        knowledge_version: knowledge.version,
        session_id: sessionId,
      },
    });
  } catch (err) {
    console.error('[CreamyV2]', err.message, err.code);
    const status = err.status === 429 ? 429 : 502;
    return json(res, status, {
      error: status === 429
        ? 'Alta demanda en este momento. Intentá en unos minutos.'
        : 'No pude procesar tu consulta. Escribinos por WhatsApp.',
    });
  }
}

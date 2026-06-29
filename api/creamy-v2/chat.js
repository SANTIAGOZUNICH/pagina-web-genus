/**
 * Creamy V2 — API Chat
 * POST /api/creamy-v2/chat
 *
 * Flujo: Usuario → System Prompt + Knowledge (contexto) → Historial → OpenAI → Respuesta
 * Knowledge NO genera respuestas hardcodeadas.
 */

import { loadKnowledge } from '../../backend/creamy-v2/lib/knowledge.js';
import { buildSystemPrompt } from '../../backend/creamy-v2/lib/prompt.js';
import { chatCompletion } from '../../backend/creamy-v2/lib/openai-client.js';
import { detectIntents, inferIntent } from '../../backend/creamy-v2/lib/intents.js';
import { StorageAdapter } from '../../backend/creamy-v2/lib/storage.js';
import {
  parseJsonBody,
  sanitizeHistory,
  normalizeUserMessage,
  getEmergencyMessage,
} from '../../backend/creamy-v2/lib/request.js';

const MODEL = 'gpt-4o-mini';
const MAX_HISTORY_MESSAGES = 10;
const RATE_LIMIT = { max: 40, windowMs: 3600000 };
const UI_TECHNICAL =
  'Estoy teniendo una demora técnica para responder consultas complejas. Mientras tanto, puedo ayudarte con información básica del laboratorio o derivarte con un asesor.';
const rateMap = new Map();

function makeRequestId() {
  return `cv2_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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

function buildMeta({
  requestId,
  sessionId,
  knowledge,
  usedOpenai = false,
  usedFallback = false,
  intent = null,
  model = null,
  tokens = null,
  openaiStatus = null,
  openaiErrorCode = null,
  historyCount = 0,
}) {
  return {
    request_id: requestId,
    session_id: sessionId,
    used_openai: usedOpenai,
    used_fallback: usedFallback,
    intent,
    model: model || MODEL,
    tokens_used: tokens,
    openai_status: openaiStatus,
    openai_error_code: openaiErrorCode,
    history_messages: historyCount,
    knowledge_version: knowledge?.version,
  };
}

function logEvent(requestId, data) {
  console.log('[CreamyV2]', JSON.stringify({ request_id: requestId, ...data }));
}

export default async function handler(req, res) {
  const requestId = makeRequestId();

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
    return json(res, 429, {
      error: UI_TECHNICAL,
      meta: buildMeta({ requestId, sessionId: 'n/a', knowledge: null, usedFallback: true, openaiErrorCode: 'rate_limit' }),
    });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return json(res, 400, { error: 'JSON inválido' });
  }

  if (!body || typeof body !== 'object') {
    return json(res, 400, { error: 'JSON inválido' });
  }

  const rawMessage = (body.message || '').trim();
  if (!rawMessage || rawMessage.length > 4000) {
    return json(res, 400, { error: 'Mensaje vacío o demasiado largo' });
  }

  const message = normalizeUserMessage(rawMessage);
  const sessionId = body.session_id || `sess_${Date.now()}`;
  const history = sanitizeHistory(body.conversation_history, MAX_HISTORY_MESSAGES);
  const pageKey = body.page_key || 'index';
  const pageUrl = body.page_url || '';
  const pageTitle = body.page_title || '';
  const intent = inferIntent(message, history.length);

  let knowledge;
  let systemPrompt;
  try {
    knowledge = loadKnowledge();
    systemPrompt = buildSystemPrompt({ knowledge, pageKey, pageUrl, pageTitle });
  } catch (err) {
    logEvent(requestId, { used_openai: false, used_fallback: true, openai_error_code: 'knowledge_load_error', error: err.message });
    return json(res, 500, {
      error: UI_TECHNICAL,
      meta: buildMeta({
        requestId,
        sessionId,
        knowledge: null,
        usedFallback: true,
        intent,
        openaiErrorCode: 'knowledge_load_error',
        historyCount: history.length,
      }),
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const keyPresent = !!apiKey;
  const keyPrefix = apiKey ? apiKey.slice(0, 7) : null;

  logEvent(requestId, {
    phase: 'request_start',
    intent,
    history_count: history.length,
    message_len: message.length,
    openai_key_present: keyPresent,
    openai_key_prefix: keyPrefix,
  });

  if (!apiKey) {
    logEvent(requestId, { used_openai: false, used_fallback: true, openai_error_code: 'missing_openai_key' });
    const emergency = getEmergencyMessage(knowledge);
    return json(res, 503, {
      error: emergency,
      reply: emergency,
      message: emergency,
      meta: buildMeta({
        requestId,
        sessionId,
        knowledge,
        usedFallback: true,
        intent,
        openaiErrorCode: 'missing_openai_key',
        openaiStatus: 'not_configured',
        historyCount: history.length,
      }),
      fallback: true,
    });
  }

  const messages = [...history, { role: 'user', content: message }];

  const callOpenAI = () =>
    chatCompletion({
      apiKey,
      model: MODEL,
      systemPrompt,
      messages,
      maxTokens: 1100,
      temperature: 0.58,
    });

  try {
    let result;
    let openaiStatus = 'ok';

    try {
      result = await callOpenAI();
    } catch (firstErr) {
      const retryable = !firstErr.status || firstErr.status >= 500 || firstErr.code === 'ECONNRESET' || firstErr.code === 'timeout';
      if (retryable) {
        logEvent(requestId, { openai_retry: true, openai_error_code: firstErr.code, openai_status: firstErr.status });
        await new Promise((r) => setTimeout(r, 800));
        result = await callOpenAI();
      } else {
        openaiStatus = String(firstErr.status || 'error');
        throw firstErr;
      }
    }

    if (!result.reply) {
      logEvent(requestId, { used_openai: true, used_fallback: false, openai_error_code: 'empty_reply' });
      return json(res, 502, {
        error: UI_TECHNICAL,
        meta: buildMeta({
          requestId,
          sessionId,
          knowledge,
          usedOpenai: true,
          intent,
          model: result.model,
          openaiStatus: 'empty_reply',
          openaiErrorCode: 'empty_reply',
          historyCount: history.length,
        }),
        fallback: true,
      });
    }

    const actions = detectIntents(message, result.reply, history.length + 1);

    logEvent(requestId, {
      used_openai: true,
      used_fallback: false,
      openai_status: openaiStatus,
      model: result.model || MODEL,
      tokens_used: result.usage?.total_tokens,
      intent,
    });

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
      meta: buildMeta({
        requestId,
        sessionId,
        knowledge,
        usedOpenai: true,
        usedFallback: false,
        intent,
        model: result.model || MODEL,
        tokens: result.usage?.total_tokens,
        openaiStatus: 'ok',
        historyCount: history.length,
      }),
    });
  } catch (err) {
    logEvent(requestId, {
      used_openai: false,
      used_fallback: true,
      openai_status: err.status || 'error',
      openai_error_code: err.code || 'openai_error',
      error_message: err.message,
    });

    return json(res, 502, {
      error: UI_TECHNICAL,
      meta: buildMeta({
        requestId,
        sessionId,
        knowledge,
        usedFallback: true,
        intent,
        openaiStatus: String(err.status || 'error'),
        openaiErrorCode: err.code || 'openai_error',
        historyCount: history.length,
      }),
      fallback: true,
    });
  }
}

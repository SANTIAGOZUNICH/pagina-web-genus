/**
 * Creamy V2 — API Chat
 * POST /api/creamy-v2/chat
 *
 * Flujo: Usuario → System Prompt + Knowledge (contexto) → Historial → Gemini → Respuesta
 */

import { loadKnowledge } from '../../backend/creamy-v2/lib/knowledge.js';
import { buildSystemPrompt } from '../../backend/creamy-v2/lib/prompt.js';
import { generateAIResponse, getActiveProviderName, getProviderModel } from '../../backend/creamy-v2/lib/ai/provider.js';
import { detectIntents, inferIntent } from '../../backend/creamy-v2/lib/intents.js';
import { StorageAdapter } from '../../backend/creamy-v2/lib/storage.js';
import { extractMentionedEntities } from '../../backend/creamy-v2/lib/entities.js';
import {
  parseJsonBody,
  sanitizeHistory,
  normalizeUserMessage,
  getEmergencyMessage,
} from '../../backend/creamy-v2/lib/request.js';

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
  provider,
  usedAi = false,
  usedFallback = false,
  intent = null,
  model = null,
  tokens = null,
  aiStatus = null,
  aiErrorCode = null,
  historyCount = 0,
}) {
  return {
    request_id: requestId,
    session_id: sessionId,
    provider,
    model,
    used_ai: usedAi,
    used_openai: provider === 'openai' && usedAi,
    used_fallback: usedFallback,
    intent,
    tokens_used: tokens,
    ai_status: aiStatus,
    ai_error_code: aiErrorCode,
    history_messages: historyCount,
    knowledge_version: knowledge?.version,
  };
}

function logEvent(requestId, data) {
  console.log('[CreamyV2]', JSON.stringify({ request_id: requestId, ...data }));
}

export default async function handler(req, res) {
  const requestId = makeRequestId();
  const provider = getActiveProviderName();
  const model = getProviderModel(provider);

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
      meta: buildMeta({ requestId, sessionId: 'n/a', knowledge: null, provider, usedFallback: true, aiErrorCode: 'rate_limit' }),
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
  const userFirstName = typeof body.user_first_name === 'string'
    ? body.user_first_name.trim().slice(0, 60)
    : (typeof body.user_name === 'string' ? body.user_name.trim().slice(0, 60) : '');
  const userLastName = typeof body.user_last_name === 'string'
    ? body.user_last_name.trim().slice(0, 60)
    : '';
  const intent = inferIntent(message, history.length);

  let knowledge;
  let systemPrompt;
  try {
    knowledge = loadKnowledge();
    systemPrompt = buildSystemPrompt({ knowledge, pageKey, pageUrl, pageTitle });
  } catch (err) {
    logEvent(requestId, { provider, used_ai: false, used_fallback: true, ai_error_code: 'knowledge_load_error', error: err.message });
    return json(res, 500, {
      error: UI_TECHNICAL,
      meta: buildMeta({
        requestId, sessionId, knowledge: null, provider, usedFallback: true, intent,
        aiErrorCode: 'knowledge_load_error', historyCount: history.length,
      }),
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  logEvent(requestId, {
    phase: 'request_start',
    provider,
    model,
    intent,
    history_count: history.length,
    message_len: message.length,
    gemini_key_present: !!geminiKey,
    openai_key_present: !!openaiKey,
    gemini_key_prefix: geminiKey ? `${geminiKey.slice(0, 6)}...` : null,
  });

  if (provider === 'gemini' && !geminiKey) {
    logEvent(requestId, { used_ai: false, used_fallback: true, ai_error_code: 'missing_gemini_key' });
    const emergency = getEmergencyMessage(knowledge);
    const entities = extractMentionedEntities(message, knowledge);
    StorageAdapter.logChatTurn({
      session_id: sessionId,
      user_first_name: userFirstName,
      user_last_name: userLastName,
      page_key: pageKey,
      user_message: message,
      assistant_reply: emergency,
      intent,
      producto_mencionado: entities.producto_mencionado,
      activos_mencionados: entities.activos_mencionados,
      provider,
      model,
      used_ai: false,
      used_fallback: true,
    });
    return json(res, 503, {
      error: emergency,
      reply: emergency,
      message: emergency,
      meta: buildMeta({
        requestId, sessionId, knowledge, provider, model, usedFallback: true, intent,
        aiErrorCode: 'missing_gemini_key', aiStatus: 'not_configured', historyCount: history.length,
      }),
      fallback: true,
    });
  }

  const messages = [...history, { role: 'user', content: message }];

  try {
    let result;
    try {
      result = await generateAIResponse({
        systemPrompt,
        messages,
        maxTokens: 1100,
        temperature: 0.58,
        provider,
      });
    } catch (firstErr) {
      const retryable = !firstErr.status || firstErr.status >= 500 || firstErr.code === 'ECONNRESET' || firstErr.code === 'timeout';
      if (retryable) {
        logEvent(requestId, { ai_retry: true, ai_error_code: firstErr.code, ai_status: firstErr.status });
        await new Promise((r) => setTimeout(r, 800));
        result = await generateAIResponse({ systemPrompt, messages, maxTokens: 1100, temperature: 0.58, provider });
      } else {
        throw firstErr;
      }
    }

    if (!result.reply) {
      logEvent(requestId, { used_ai: true, used_fallback: false, ai_error_code: 'empty_reply', provider });
      return json(res, 502, {
        error: UI_TECHNICAL,
        meta: buildMeta({
          requestId, sessionId, knowledge, provider, model: result.model, usedAi: true, intent,
          aiStatus: 'empty_reply', aiErrorCode: 'empty_reply', historyCount: history.length,
        }),
        fallback: true,
      });
    }

    const actions = detectIntents(message, result.reply, history.length + 1);
    const entities = extractMentionedEntities(`${message}\n${result.reply}`, knowledge);

    logEvent(requestId, {
      used_ai: true,
      used_fallback: false,
      provider: result.provider,
      ai_status: 'ok',
      model: result.model,
      tokens_used: result.usage?.total_tokens,
      intent,
    });

    await StorageAdapter.saveConversation(sessionId, {
      message_count: history.length + 1,
      page_key: pageKey,
      user_first_name: userFirstName,
      user_last_name: userLastName,
      last_user_preview: message.slice(0, 80),
    });

    StorageAdapter.logChatTurn({
      session_id: sessionId,
      user_first_name: userFirstName,
      user_last_name: userLastName,
      page_key: pageKey,
      user_message: message,
      assistant_reply: result.reply,
      intent,
      producto_mencionado: entities.producto_mencionado,
      activos_mencionados: entities.activos_mencionados,
      provider: result.provider,
      model: result.model,
      used_ai: true,
      used_fallback: false,
    });

    if (actions.length) {
      await StorageAdapter.trackMetric('creamy_v2_lead_signal', {
        actions, sessionId, user_first_name: userFirstName, user_last_name: userLastName,
      });
    }

    return json(res, 200, {
      reply: result.reply,
      message: result.reply,
      actions,
      meta: buildMeta({
        requestId, sessionId, knowledge, provider: result.provider, model: result.model,
        usedAi: true, usedFallback: false, intent, tokens: result.usage?.total_tokens,
        aiStatus: 'ok', historyCount: history.length,
      }),
    });
  } catch (err) {
    logEvent(requestId, {
      used_ai: false,
      used_fallback: true,
      provider,
      ai_status: err.status || 'error',
      ai_error_code: err.code || 'ai_error',
      ai_error_type: err.type || null,
      ai_error_body: err.providerBody ? JSON.stringify(err.providerBody).slice(0, 500) : null,
      error_message: err.message,
    });

    const entities = extractMentionedEntities(message, knowledge);
    StorageAdapter.logChatTurn({
      session_id: sessionId,
      user_first_name: userFirstName,
      user_last_name: userLastName,
      page_key: pageKey,
      user_message: message,
      assistant_reply: UI_TECHNICAL,
      intent,
      producto_mencionado: entities.producto_mencionado,
      activos_mencionados: entities.activos_mencionados,
      provider,
      model,
      used_ai: false,
      used_fallback: true,
    });

    return json(res, 502, {
      error: UI_TECHNICAL,
      meta: buildMeta({
        requestId, sessionId, knowledge, provider, model,
        usedFallback: true, intent,
        aiStatus: String(err.status || 'error'),
        aiErrorCode: err.code || 'ai_error',
        historyCount: history.length,
      }),
      fallback: true,
    });
  }
}

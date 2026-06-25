// api/creamy/chat.js
// Vercel Serverless Function — Creamy AI Backend C2
// Incluye: logs de diagnóstico, rate limiting básico, system prompt completo, knowledge injection

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 700;
const TEMPERATURE = 0.4;
const MAX_HISTORY_TURNS = 12; // máximo de turnos de conversación a mantener

// Rate limiting simple en memoria (se reinicia con cada cold start de Vercel)
// Para producción real: usar Upstash Redis
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;       // max mensajes por IP por ventana
const RATE_LIMIT_WINDOW = 3600000; // 1 hora en ms

// ─────────────────────────────────────────────
// LOGGER — logs seguros para diagnóstico
// En producción, solo loggea metadata, nunca contenido de conversación
// ─────────────────────────────────────────────
const log = {
  info: (tag, data) => {
    const safe = { ...data };
    // nunca loggear contenido de mensajes en producción
    if (safe.message) safe.message = '[REDACTED]';
    if (safe.content) safe.content = '[REDACTED]';
    console.log(`[CREAMY:${tag}]`, JSON.stringify(safe));
  },
  error: (tag, err) => {
    console.error(`[CREAMY:ERROR:${tag}]`, {
      message: err.message,
      code: err.code,
      status: err.status,
      type: err.type,
    });
  },
  debug: (tag, data) => {
    // solo en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CREAMY:DEBUG:${tag}]`, data);
    }
  }
};

// ─────────────────────────────────────────────
// CARGAR SYSTEM PROMPT
// ─────────────────────────────────────────────
function loadSystemPrompt() {
  try {
    const promptPath = path.join(process.cwd(), 'backend/creamy/prompts/system-prompt.txt');
    const prompt = fs.readFileSync(promptPath, 'utf-8');
    log.info('PROMPT', { loaded: true, chars: prompt.length });
    return prompt;
  } catch (err) {
    log.error('PROMPT_LOAD', err);
    // fallback mínimo de emergencia — suficiente para no romperse, pero debe solucionarse
    return `Sos Creamy, el asistente de Laboratorio Genus. 
Respondés consultas sobre desarrollo cosmético y fabricación tercerizada.
MOQ mínimo: 500 unidades. Llave en mano desde 5000 unidades.
No fabricamos bálsamos en barra. Sí fabricamos bálsamos y pomadas en lata.`;
  }
}

// ─────────────────────────────────────────────
// CARGAR BASE DE CONOCIMIENTO
// ─────────────────────────────────────────────
function loadKnowledge() {
  try {
    const knowledgePath = path.join(process.cwd(), 'assets/creamy/creamy-knowledge.json');
    const raw = fs.readFileSync(knowledgePath, 'utf-8');
    const knowledge = JSON.parse(raw);
    log.info('KNOWLEDGE', { 
      loaded: true, 
      products: knowledge.products?.length ?? 0,
      actives: knowledge.actives?.length ?? 0,
      services: knowledge.services?.length ?? 0,
    });
    return knowledge;
  } catch (err) {
    log.error('KNOWLEDGE_LOAD', err);
    log.info('KNOWLEDGE', { loaded: false, reason: 'file_not_found_or_invalid' });
    return null;
  }
}

// ─────────────────────────────────────────────
// CONSTRUIR SYSTEM PROMPT COMPLETO CON KNOWLEDGE
// ─────────────────────────────────────────────
function buildFullSystemPrompt(basePrompt, knowledge) {
  if (!knowledge) {
    log.info('SYSTEM_PROMPT', { knowledge_injected: false });
    return basePrompt;
  }

  const knowledgeSection = `

---

# BASE DE CONOCIMIENTO DEL LABORATORIO

${knowledge.products?.length ? `## Productos disponibles
${knowledge.products.map(p => `- ${p.nombre}: ${p.descripcion}`).join('\n')}
` : ''}

${knowledge.actives?.length ? `## Activos con los que trabajamos
${knowledge.actives.map(a => `- ${a.nombre}: ${a.descripcion}${a.consideraciones ? ` | Consideración: ${a.consideraciones}` : ''}`).join('\n')}
` : ''}

${knowledge.services?.length ? `## Servicios
${knowledge.services.map(s => `- ${s.nombre}: ${s.descripcion}`).join('\n')}
` : ''}

${knowledge.restrictions ? `## Restricciones vigentes
${JSON.stringify(knowledge.restrictions, null, 2)}
` : ''}
`;

  const fullPrompt = basePrompt + knowledgeSection;
  log.info('SYSTEM_PROMPT', { 
    knowledge_injected: true,
    total_chars: fullPrompt.length,
    estimated_tokens: Math.round(fullPrompt.length / 4),
  });

  return fullPrompt;
}

// ─────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────
function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const record = rateLimitMap.get(key);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    log.info('RATE_LIMIT', { ip: key.substring(0, 8) + '...', blocked: true });
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// ─────────────────────────────────────────────
// DETECTAR SI LA RESPUESTA ES FALLBACK
// ─────────────────────────────────────────────
function detectFallback(responseText) {
  const fallbackPhrases = [
    'no puedo ayudarte con eso',
    'como ia, no tengo',
    'no tengo acceso',
    'lo siento, no',
  ];
  const lower = responseText.toLowerCase();
  return fallbackPhrases.some(phrase => lower.includes(phrase));
}

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = Math.random().toString(36).substring(2, 9);
  log.info('REQUEST_START', { requestId, method: req.method });

  // ── RATE LIMITING ──
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ 
      error: 'Demasiadas solicitudes. Por favor esperá unos minutos.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  // ── VALIDAR BODY ──
  const { message, conversation_history = [], session_id, page_url } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mensaje vacío o inválido.', code: 'INVALID_MESSAGE' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Mensaje demasiado largo.', code: 'MESSAGE_TOO_LONG' });
  }

  log.info('REQUEST_META', { 
    requestId, 
    session_id: session_id?.substring(0, 8) + '...',
    page_url,
    history_turns: conversation_history.length,
    message_len: message.length,
  });

  // ── VERIFICAR API KEY ──
  if (!process.env.OPENAI_API_KEY) {
    log.error('CONFIG', new Error('OPENAI_API_KEY not set in environment'));
    return res.status(500).json({ 
      error: 'Error de configuración del servidor.',
      code: 'MISSING_API_KEY',
      // diagnóstico visible solo en desarrollo
      ...(process.env.NODE_ENV !== 'production' && { 
        debug: 'OPENAI_API_KEY environment variable is not set in Vercel' 
      })
    });
  }

  log.info('API_KEY', { present: true, prefix: process.env.OPENAI_API_KEY.substring(0, 7) + '...' });

  // ── CARGAR PROMPT Y KNOWLEDGE ──
  const basePrompt = loadSystemPrompt();
  const knowledge = loadKnowledge();
  const systemPrompt = buildFullSystemPrompt(basePrompt, knowledge);

  // ── PREPARAR HISTORIAL (limitar a MAX_HISTORY_TURNS para controlar tokens) ──
  const trimmedHistory = conversation_history
    .filter(m => m.role && m.content)
    .slice(-MAX_HISTORY_TURNS * 2); // *2 porque cada turno = 1 user + 1 assistant

  const messages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user', content: message.trim() }
  ];

  log.info('OPENAI_REQUEST', { 
    requestId,
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    total_messages: messages.length,
    system_prompt_chars: systemPrompt.length,
    knowledge_loaded: !!knowledge,
  });

  // ── LLAMAR A OPENAI ──
  let openaiResponse;
  let usedFallback = false;
  const callStart = Date.now();

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    openaiResponse = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages,
    });

    const elapsed = Date.now() - callStart;
    log.info('OPENAI_RESPONSE', { 
      requestId,
      success: true,
      elapsed_ms: elapsed,
      model_used: openaiResponse.model,
      finish_reason: openaiResponse.choices[0]?.finish_reason,
      usage: {
        prompt_tokens: openaiResponse.usage?.prompt_tokens,
        completion_tokens: openaiResponse.usage?.completion_tokens,
        total_tokens: openaiResponse.usage?.total_tokens,
      }
    });

  } catch (err) {
    const elapsed = Date.now() - callStart;
    log.error('OPENAI_CALL', err);
    log.info('OPENAI_FAILED', { 
      requestId, 
      elapsed_ms: elapsed,
      error_type: err.constructor.name,
      error_status: err.status,
      error_code: err.code,
    });

    // Respuesta de error amigable al usuario
    return res.status(502).json({
      error: 'Creamy no está disponible en este momento. Por favor intentá de nuevo.',
      code: 'OPENAI_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { debug: err.message })
    });
  }

  // ── PROCESAR RESPUESTA ──
  const rawText = openaiResponse.choices[0]?.message?.content || '';

  if (!rawText) {
    log.error('RESPONSE_EMPTY', new Error('OpenAI returned empty content'));
    return res.status(502).json({ error: 'Respuesta vacía del modelo.', code: 'EMPTY_RESPONSE' });
  }

  // Detectar si cayó en fallback
  if (detectFallback(rawText)) {
    usedFallback = true;
    log.info('FALLBACK_DETECTED', { requestId, used_fallback: true });
  }

  // Extraer bloque de acciones si existe (para los botones de conversión)
  const actionsMatch = rawText.match(/---ACCIONES---([\s\S]*?)---FIN---/);
  const actions = actionsMatch
    ? actionsMatch[1].trim().split('\n').map(a => a.trim()).filter(Boolean)
    : [];

  // Limpiar el texto para el usuario (sin el bloque de acciones)
  const cleanText = rawText.replace(/---ACCIONES---([\s\S]*?)---FIN---/, '').trim();

  log.info('RESPONSE_PROCESSED', { 
    requestId,
    response_chars: cleanText.length,
    has_actions: actions.length > 0,
    actions,
    used_fallback: usedFallback,
  });

  // ── RESPUESTA FINAL ──
  return res.status(200).json({
    reply: cleanText,
    actions,                                    // ["CONFIGURADOR", "COTIZACION", "WHATSAPP"]
    session_id,
    meta: {
      model: openaiResponse.model,
      tokens_used: openaiResponse.usage?.total_tokens,
      knowledge_loaded: !!knowledge,
      used_fallback: usedFallback,
      request_id: requestId,
    }
  });
}

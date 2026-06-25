/*!
 * CREAMY AI - Backend API Endpoint
 * Fase C2 - Inteligencia Artificial Real con OpenAI
 * POST /api/creamy/chat
 * Arquitectura: docs/CREAMY_AI_ARCHITECTURE_v1.md
 */

import fs from 'fs';
import path from 'path';

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 700;
const TEMPERATURE = 0.4;
const MAX_HISTORY_TURNS = 12;

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 3600000;

const log = {
  info: (tag, data) => {
    const safe = { ...data };
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
};

function loadSystemPrompt() {
  const candidates = [
    path.join(process.cwd(), 'backend/creamy/prompts/system-prompt.txt'),
    path.join(process.cwd(), 'docs/creamy-debug/system-prompt.txt'),
  ];

  for (const promptPath of candidates) {
    try {
      const prompt = fs.readFileSync(promptPath, 'utf-8');
      log.info('PROMPT', { loaded: true, chars: prompt.length, path: promptPath });
      return prompt;
    } catch (_) {
      // try next path
    }
  }

  log.error('PROMPT_LOAD', new Error('system-prompt.txt not found'));
  return `Sos Creamy, el asistente de Laboratorio Genus.
Respondés consultas sobre desarrollo cosmético y fabricación tercerizada.
MOQ mínimo: 500 unidades. Llave en mano desde 5000 unidades.
No fabricamos bálsamos en barra. Sí fabricamos bálsamos y pomadas en lata.
Inferí información del mensaje antes de preguntar. No repreguntes lo que el usuario ya dijo.`;
}

function loadKnowledge() {
  const candidates = [
    path.join(process.cwd(), 'assets/creamy/creamy-knowledge.json'),
    path.join(process.cwd(), 'docs/creamy-debug/creamy-knowledge.json'),
  ];

  for (const knowledgePath of candidates) {
    try {
      const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
      log.info('KNOWLEDGE', {
        loaded: true,
        products: knowledge.products?.length ?? 0,
        actives: knowledge.actives?.length ?? 0,
        services: knowledge.services?.length ?? 0,
      });
      return knowledge;
    } catch (_) {
      // try next path
    }
  }

  log.info('KNOWLEDGE', { loaded: false, reason: 'file_not_found_or_invalid' });
  return null;
}

function buildFullSystemPrompt(basePrompt, knowledge, pageContext) {
  let fullPrompt = basePrompt;

  if (pageContext) {
    fullPrompt += `

---

# CONTEXTO DE LA PÁGINA ACTUAL

El usuario está navegando: ${pageContext.title || 'el sitio web'} (${pageContext.url || 'desconocida'}).
${pageContext.hint ? `Contexto útil: ${pageContext.hint}` : ''}
Adaptá tu respuesta al contexto de la página cuando sea relevante, sin forzarlo.`;
  }

  if (!knowledge) {
    log.info('SYSTEM_PROMPT', { knowledge_injected: false });
    return fullPrompt;
  }

  const knowledgeSection = `

---

# BASE DE CONOCIMIENTO DEL LABORATORIO

${knowledge.products?.length ? `## Productos disponibles
${knowledge.products.map((p) => `- ${p.nombre}: ${p.descripcion}`).join('\n')}
` : ''}

${knowledge.actives?.length ? `## Activos con los que trabajamos
${knowledge.actives.map((a) => `- ${a.nombre}: ${a.descripcion}${a.consideraciones ? ` | Consideración: ${a.consideraciones}` : ''}`).join('\n')}
` : ''}

${knowledge.services?.length ? `## Servicios
${knowledge.services.map((s) => `- ${s.nombre}: ${s.descripcion}`).join('\n')}
` : ''}

${knowledge.restrictions ? `## Restricciones vigentes
${JSON.stringify(knowledge.restrictions, null, 2)}
` : ''}
`;

  fullPrompt += knowledgeSection;
  log.info('SYSTEM_PROMPT', {
    knowledge_injected: true,
    total_chars: fullPrompt.length,
    estimated_tokens: Math.round(fullPrompt.length / 4),
  });

  return fullPrompt;
}

function getPageContext(pageUrl, pageTitle) {
  const url = (pageUrl || '').toLowerCase();
  const title = pageTitle || '';

  if (url.includes('productos')) {
    return { title, url: pageUrl, hint: 'El usuario está viendo el catálogo de productos. Puede estar explorando qué desarrollar.' };
  }
  if (url.includes('cotizador') || url.includes('desarrolla-tu-producto') || url.includes('crea-tu-producto')) {
    return { title, url: pageUrl, hint: 'El usuario está en el configurador o proceso de creación de producto. Ofrecé ayuda técnica con activos y formulación.' };
  }
  if (url.includes('contacto')) {
    return { title, url: pageUrl, hint: 'El usuario está en contacto/cotización. Puede tener dudas antes de enviar el formulario.' };
  }
  if (url.includes('calidad')) {
    return { title, url: pageUrl, hint: 'El usuario está revisando calidad y procesos del laboratorio.' };
  }
  if (url.includes('llave-en-mano')) {
    return { title, url: pageUrl, hint: 'El usuario está evaluando el servicio llave en mano (desde 5.000 unidades).' };
  }
  if (url.includes('quienes-somos')) {
    return { title, url: pageUrl, hint: 'El usuario está conociendo al laboratorio.' };
  }

  return { title, url: pageUrl, hint: null };
}

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

function detectFallback(responseText) {
  const fallbackPhrases = [
    'no puedo ayudarte con eso',
    'como ia, no tengo',
    'no tengo acceso',
    'lo siento, no',
  ];
  const lower = responseText.toLowerCase();
  return fallbackPhrases.some((phrase) => lower.includes(phrase));
}

function detectIntention(message, actions) {
  if (actions.length > 0) return 'LISTO_PARA_AVANZAR';

  const lower = (message || '').toLowerCase();
  if (lower.includes('asesor') || lower.includes('hablar con') || lower.includes('whatsapp')) {
    return 'LEAD_CALIFICADO';
  }
  if (lower.includes('cotiz') || lower.includes('precio') || lower.includes('moq') || lower.includes('muestra')) {
    return 'LISTO_PARA_AVANZAR';
  }
  if (lower.includes('quiero') || lower.includes('necesito') || lower.includes('busco')) {
    return 'INTERESADO';
  }
  return 'EXPLORANDO';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = Math.random().toString(36).substring(2, 9);
  log.info('REQUEST_START', { requestId, method: req.method });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes. Por favor esperá unos minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  const { message, conversation_history = [], session_id, page_url, page_title } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mensaje vacío o inválido.', code: 'INVALID_MESSAGE' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Mensaje demasiado largo.', code: 'MESSAGE_TOO_LONG' });
  }

  const sanitizedMessage = message.trim().replace(/<[^>]*>/g, '');

  log.info('REQUEST_META', {
    requestId,
    session_id: session_id?.substring(0, 8) + '...',
    page_url,
    history_turns: conversation_history.length,
    message_len: sanitizedMessage.length,
  });

  if (!process.env.OPENAI_API_KEY) {
    log.error('CONFIG', new Error('OPENAI_API_KEY not set in environment'));
    return res.status(500).json({
      error: 'Error de configuración del servidor.',
      code: 'MISSING_API_KEY',
      ...(process.env.NODE_ENV !== 'production' && {
        debug: 'OPENAI_API_KEY environment variable is not set in Vercel',
      }),
    });
  }

  log.info('API_KEY', { present: true, prefix: process.env.OPENAI_API_KEY.substring(0, 7) + '...' });

  const basePrompt = loadSystemPrompt();
  const knowledge = loadKnowledge();
  const pageContext = getPageContext(page_url, page_title);
  const systemPrompt = buildFullSystemPrompt(basePrompt, knowledge, pageContext);

  const trimmedHistory = conversation_history
    .filter((m) => m.role && m.content)
    .slice(-MAX_HISTORY_TURNS * 2);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user', content: sanitizedMessage },
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

  let openaiResponse;
  let usedFallback = false;
  const callStart = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }

    openaiResponse = await response.json();

    log.info('OPENAI_RESPONSE', {
      requestId,
      success: true,
      elapsed_ms: Date.now() - callStart,
      model_used: openaiResponse.model,
      finish_reason: openaiResponse.choices[0]?.finish_reason,
      usage: {
        prompt_tokens: openaiResponse.usage?.prompt_tokens,
        completion_tokens: openaiResponse.usage?.completion_tokens,
        total_tokens: openaiResponse.usage?.total_tokens,
      },
    });
  } catch (err) {
    log.error('OPENAI_CALL', err);
    log.info('OPENAI_FAILED', {
      requestId,
      elapsed_ms: Date.now() - callStart,
      error_type: err.constructor.name,
    });

    return res.status(502).json({
      error: 'Creamy no está disponible en este momento. Por favor intentá de nuevo.',
      code: 'OPENAI_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { debug: err.message }),
    });
  }

  const rawText = openaiResponse.choices[0]?.message?.content || '';

  if (!rawText) {
    log.error('RESPONSE_EMPTY', new Error('OpenAI returned empty content'));
    return res.status(502).json({ error: 'Respuesta vacía del modelo.', code: 'EMPTY_RESPONSE' });
  }

  if (detectFallback(rawText)) {
    usedFallback = true;
    log.info('FALLBACK_DETECTED', { requestId, used_fallback: true });
  }

  const actionsMatch = rawText.match(/---ACCIONES---([\s\S]*?)---FIN---/);
  const actions = actionsMatch
    ? actionsMatch[1].trim().split('\n').map((a) => a.trim()).filter(Boolean)
    : [];

  const cleanText = rawText.replace(/---ACCIONES---([\s\S]*?)---FIN---/, '').trim();
  const intention = detectIntention(sanitizedMessage, actions);

  log.info('RESPONSE_PROCESSED', {
    requestId,
    response_chars: cleanText.length,
    has_actions: actions.length > 0,
    actions,
    intention,
    used_fallback: usedFallback,
  });

  return res.status(200).json({
    reply: cleanText,
    message: cleanText,
    actions,
    showConversionChips: actions.length > 0,
    intention,
    session_id,
    meta: {
      model: openaiResponse.model,
      tokens_used: openaiResponse.usage?.total_tokens,
      knowledge_loaded: !!knowledge,
      used_fallback: usedFallback,
      request_id: requestId,
    },
  });
}

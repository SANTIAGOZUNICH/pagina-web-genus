/**
 * Creamy V2 — Diagnóstico OpenAI (sin exponer API key)
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';
const DEFAULT_MODEL = 'gpt-4o-mini';
const PROBE_TIMEOUT_MS = 15000;

function redactSecrets(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, 'sk-[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
}

function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  if (vercelEnv === 'development') return 'development';
  if (process.env.NODE_ENV === 'production') return 'production';
  return process.env.NODE_ENV || 'local';
}

function getKeyInfo() {
  const raw = process.env.OPENAI_API_KEY;
  const trimmed = raw?.trim() || '';
  return {
    openai_key_present: trimmed.length > 0,
    openai_key_length: trimmed.length,
    openai_key_prefix: trimmed ? `${trimmed.slice(0, 7)}...` : null,
    openai_key_has_whitespace: raw != null && raw !== trimmed,
    openai_key_env_var_name: 'OPENAI_API_KEY',
  };
}

async function fetchOpenAI(url, apiKey, body, timeoutMs = PROBE_TIMEOUT_MS) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const latencyMs = Date.now() - started;
    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw_text: text.slice(0, 500) };
    }

    return { ok: res.ok, status: res.status, data, latencyMs, aborted: false };
  } catch (err) {
    const latencyMs = Date.now() - started;
    if (err.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        data: { error: { message: 'Request timeout', code: 'timeout', type: 'timeout' } },
        latencyMs,
        aborted: true,
      };
    }
    return {
      ok: false,
      status: 0,
      data: { error: { message: err.message, code: err.code || 'network_error', type: 'network' } },
      latencyMs,
      aborted: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

function formatOpenAIError(data, httpStatus) {
  const e = data?.error || {};
  return {
    http_status: httpStatus,
    type: e.type || null,
    code: e.code || null,
    message: redactSecrets(e.message || 'Unknown error'),
    param: e.param || null,
  };
}

/**
 * Probe mínimo: 1 mensaje, pocos tokens — valida key + modelo + conectividad.
 */
export async function probeOpenAI(model = DEFAULT_MODEL) {
  const keyInfo = getKeyInfo();
  const environment = getEnvironment();

  const base = {
    model,
    environment,
    timestamp: new Date().toISOString(),
    ...keyInfo,
    vercel: {
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      VERCEL_URL: process.env.VERCEL_URL || null,
      VERCEL_REGION: process.env.VERCEL_REGION || null,
    },
    node_version: process.version,
  };

  if (!keyInfo.openai_key_present) {
    return {
      ...base,
      can_connect_to_openai: false,
      openai_status: 'not_configured',
      last_error: {
        http_status: null,
        type: 'configuration',
        code: 'missing_openai_key',
        message: 'OPENAI_API_KEY no está definida o está vacía en el runtime de Vercel/Node.',
        param: null,
      },
      diagnosis: 'ROOT_CAUSE: OPENAI_API_KEY ausente en este entorno. Verificar Vercel → Settings → Environment Variables → Preview + Production.',
    };
  }

  const apiKey = process.env.OPENAI_API_KEY.trim();

  // 1) Auth probe — GET /v1/models (liviano)
  const modelsProbe = await fetchOpenAI(OPENAI_MODELS_URL, apiKey, null, 10000);

  if (!modelsProbe.ok) {
    const err = formatOpenAIError(modelsProbe.data, modelsProbe.status);
    return {
      ...base,
      can_connect_to_openai: false,
      openai_status: String(modelsProbe.status),
      models_probe_latency_ms: modelsProbe.latencyMs,
      last_error: err,
      openai_error_body: redactSecrets(JSON.stringify(modelsProbe.data?.error || modelsProbe.data)).slice(0, 800),
      diagnosis: diagnoseFromError(err, modelsProbe.aborted),
    };
  }

  // 2) Chat probe — gpt-4o-mini respuesta mínima
  const chatProbe = await fetchOpenAI(
    OPENAI_CHAT_URL,
    apiKey,
    {
      model,
      messages: [{ role: 'user', content: 'Respondé solo: OK' }],
      max_tokens: 5,
      temperature: 0,
    },
    PROBE_TIMEOUT_MS,
  );

  if (!chatProbe.ok) {
    const err = formatOpenAIError(chatProbe.data, chatProbe.status);
    return {
      ...base,
      can_connect_to_openai: true,
      openai_status: String(chatProbe.status),
      models_probe_latency_ms: modelsProbe.latencyMs,
      chat_probe_latency_ms: chatProbe.latencyMs,
      last_error: err,
      openai_error_body: redactSecrets(JSON.stringify(chatProbe.data?.error || chatProbe.data)).slice(0, 800),
      diagnosis: diagnoseFromError(err, chatProbe.aborted),
    };
  }

  const reply = chatProbe.data?.choices?.[0]?.message?.content?.trim() || '';

  return {
    ...base,
    can_connect_to_openai: true,
    openai_status: 'ok',
    models_probe_latency_ms: modelsProbe.latencyMs,
    chat_probe_latency_ms: chatProbe.latencyMs,
    chat_probe_reply: reply.slice(0, 50),
    chat_probe_model: chatProbe.data?.model || model,
    last_error: null,
    diagnosis: 'OpenAI responde correctamente. Si /chat falla, el problema está en el payload del chat (system prompt, historial o timeout del handler).',
  };
}

function diagnoseFromError(err, aborted) {
  if (aborted || err.code === 'timeout') {
    return 'ROOT_CAUSE probable: TIMEOUT — OpenAI no respondió dentro del límite. Revisar latencia o aumentar timeout.';
  }
  if (err.http_status === 401 || err.code === 'invalid_api_key') {
    return 'ROOT_CAUSE: API KEY INVÁLIDA — la key existe en runtime pero OpenAI la rechaza (401 invalid_api_key). Regenerar key en platform.openai.com y actualizar Vercel.';
  }
  if (err.http_status === 403) {
    return 'ROOT_CAUSE probable: PERMISOS — proyecto OpenAI sin acceso al modelo o cuenta restringida (403).';
  }
  if (err.http_status === 429 || err.code === 'rate_limit_exceeded') {
    return 'ROOT_CAUSE: RATE LIMIT — OpenAI devolvió 429. Esperar o revisar cuota/billing.';
  }
  if (err.http_status === 404 && /model/i.test(err.message || '')) {
    return 'ROOT_CAUSE: MODELO — gpt-4o-mini no disponible para esta cuenta (404 model).';
  }
  if (err.http_status >= 500) {
    return 'ROOT_CAUSE probable: OPENAI SERVER ERROR — problema temporal del lado de OpenAI (5xx).';
  }
  if (err.http_status === 0) {
    return 'ROOT_CAUSE probable: RED — fetch a api.openai.com falló (network/DNS/firewall en Vercel).';
  }
  return `ROOT_CAUSE: OpenAI error HTTP ${err.http_status} code=${err.code} — ver openai_error_body en este endpoint.`;
}

export { DEFAULT_MODEL, getEnvironment, getKeyInfo, redactSecrets };

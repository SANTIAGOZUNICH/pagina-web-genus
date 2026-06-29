/**
 * Creamy V2 — Capa de abstracción IA
 * generateAIResponse() — único punto de entrada del chat
 */

import {
  getActiveProviderName,
  getKeyInfo,
  getProviderModel,
  getEnvironment,
  GEMINI_MODEL,
} from './config.js';
import { geminiGenerate, probeGemini } from './gemini-provider.js';
import { openaiGenerate, probeOpenAI } from './openai-provider.js';

export { getActiveProviderName, getKeyInfo, getProviderModel, getEnvironment, GEMINI_MODEL };

export async function generateAIResponse({
  systemPrompt,
  messages,
  maxTokens = 1100,
  temperature = 0.58,
  provider: forcedProvider,
}) {
  const provider = forcedProvider || getActiveProviderName();
  const model = getProviderModel(provider);

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      const err = new Error('OPENAI_API_KEY no configurada');
      err.code = 'missing_openai_key';
      err.status = 503;
      throw err;
    }
    return openaiGenerate({ apiKey, model, systemPrompt, messages, maxTokens, temperature });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY no configurada');
    err.code = 'missing_gemini_key';
    err.status = 503;
    throw err;
  }
  return geminiGenerate({ apiKey, model, systemPrompt, messages, maxTokens, temperature });
}

export async function probeAIProvider(provider = getActiveProviderName()) {
  const environment = getEnvironment();
  const model = getProviderModel(provider);
  const keyInfo = getKeyInfo(provider);

  const base = {
    provider,
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

  if (!keyInfo.key_present && !keyInfo.gemini_key_present) {
    const code = provider === 'gemini' ? 'missing_gemini_key' : 'missing_openai_key';
    return {
      ...base,
      can_connect: false,
      status: 'not_configured',
      last_error: {
        code,
        message: `${keyInfo.key_env} no está definida en el runtime.`,
        http_status: null,
      },
      diagnosis: `ROOT_CAUSE: ${keyInfo.key_env} ausente. Configurar en Vercel → Environment Variables → Preview + Production.`,
    };
  }

  const apiKey = provider === 'gemini'
    ? process.env.GEMINI_API_KEY.trim()
    : process.env.OPENAI_API_KEY.trim();

  const probe = provider === 'gemini'
    ? await probeGemini(apiKey, model)
    : await probeOpenAI(apiKey, model);

  if (!probe.ok) {
    return {
      ...base,
      can_connect: false,
      status: probe.status,
      probe_latency_ms: probe.latencyMs,
      last_error: probe.last_error,
      diagnosis: diagnoseError(provider, probe.last_error),
    };
  }

  return {
    ...base,
    can_connect: true,
    status: 'ok',
    probe_latency_ms: probe.latencyMs,
    probe_reply: probe.reply,
    last_error: null,
    diagnosis: `${provider} responde correctamente con modelo ${model}.`,
  };
}

function diagnoseError(provider, err) {
  if (!err) return 'Error desconocido';
  if (err.code === 'timeout') return 'ROOT_CAUSE: TIMEOUT al conectar con el proveedor IA.';
  if (err.http_status === 401 || err.http_status === 403) {
    return `ROOT_CAUSE: API KEY inválida o sin permisos para ${provider}.`;
  }
  if (err.http_status === 429) return 'ROOT_CAUSE: RATE LIMIT del proveedor IA.';
  return `ROOT_CAUSE: ${provider} error HTTP ${err.http_status} code=${err.code}`;
}

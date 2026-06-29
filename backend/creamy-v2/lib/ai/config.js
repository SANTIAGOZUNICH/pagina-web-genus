/**
 * Creamy V2 — Configuración de proveedor IA
 */

export const GEMINI_MODEL = process.env.CREAMY_GEMINI_MODEL || 'gemini-2.5-flash';
export const OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_PROVIDER = 'gemini';

export function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  if (vercelEnv === 'development') return 'development';
  return process.env.NODE_ENV || 'local';
}

export function getActiveProviderName() {
  const forced = (process.env.CREAMY_AI_PROVIDER || '').trim().toLowerCase();
  if (forced === 'openai' && process.env.OPENAI_API_KEY?.trim()) return 'openai';
  if (forced === 'gemini' && process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  return DEFAULT_PROVIDER;
}

export function getProviderModel(provider = getActiveProviderName()) {
  return provider === 'openai' ? OPENAI_MODEL : GEMINI_MODEL;
}

export function getKeyInfo(provider = getActiveProviderName()) {
  if (provider === 'openai') {
    const raw = process.env.OPENAI_API_KEY;
    const trimmed = raw?.trim() || '';
    return {
      provider: 'openai',
      key_present: trimmed.length > 0,
      key_prefix: trimmed ? `${trimmed.slice(0, 7)}...` : null,
      key_env: 'OPENAI_API_KEY',
      model: OPENAI_MODEL,
    };
  }
  const raw = process.env.GEMINI_API_KEY;
  const trimmed = raw?.trim() || '';
  return {
    provider: 'gemini',
    gemini_key_present: trimmed.length > 0,
    key_present: trimmed.length > 0,
    key_prefix: trimmed ? `${trimmed.slice(0, 6)}...` : null,
    key_env: 'GEMINI_API_KEY',
    model: GEMINI_MODEL,
  };
}

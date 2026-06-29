/**
 * Creamy V2 — Gemini Provider (@google/genai)
 */

import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from './config.js';

const TIMEOUT_MS = 28000;

function mapMessages(messages) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

function normalizeGeminiError(err) {
  const e = new Error(err.message || 'Gemini API error');
  e.status = err.status || err.statusCode || 0;
  e.code = err.code || err.name || 'gemini_error';
  e.type = err.name || 'GeminiError';
  e.providerBody = {
    message: err.message,
    status: err.status,
    code: err.code,
    name: err.name,
  };
  return e;
}

export async function geminiGenerate({
  apiKey,
  model = GEMINI_MODEL,
  systemPrompt,
  messages,
  maxTokens = 1100,
  temperature = 0.58,
}) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = mapMessages(messages);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
        abortSignal: controller.signal,
      },
    });

    const reply = (response.text || '').trim();
    const usage = response.usageMetadata;

    return {
      reply,
      model: response.modelVersion || model,
      provider: 'gemini',
      usage: usage
        ? {
            total_tokens: usage.totalTokenCount,
            prompt_tokens: usage.promptTokenCount,
            completion_tokens: usage.candidatesTokenCount,
          }
        : undefined,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = normalizeGeminiError(new Error('Gemini request timeout'));
      timeoutErr.status = 504;
      timeoutErr.code = 'timeout';
      throw timeoutErr;
    }
    throw normalizeGeminiError(err);
  } finally {
    clearTimeout(timer);
  }
}

export async function probeGemini(apiKey, model = GEMINI_MODEL) {
  const started = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: 'Respondé únicamente: OK',
      config: { maxOutputTokens: 8, temperature: 0 },
    });
    return {
      ok: true,
      status: 'ok',
      latencyMs: Date.now() - started,
      reply: (response.text || '').trim().slice(0, 20),
      model: response.modelVersion || model,
      last_error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: String(err.status || 'error'),
      latencyMs: Date.now() - started,
      reply: null,
      model,
      last_error: {
        http_status: err.status || null,
        code: err.code || err.name || 'gemini_error',
        type: err.name || 'GeminiError',
        message: err.message,
      },
    };
  }
}

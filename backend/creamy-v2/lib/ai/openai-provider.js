/**
 * Creamy V2 — OpenAI Provider (legacy)
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 28000;

function normalizeOpenAIError(data, status) {
  const err = new Error(data?.error?.message || `OpenAI error ${status}`);
  err.status = status;
  err.code = data?.error?.code;
  err.type = data?.error?.type;
  err.providerBody = data?.error || data;
  return err;
}

export async function openaiGenerate({
  apiKey,
  model = 'gpt-4o-mini',
  systemPrompt,
  messages,
  maxTokens = 1100,
  temperature = 0.58,
}) {
  const body = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: maxTokens,
    temperature,
    presence_penalty: 0.1,
    frequency_penalty: 0.2,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('OpenAI request timeout');
      timeoutErr.status = 504;
      timeoutErr.code = 'timeout';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json();
  if (!res.ok) throw normalizeOpenAIError(data, res.status);

  return {
    reply: data.choices?.[0]?.message?.content?.trim() || '',
    model: data.model,
    provider: 'openai',
    usage: data.usage
      ? {
          total_tokens: data.usage.total_tokens,
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
        }
      : undefined,
  };
}

export async function probeOpenAI(apiKey, model = 'gpt-4o-mini') {
  const started = Date.now();
  try {
    const result = await openaiGenerate({
      apiKey,
      model,
      systemPrompt: 'Respondé solo OK',
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 5,
      temperature: 0,
    });
    return {
      ok: true,
      status: 'ok',
      latencyMs: Date.now() - started,
      reply: result.reply?.slice(0, 20),
      model: result.model || model,
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
        code: err.code || 'openai_error',
        type: err.type || null,
        message: err.message,
      },
    };
  }
}

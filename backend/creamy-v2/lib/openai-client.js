/**
 * Creamy V2 — Cliente OpenAI
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export async function chatCompletion({
  apiKey,
  model = 'gpt-4o-mini',
  systemPrompt,
  messages,
  maxTokens = 900,
  temperature = 0.55,
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
  const timeout = setTimeout(() => controller.abort(), 28000);

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
    clearTimeout(timeout);
  }

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error?.message || `OpenAI error ${res.status}`);
    err.status = res.status;
    err.code = data.error?.code;
    throw err;
  }

  const reply = data.choices?.[0]?.message?.content?.trim() || '';
  return {
    reply,
    usage: data.usage,
    model: data.model,
  };
}

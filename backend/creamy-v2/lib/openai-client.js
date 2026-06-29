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

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

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

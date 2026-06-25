#!/usr/bin/env node
/**
 * Test local de Creamy AI — valida system prompt + knowledge + OpenAI
 * Uso: node scripts/test-creamy-local.js
 */

import fs from 'fs';
import path from 'path';

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 700;
const TEMPERATURE = 0.4;

function loadSystemPrompt() {
  const p = path.join(process.cwd(), 'backend/creamy/prompts/system-prompt.txt');
  return fs.readFileSync(p, 'utf-8');
}

function loadKnowledge() {
  const p = path.join(process.cwd(), 'assets/creamy/creamy-knowledge.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function buildFullSystemPrompt(basePrompt, knowledge) {
  const knowledgeSection = `

---

# BASE DE CONOCIMIENTO DEL LABORATORIO

${knowledge.products?.length ? `## Productos disponibles\n${knowledge.products.map((p) => `- ${p.nombre}: ${p.descripcion}`).join('\n')}\n` : ''}
${knowledge.actives?.length ? `## Activos\n${knowledge.actives.map((a) => `- ${a.nombre}: ${a.descripcion}`).join('\n')}\n` : ''}
${knowledge.services?.length ? `## Servicios\n${knowledge.services.map((s) => `- ${s.nombre}: ${s.descripcion}`).join('\n')}\n` : ''}
${knowledge.restrictions ? `## Restricciones\n${JSON.stringify(knowledge.restrictions, null, 2)}\n` : ''}
`;
  return basePrompt + knowledgeSection;
}

const TEST_CASES = [
  { id: 'T1', message: 'Quiero hacer un serum de niacinamida.', must_contain: ['serum', 'niacinamida'], must_not_contain: ['¿para qué zona', '¿qué zona'] },
  { id: 'T2', message: 'Quiero una crema antiage.', must_contain: ['crema', 'antiage'], must_not_contain: ['¿para qué zona'] },
  { id: 'T3', message: '¿Hacen crema de magnesio con árnica?', must_contain: ['sí', 'podemos'], must_not_contain: ['no trabajamos'] },
  { id: 'T4', message: '¿Trabajan con retinol?', must_contain: ['retinol', 'sí'], must_not_contain: ['no trabajamos con retinol'] },
  { id: 'T5', message: '¿Cuál es el MOQ?', must_contain: ['500'], must_not_contain: [] },
  { id: 'T6', message: '¿Hacen bálsamos en barra?', must_contain: ['no fabricamos', 'lata'], must_not_contain: ['sí hacemos bálsamos en barra'] },
  { id: 'T7', message: 'Quiero crear mi marca.', must_contain: ['500', 'desarrollo'], must_not_contain: [] },
  { id: 'T8', message: 'Necesito una muestra.', must_contain: ['muestra'], must_not_contain: [] },
  { id: 'T9', message: 'Quiero hablar con un asesor.', must_contain: ['asesor', 'whatsapp'], must_not_contain: [] },
  { id: 'T10', message: 'Quiero un shampoo con biotina.', must_contain: ['shampoo', 'biotina'], must_not_contain: ['¿para qué zona'] },
];

async function ask(systemPrompt, message) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.replace(/---ACCIONES---[\s\S]*?---FIN---/, '').trim();
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY no configurada');
    process.exit(1);
  }

  const systemPrompt = buildFullSystemPrompt(loadSystemPrompt(), loadKnowledge());
  console.log(`System prompt: ${systemPrompt.length} chars\n`);

  let passed = 0;
  for (const tc of TEST_CASES) {
    process.stdout.write(`[${tc.id}] ${tc.message.substring(0, 50)}... `);
    const reply = await ask(systemPrompt, tc.message);
    const lower = reply.toLowerCase();
    const failures = [];

    for (const p of tc.must_contain) {
      if (!lower.includes(p.toLowerCase())) failures.push(`falta "${p}"`);
    }
    for (const p of tc.must_not_contain) {
      if (lower.includes(p.toLowerCase())) failures.push(`prohibido "${p}"`);
    }

    if (failures.length === 0) {
      console.log('✅');
      passed++;
    } else {
      console.log('❌', failures.join(', '));
      console.log('  →', reply.substring(0, 200));
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n${passed}/${TEST_CASES.length} tests pasados`);
  process.exit(passed === TEST_CASES.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import { formatKnowledgeForPrompt, getPageHint } from './knowledge.js';

export function loadSystemPromptBase() {
  const file = path.join(process.cwd(), 'backend/creamy-v2/prompts/system-prompt.txt');
  return fs.readFileSync(file, 'utf-8');
}

export function buildSystemPrompt({ knowledge, pageKey, pageUrl, pageTitle }) {
  const base = loadSystemPromptBase();
  const kb = formatKnowledgeForPrompt(knowledge);
  const hint = getPageHint(pageKey, knowledge);

  let prompt = `${base}\n\n---\n\n${kb}`;

  if (pageUrl || pageTitle || hint) {
    prompt += `\n\n---\n\n# CONTEXTO DE NAVEGACIÓN\n`;
    if (pageTitle) prompt += `- Página: ${pageTitle}\n`;
    if (pageUrl) prompt += `- URL: ${pageUrl}\n`;
    if (hint) prompt += `- Hint: ${hint}\n`;
  }

  return prompt;
}

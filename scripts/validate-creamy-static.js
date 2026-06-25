#!/usr/bin/env node
/**
 * Validación estática de Creamy AI (sin llamada a OpenAI)
 */
import fs from 'fs';
import path from 'path';

let errors = 0;

function check(name, condition, detail) {
  if (!condition) {
    console.error(`❌ ${name}: ${detail}`);
    errors++;
  } else {
    console.log(`✅ ${name}`);
  }
}

const promptPath = path.join(process.cwd(), 'backend/creamy/prompts/system-prompt.txt');
const knowledgePath = path.join(process.cwd(), 'assets/creamy/creamy-knowledge.json');
const configPath = path.join(process.cwd(), 'assets/creamy/creamy-config.json');

const prompt = fs.readFileSync(promptPath, 'utf-8');
const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

check('System prompt cargado', prompt.length > 5000, `solo ${prompt.length} chars`);
check('Inferencia en prompt', prompt.includes('INFERENCIA ANTES DE PREGUNTAR'), 'falta regla de inferencia');
check('Acciones en prompt', prompt.includes('---ACCIONES---'), 'falta bloque de acciones');
check('Knowledge products', knowledge.products?.length > 0, 'sin productos');
check('Knowledge actives', knowledge.actives?.length > 0, 'sin activos');
check('Knowledge restrictions', !!knowledge.restrictions, 'sin restricciones');
check('Config useMock false', config.useMock === false, `useMock=${config.useMock}`);
check('Config apiEndpoint', config.apiEndpoint === '/api/creamy/chat', config.apiEndpoint);
check('Config pageContext', Object.keys(config.pageContext || {}).length >= 5, 'pocos contextos');
check('creamy.js existe', fs.existsSync('assets/creamy/creamy.js'), 'no encontrado');
check('creamy.css acciones', fs.readFileSync('assets/creamy/creamy.css', 'utf-8').includes('creamy-action-btn'), 'sin estilos de acción');
check('creamy.css saludo', fs.readFileSync('assets/creamy/creamy.css', 'utf-8').includes('creamy-greeting-bubble'), 'sin saludo');

// Syntax check JS files
for (const f of ['assets/creamy/creamy.js', 'api/creamy/chat.js']) {
  try {
    new Function(fs.readFileSync(f, 'utf-8'));
    check(`Syntax ${f}`, true, '');
  } catch (e) {
    check(`Syntax ${f}`, false, e.message);
  }
}

console.log(`\n${errors === 0 ? '✅ Validación estática OK' : `❌ ${errors} errores`}`);
process.exit(errors > 0 ? 1 : 0);

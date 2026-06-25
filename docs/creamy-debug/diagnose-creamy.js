#!/usr/bin/env node
// diagnose-creamy.js
// Corre este script localmente apuntando a tu Vercel deploy.
// Uso: CREAMY_URL=https://tu-sitio.vercel.app node diagnose-creamy.js

const ENDPOINT = (process.env.CREAMY_URL || 'http://localhost:3000') + '/api/creamy/chat';

const TEST_CASES = [
  {
    id: 'T1',
    label: 'MOQ y llave en mano',
    message: '¿Cuál es el mínimo de unidades?',
    must_contain: ['500', 'llave en mano', '5000'],
    must_not_contain: ['no puedo', 'no tengo información'],
  },
  {
    id: 'T2',
    label: 'Bálsamo en barra',
    message: '¿Hacen bálsamos en barra?',
    must_contain: ['no fabricamos', 'lata'],
    must_not_contain: ['sí hacemos bálsamos en barra', 'claro que sí'],
  },
  {
    id: 'T3',
    label: 'Crema de magnesio con árnica',
    message: '¿Hacen crema de magnesio con árnica?',
    must_contain: ['sí', 'podemos'],
    must_not_contain: ['no trabajamos', 'no fabricamos cremas'],
  },
  {
    id: 'T4',
    label: 'Combinación retinol + AHA + vitamina C',
    message: '¿Puedo mezclar retinol con AHA y vitamina C pura?',
    must_contain: ['estabilidad', 'irritación'],
    must_not_contain: ['sí, podés combinarlos sin problema', 'no hay problema'],
  },
  {
    id: 'T5',
    label: 'Niacinamida',
    message: '¿Trabajan con niacinamida?',
    must_contain: ['niacinamida', 'sí'],
    must_not_contain: ['no trabajamos con niacinamida'],
  },
  {
    id: 'T6',
    label: 'Test de inferencia — NO debe preguntar la zona',
    message: 'Quiero hacer un serum de niacinamida.',
    must_contain: ['serum', 'niacinamida'],
    must_not_contain: ['¿para qué zona', '¿qué zona'],
    note: 'Creamy debe inferir que es facial. No debe volver a preguntar la zona.',
  },
  {
    id: 'T7',
    label: 'Test de inferencia — shampoo con info completa',
    message: 'Quiero un shampoo para cabello dañado, algo premium.',
    must_contain: ['cabello', 'reparaci'],
    must_not_contain: ['¿a qué público', '¿qué objetivo buscás'],
    note: 'El usuario ya dio zona, objetivo y posicionamiento. No debe repetir las preguntas.',
  },
];

// ─────────────────────────────────────────────────────────────

async function runTest(tc) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${tc.id}] ${tc.label}`);
  if (tc.note) console.log(`  ℹ️  ${tc.note}`);
  console.log(`  Pregunta: "${tc.message}"`);
  console.log('  ...');

  const startTime = Date.now();

  let response, data;

  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: tc.message,
        conversation_history: [],
        session_id: `test-${tc.id}-${Date.now()}`,
        page_url: 'https://test/diagnose',
      }),
    });
  } catch (err) {
    console.error(`  ❌ ERROR DE RED: ${err.message}`);
    console.error('     → Verificá que el servidor esté corriendo y el endpoint sea correcto.');
    console.error(`     → Endpoint usado: ${ENDPOINT}`);
    return { id: tc.id, status: 'NETWORK_ERROR', passed: false };
  }

  const elapsed = Date.now() - startTime;
  console.log(`  HTTP ${response.status} (${elapsed}ms)`);

  if (!response.ok) {
    let errorBody = '';
    try { errorBody = JSON.stringify(await response.json()); } catch (_) {}
    console.error(`  ❌ ERROR ${response.status}: ${errorBody}`);

    if (response.status === 500) {
      console.error('     → Revisá los logs de Vercel. Probable causa: OPENAI_API_KEY no configurada.');
    }
    if (response.status === 401 || response.status === 403) {
      console.error('     → Error de autenticación. Revisá CORS y tokens.');
    }
    return { id: tc.id, status: `HTTP_${response.status}`, passed: false };
  }

  try {
    data = await response.json();
  } catch (err) {
    console.error(`  ❌ ERROR al parsear JSON: ${err.message}`);
    return { id: tc.id, status: 'PARSE_ERROR', passed: false };
  }

  // ── Meta diagnóstico ──
  if (data.meta) {
    console.log('  📊 Meta:', {
      model: data.meta.model || '⚠️ no reportado',
      tokens: data.meta.tokens_used,
      knowledge_loaded: data.meta.knowledge_loaded ? '✅' : '❌',
      used_fallback: data.meta.used_fallback ? '⚠️ SÍ' : '✅ NO',
    });

    if (!data.meta.model) {
      console.warn('  ⚠️  El backend no reporta modelo. Posiblemente usando mock o fallback.');
    }
    if (data.meta.used_fallback) {
      console.warn('  ⚠️  FALLBACK DETECTADO — la IA no pudo responder apropiadamente.');
    }
    if (!data.meta.knowledge_loaded) {
      console.warn('  ⚠️  Knowledge NO cargado — revisá la ruta del archivo creamy-knowledge.json.');
    }
  } else {
    console.warn('  ⚠️  No hay campo "meta" en la respuesta. El backend puede ser la versión antigua.');
  }

  const reply = data.reply || '';
  const replyLower = reply.toLowerCase();
  console.log(`\n  Respuesta:\n  "${reply.substring(0, 300)}${reply.length > 300 ? '...' : ''}"`);

  // ── Validaciones ──
  const failures = [];
  const passes = [];

  for (const phrase of (tc.must_contain || [])) {
    if (replyLower.includes(phrase.toLowerCase())) {
      passes.push(`✅ contiene "${phrase}"`);
    } else {
      failures.push(`❌ falta "${phrase}"`);
    }
  }

  for (const phrase of (tc.must_not_contain || [])) {
    if (replyLower.includes(phrase.toLowerCase())) {
      failures.push(`❌ contiene frase prohibida: "${phrase}"`);
    } else {
      passes.push(`✅ no contiene "${phrase}"`);
    }
  }

  console.log('\n  Validaciones:');
  passes.forEach(p => console.log('  ' + p));
  failures.forEach(f => console.log('  ' + f));

  const passed = failures.length === 0;
  console.log(`\n  ${passed ? '✅ TEST PASADO' : '❌ TEST FALLIDO'}`);

  return { id: tc.id, label: tc.label, passed, failures };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     CREAMY AI — DIAGNÓSTICO DE INTELIGENCIA C2        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nEndpoint: ${ENDPOINT}`);
  console.log(`Tests: ${TEST_CASES.length}\n`);

  // Verificar conectividad primero
  console.log('Verificando conectividad...');
  try {
    const ping = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping', conversation_history: [], session_id: 'ping-test' }),
    });
    console.log(`Conectividad: OK (HTTP ${ping.status})\n`);
  } catch (err) {
    console.error(`❌ No se puede conectar al endpoint: ${ENDPOINT}`);
    console.error(`   Error: ${err.message}`);
    console.error('\n   Posibles causas:');
    console.error('   1. El servidor de desarrollo no está corriendo (npm run dev)');
    console.error('   2. La URL en CREAMY_URL es incorrecta');
    console.error('   3. El endpoint /api/creamy/chat no existe todavía');
    process.exit(1);
  }

  const results = [];
  for (const tc of TEST_CASES) {
    const result = await runTest(tc);
    results.push(result);
    // Esperar entre tests para no triggear rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  // ── Resumen final ──
  console.log('\n\n' + '═'.repeat(60));
  console.log('RESUMEN DE DIAGNÓSTICO');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    console.log(`  [${r.id}] ${r.passed ? '✅ OK' : '❌ FALLA'} — ${r.label || r.id}`);
    if (r.failures?.length) {
      r.failures.forEach(f => console.log(`       ${f}`));
    }
  });

  console.log(`\nResultado: ${passed}/${results.length} tests pasados`);

  if (failed > 0) {
    console.log('\n⚠️  ACCIONES REQUERIDAS:');
    console.log('  1. Verificá que OPENAI_API_KEY está en las variables de entorno de Vercel.');
    console.log('  2. Verificá que creamy-config.json tiene "useMock": false.');
    console.log('  3. Verificá que creamy-knowledge.json está en la ruta correcta.');
    console.log('  4. Revisá los logs de Vercel para detalles de cada request.');
    console.log('  5. Copiá el system prompt corregido a backend/creamy/prompts/system-prompt.txt');
    process.exit(1);
  } else {
    console.log('\n✅ Creamy AI está respondiendo correctamente con IA real.');
    process.exit(0);
  }
}

main();

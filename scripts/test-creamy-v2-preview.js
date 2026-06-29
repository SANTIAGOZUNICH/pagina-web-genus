#!/usr/bin/env node
/**
 * Prueba Creamy V2 contra Preview Deployment de Vercel
 *
 * Uso:
 *   CREAMY_PREVIEW_URL=https://tu-preview.vercel.app npm run test:creamy-v2-preview
 *
 * Si la preview tiene Deployment Protection (SSO):
 *   VERCEL_AUTOMATION_BYPASS_SECRET=tu-secreto npm run test:creamy-v2-preview
 */

const PREVIEW = process.env.CREAMY_PREVIEW_URL
  || 'https://pagina-web-genus-git-cursor-c-2ce9a9-santizunich-2879s-projects.vercel.app';
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';

function headers(extra = {}) {
  const h = { ...extra };
  if (BYPASS) {
    h['x-vercel-protection-bypass'] = BYPASS;
    h['x-vercel-set-bypass-cookie'] = 'true';
  }
  return h;
}

function withBypass(url) {
  if (!BYPASS) return url;
  const u = new URL(url);
  u.searchParams.set('x-vercel-protection-bypass', BYPASS);
  u.searchParams.set('x-vercel-set-bypass-cookie', 'true');
  return u.toString();
}

let errors = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    console.error(`❌ ${name}${detail ? ': ' + detail : ''}`);
    errors++;
  } else {
    console.log(`✅ ${name}`);
  }
}

async function main() {
  console.log(`\n🔍 Preview: ${PREVIEW}`);
  if (BYPASS) console.log('🔐 Usando bypass de Deployment Protection\n');
  else console.log('⚠️  Sin bypass — si la preview pide login Vercel, configurá VERCEL_AUTOMATION_BYPASS_SECRET\n');

  // 1. Health
  const healthRes = await fetch(withBypass(`${PREVIEW}/api/creamy-v2/health`), { headers: headers() });
  const health = await healthRes.json().catch(() => ({}));
  check('Health endpoint responde', healthRes.status === 200 || healthRes.status === 503, `HTTP ${healthRes.status}`);
  if (health.checks) {
    check('Knowledge cargada', health.checks.knowledge === true);
    check('System prompt cargado', health.checks.system_prompt === true);
    check('OPENAI_API_KEY configurada', health.checks.openai_key === true,
      health.checks.openai_key ? '' : 'Configurar en Vercel → Settings → Environment Variables → Preview + Production');
  }
  if (health.status === 'ready') {
    console.log('   → Servicio listo para chat\n');
  } else {
    console.log('   → Servicio degradado — el chat fallará hasta configurar OPENAI_API_KEY\n');
  }

  // 2. HTML + assets
  const htmlRes = await fetch(withBypass(`${PREVIEW}/index.html`), { headers: headers(), redirect: 'follow' });
  const html = await htmlRes.text();
  check('index.html accesible', htmlRes.ok, `HTTP ${htmlRes.status}`);
  if (htmlRes.status === 401 || html.includes('vercel.com/login') || html.includes('sso-api')) {
    console.error('\n⛔ La preview requiere autenticación Vercel (Deployment Protection).');
    console.error('   Opciones:');
    console.error('   1. Abrí el link Preview desde el PR #3 estando logueado en Vercel');
    console.error('   2. Vercel Dashboard → Project → Settings → Deployment Protection → desactivar para Preview');
    console.error('   3. Generar VERCEL_AUTOMATION_BYPASS_SECRET y pasarlo como env var\n');
    process.exit(1);
  }
  check('HTML carga creamy-v2', html.includes('creamy-v2'));
  check('HTML sin creamy v1', !html.includes('assets/creamy/creamy.js'));

  const jsRes = await fetch(withBypass(`${PREVIEW}/assets/creamy-v2/creamy.js?v=v2`), { headers: headers() });
  check('creamy.js accesible', jsRes.ok, `HTTP ${jsRes.status}`);

  // 3. Chat API (solo si health ready)
  if (health.status === 'ready') {
    const chatRes = await fetch(withBypass(`${PREVIEW}/api/creamy-v2/chat`), {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: 'Quiero hacer un serum de niacinamida. ¿Cuál es el MOQ?',
        conversation_history: [],
        session_id: 'preview_smoke_test',
        page_key: 'index',
      }),
    });
    const chat = await chatRes.json().catch(() => ({}));
    check('Chat API responde 200', chatRes.status === 200, `HTTP ${chatRes.status}`);
    const reply = chat.reply || chat.message || '';
    check('Respuesta no vacía', reply.length > 80, `len=${reply.length}`);
    check('Menciona MOQ o 500', /500|MOQ|unidades/i.test(reply));
    if (reply) console.log(`\n💬 Preview respuesta:\n${reply.slice(0, 400)}...\n`);
  } else {
    console.log('⏭️  Chat API omitido (servicio no ready)\n');
  }

  // 4. Playwright visual (opcional)
  if (process.env.CREAMY_PREVIEW_VISUAL === '1') {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const entry = withBypass(`${PREVIEW}/index.html`);
    await page.goto(entry, { waitUntil: 'networkidle' });
    await page.waitForSelector('#cv2-fab', { state: 'visible', timeout: 15000 });
    await page.click('#cv2-fab', { force: true });
    await page.waitForTimeout(500);
    const open = await page.evaluate(() => ({
      root: !!document.getElementById('creamy-v2'),
      avatar: !!document.querySelector('.cv2-fab-avatar'),
      windowOpen: !document.getElementById('cv2-window')?.classList.contains('cv2-hidden'),
    }));
    check('[visual] Widget abre', open.windowOpen);
    await browser.close();
  }

  if (errors) {
    console.error(`\n❌ ${errors} error(es)\n`);
    process.exit(1);
  }
  console.log('✅ Preview validation OK\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

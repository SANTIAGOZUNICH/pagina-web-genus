#!/usr/bin/env node
/**
 * Validación Creamy V2 — DOM, CSS, layout visual
 */
import fs from 'fs';
import { chromium } from 'playwright';

const js = fs.readFileSync('assets/creamy-v2/creamy.js', 'utf-8');
const css = fs.readFileSync('assets/creamy-v2/creamy.css', 'utf-8');
let errors = 0;

function check(name, ok, detail = '') {
  if (!ok) { console.error(`❌ ${name}${detail ? ': ' + detail : ''}`); errors++; }
  else console.log(`✅ ${name}`);
}

const jsClasses = new Set();
for (const m of js.matchAll(/class(?:Name)?\s*=\s*['"`]([^'"`]+)['"`]/g)) m[1].split(/\s+/).forEach((c) => c && jsClasses.add(c));
for (const m of js.matchAll(/class=['"`]([^'"`]+)['"`]/g)) m[1].split(/\s+/).forEach((c) => c && jsClasses.add(c));
for (const m of js.matchAll(/classList\.(?:add|remove)\(['"`]([^'"`]+)['"`]/g)) jsClasses.add(m[1]);
['cv2-action-btn--primary', 'cv2-action-btn--secondary', 'cv2-action-btn--whatsapp'].forEach((c) => jsClasses.add(c));

const cssClasses = new Set([...css.matchAll(/\.(cv2-[a-z0-9-]+)/g)].map((m) => m[1]));
const cv2Js = [...jsClasses].filter((c) => c.startsWith('cv2-') || c === 'creamy-v2--open');
const missing = cv2Js.filter((c) => !cssClasses.has(c) && !c.includes('--'));

check('Root id creamy-v2 en JS', js.includes("id = 'creamy-v2'"));
check('Avatar cv2-fab-avatar', js.includes('cv2-fab-avatar'));
check('API endpoint v2', js.includes('/api/creamy-v2/chat'));
check('CSS scoped #creamy-v2', css.includes('#creamy-v2 .cv2-window'));
check('Desktop 390px', css.includes('width: 390px'));
check('Mobile 85vh', css.includes('height: 85vh'));
check('Microanimación breathe', css.includes('cv2-breathe'));
check('Sin referencia creamy-v1', !js.includes('creamy-fab-avatar-placeholder'));

if (missing.length) {
  check('Clases JS con CSS', false, missing.join(', '));
} else {
  check('Clases JS con CSS', true);
}

const base = process.env.CREAMY_TEST_URL || 'http://localhost:8765';

async function visual() {
  const browser = await chromium.launch({ headless: true });

  for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#cv2-fab', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1200);

    const closed = await page.evaluate(() => {
      const root = document.getElementById('creamy-v2');
      const fab = document.getElementById('cv2-fab');
      const fr = fab.getBoundingClientRect();
      return {
        rootId: root?.id,
        rootClass: root?.className,
        avatar: !!document.querySelector('.cv2-fab-avatar'),
        fabW: Math.round(fr.width),
        fabH: Math.round(fr.height),
        oldWidget: !!document.getElementById('creamy-widget'),
      };
    });

    check(`[${name}] Root #creamy-v2`, closed.rootId === 'creamy-v2');
    check(`[${name}] .cv2-fab-avatar`, closed.avatar);
    check(`[${name}] Sin creamy v1`, !closed.oldWidget);
    const fabSize = name === 'mobile' ? 64 : 72;
    check(`[${name}] FAB ~${fabSize}px`, Math.abs(closed.fabW - fabSize) <= 4);

    await page.click('#cv2-fab', { force: true });
    await page.waitForTimeout(400);

    const open = await page.evaluate(() => {
      const win = document.getElementById('cv2-window');
      const wr = win.getBoundingClientRect();
      return { w: Math.round(wr.width), h: Math.round(wr.height), display: getComputedStyle(win).display };
    });

    if (name === 'desktop') {
      check(`[${name}] Ventana 390×580`, open.w >= 385 && open.w <= 395 && open.h >= 575 && open.h <= 585);
    } else {
      check(`[${name}] Bottom sheet ancho completo`, open.w >= 385);
      check(`[${name}] Bottom sheet ~85vh`, open.h / 844 >= 0.82 && open.h / 844 <= 0.88);
    }
    await page.close();
  }
  await browser.close();
}

await visual();
console.log(errors ? `\n❌ ${errors} errores` : '\n✅ Creamy V2 validación OK');
process.exit(errors);

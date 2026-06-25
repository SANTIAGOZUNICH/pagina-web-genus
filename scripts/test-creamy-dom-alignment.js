#!/usr/bin/env node
/**
 * Valida alineación DOM (creamy.js) vs selectores (creamy.css) y layout visual.
 */
import fs from 'fs';
import { chromium } from 'playwright';

const js = fs.readFileSync('assets/creamy/creamy.js', 'utf-8');
const css = fs.readFileSync('assets/creamy/creamy.css', 'utf-8');

function extractJsTokens() {
  const classes = new Set();
  const ids = new Set();

  for (const m of js.matchAll(/class(?:Name)?\s*=\s*['"`]([^'"`]+)['"`]/g)) {
    m[1].split(/\s+/).forEach((c) => c && classes.add(c));
  }
  for (const m of js.matchAll(/classList\.(?:add|remove|toggle)\(\s*['"`]([^'"`]+)['"`]/g)) {
    classes.add(m[1]);
  }
  for (const m of js.matchAll(/class=['"`]([^'"`]+)['"`]/g)) {
    m[1].split(/\s+/).forEach((c) => c && classes.add(c));
  }
  for (const m of js.matchAll(/class=\`([^\`]+)\`/g)) {
    for (const part of m[1].split(/\s+/)) {
      if (!part || part.includes('${')) continue;
      classes.add(part);
    }
  }

  // Strip template-literal fragments accidentally captured
  for (const c of [...classes]) {
    if (c.includes('${') || c.includes('`') || c === '?') classes.delete(c);
  }

  // Dynamic suffixes used at runtime
  ['creamy-action-btn--primary', 'creamy-action-btn--secondary', 'creamy-action-btn--whatsapp', 'creamy-chip-cta'].forEach(
    (c) => classes.add(c)
  );

  for (const m of js.matchAll(/id=['"`]([^'"`]+)['"`]/g)) ids.add(m[1]);
  for (const m of js.matchAll(/getElementById\(['"`]([^'"`]+)['"`]/g)) ids.add(m[1]);

  return { classes: [...classes].sort(), ids: [...ids].sort() };
}

function extractCssTokens() {
  const classes = new Set();
  const ids = new Set();

  for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) classes.add(m[1]);
  for (const m of css.matchAll(/#([a-zA-Z][a-zA-Z0-9_-]*)/g)) ids.add(m[1]);

  return {
    classes: [...classes].sort(),
    classSet: classes,
    ids: [...ids].sort(),
  };
}

const jsTokens = extractJsTokens();
const cssTokens = extractCssTokens();

const jsClassesNoCss = jsTokens.classes.filter(
  (c) => c.startsWith('creamy-') && !cssTokens.classSet.has(c)
);
const cssClassesNoJs = cssTokens.classes.filter(
  (c) => c.startsWith('creamy-') && !jsTokens.classes.includes(c)
);

console.log('=== DOM/CSS class alignment ===');
console.log('JS creamy classes:', jsTokens.classes.filter((c) => c.startsWith('creamy-')).length);
console.log('CSS creamy classes:', cssTokens.classes.filter((c) => c.startsWith('creamy-')).length);

if (jsClassesNoCss.length) {
  console.error('JS classes WITHOUT CSS:', jsClassesNoCss.join(', '));
} else {
  console.log('✅ All JS classes have CSS');
}

if (cssClassesNoJs.length) {
  console.error('CSS classes NOT in JS:', cssClassesNoJs.join(', '));
} else {
  console.log('✅ No orphan CSS classes');
}

const baseUrl = process.env.CREAMY_TEST_URL || 'http://localhost:8765';

async function runVisualChecks() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function checkPage(name, path, viewport) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#creamy-fab', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1500);

    const closed = await page.evaluate(() => {
      const root = document.getElementById('creamy-widget');
      const fab = document.getElementById('creamy-fab');
      const win = document.getElementById('creamy-window');
      const fabRect = fab.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();
      const fabStyle = getComputedStyle(fab);
      const winStyle = getComputedStyle(win);
      return {
        rootId: root?.id,
        rootClass: root?.className,
        fabW: Math.round(fabRect.width),
        fabH: Math.round(fabRect.height),
        fabPos: fabStyle.position,
        fabBR: fabStyle.borderRadius,
        winDisplay: winStyle.display,
        winW: Math.round(winRect.width),
        winH: Math.round(winRect.height),
        winPos: winStyle.position,
        bodyW: document.body.getBoundingClientRect().width,
      };
    });

    await page.click('#creamy-fab');
    await page.waitForTimeout(400);

    const open = await page.evaluate(() => {
      const root = document.getElementById('creamy-widget');
      const win = document.getElementById('creamy-window');
      const fab = document.getElementById('creamy-fab');
      const winRect = win.getBoundingClientRect();
      const fabStyle = getComputedStyle(fab);
      const winStyle = getComputedStyle(win);
      return {
        rootOpen: root?.classList.contains('creamy-widget--open'),
        winDisplay: winStyle.display,
        winW: Math.round(winRect.width),
        winH: Math.round(winRect.height),
        fabHidden: fabStyle.opacity === '0' || fabStyle.pointerEvents === 'none',
        isFullWidthBar: winRect.width > window.innerWidth * 0.9 && winRect.height < 200,
      };
    });

    results.push({ name, path, viewport, closed, open });
    await page.close();
  }

  await checkPage('index-desktop', '/index.html', { width: 1280, height: 800 });
  await checkPage('index-mobile', '/index.html', { width: 390, height: 844 });
  await checkPage('cotizador-desktop', '/cotizador.html', { width: 1280, height: 800 });

  await browser.close();
  return results;
}

const visual = await runVisualChecks();

console.log('\n=== Visual checks ===');
let visualErrors = 0;

for (const r of visual) {
  const isDesktop = r.viewport.width >= 769;
  const isMobile = r.viewport.width <= 768;
  console.log(`\n[${r.name}]`);

  if (r.closed.rootId !== 'creamy-widget') {
    console.error('  ❌ Missing #creamy-widget root');
    visualErrors++;
  } else {
    console.log('  ✅ Root #creamy-widget');
  }

  const fabSize = isMobile ? 64 : 72;
  if (Math.abs(r.closed.fabW - fabSize) > 4 || Math.abs(r.closed.fabH - fabSize) > 4) {
    console.error(`  ❌ FAB size ${r.closed.fabW}x${r.closed.fabH} (expected ~${fabSize}px)`);
    visualErrors++;
  } else {
    console.log(`  ✅ FAB ${r.closed.fabW}x${r.closed.fabH}px`);
  }

  if (r.closed.fabPos !== 'fixed') {
    console.error(`  ❌ FAB position ${r.closed.fabPos}`);
    visualErrors++;
  }

  if (r.closed.winDisplay !== 'none') {
    console.error(`  ❌ Window visible when closed (${r.closed.winDisplay})`);
    visualErrors++;
  } else {
    console.log('  ✅ Window hidden when closed');
  }

  if (!r.open.rootOpen) {
    console.error('  ❌ Missing .creamy-widget--open');
    visualErrors++;
  }

  if (r.open.winDisplay === 'none') {
    console.error('  ❌ Window hidden when open');
    visualErrors++;
  }

  if (r.open.isFullWidthBar && isDesktop) {
    console.error('  ❌ Desktop shows horizontal bar layout');
    visualErrors++;
  }

  if (isDesktop) {
    if (r.open.winW < 370 || r.open.winW > 390) {
      console.error(`  ❌ Desktop window width ${r.open.winW}px (expected 380)`);
      visualErrors++;
    } else {
      console.log(`  ✅ Desktop window ${r.open.winW}x${r.open.winH}px`);
    }
  }

  if (isMobile) {
    if (r.open.winW < r.viewport.width - 5) {
      console.error(`  ❌ Mobile window not full width (${r.open.winW}px)`);
      visualErrors++;
    }
    const vh = (r.open.winH / r.viewport.height) * 100;
    if (vh < 80 || vh > 90) {
      console.error(`  ❌ Mobile window height ${vh.toFixed(0)}vh (expected ~85vh)`);
      visualErrors++;
    } else {
      console.log(`  ✅ Mobile bottom sheet ${r.open.winW}x${r.open.winH}px (~${vh.toFixed(0)}vh)`);
    }
  }
}

const totalErrors = jsClassesNoCss.length + cssClassesNoJs.length + visualErrors;
console.log(totalErrors ? `\n❌ ${totalErrors} total issues` : '\n✅ All checks passed');
process.exit(totalErrors ? 1 : 0);

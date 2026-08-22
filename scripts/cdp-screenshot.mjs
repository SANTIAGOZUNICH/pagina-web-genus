// Real screenshot via Chrome DevTools Protocol (Emulation.setDeviceMetricsOverride),
// avoiding the confirmed --window-size CLI bug for narrow viewports.
// Usage: node scripts/cdp-screenshot.mjs <url> <width> <height> <outPath> [mobile]

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const [, , url, widthArg, heightArg, outPath, mobileArg, fullArg] = process.argv;
const width = parseInt(widthArg, 10);
const height = parseInt(heightArg, 10);
const isMobile = mobileArg === 'mobile';
const fullPage = fullArg === 'full';
const port = 9333 + Math.floor(Math.random() * 500);
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = `C:\\Users\\Usuario\\AppData\\Local\\Temp\\claude\\cdp-ud-${Date.now()}-${port}`;

fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

async function waitForCdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error('CDP did not become ready');
}

function send(ws, id, method, params) {
  ws.send(JSON.stringify({ id, method, params }));
}

async function run() {
  console.error('waiting for CDP on port', port);
  await waitForCdp();
  console.error('CDP ready, creating target');
  const newRes = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const target = await newRes.json();
  console.error('target', target.id, target.webSocketDebuggerUrl);
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let idCounter = 1;
  const pending = new Map();
  const waitFor = (id) => new Promise((resolve) => pending.set(id, resolve));

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  const call = async (method, params) => {
    const id = idCounter++;
    send(ws, id, method, params);
    return waitFor(id);
  };

  await call('Page.enable', {});
  await call('Emulation.setDeviceMetricsOverride', {
    width, height,
    deviceScaleFactor: 2,
    mobile: isMobile,
  });
  if (isMobile) {
    await call('Network.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    });
  }
  console.error('navigating');
  await call('Page.navigate', { url });
  await Promise.race([
    new Promise((resolve) => {
      const handler = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.method === 'Page.loadEventFired') {
          ws.removeEventListener('message', handler);
          resolve();
        }
      };
      ws.addEventListener('message', handler);
    }),
    sleep(10000),
  ]);
  console.error('loaded, settling');
  await sleep(1200); // let webfonts/animations settle

  if (fullPage) {
    const metrics = await call('Page.getLayoutMetrics', {});
    const contentHeight = Math.ceil(metrics.result.cssContentSize.height);
    await call('Emulation.setDeviceMetricsOverride', {
      width, height: contentHeight, deviceScaleFactor: 2, mobile: isMobile,
    });
    await sleep(400);
  }

  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage });
  const buf = Buffer.from(shot.result.data, 'base64');
  fs.writeFileSync(outPath, buf);
  ws.close();
  chrome.kill();
  console.log('OK', outPath, buf.length, 'bytes');
  process.exit(0);
}

const watchdog = setTimeout(() => { console.error('WATCHDOG TIMEOUT'); chrome.kill(); process.exit(1); }, 25000);
run().then(() => clearTimeout(watchdog)).catch((e) => { console.error('ERROR', e); chrome.kill(); process.exit(1); });

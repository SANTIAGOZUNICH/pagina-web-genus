/**
 * Tests — endpoints de diagnóstico protegidos y health sin datos sensibles. Sin red ni escrituras.
 * node scripts/test-creamy-admin.js
 */
import debugHandler from '../api/creamy-v2/debug.js';
import sheetsDebugHandler from '../api/creamy-v2/sheets-debug.js';
import healthHandler from '../api/creamy-v2/health.js';
import { isAdminRequest } from '../backend/creamy-v2/lib/admin-auth.js';

let errors = 0;
const check = (name, ok) => { if (ok) console.log(`✅ ${name}`); else { console.error(`❌ ${name}`); errors++; } };
const mockRes = () => ({
  statusCode: 0, headers: {}, body: '',
  setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; }, status(c) { this.statusCode = c; return this; },
});
const call = async (handler, headers = {}) => { const res = mockRes(); await handler({ method: 'GET', headers }, res); return res; };

const TOKEN = 'test-admin-token-0123456789abcdef0123456789';
const FAKE_KEY = 'AQ.FAKE-GEMINI-KEY-0000000000000000';
process.env.GEMINI_API_KEY = FAKE_KEY;

// 1. Sin token configurado: deshabilitados aunque manden cualquier Authorization.
delete process.env.CREAMY_ADMIN_TOKEN;
for (const [name, h] of [['debug', debugHandler], ['sheets-debug', sheetsDebugHandler]]) {
  check(`${name}: 404 sin token configurado`, (await call(h)).statusCode === 404);
  check(`${name}: 404 sin token configurado aun con Authorization`, (await call(h, { authorization: 'Bearer cualquier-cosa' })).statusCode === 404);
}

// 2. Con token configurado: 404 sin Authorization, con token incorrecto o con otro esquema.
process.env.CREAMY_ADMIN_TOKEN = TOKEN;
for (const [name, h] of [['debug', debugHandler], ['sheets-debug', sheetsDebugHandler]]) {
  check(`${name}: 404 sin Authorization`, (await call(h)).statusCode === 404);
  check(`${name}: 404 con token incorrecto`, (await call(h, { authorization: `Bearer ${TOKEN}x` })).statusCode === 404);
  check(`${name}: 404 con esquema Basic`, (await call(h, { authorization: `Basic ${TOKEN}` })).statusCode === 404);
}
check('isAdminRequest acepta el token correcto', isAdminRequest({ headers: { authorization: `Bearer ${TOKEN}` } }));
check('isAdminRequest rechaza tokens cortos configurados', !isAdminRequest({ headers: { authorization: 'Bearer corto' } }, { CREAMY_ADMIN_TOKEN: 'corto' }));

// 3. health público: solo status, nada de proveedor, modelo, variables ni fragmentos de clave.
const pub = await call(healthHandler);
const pubBody = JSON.parse(pub.body);
check('health público responde ready', pub.statusCode === 200 && pubBody.status === 'ready');
check('health público solo trae service/status/timestamp', JSON.stringify(Object.keys(pubBody).sort()) === JSON.stringify(['service', 'status', 'timestamp']));
check('health público sin fragmentos de la clave', !pub.body.includes(FAKE_KEY.slice(0, 5)) && !/key|GEMINI|gemini|model/i.test(pub.body));

// 4. health con token de administrador: detalle de diagnóstico, igualmente sin la clave.
const adm = await call(healthHandler, { authorization: `Bearer ${TOKEN}` });
check('health admin trae checks', !!JSON.parse(adm.body).checks);
check('health admin sin fragmentos de la clave', !adm.body.includes(FAKE_KEY.slice(0, 5)) && !adm.body.includes('key_prefix'));

console.log(errors ? `\n❌ ${errors} errores` : '\n✅ Endpoints de diagnóstico protegidos');
process.exit(errors ? 1 : 0);

/**
 * Creamy V2 — acceso administrativo para endpoints de diagnóstico (debug, sheets-debug).
 *
 * Están DESHABILITADOS salvo que el servidor tenga CREAMY_ADMIN_TOKEN (variable de entorno de Vercel,
 * nunca en el frontend) y el pedido traiga `Authorization: Bearer <ese token>`.
 * Sin token configurado o con un token incorrecto responden 404, sin revelar que el endpoint existe.
 */
import crypto from 'node:crypto';

const MIN_TOKEN_LENGTH = 32;

function digest(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest();
}

/** true only when a strong admin token is configured and the request carries exactly that token. */
export function isAdminRequest(req, env = process.env) {
  const expected = env.CREAMY_ADMIN_TOKEN?.trim() || '';
  if (expected.length < MIN_TOKEN_LENGTH) return false;
  const header = req?.headers?.authorization || req?.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  if (!match) return false;
  return crypto.timingSafeEqual(digest(match[1].trim()), digest(expected));
}

/** Sends the 404 used for every refused diagnostic request. */
export function notFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: 'Not found' }));
}

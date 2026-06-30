/**
 * Creamy V2 — Eventos (CTA clicks, etc.)
 * POST /api/creamy-v2/event
 */

import { StorageAdapter } from '../../backend/creamy-v2/lib/storage.js';
import { parseJsonBody } from '../../backend/creamy-v2/lib/request.js';

const ALLOWED_CTAS = new Set(['WHATSAPP', 'COTIZACION', 'CONFIGURADOR', 'REUNION']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return json(res, 400, { error: 'JSON inválido' });
  }

  const cta = typeof body.cta === 'string' ? body.cta.toUpperCase() : '';
  if (!ALLOWED_CTAS.has(cta)) {
    return json(res, 400, { error: 'CTA inválido' });
  }

  StorageAdapter.logCtaClick({
    session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 120) : '',
    user_name: typeof body.user_name === 'string' ? body.user_name.trim().slice(0, 80) : '',
    page_key: typeof body.page_key === 'string' ? body.page_key.slice(0, 60) : '',
    cta,
    context_message: typeof body.context_message === 'string' ? body.context_message.slice(0, 500) : '',
  });

  res.statusCode = 204;
  res.setHeader('Cache-Control', 'no-store');
  return res.end();
}

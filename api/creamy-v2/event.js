/**
 * Creamy V2 — Eventos (registro visitante, CTA clicks)
 * POST /api/creamy-v2/event
 */

import { StorageAdapter } from '../../backend/creamy-v2/lib/storage.js';
import { ctaToEventType } from '../../backend/creamy-v2/lib/entities.js';
import { parseJsonBody } from '../../backend/creamy-v2/lib/request.js';

const CTA_KEYS = new Set(['WHATSAPP', 'COTIZACION', 'CONFIGURADOR', 'REUNION']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function pickStr(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
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

  const eventType = pickStr(body.event_type, 40);
  const sessionId = pickStr(body.session_id, 120);
  const firstName = pickStr(body.user_first_name || body.nombre, 60);
  const lastName = pickStr(body.user_last_name || body.apellido, 60);
  const pageKey = pickStr(body.page_key, 60);
  const userAgent = pickStr(body.user_agent, 300);

  if (eventType === 'visitor_registered') {
    if (!firstName || !lastName) {
      return json(res, 400, { error: 'Nombre y apellido requeridos' });
    }
    StorageAdapter.logVisitorRegistered({
      session_id: sessionId,
      user_first_name: firstName,
      user_last_name: lastName,
      page_key: pageKey,
      user_agent: userAgent,
    });
    res.statusCode = 204;
    res.setHeader('Cache-Control', 'no-store');
    return res.end();
  }

  const cta = typeof body.cta === 'string' ? body.cta.toUpperCase() : '';
  if (!CTA_KEYS.has(cta)) {
    return json(res, 400, { error: 'Evento inválido' });
  }

  StorageAdapter.logCtaClick({
    session_id: sessionId,
    user_first_name: firstName,
    user_last_name: lastName,
    page_key: pageKey,
    event_type: ctaToEventType(cta),
    context_message: pickStr(body.context_message, 500),
    user_agent: userAgent,
  });

  res.statusCode = 204;
  res.setHeader('Cache-Control', 'no-store');
  return res.end();
}

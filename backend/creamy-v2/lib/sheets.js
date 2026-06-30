/**
 * Creamy V2 — Google Sheets logging
 *
 * Opción A (recomendada): Apps Script Web App
 *   CREAMY_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 *   CREAMY_SHEETS_WEBHOOK_SECRET=opcional
 *
 * Opción B: Google Sheets API + service account
 *   CREAMY_SHEETS_SPREADSHEET_ID=...
 *   CREAMY_SHEETS_CREDENTIALS={"type":"service_account",...}
 *   CREAMY_SHEETS_TAB=Creamy Log
 */

import crypto from 'crypto';

const SHEET_HEADERS = [
  'fecha',
  'hora',
  'session_id',
  'nombre',
  'página',
  'pregunta del usuario',
  'respuesta de Creamy',
  'intención detectada',
  'producto mencionado',
  'activos mencionados',
  'proveedor IA',
  'modelo',
  'si usó IA',
  'si usó fallback',
  'evento CTA',
];

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const TZ = 'America/Argentina/Buenos_Aires';

function formatNowParts(date = new Date()) {
  const fecha = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return { fecha, hora };
}

function boolLabel(value) {
  return value ? 'sí' : 'no';
}

export function buildSheetRow(payload = {}) {
  const { fecha, hora } = formatNowParts();
  return {
    fecha: payload.fecha || fecha,
    hora: payload.hora || hora,
    session_id: payload.session_id || '',
    nombre: payload.nombre || payload.user_name || '',
    página: payload.página || payload.page_key || '',
    'pregunta del usuario': payload['pregunta del usuario'] || payload.user_message || '',
    'respuesta de Creamy': payload['respuesta de Creamy'] || payload.assistant_reply || '',
    'intención detectada': payload['intención detectada'] || payload.intent || '',
    'producto mencionado': payload['producto mencionado'] || payload.producto_mencionado || '',
    'activos mencionados': payload['activos mencionados'] || payload.activos_mencionados || '',
    'proveedor IA': payload['proveedor IA'] || payload.provider || '',
    modelo: payload.modelo || payload.model || '',
    'si usó IA': payload['si usó IA'] ?? boolLabel(!!payload.used_ai),
    'si usó fallback': payload['si usó fallback'] ?? boolLabel(!!payload.used_fallback),
    'evento CTA': payload['evento CTA'] || payload.evento_cta || '',
  };
}

export function rowToValues(row) {
  const built = buildSheetRow(row);
  return SHEET_HEADERS.map((h) => String(built[h] ?? ''));
}

function webhookConfigured() {
  return !!process.env.CREAMY_SHEETS_WEBHOOK_URL?.trim();
}

function apiConfigured() {
  return !!(
    process.env.CREAMY_SHEETS_SPREADSHEET_ID?.trim()
    && process.env.CREAMY_SHEETS_CREDENTIALS?.trim()
  );
}

export function isSheetsConfigured() {
  return webhookConfigured() || apiConfigured();
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getServiceAccountToken() {
  const creds = JSON.parse(process.env.CREAMY_SHEETS_CREDENTIALS);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: creds.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signInput = `${header}.${claim}`;
  const sign = crypto.createSign('RSA-SHA256').update(signInput).sign(creds.private_key, 'base64url');
  const jwt = `${signInput}.${sign}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error || 'sheets_auth_failed');
  return data.access_token;
}

async function appendViaWebhook(row) {
  const url = process.env.CREAMY_SHEETS_WEBHOOK_URL.trim();
  const headers = { 'Content-Type': 'application/json' };
  const secret = process.env.CREAMY_SHEETS_WEBHOOK_SECRET?.trim();
  if (secret) headers['X-Creamy-Secret'] = secret;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildSheetRow(row)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`webhook_${res.status}:${text.slice(0, 200)}`);
  }
  return { ok: true, via: 'webhook' };
}

async function appendViaApi(row) {
  const spreadsheetId = process.env.CREAMY_SHEETS_SPREADSHEET_ID.trim();
  const tab = (process.env.CREAMY_SHEETS_TAB || 'Creamy Log').trim();
  const range = `${tab}!A:O`;
  const token = await getServiceAccountToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowToValues(row)] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`api_${res.status}:${text.slice(0, 200)}`);
  }
  return { ok: true, via: 'api' };
}

/**
 * Append row to Google Sheets. Never throws — logging must not break chat.
 */
export async function appendConversationLog(row) {
  if (!isSheetsConfigured()) {
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  try {
    if (webhookConfigured()) return await appendViaWebhook(row);
    return await appendViaApi(row);
  } catch (err) {
    console.warn('[CreamyV2:Sheets]', err.message);
    return { ok: false, error: err.message };
  }
}

export { SHEET_HEADERS };

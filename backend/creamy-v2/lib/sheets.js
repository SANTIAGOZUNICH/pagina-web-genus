/**
 * Creamy V2 — Google Sheets logging (CRM)
 */

import crypto from 'crypto';

export const SHEET_HEADERS = [
  'fecha',
  'hora',
  'session_id',
  'nombre',
  'apellido',
  'página',
  'url',
  'tipo_evento',
  'pregunta del usuario',
  'respuesta de Creamy',
  'intención detectada',
  'producto principal',
  'activo principal',
  'proveedor IA',
  'modelo',
  'tiempo conversación (seg)',
  'cantidad preguntas',
  'abrió WhatsApp',
  'abrió crear producto',
  'abrió cotización',
  'si usó IA',
  'si hubo error',
  'si usó fallback',
  'user_agent',
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
    nombre: payload.nombre || payload.user_first_name || payload.user_name || '',
    apellido: payload.apellido || payload.user_last_name || '',
    página: payload.página || payload.page_key || '',
    url: payload.url || payload.page_url || '',
    tipo_evento: payload.tipo_evento || payload.event_type || '',
    'pregunta del usuario': payload['pregunta del usuario'] || payload.user_message || '',
    'respuesta de Creamy': payload['respuesta de Creamy'] || payload.assistant_reply || '',
    'intención detectada': payload['intención detectada'] || payload.intent || '',
    'producto principal': payload['producto principal'] || payload.primary_product || payload.producto_mencionado || '',
    'activo principal': payload['activo principal'] || payload.primary_active || payload.activos_mencionados || '',
    'proveedor IA': payload['proveedor IA'] || payload.provider || '',
    modelo: payload.modelo || payload.model || '',
    'tiempo conversación (seg)': payload['tiempo conversación (seg)'] ?? payload.conversation_duration_sec ?? '',
    'cantidad preguntas': payload['cantidad preguntas'] ?? payload.question_count ?? '',
    'abrió WhatsApp': payload['abrió WhatsApp'] ?? payload.opened_whatsapp ?? '',
    'abrió crear producto': payload['abrió crear producto'] ?? payload.opened_crear_producto ?? '',
    'abrió cotización': payload['abrió cotización'] ?? payload.opened_cotizacion ?? '',
    'si usó IA': payload['si usó IA'] ?? (payload.used_ai != null ? boolLabel(!!payload.used_ai) : ''),
    'si hubo error': payload['si hubo error'] ?? (payload.had_error != null ? boolLabel(!!payload.had_error) : ''),
    'si usó fallback': payload['si usó fallback'] ?? (payload.used_fallback != null ? boolLabel(!!payload.used_fallback) : ''),
    user_agent: payload.user_agent || '',
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

export function isApiConfigured() {
  return apiConfigured();
}

export function isSheetsConfigured() {
  return webhookConfigured() || apiConfigured();
}

export function isSheetsUrlPresent() {
  return webhookConfigured();
}

export function normalizeWebhookUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/dev(\?|$)/, '/exec$1').replace(/\/dev$/, '/exec');
}

function logSheetsEvent(meta) {
  console.log('[CreamyV2:Sheets]', JSON.stringify({
    sheets_enabled: meta.sheets_enabled ?? isSheetsConfigured(),
    sheets_url_present: meta.sheets_url_present ?? isSheetsUrlPresent(),
    sheets_event_type: meta.sheets_event_type || '',
    sheets_status: meta.sheets_status ?? null,
    sheets_response_text: meta.sheets_response_text ?? '',
    sheets_error: meta.sheets_error ?? '',
  }));
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

function base64urlEncodeJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

async function appendViaGet(url, row, headers) {
  const payload = buildSheetRow(row);
  const params = new URLSearchParams();
  params.set('payload', base64urlEncodeJson(payload));
  const secret = process.env.CREAMY_SHEETS_WEBHOOK_SECRET?.trim();
  if (secret) params.set('secret', secret);

  const getUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
  const res = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
  const text = await res.text();

  if (!res.ok) {
    return { status: res.status, ok: false, text, strategy: 'get_payload' };
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.ok === false) {
      return { status: res.status, ok: false, text, strategy: 'get_payload', parsed };
    }
    if (parsed && parsed.appended !== true) {
      return {
        status: res.status,
        ok: false,
        text,
        strategy: 'get_payload',
        parsed,
        needs_apps_script_update: parsed.service === 'creamy-v2-sheets-webhook',
      };
    }
    return { status: res.status, ok: true, text, strategy: 'get_payload', parsed };
  } catch {
    return { status: res.status, ok: res.ok, text, strategy: 'get_payload' };
  }
}

async function diagnoseWebhookPost(url, reqHeaders, bodyPayload) {
  const diag = {
    post_status: null,
    redirect_followed: false,
    redirect_get_status: null,
    post_text: '',
    redirect_get_text: '',
  };

  const res1 = await fetch(url, {
    method: 'POST',
    headers: reqHeaders,
    body: bodyPayload,
    redirect: 'manual',
  });
  diag.post_status = res1.status;

  if ([301, 302, 303, 307, 308].includes(res1.status)) {
    const location = res1.headers.get('location');
    diag.redirect_followed = !!location;
    if (location) {
      const res2 = await fetch(location, { method: 'GET', redirect: 'follow' });
      diag.redirect_get_status = res2.status;
      const fullText = await res2.text();
      diag.redirect_get_text = fullText.slice(0, 200);
      return { diag, status: res2.status, ok: res2.ok, text: fullText };
    }
  }

  const fullPostText = await res1.text();
  diag.post_text = fullPostText.slice(0, 200);
  return { diag, status: res1.status, ok: res1.ok, text: fullPostText };
}

async function postWebhook(url, body, headers) {
  const postAttempts = [
    {
      label: 'json_post_get_redirect',
      contentType: 'application/json',
      buildBody: () => JSON.stringify(body),
    },
    {
      label: 'form_post_get_redirect',
      contentType: 'application/x-www-form-urlencoded',
      buildBody: () => new URLSearchParams({ payload: JSON.stringify(body) }),
    },
  ];

  let lastDiag = null;

  for (const attempt of postAttempts) {
    const reqHeaders = { 'Content-Type': attempt.contentType };
    if (headers['X-Creamy-Secret']) reqHeaders['X-Creamy-Secret'] = headers['X-Creamy-Secret'];

    const { diag, status, ok, text } = await diagnoseWebhookPost(url, reqHeaders, attempt.buildBody());
    lastDiag = diag;
    const result = { status, ok, text, strategy: attempt.label, diag };

    if (ok) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.ok === false) {
          return { ...result, ok: false };
        }
      } catch {
        // non-json ok response
      }
      return result;
    }

    if (status !== 401 && status !== 403) {
      return result;
    }
  }

  return { status: 401, ok: false, text: 'all_post_strategies_failed', strategy: 'failed', diag: lastDiag };
}

async function getWebhookHealth(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text: text.slice(0, 500) };
  } catch (err) {
    return { status: 'error', ok: false, text: err.message };
  }
}

async function appendViaWebhook(row) {
  const url = normalizeWebhookUrl(process.env.CREAMY_SHEETS_WEBHOOK_URL);
  const headers = { 'Content-Type': 'application/json' };
  const secret = process.env.CREAMY_SHEETS_WEBHOOK_SECRET?.trim();
  if (secret) headers['X-Creamy-Secret'] = secret;

  const payload = buildSheetRow(row);
  const { status, ok, text, strategy, diag } = await postWebhook(url, payload, headers);

  if (!ok) {
    const getResult = await appendViaGet(url, row, headers);
    if (getResult.ok) {
      return {
        ok: true,
        via: 'webhook_get',
        status: getResult.status,
        response_text: getResult.text,
        parsed: getResult.parsed,
        strategy: getResult.strategy,
        post_fallback: true,
      };
    }

    if (getResult.needs_apps_script_update) {
      const err = new Error('webhook_get_needs_apps_script_update:doGet sin soporte payload');
      err.diag = diag;
      err.needs_apps_script_update = true;
      throw err;
    }

    const err = new Error(`webhook_${status}${strategy ? `_${strategy}` : ''}:${text.slice(0, 200)}`);
    err.diag = diag;
    err.get_fallback = getResult.text?.slice(0, 200) || '';
    throw err;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(text);
    if (parsed && parsed.ok === false) {
      throw new Error(`webhook_rejected:${parsed.error || 'unknown'}`);
    }
  } catch (err) {
    if (err.message.startsWith('webhook_rejected:')) throw err;
  }

  return { ok: true, via: 'webhook', status, response_text: text, parsed, strategy, diag };
}

async function appendViaApi(row) {
  const spreadsheetId = process.env.CREAMY_SHEETS_SPREADSHEET_ID.trim();
  const tab = (process.env.CREAMY_SHEETS_TAB || 'Creamy Log').trim();
  const range = `${tab}!A:X`;
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

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`api_${res.status}:${text.slice(0, 200)}`);
  }
  return { ok: true, via: 'api', status: res.status, response_text: text };
}

export async function appendConversationLog(row) {
  const eventType = row.tipo_evento || row.event_type || '';
  const meta = {
    sheets_enabled: isSheetsConfigured(),
    sheets_url_present: isSheetsUrlPresent(),
    sheets_event_type: eventType,
    sheets_status: null,
    sheets_response_text: '',
    sheets_error: '',
  };

  if (!isSheetsConfigured()) {
    meta.sheets_error = 'not_configured';
    logSheetsEvent(meta);
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  try {
    if (webhookConfigured()) {
      try {
        return await appendViaWebhook(row);
      } catch (webhookErr) {
        if (!apiConfigured()) throw webhookErr;
        meta.sheets_error = `webhook_failed:${webhookErr.message}`;
        const apiResult = await appendViaApi(row);
        meta.sheets_status = apiResult.status ?? 200;
        meta.sheets_response_text = String(apiResult.response_text || '').slice(0, 300);
        logSheetsEvent({ ...meta, sheets_event_type: eventType });
        return { ...apiResult, fallback_from_webhook: true };
      }
    }
    const result = await appendViaApi(row);

    meta.sheets_status = result.status ?? 200;
    meta.sheets_response_text = String(result.response_text || '').slice(0, 300);
    logSheetsEvent(meta);
    return result;
  } catch (err) {
    meta.sheets_status = 'error';
    meta.sheets_error = err.message;
    logSheetsEvent(meta);
    return { ok: false, error: err.message, diag: err.diag || null, needs_apps_script_update: err.needs_apps_script_update || false };
  }
}

export async function probeSheetsWebhook() {
  const sheets_url_present = isSheetsUrlPresent();
  const api_configured = apiConfigured();
  const rawUrl = process.env.CREAMY_SHEETS_WEBHOOK_URL?.trim() || '';
  const result = {
    sheets_url_present,
    api_configured,
    webhook_url_uses_dev: rawUrl.includes('/dev'),
    webhook_secret_set: !!process.env.CREAMY_SHEETS_WEBHOOK_SECRET?.trim(),
    webhook_get_status: null,
    webhook_get_ok: false,
    webhook_reachable: false,
    webhook_status: null,
    webhook_response: '',
    test_write_ok: false,
  };

  if (!sheets_url_present && !api_configured) {
    result.webhook_response = 'CREAMY_SHEETS_WEBHOOK_URL ni API credentials configuradas';
    return result;
  }

  if (sheets_url_present) {
    const url = normalizeWebhookUrl(rawUrl);
    const health = await getWebhookHealth(url);
    result.webhook_get_status = health.status;
    result.webhook_get_ok = health.ok;
    try {
      const parsed = JSON.parse(health.text);
      result.webhook_get_ok = health.ok && parsed.ok === true;
      result.webhook_get_supports_payload = health.ok && parsed.service === 'creamy-v2-sheets-webhook';
    } catch {
      // keep health.ok
    }
  }

  const testRow = {
    session_id: `debug_${Date.now()}`,
    nombre: 'Sheets',
    apellido: 'Debug',
    tipo_evento: 'debug_test',
    página: 'sheets-debug',
    url: 'api/creamy-v2/sheets-debug',
    user_agent: 'creamy-v2/sheets-debug',
  };

  const append = await appendConversationLog(testRow);
  result.webhook_status = append.status ?? (append.ok ? 200 : 'error');
  result.webhook_strategy = append.strategy || '';
  result.webhook_post_diag = append.diag || null;
  result.webhook_response = String(append.response_text || append.error || append.reason || '').slice(0, 500);
  result.webhook_reachable = append.ok === true;
  result.test_write_ok = append.ok === true;
  if (!result.test_write_ok && result.webhook_get_ok && result.webhook_post_diag?.post_status === 401) {
    result.hint = 'POST bloqueado (401) pero GET funciona. Actualizar Apps Script con doGet+payload y crear NUEVA implementación del Web App.';
    result.apps_script_update_required = true;
  }
  if (append.needs_apps_script_update) {
    result.apps_script_update_required = true;
    result.hint = 'Pegar backend/creamy-v2/google-apps-script/sheets-webhook.gs actualizado y crear NUEVA implementación (acceso: Cualquiera).';
  }
  return result;
}

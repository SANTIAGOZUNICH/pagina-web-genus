/**
 * Creamy V2 — Debug endpoint (temporal)
 * GET /api/creamy-v2/debug
 *
 * Diagnóstico OpenAI sin exponer API key.
 */

import { probeOpenAI, DEFAULT_MODEL } from '../../backend/creamy-v2/lib/openai-debug.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body, null, 2));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const report = await probeOpenAI(DEFAULT_MODEL);

    const payload = {
      openai_key_present: report.openai_key_present,
      openai_key_prefix: report.openai_key_prefix,
      openai_key_has_whitespace: report.openai_key_has_whitespace,
      model: DEFAULT_MODEL,
      can_connect_to_openai: report.can_connect_to_openai,
      openai_status: report.openai_status,
      last_error: report.last_error,
      environment: report.environment,
      diagnosis: report.diagnosis,
      probes: {
        models_latency_ms: report.models_probe_latency_ms ?? null,
        chat_latency_ms: report.chat_probe_latency_ms ?? null,
        chat_reply: report.chat_probe_reply ?? null,
      },
      timestamp: report.timestamp,
    };

    const httpStatus = report.can_connect_to_openai && report.openai_status === 'ok' ? 200 : 503;
    return json(res, httpStatus, payload);
  } catch (err) {
    return json(res, 500, {
      openai_key_present: !!process.env.OPENAI_API_KEY?.trim(),
      model: DEFAULT_MODEL,
      can_connect_to_openai: false,
      openai_status: 'handler_error',
      last_error: { code: 'debug_handler_error', message: err.message },
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    });
  }
}

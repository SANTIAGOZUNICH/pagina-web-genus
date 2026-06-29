/**
 * Creamy V2 — Debug endpoint (temporal)
 * GET /api/creamy-v2/debug
 */

import { probeAIProvider, getActiveProviderName, getProviderModel } from '../../backend/creamy-v2/lib/ai/provider.js';

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
    const provider = getActiveProviderName();
    const model = getProviderModel(provider);
    const report = await probeAIProvider(provider);

    const payload = {
      provider: report.provider,
      model: report.model,
      gemini_key_present: report.gemini_key_present ?? (provider === 'gemini' ? report.key_present : false),
      openai_key_present: provider === 'openai' ? report.key_present : !!process.env.OPENAI_API_KEY?.trim(),
      key_prefix: report.key_prefix,
      can_connect: report.can_connect,
      status: report.status,
      last_error: report.last_error,
      environment: report.environment,
      diagnosis: report.diagnosis,
      probe_latency_ms: report.probe_latency_ms ?? null,
      probe_reply: report.probe_reply ?? null,
      timestamp: report.timestamp,
    };

    const httpStatus = report.can_connect && report.status === 'ok' ? 200 : 503;
    return json(res, httpStatus, payload);
  } catch (err) {
    return json(res, 500, {
      provider: getActiveProviderName(),
      model: getProviderModel(),
      gemini_key_present: !!process.env.GEMINI_API_KEY?.trim(),
      can_connect: false,
      status: 'handler_error',
      last_error: { code: 'debug_handler_error', message: err.message },
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    });
  }
}

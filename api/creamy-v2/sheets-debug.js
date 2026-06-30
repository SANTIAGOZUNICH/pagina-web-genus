/**
 * Creamy V2 — Sheets debug (temporal)
 * GET /api/creamy-v2/sheets-debug
 */

import { isSheetsConfigured, isSheetsUrlPresent, probeSheetsWebhook } from '../../backend/creamy-v2/lib/sheets.js';

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

  const probe = await probeSheetsWebhook();
  const payload = {
    service: 'creamy-v2-sheets-debug',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    sheets_enabled: isSheetsConfigured(),
    ...probe,
    timestamp: new Date().toISOString(),
  };

  const httpStatus = probe.test_write_ok ? 200 : (probe.sheets_url_present ? 503 : 503);
  return json(res, httpStatus, payload);
}

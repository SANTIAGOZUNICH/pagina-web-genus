/*!
 * Serves assets/creamy/creamy.js — bypasses stale static CDN cache on production.
 */
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'assets/creamy/creamy.js');

export default function handler(req, res) {
  try {
    const body = fs.readFileSync(FILE, 'utf8');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('X-Creamy-Asset', 'widget-js');
    res.status(200).send(body);
  } catch (err) {
    res.status(500).json({ error: 'Creamy widget JS unavailable', detail: err.message });
  }
}

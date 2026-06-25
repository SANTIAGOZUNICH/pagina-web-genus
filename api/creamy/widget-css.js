/*!
 * Serves assets/creamy/creamy.css — bypasses stale static CDN cache on production.
 */
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'assets/creamy/creamy.css');

export default function handler(req, res) {
  try {
    const body = fs.readFileSync(FILE, 'utf8');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('X-Creamy-Asset', 'widget-css');
    res.status(200).send(body);
  } catch (err) {
    res.status(500).json({ error: 'Creamy widget CSS unavailable', detail: err.message });
  }
}

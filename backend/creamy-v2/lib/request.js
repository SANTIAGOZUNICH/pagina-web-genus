/**
 * Request helpers — parse body, sanitize history.
 * Knowledge NO se usa para respuestas hardcodeadas; solo contexto en system prompt.
 */

export async function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return null;
      }
    }
    if (typeof req.body === 'object') return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/** Últimos N mensajes válidos para OpenAI */
export function sanitizeHistory(raw, maxMessages = 10) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role;
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    if (!content || (role !== 'user' && role !== 'assistant')) continue;
    out.push({ role, content: content.slice(0, 4000) });
  }
  return out.slice(-maxMessages);
}

/** Normalización ligera de typos frecuentes (la IA también infiere en el prompt) */
export function normalizeUserMessage(message) {
  let m = message.trim();
  const fixes = [
    [/\bniaciniamida\b/gi, 'niacinamida'],
    [/\bniaciamida\b/gi, 'niacinamida'],
    [/\bhialuronico\b/gi, 'ácido hialurónico'],
    [/\bacido hialuronico\b/gi, 'ácido hialurónico'],
    [/\bvitamina c\b/gi, 'vitamina C'],
    [/\bretinol\b/gi, 'retinol'],
  ];
  for (const [re, rep] of fixes) m = m.replace(re, rep);
  return m;
}

/** Mensaje de emergencia genérico — sin respuestas prearmadas por patrón */
export function getEmergencyMessage(knowledge) {
  const email = knowledge?.laboratorio?.email || 'ventas@laboratoriogenus.com.ar';
  const wa = knowledge?.laboratorio?.whatsapp || 'https://wa.me/5491124980861';
  return `Estoy teniendo una demora técnica para responder consultas complejas. Mientras tanto, puedo ayudarte con información básica del laboratorio o derivarte con un asesor.\n\n**Contacto:** ${email}\n**WhatsApp:** ${wa}\n\nMOQ desarrollo: **500 unidades** · Llave en mano: desde **5.000 unidades**.`;
}

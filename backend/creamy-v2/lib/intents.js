/**
 * Detección de intención comercial — reglas + señales del mensaje.
 * Devuelve array de action keys para el frontend.
 */

const ACTION_DEFS = {
  CONFIGURADOR: { label: '🧪 Crear mi producto', style: 'primary', urlKey: 'configurador' },
  COTIZACION: { label: '📋 Solicitar cotización', style: 'secondary', urlKey: 'cotizacion' },
  WHATSAPP: { label: '💬 Hablar por WhatsApp', style: 'whatsapp', urlKey: 'whatsapp', external: true },
  REUNION: { label: '📅 Agendar reunión', style: 'secondary', urlKey: 'reunion' },
};

const PATTERNS = {
  develop: /\b(desarrroll|crear|formul|mi producto|mi marca|lanzar|fabricar|producir|serum|crema|shampoo|cosmético)\b/i,
  quote: /\b(cotiz|precio|costo|cuánto sale|cuanto sale|presupuesto|tarifa|inversión)\b/i,
  human: /\b(hablar con|asesor|humano|persona|llamar|whatsapp|wsp|wa\.me)\b/i,
  meeting: /\b(reunión|reunion|agendar|videollamada|llamada|turno|cita)\b/i,
  ready: /\b(avanz|siguiente paso|empezar|arrancar|quiero hacerlo|dale|ok perfecto)\b/i,
};

export function detectIntents(userMessage, assistantReply, historyLength) {
  const text = `${userMessage} ${assistantReply}`.toLowerCase();
  const actions = new Set();

  if (PATTERNS.quote.test(text)) actions.add('COTIZACION');
  if (PATTERNS.human.test(text)) actions.add('WHATSAPP');
  if (PATTERNS.meeting.test(text)) actions.add('REUNION');
  if (PATTERNS.develop.test(text) && (PATTERNS.ready.test(text) || historyLength >= 4)) {
    actions.add('CONFIGURADOR');
  }
  if (PATTERNS.develop.test(text) && historyLength >= 2 && !actions.has('COTIZACION')) {
    actions.add('COTIZACION');
  }

  if (actions.size === 0 && historyLength >= 6 && PATTERNS.develop.test(text)) {
    actions.add('CONFIGURADOR');
    actions.add('WHATSAPP');
  }

  return [...actions].slice(0, 3);
}

export function getActionDefs() {
  return ACTION_DEFS;
}

export { ACTION_DEFS };

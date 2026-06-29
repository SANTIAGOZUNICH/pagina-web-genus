/**
 * Detección de intención comercial — conservadora.
 * WhatsApp solo cuando el usuario pide contacto humano explícito.
 */

const PATTERNS = {
  develop: /\b(desarrroll|crear|formul|mi producto|mi marca|lanzar|fabricar|producir|serum|crema|shampoo|cosmético)\b/i,
  quote: /\b(cotiz|precio|costo|cuánto sale|cuanto sale|presupuesto|tarifa|inversión)\b/i,
  human: /\b(hablar con (alguien|una persona|un asesor|humano)|quiero un asesor|contactar|llamame|llámame|whatsapp|wsp|wa\.me|hablar por whatsapp)\b/i,
  meeting: /\b(reunión|reunion|agendar|videollamada|llamada|turno|cita)\b/i,
  ready: /\b(avanz|siguiente paso|empezar|arrancar|quiero hacerlo|dale|ok perfecto|solicitar|cotizar)\b/i,
};

export function detectIntents(userMessage, assistantReply, historyLength) {
  const user = (userMessage || '').toLowerCase();
  const actions = [];

  if (PATTERNS.human.test(user)) actions.push('WHATSAPP');
  if (PATTERNS.meeting.test(user)) actions.push('REUNION');
  if (PATTERNS.quote.test(user)) actions.push('COTIZACION');

  if (PATTERNS.develop.test(user) && PATTERNS.ready.test(user)) {
    actions.push('CONFIGURADOR');
    if (!actions.includes('COTIZACION')) actions.push('COTIZACION');
  } else if (PATTERNS.develop.test(user) && historyLength >= 5 && PATTERNS.quote.test(assistantReply || '')) {
    actions.push('COTIZACION');
  }

  return [...new Set(actions)].slice(0, 2);
}

export function inferIntent(userMessage, historyLength) {
  const user = (userMessage || '').toLowerCase();
  if (PATTERNS.human.test(user)) return 'contacto_humano';
  if (PATTERNS.meeting.test(user)) return 'agendar_reunion';
  if (PATTERNS.quote.test(user)) return 'cotizacion';
  if (PATTERNS.develop.test(user) && PATTERNS.ready.test(user)) return 'desarrollo_listo';
  if (PATTERNS.develop.test(user)) return 'explorando_desarrollo';
  if (/\b(moq|mínim|minim|unidades)\b/i.test(user)) return 'consulta_comercial';
  if (historyLength >= 2 && /\b(pero|entonces|y si|mejor|recomendas|recomendás)\b/i.test(user)) return 'follow_up';
  return 'consulta_tecnica';
}

export { PATTERNS };

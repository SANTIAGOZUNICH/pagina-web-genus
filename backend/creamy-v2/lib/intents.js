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

export { PATTERNS };

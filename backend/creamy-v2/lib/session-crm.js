/**
 * CRM en memoria por session_id — métricas de conversación para Sheets.
 * No afecta la IA; solo enriquece el logging.
 */

const sessions = new Map();

function touch(sessionId) {
  if (!sessionId) return null;
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      startedAt: Date.now(),
      questionCount: 0,
      whatsapp: false,
      crearProducto: false,
      cotizacion: false,
      hadError: false,
      primaryProduct: '',
      primaryActive: '',
    });
  }
  return sessions.get(sessionId);
}

function pickPrimary(current, value) {
  if (current) return current;
  const first = (value || '').split(',')[0]?.trim();
  return first || '';
}

export function registerVisitorSession(sessionId) {
  touch(sessionId);
}

export function recordUserMessage(sessionId, entities = {}) {
  const s = touch(sessionId);
  if (!s) return;
  s.questionCount += 1;
  s.primaryProduct = pickPrimary(s.primaryProduct, entities.producto_mencionado);
  s.primaryActive = pickPrimary(s.primaryActive, entities.activos_mencionados);
}

export function recordAssistantTurn(sessionId, { hadError = false, entities = {} } = {}) {
  const s = touch(sessionId);
  if (!s) return;
  if (hadError) s.hadError = true;
  s.primaryProduct = pickPrimary(s.primaryProduct, entities.producto_mencionado);
  s.primaryActive = pickPrimary(s.primaryActive, entities.activos_mencionados);
}

export function recordCtaEvent(sessionId, eventType) {
  const s = touch(sessionId);
  if (!s) return;
  if (eventType === 'whatsapp_click') s.whatsapp = true;
  if (eventType === 'crear_producto_click') s.crearProducto = true;
  if (eventType === 'cotizacion_click') s.cotizacion = true;
}

export function crmSnapshot(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) {
    return {
      conversation_duration_sec: '',
      question_count: '',
      primary_product: '',
      primary_active: '',
      opened_whatsapp: '',
      opened_crear_producto: '',
      opened_cotizacion: '',
      had_error: '',
    };
  }
  return {
    conversation_duration_sec: Math.max(0, Math.round((Date.now() - s.startedAt) / 1000)),
    question_count: s.questionCount,
    primary_product: s.primaryProduct,
    primary_active: s.primaryActive,
    opened_whatsapp: s.whatsapp ? 'sí' : 'no',
    opened_crear_producto: s.crearProducto ? 'sí' : 'no',
    opened_cotizacion: s.cotizacion ? 'sí' : 'no',
    had_error: s.hadError ? 'sí' : 'no',
  };
}

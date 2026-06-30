/**
 * Creamy V2 — Storage adapter
 * Memoria local + Google Sheets (si está configurado).
 */

import { appendConversationLog } from './sheets.js';
import { formatCtaEvent } from './entities.js';

const memoryStore = {
  conversations: new Map(),
  leads: [],
  metrics: [],
};

function scheduleSheetLog(row) {
  appendConversationLog(row).catch(() => {});
}

export const StorageAdapter = {
  async saveConversation(sessionId, payload) {
    memoryStore.conversations.set(sessionId, {
      ...payload,
      saved_at: new Date().toISOString(),
    });
    return { ok: true, provider: 'memory' };
  },

  async saveLead(lead) {
    memoryStore.leads.push({ ...lead, created_at: new Date().toISOString() });
    return { ok: true, provider: 'memory' };
  },

  async trackMetric(event, data = {}) {
    memoryStore.metrics.push({ event, data, at: new Date().toISOString() });
    return { ok: true };
  },

  logMessageTurn(payload) {
    const ctaShown = Array.isArray(payload.actions)
      ? payload.actions.map(formatCtaEvent).filter(Boolean).join(', ')
      : '';

    scheduleSheetLog({
      session_id: payload.session_id,
      nombre: payload.user_name,
      página: payload.page_key,
      'pregunta del usuario': payload.user_message,
      'respuesta de Creamy': payload.assistant_reply,
      'intención detectada': payload.intent,
      'producto mencionado': payload.producto_mencionado,
      'activos mencionados': payload.activos_mencionados,
      'proveedor IA': payload.provider,
      modelo: payload.model,
      used_ai: payload.used_ai,
      used_fallback: payload.used_fallback,
      'evento CTA': ctaShown,
    });

    return { ok: true };
  },

  logCtaClick(payload) {
    scheduleSheetLog({
      session_id: payload.session_id,
      nombre: payload.user_name,
      página: payload.page_key,
      'pregunta del usuario': payload.context_message || '',
      'respuesta de Creamy': '',
      'intención detectada': 'cta_click',
      'evento CTA': formatCtaEvent(payload.cta),
    });

    return { ok: true };
  },

  /** Para tests / debug */
  _peek() {
    return {
      conversations: memoryStore.conversations.size,
      leads: memoryStore.leads.length,
      metrics: memoryStore.metrics.length,
    };
  },
};

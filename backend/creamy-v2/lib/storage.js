/**
 * Creamy V2 — Storage adapter
 * Memoria local + Google Sheets (si está configurado).
 */

import { appendConversationLog } from './sheets.js';

const memoryStore = {
  conversations: new Map(),
  leads: [],
  metrics: [],
};

function scheduleSheetLog(row) {
  appendConversationLog(row).catch(() => {});
}

function visitorBase(payload) {
  return {
    session_id: payload.session_id || '',
    nombre: payload.user_first_name || payload.nombre || '',
    apellido: payload.user_last_name || payload.apellido || '',
    página: payload.page_key || payload.página || '',
    user_agent: payload.user_agent || '',
  };
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

  logVisitorRegistered(payload) {
    scheduleSheetLog({
      ...visitorBase(payload),
      tipo_evento: 'visitor_registered',
    });
    return { ok: true };
  },

  logChatTurn(payload) {
    const base = visitorBase(payload);

    scheduleSheetLog({
      ...base,
      tipo_evento: 'user_message',
      user_message: payload.user_message,
    });

    scheduleSheetLog({
      ...base,
      tipo_evento: 'assistant_message',
      assistant_reply: payload.assistant_reply,
      intent: payload.intent,
      producto_mencionado: payload.producto_mencionado,
      activos_mencionados: payload.activos_mencionados,
      provider: payload.provider,
      model: payload.model,
      used_ai: payload.used_ai,
      used_fallback: payload.used_fallback,
    });

    return { ok: true };
  },

  logCtaClick(payload) {
    scheduleSheetLog({
      ...visitorBase(payload),
      tipo_evento: payload.event_type || payload.tipo_evento || 'cta_click',
      user_message: payload.context_message || '',
    });
    return { ok: true };
  },

  /** @deprecated use logChatTurn */
  logMessageTurn(payload) {
    return this.logChatTurn(payload);
  },

  _peek() {
    return {
      conversations: memoryStore.conversations.size,
      leads: memoryStore.leads.length,
      metrics: memoryStore.metrics.length,
    };
  },
};

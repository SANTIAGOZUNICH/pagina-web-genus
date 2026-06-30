/**
 * Creamy V2 — Storage adapter + CRM Sheets
 */

import { appendConversationLog } from './sheets.js';
import {
  registerVisitorSession,
  recordUserMessage,
  recordAssistantTurn,
  recordCtaEvent,
  crmSnapshot,
} from './session-crm.js';

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
    url: payload.page_url || payload.url || '',
    user_agent: payload.user_agent || '',
    ...crmSnapshot(payload.session_id),
  };
}

function withCrm(payload, extra = {}) {
  return { ...visitorBase(payload), ...extra };
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
    registerVisitorSession(payload.session_id);
    scheduleSheetLog(withCrm(payload, { tipo_evento: 'visitor_registered' }));
    return { ok: true };
  },

  logChatTurn(payload) {
    const entities = {
      producto_mencionado: payload.producto_mencionado,
      activos_mencionados: payload.activos_mencionados,
    };

    recordUserMessage(payload.session_id, entities);

    scheduleSheetLog(withCrm(payload, {
      tipo_evento: 'user_message',
      user_message: payload.user_message,
    }));

    const hadError = !!payload.had_error;
    recordAssistantTurn(payload.session_id, { hadError, entities });

    scheduleSheetLog(withCrm(payload, {
      tipo_evento: 'assistant_message',
      assistant_reply: payload.assistant_reply,
      intent: payload.intent,
      primary_product: crmSnapshot(payload.session_id).primary_product,
      primary_active: crmSnapshot(payload.session_id).primary_active,
      provider: payload.provider,
      model: payload.model,
      used_ai: payload.used_ai,
      used_fallback: payload.used_fallback,
      had_error: hadError,
    }));

    return { ok: true };
  },

  logCtaClick(payload) {
    const eventType = payload.event_type || payload.tipo_evento || 'cta_click';
    recordCtaEvent(payload.session_id, eventType);
    scheduleSheetLog(withCrm(payload, {
      tipo_evento: eventType,
      user_message: payload.context_message || '',
    }));
    return { ok: true };
  },

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

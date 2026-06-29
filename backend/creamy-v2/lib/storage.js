/**
 * Creamy V2 — Storage adapter (preparado para Supabase)
 * Por ahora: noop / in-memory hooks para futura integración.
 */

const memoryStore = {
  conversations: new Map(),
  leads: [],
  metrics: [],
};

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

  /** Para tests / debug */
  _peek() {
    return {
      conversations: memoryStore.conversations.size,
      leads: memoryStore.leads.length,
      metrics: memoryStore.metrics.length,
    };
  },
};

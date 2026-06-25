// ============================================================
// PARCHE PARA creamy.js — Sección de llamada a la API
// Reemplazá el método _processWithAI() (o el que uses) con esto.
// Eliminá cualquier llamada a _processWithMock() fuera de
// los quick chips iniciales de C1.
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURACIÓN DEL ENDPOINT (al inicio de la clase Creamy)
// ─────────────────────────────────────────────────────────────

// Dentro de creamy-config.json ya debe existir:
// {
//   "apiEndpoint": "/api/creamy/chat",
//   "useMock": false          ← CONFIRMAR QUE ESTÁ EN false
// }

// En la inicialización de la clase:
// this.config = await this._loadConfig();
// this.apiEndpoint = this.config.apiEndpoint || '/api/creamy/chat';
// this.useMock = this.config.useMock ?? false;  // false = IA real


// ─────────────────────────────────────────────────────────────
// 2. REEMPLAZAR EL MÉTODO PRINCIPAL DE PROCESAMIENTO
// ─────────────────────────────────────────────────────────────

async _sendMessage(userMessage) {
  // ── NUNCA usar mock si useMock === false ──
  // El único mock permitido es para los quick chips iniciales de C1
  // Eso ya no aplica en C2.

  this._showTypingIndicator();

  let responseData;

  try {
    responseData = await this._callAPI(userMessage);
  } catch (err) {
    this._hideTypingIndicator();
    // Mostrar error real al usuario — no simular una respuesta
    this._appendMessage('assistant', 
      'Estoy teniendo problemas para conectarme. Por favor intentá de nuevo en unos segundos.',
      { isError: true }
    );
    console.error('[Creamy] Error en _sendMessage:', err);
    return;
  }

  this._hideTypingIndicator();

  if (!responseData || !responseData.reply) {
    this._appendMessage('assistant',
      'Recibí una respuesta vacía. Por favor intentá de nuevo.',
      { isError: true }
    );
    return;
  }

  // Agregar la respuesta al chat
  this._appendMessage('assistant', responseData.reply);

  // Mostrar botones de acción si los hay
  if (responseData.actions && responseData.actions.length > 0) {
    this._showActionButtons(responseData.actions);
  }

  // Log de diagnóstico (solo en desarrollo)
  if (responseData.meta) {
    console.log('[Creamy] Meta:', {
      model: responseData.meta.model,
      tokens: responseData.meta.tokens_used,
      knowledge_loaded: responseData.meta.knowledge_loaded,
      used_fallback: responseData.meta.used_fallback,
      request_id: responseData.meta.request_id,
    });
  }
}


// ─────────────────────────────────────────────────────────────
// 3. MÉTODO DE LLAMADA A LA API (reemplazá el tuyo por este)
// ─────────────────────────────────────────────────────────────

async _callAPI(userMessage) {
  const endpoint = this.apiEndpoint; // debe ser '/api/creamy/chat'

  console.log(`[Creamy] POST → ${endpoint}`, {
    message_length: userMessage.length,
    history_turns: this.conversationHistory.length,
    session_id: this.sessionId,
  });

  const body = {
    message: userMessage,
    conversation_history: this.conversationHistory,
    session_id: this.sessionId,
    page_url: window.location.href,
    page_title: document.title,
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error('[Creamy] Network error (no se pudo conectar al endpoint):', networkErr);
    throw new Error('NETWORK_ERROR');
  }

  console.log(`[Creamy] Respuesta HTTP: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    let errorData = {};
    try { errorData = await response.json(); } catch (_) {}

    console.error('[Creamy] Error del servidor:', {
      status: response.status,
      code: errorData.code,
      error: errorData.error,
    });

    // Mensajes específicos por código de error
    if (response.status === 429) {
      throw new Error('RATE_LIMIT: ' + (errorData.error || 'Demasiadas solicitudes'));
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_ERROR: ' + response.status);
    }
    if (response.status === 500 || response.status === 502) {
      throw new Error('SERVER_ERROR: ' + (errorData.code || response.status));
    }
    throw new Error(`HTTP_${response.status}`);
  }

  const data = await response.json();

  console.log('[Creamy] Respuesta recibida:', {
    has_reply: !!data.reply,
    reply_length: data.reply?.length,
    actions: data.actions,
    model: data.meta?.model,
    tokens: data.meta?.tokens_used,
    knowledge_loaded: data.meta?.knowledge_loaded,
    used_fallback: data.meta?.used_fallback,
  });

  // Actualizar historial de conversación
  this.conversationHistory.push(
    { role: 'user', content: userMessage },
    { role: 'assistant', content: data.reply }
  );

  // Limitar historial a los últimos 24 mensajes (12 turnos)
  if (this.conversationHistory.length > 24) {
    this.conversationHistory = this.conversationHistory.slice(-24);
  }

  return data;
}


// ─────────────────────────────────────────────────────────────
// 4. MOSTRAR BOTONES DE ACCIÓN (conversión)
// ─────────────────────────────────────────────────────────────

_showActionButtons(actions) {
  const config = this.config;

  const buttonMap = {
    'CONFIGURADOR': {
      label: '🧪 Crear mi producto',
      url: config.urls?.configurador || '/crea-tu-producto',
      style: 'primary',
    },
    'COTIZACION': {
      label: '📋 Solicitar cotización',
      url: config.urls?.cotizacion || '/cotizacion',
      style: 'secondary',
    },
    'WHATSAPP': {
      label: '💬 Hablar con un asesor',
      url: config.urls?.whatsapp || 'https://wa.me/5491124980861',
      style: 'whatsapp',
      external: true,
    },
  };

  const container = document.createElement('div');
  container.className = 'creamy-action-buttons';

  actions.forEach(action => {
    const def = buttonMap[action];
    if (!def) return;

    const btn = document.createElement('a');
    btn.href = def.url;
    btn.className = `creamy-action-btn creamy-action-btn--${def.style}`;
    btn.textContent = def.label;

    if (def.external) {
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
    }

    // Evento de analytics
    btn.addEventListener('click', () => {
      this._trackEvent(`creamy_click_${action.toLowerCase()}`);
    });

    container.appendChild(btn);
  });

  // Agregar al último mensaje del asistente
  const messages = this.elements.messages.querySelectorAll('.creamy-bubble--assistant');
  const lastMessage = messages[messages.length - 1];
  if (lastMessage) {
    lastMessage.appendChild(container);
  }
}

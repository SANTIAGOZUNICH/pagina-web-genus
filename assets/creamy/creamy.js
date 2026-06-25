/*!
 * CREAMY AI - Widget JavaScript
 * Fase C2+ — Asistente inteligente premium
 * Arquitectura: docs/CREAMY_AI_ARCHITECTURE_v1.md
 */
(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    apiEndpoint: '/api/creamy/chat',
    useMock: false,
    typingDelayMin: 400,
    typingDelayMax: 900,
    greetingDelayMin: 6000,
    greetingDelayMax: 8000,
    greetingBubbleDuration: 8000,
    avatarEmoji: '🧴',
    welcomeMessage:
      'Hola, soy Creamy — el asistente de Laboratorio Genus. Puedo ayudarte a explorar nuestros servicios, resolver consultas técnicas y orientarte en el desarrollo de tu producto cosmético. ¿Por dónde empezamos?',
    urls: {
      configurador: '/cotizador.html',
      cotizacion: '/contacto.html',
      whatsapp: 'https://wa.me/5491124980861',
    },
    initialChips: [
      { id: 'develop', label: '🧪 Quiero desarrollar un producto' },
      { id: 'services', label: '📋 Consultar servicios y precios' },
      { id: 'technical', label: '⚗️ Tengo una consulta técnica' },
      { id: 'advisor', label: '💬 Hablar con un asesor' },
    ],
    pageContext: {},
  };

  const ACTION_BUTTONS = {
    CONFIGURADOR: { label: '🧪 Crear mi producto', style: 'primary', key: 'configurador' },
    COTIZACION: { label: '📋 Solicitar cotización', style: 'secondary', key: 'cotizacion' },
    WHATSAPP: { label: '💬 Hablar con un asesor', style: 'whatsapp', key: 'whatsapp', external: true },
  };

  const CREAMY_AVATAR_SVG = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#D9F0F7"/>
    <ellipse cx="24" cy="30" rx="12" ry="10" fill="#1E9BC0"/>
    <rect x="17" y="10" width="14" height="16" rx="4" fill="#fff" stroke="#0D5C73" stroke-width="1.5"/>
    <circle cx="20" cy="17" r="1.5" fill="#0D5C73"/>
    <circle cx="28" cy="17" r="1.5" fill="#0D5C73"/>
    <path d="M20 21c2 2 6 2 8 0" stroke="#0D5C73" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="24" cy="8" rx="5" ry="3" fill="#1E9BC0"/>
  </svg>`;

  class CreamyAI {
    constructor() {
      this.config = { ...DEFAULT_CONFIG };
      this.isOpen = false;
      this.isTyping = false;
      this.conversationHistory = [];
      this.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
      this.messageCount = 0;
      this.greetingShown = false;
      this.greetingBubbleEl = null;
      this.pageUrl = window.location.href;
      this.pageTitle = document.title;
      this.pageKey = this._detectPageKey();
      this._init();
    }

    async _init() {
      await this._loadConfig();
      this._render();
      this._bindEvents();
      this._scheduleSmartGreeting();
      this._trackEvent('creamy_session_start');
    }

    async _loadConfig() {
      try {
        const res = await fetch('/assets/creamy/creamy-config.json', { cache: 'no-cache' });
        if (res.ok) {
          const external = await res.json();
          this.config = { ...DEFAULT_CONFIG, ...external, urls: { ...DEFAULT_CONFIG.urls, ...external.urls } };
        }
      } catch (_) {
        // defaults are fine
      }
    }

    _detectPageKey() {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('productos')) return 'productos';
      if (path.includes('cotizador')) return 'cotizador';
      if (path.includes('desarrolla-tu-producto') || path.includes('crea-tu-producto')) return 'desarrolla-tu-producto';
      if (path.includes('contacto')) return 'contacto';
      if (path.includes('calidad')) return 'calidad';
      if (path.includes('llave-en-mano')) return 'llave-en-mano';
      if (path.includes('quienes-somos')) return 'quienes-somos';
      return 'index';
    }

    _getContextualHint() {
      return this.config.pageContext?.[this.pageKey] || this.config.pageContext?.index || null;
    }

    _render() {
      const wrapper = document.createElement('div');
      wrapper.id = 'creamy-widget';
      wrapper.className = 'creamy-widget';
      wrapper.innerHTML = `
        <div class="creamy-backdrop creamy-hidden" id="creamy-backdrop" aria-hidden="true"></div>
        <button class="creamy-fab" id="creamy-fab" aria-label="Abrir chat con Creamy AI" type="button">
          <span class="creamy-fab-avatar" aria-hidden="true">${CREAMY_AVATAR_SVG}</span>
          <span class="creamy-fab-badge" aria-hidden="true"></span>
          <span class="creamy-fab-tooltip" aria-hidden="true">¿Te ayudo?</span>
        </button>
        <div class="creamy-greeting-bubble creamy-hidden" id="creamy-greeting-bubble" role="status" aria-live="polite"></div>
        <div class="creamy-window creamy-hidden" id="creamy-window" role="dialog" aria-label="Chat Creamy AI" aria-modal="true">
          <div class="creamy-header" role="banner">
            <span class="creamy-header-avatar" aria-hidden="true">${CREAMY_AVATAR_SVG}</span>
            <div class="creamy-header-info">
              <div class="creamy-header-name">Creamy AI</div>
              <div class="creamy-header-status">
                <span class="creamy-header-dot" aria-hidden="true"></span>
                <span class="creamy-header-status-text">${this.config.statusText || 'En línea'}</span>
              </div>
            </div>
            <div class="creamy-header-actions">
              <button class="creamy-header-btn" data-creamy-action="minimize" aria-label="Minimizar" type="button">&#8212;</button>
              <button class="creamy-header-btn" data-creamy-action="close" aria-label="Cerrar" type="button">&times;</button>
            </div>
          </div>
          <div class="creamy-messages" id="creamy-messages" role="log" aria-live="polite"></div>
          <div class="creamy-input-area">
            <div class="creamy-input-row">
              <textarea class="creamy-textarea" id="creamy-textarea" placeholder="Escribí tu consulta..." rows="1" maxlength="2000" aria-label="Mensaje para Creamy"></textarea>
              <button class="creamy-send-btn" id="creamy-send-btn" aria-label="Enviar mensaje" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11l18-7-7 18-2-7-9-4z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
          <div class="creamy-powered">Asistente de Laboratorio Genus</div>
        </div>`;

      document.body.appendChild(wrapper);

      this.wrapper = wrapper;
      this.fab = document.getElementById('creamy-fab');
      this.backdrop = document.getElementById('creamy-backdrop');
      this.windowEl = document.getElementById('creamy-window');
      this.messagesEl = document.getElementById('creamy-messages');
      this.inputEl = document.getElementById('creamy-textarea');
      this.sendBtn = document.getElementById('creamy-send-btn');
      this.greetingBubbleEl = document.getElementById('creamy-greeting-bubble');
    }

    _bindEvents() {
      this.fab.addEventListener('click', () => this._open());
      this.backdrop.addEventListener('click', () => this._minimize());
      this.wrapper.querySelector('[data-creamy-action="minimize"]').addEventListener('click', () => this._minimize());
      this.wrapper.querySelector('[data-creamy-action="close"]').addEventListener('click', () => this._close());
      this.sendBtn.addEventListener('click', () => this._sendUserMessage());
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._sendUserMessage();
        }
      });
      this.inputEl.addEventListener('input', () => {
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 72) + 'px';
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this._minimize();
      });
    }

    _scheduleSmartGreeting() {
      if (sessionStorage.getItem('creamy_greeted')) return;

      const delay =
        this.config.greetingDelayMin +
        Math.random() * (this.config.greetingDelayMax - this.config.greetingDelayMin);

      setTimeout(() => {
        if (this.isOpen || sessionStorage.getItem('creamy_greeted')) return;
        this._showSmartGreeting();
      }, delay);
    }

    _showSmartGreeting() {
      if (this.greetingShown || this.isOpen) return;
      this.greetingShown = true;
      sessionStorage.setItem('creamy_greeted', '1');

      const contextual = this._getContextualHint();
      const text = contextual
        ? `👋 Hola, soy Creamy. ${contextual}`
        : '👋 Hola, soy Creamy. ¿Necesitás ayuda para desarrollar tu producto?';

      this.greetingBubbleEl.textContent = text;
      this.greetingBubbleEl.classList.remove('creamy-hidden');
      this.greetingBubbleEl.classList.add('creamy-greeting-visible');
      this.fab.classList.add('creamy-fab--wave');

      setTimeout(() => this.fab.classList.remove('creamy-fab--wave'), 1200);

      this.greetingBubbleEl.addEventListener('click', () => {
        this._dismissGreeting();
        this._open();
      });

      setTimeout(() => this._dismissGreeting(), this.config.greetingBubbleDuration);
    }

    _dismissGreeting() {
      if (!this.greetingBubbleEl) return;
      this.greetingBubbleEl.classList.remove('creamy-greeting-visible');
      this.greetingBubbleEl.classList.add('creamy-hidden');
    }

    _open() {
      this._dismissGreeting();
      this.isOpen = true;
      this.wrapper.classList.add('creamy-widget--open');
      this.backdrop.classList.remove('creamy-hidden');
      this.windowEl.classList.remove('creamy-hidden');
      this.fab.classList.add('creamy-fab--hidden');

      if (this.messageCount === 0) this._showWelcome();

      this._trackEvent('creamy_open');
      setTimeout(() => this.inputEl.focus(), 300);
    }

    _minimize() {
      this.isOpen = false;
      this.wrapper.classList.remove('creamy-widget--open');
      this.backdrop.classList.add('creamy-hidden');
      this.windowEl.classList.add('creamy-hidden');
      this.fab.classList.remove('creamy-fab--hidden');
      this._trackEvent('creamy_close');
    }

    _close() {
      this._minimize();
    }

    _showWelcome() {
      const welcome = this.config.welcomeMessage || DEFAULT_CONFIG.welcomeMessage;
      const chips = this.config.initialChips || DEFAULT_CONFIG.initialChips;
      this._addBotMessage(welcome, chips);
    }

    _sendUserMessage(overrideText) {
      const text = (overrideText || this.inputEl.value).trim();
      if (!text || this.isTyping) return;

      if (!overrideText) {
        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';
      }

      this._addUserMessage(text);
      this._trackEvent('creamy_message_sent');
      this._callAPI(text);
    }

    async _callAPI(userMessage) {
      this.isTyping = true;
      this.sendBtn.disabled = true;
      this._showTyping();

      const minDelay = new Promise((r) =>
        setTimeout(
          r,
          this.config.typingDelayMin +
            Math.random() * (this.config.typingDelayMax - this.config.typingDelayMin)
        )
      );

      console.log(`[Creamy] POST → ${this.config.apiEndpoint}`, {
        message_length: userMessage.length,
        history_turns: this.conversationHistory.length,
        session_id: this.sessionId,
      });

      try {
        const [response] = await Promise.all([
          fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMessage,
              conversation_history: this.conversationHistory.slice(-24),
              session_id: this.sessionId,
              page_url: this.pageUrl,
              page_title: this.pageTitle,
            }),
          }),
          minDelay,
        ]);

        this._hideTyping();

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (response.status === 429) {
            this._addBotMessage('Recibimos muchas consultas en este momento. Por favor esperá unos minutos e intentá de nuevo.', []);
          } else {
            this._addBotMessage(err.error || 'Estoy teniendo problemas para conectarme. Por favor intentá de nuevo en unos segundos.', [
              { label: '💬 Hablar con un asesor', url: this.config.urls.whatsapp, external: true },
            ]);
          }
          return;
        }

        const data = await response.json();
        const reply = data.reply || data.message || '';

        if (!reply) {
          this._addBotMessage('Recibí una respuesta vacía. Por favor intentá de nuevo.', []);
          return;
        }

        this.conversationHistory.push({ role: 'user', content: userMessage });
        this.conversationHistory.push({ role: 'assistant', content: reply });

        if (this.conversationHistory.length > 24) {
          this.conversationHistory = this.conversationHistory.slice(-24);
        }

        if (data.meta) {
          console.log('[Creamy] Meta:', {
            model: data.meta.model,
            tokens: data.meta.tokens_used,
            knowledge_loaded: data.meta.knowledge_loaded,
            used_fallback: data.meta.used_fallback,
          });
        }

        const chips = [];
        this._addBotMessage(reply, chips);

        if (data.actions?.length) {
          this._showActionButtons(data.actions);
          this._trackEvent('creamy_lead_detected');
        } else if (data.showConversionChips) {
          this._showActionButtons(['CONFIGURADOR', 'COTIZACION', 'WHATSAPP']);
        }
      } catch (err) {
        this._hideTyping();
        console.error('[Creamy] Error:', err);
        this._addBotMessage('No pude conectarme en este momento. Podés escribirnos directamente por WhatsApp.', [
          { label: '💬 Abrir WhatsApp', url: this.config.urls.whatsapp, external: true },
        ]);
      } finally {
        this.isTyping = false;
        this.sendBtn.disabled = false;
      }
    }

    _addUserMessage(text) {
      const div = document.createElement('div');
      div.className = 'creamy-message creamy-message-user';
      div.innerHTML = `<div class="creamy-bubble">${this._escapeHTML(text)}</div>`;
      this.messagesEl.appendChild(div);
      this._scrollToBottom();
    }

    _addBotMessage(text, chips) {
      const div = document.createElement('div');
      div.className = 'creamy-message creamy-message-bot';
      let html = `<div class="creamy-bubble">${this._formatText(text)}</div>`;

      if (chips?.length) {
        html += '<div class="creamy-chips">';
        chips.forEach((chip) => {
          if (chip.url) {
            const target = chip.external ? ' target="_blank" rel="noopener noreferrer"' : '';
            html += `<a href="${chip.url}"${target} class="creamy-chip${chip.cta ? ' creamy-chip-cta' : ''}">${this._escapeHTML(chip.label)}</a>`;
          } else {
            html += `<button class="creamy-chip" type="button" data-chip="${this._escapeHTML(chip.label)}">${this._escapeHTML(chip.label)}</button>`;
          }
        });
        html += '</div>';
      }

      div.innerHTML = html;
      this.messagesEl.appendChild(div);

      div.querySelectorAll('.creamy-chip[data-chip]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._trackEvent('creamy_quick_chip_click');
          this._sendUserMessage(btn.getAttribute('data-chip'));
        });
      });

      div.querySelectorAll('a.creamy-chip').forEach((link) => {
        link.addEventListener('click', () => this._trackEvent('creamy_quick_chip_click'));
      });

      this.messageCount++;
      this._scrollToBottom();
    }

    _showActionButtons(actions) {
      const container = document.createElement('div');
      container.className = 'creamy-action-buttons';

      actions.forEach((action) => {
        const def = ACTION_BUTTONS[action];
        if (!def) return;

        const url = this.config.urls[def.key];
        const btn = document.createElement('a');
        btn.href = url;
        btn.className = `creamy-action-btn creamy-action-btn--${def.style}`;
        btn.textContent = def.label;
        if (def.external) {
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
        }
        btn.addEventListener('click', () => this._trackEvent(`creamy_click_${action.toLowerCase()}`));
        container.appendChild(btn);
      });

      const messages = this.messagesEl.querySelectorAll('.creamy-message-bot');
      const last = messages[messages.length - 1];
      if (last) last.appendChild(container);
      this._scrollToBottom();
    }

    _showTyping() {
      const div = document.createElement('div');
      div.className = 'creamy-typing';
      div.id = 'creamy-typing';
      div.innerHTML = '<span class="creamy-typing-dot"></span><span class="creamy-typing-dot"></span><span class="creamy-typing-dot"></span>';
      this.messagesEl.appendChild(div);
      this._scrollToBottom();
    }

    _hideTyping() {
      const el = document.getElementById('creamy-typing');
      if (el) el.remove();
    }

    _scrollToBottom() {
      requestAnimationFrame(() => {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      });
    }

    _formatText(text) {
      return this._escapeHTML(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    _escapeHTML(str) {
      const d = document.createElement('div');
      d.appendChild(document.createTextNode(str));
      return d.innerHTML;
    }

    _trackEvent(name, data) {
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', name, data || {});
        }
        if (typeof window.fbq === 'function') {
          window.fbq('trackCustom', name, data || {});
        }
        if (window.dataLayer) {
          window.dataLayer.push({ event: name, ...(data || {}) });
        }
      } catch (_) {
        // analytics optional
      }
    }
  }

  function boot() {
    window.creamyAI = new CreamyAI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

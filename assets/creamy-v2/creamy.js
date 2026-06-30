/*!
 * CREAMY V2 — Asistente Inteligente Laboratorio Genus
 * Producto nuevo — sin dependencias del Creamy anterior
 */
(function () {
  'use strict';

  const VISITOR_KEY = 'cv2_visitor';

  const AVATAR_SVG = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#dff0f5"/>
    <ellipse cx="24" cy="31" rx="11" ry="9" fill="#169ab0"/>
    <rect x="16" y="11" width="16" height="18" rx="5" fill="#fff" stroke="#0e7a8c" stroke-width="1.2"/>
    <circle class="cv2-eye" cx="20" cy="19" r="2" fill="#07172f"/>
    <circle class="cv2-eye" cx="28" cy="19" r="2" fill="#07172f"/>
    <path d="M20 24c2.5 2 5.5 2 8 0" stroke="#0e7a8c" stroke-width="1.3" stroke-linecap="round" fill="none"/>
    <ellipse cx="24" cy="9" rx="6" ry="3.5" fill="#169ab0"/>
    <path d="M14 8c0-2 4-4 10-4s10 2 10 4" stroke="#0e7a8c" stroke-width="1" fill="none" opacity="0.5"/>
  </svg>`;

  const ACTION_MAP = {
    CONFIGURADOR: { label: '🧪 Crear mi producto', style: 'primary', key: 'configurador' },
    COTIZACION: { label: '📋 Solicitar cotización', style: 'secondary', key: 'cotizacion' },
    WHATSAPP: { label: '💬 Hablar por WhatsApp', style: 'whatsapp', key: 'whatsapp', external: true },
    REUNION: { label: '📅 Agendar reunión', style: 'secondary', key: 'reunion' },
  };

  const TECHNICAL_FALLBACK =
    'Estoy teniendo una demora técnica para responder consultas complejas. Mientras tanto, puedo derivarte con un asesor del laboratorio.';

  const DEFAULTS = {
    apiEndpoint: '/api/creamy-v2/chat',
    greetingDelayMs: 6000,
    greetingDurationMs: 9000,
    typingDelayMin: 350,
    typingDelayMax: 900,
    welcomeMessage: '',
    greetingText: '👋 Hola, soy Creamy. ¿Necesitás ayuda para desarrollar tu producto?',
    urls: {
      configurador: '/cotizador.html',
      cotizacion: '/contacto.html',
      whatsapp: 'https://wa.me/5491124980861',
      reunion: '/contacto.html',
    },
    pageContext: {},
  };

  class CreamyV2 {
    constructor() {
      this.config = { ...DEFAULTS };
      this.isOpen = false;
      this.isTyping = false;
      this.history = [];
      this.pageKey = this._pageKey();
      this.pageUrl = location.href;
      this.pageTitle = document.title;
      this._technicalCtaShown = false;
      this._greetedAfterRegister = false;

      const visitor = this._loadVisitor();
      this.sessionId = visitor?.session_id || ('cv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11));
      this.firstName = visitor?.nombre || null;
      this.lastName = visitor?.apellido || null;
      this.isRegistered = !!(this.firstName && this.lastName);

      this._init();
    }

    async _init() {
      await this._loadConfig();
      this._render();
      this._bind();
      this._scheduleGreeting();
      this._scheduleTilt();
      this._checkHealth();
      this._track('creamy_v2_session_start');
    }

    async _checkHealth() {
      try {
        const res = await fetch('/api/creamy-v2/health', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        this._serviceReady = res.ok && data.status === 'ready';
        if (!this._serviceReady) {
          console.warn('[CreamyV2] Servicio en modo degradado:', data.checks || data);
        }
      } catch (_) {
        this._serviceReady = null;
      }
    }

    async _loadConfig() {
      try {
        const res = await fetch('/assets/creamy-v2/config.json', { cache: 'no-cache' });
        if (res.ok) {
          const ext = await res.json();
          this.config = { ...DEFAULTS, ...ext, urls: { ...DEFAULTS.urls, ...ext.urls } };
        }
      } catch (_) { /* defaults */ }
    }

    _pageKey() {
      const p = location.pathname.toLowerCase();
      if (p.includes('productos')) return 'productos';
      if (p.includes('cotizador')) return 'cotizador';
      if (p.includes('desarrolla') || p.includes('crea-tu')) return 'desarrolla-tu-producto';
      if (p.includes('contacto')) return 'contacto';
      if (p.includes('calidad')) return 'calidad';
      if (p.includes('llave')) return 'llave-en-mano';
      if (p.includes('quienes')) return 'quienes-somos';
      return 'index';
    }

    _loadVisitor() {
      try {
        const raw = sessionStorage.getItem(VISITOR_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw);
        if (v?.session_id && v?.nombre?.trim().length >= 2 && v?.apellido?.trim().length >= 2) {
          return { session_id: v.session_id, nombre: v.nombre.trim(), apellido: v.apellido.trim() };
        }
      } catch (_) { /* ignore */ }
      return null;
    }

    _saveVisitor(nombre, apellido) {
      const data = {
        session_id: this.sessionId,
        nombre,
        apellido,
      };
      try { sessionStorage.setItem(VISITOR_KEY, JSON.stringify(data)); } catch (_) {}
      this.firstName = nombre;
      this.lastName = apellido;
      this.isRegistered = true;
    }

    _validateName(value) {
      const t = (value || '').trim().replace(/\s+/g, ' ');
      if (t.length < 2 || t.length > 60) return null;
      if (/\d/.test(t)) return null;
      if (!/^[\p{L}\s'-]+$/u.test(t)) return null;
      return t;
    }

    _updateHeader() {
      const subtitle = this.root?.querySelector('#cv2-header-subtitle');
      if (!subtitle) return;
      subtitle.textContent = this.firstName
        ? `Atendiendo a ${this.firstName}`
        : 'Asistente Inteligente';
    }

    _personalGreeting() {
      const n = this._esc(this.firstName);
      return `¡Hola ${n}! 👋

Soy Creamy, el asistente inteligente de Laboratorio Genus.

Estoy para ayudarte a desarrollar productos cosméticos, responder consultas técnicas, asesorarte sobre formulaciones o acompañarte durante todo el proceso de creación de tu marca.

¿En qué te gustaría que empecemos?`;
    }

    _render() {
      const root = document.createElement('div');
      root.id = 'creamy-v2';
      root.className = 'creamy-v2';
      root.setAttribute('data-creamy-version', '2.0');
      root.innerHTML = `
        <div class="cv2-backdrop cv2-hidden" id="cv2-backdrop" aria-hidden="true"></div>
        <button class="cv2-fab" id="cv2-fab" type="button" aria-label="Abrir Creamy AI">
          <span class="cv2-fab-avatar" aria-hidden="true">${AVATAR_SVG}</span>
          <span class="cv2-fab-badge" aria-hidden="true" title="En línea"></span>
          <span class="cv2-fab-tooltip" aria-hidden="true">¿Te ayudo?</span>
        </button>
        <div class="cv2-greeting cv2-hidden" id="cv2-greeting" role="status" aria-live="polite"></div>
        <div class="cv2-window cv2-hidden" id="cv2-window" role="dialog" aria-label="Creamy AI" aria-modal="true">
          <div class="cv2-header" role="banner">
            <span class="cv2-header-avatar" aria-hidden="true">${AVATAR_SVG}</span>
            <div class="cv2-header-info">
              <div class="cv2-header-name">Creamy AI</div>
              <div class="cv2-header-subtitle" id="cv2-header-subtitle">Asistente Inteligente</div>
              <div class="cv2-header-status">
                <span class="cv2-header-dot" aria-hidden="true"></span>
                <span>🟢 En línea</span>
              </div>
            </div>
            <div class="cv2-header-actions">
              <button class="cv2-header-btn" type="button" data-cv2-action="minimize" aria-label="Minimizar">&#8212;</button>
              <button class="cv2-header-btn" type="button" data-cv2-action="close" aria-label="Cerrar">&times;</button>
            </div>
          </div>
          <div class="cv2-onboard cv2-hidden" id="cv2-onboard">
            <div class="cv2-onboard-inner">
              <div class="cv2-onboard-avatar" aria-hidden="true">${AVATAR_SVG}</div>
              <h2 class="cv2-onboard-title">¡Bienvenido!</h2>
              <p class="cv2-onboard-lead">Soy <strong>Creamy</strong>, el asistente inteligente de Laboratorio Genus.</p>
              <p class="cv2-onboard-text">Voy a acompañarte durante toda tu consulta para ayudarte a desarrollar el producto ideal para tu marca.</p>
              <p class="cv2-onboard-ask">Antes de comenzar…<br>¿Me contás cómo te llamás?</p>
              <form class="cv2-onboard-form" id="cv2-onboard-form" novalidate>
                <label class="cv2-field">
                  <span class="cv2-field-label">Nombre</span>
                  <input class="cv2-field-input" type="text" id="cv2-first-name" name="nombre" autocomplete="given-name" maxlength="60" placeholder="Tu nombre" required>
                </label>
                <label class="cv2-field">
                  <span class="cv2-field-label">Apellido</span>
                  <input class="cv2-field-input" type="text" id="cv2-last-name" name="apellido" autocomplete="family-name" maxlength="60" placeholder="Tu apellido" required>
                </label>
                <p class="cv2-onboard-error cv2-hidden" id="cv2-onboard-error" role="alert"></p>
                <button class="cv2-onboard-btn" type="submit">Comenzar conversación</button>
              </form>
            </div>
          </div>
          <div class="cv2-chat-body" id="cv2-chat-body">
            <div class="cv2-messages" id="cv2-messages" role="log" aria-live="polite"></div>
            <div class="cv2-input-area">
              <div class="cv2-input-row">
                <textarea class="cv2-textarea" id="cv2-textarea" placeholder="Escribí tu consulta..." rows="1" maxlength="4000" aria-label="Mensaje"></textarea>
                <button class="cv2-send-btn" id="cv2-send-btn" type="button" aria-label="Enviar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 11l18-7-7 18-2-7-9-4z"/></svg>
                </button>
              </div>
            </div>
            <div class="cv2-footer">Laboratorio Genus · Asistente con IA</div>
          </div>
        </div>`;

      document.body.appendChild(root);
      this.root = root;
      this.fab = document.getElementById('cv2-fab');
      this.backdrop = document.getElementById('cv2-backdrop');
      this.windowEl = document.getElementById('cv2-window');
      this.onboardEl = document.getElementById('cv2-onboard');
      this.chatBodyEl = document.getElementById('cv2-chat-body');
      this.onboardForm = document.getElementById('cv2-onboard-form');
      this.firstNameInput = document.getElementById('cv2-first-name');
      this.lastNameInput = document.getElementById('cv2-last-name');
      this.onboardErrorEl = document.getElementById('cv2-onboard-error');
      this.messagesEl = document.getElementById('cv2-messages');
      this.inputEl = document.getElementById('cv2-textarea');
      this.sendBtn = document.getElementById('cv2-send-btn');
      this.greetingEl = document.getElementById('cv2-greeting');
      this._updateHeader();
    }

    _bind() {
      this.fab.addEventListener('click', () => this.open());
      this.backdrop.addEventListener('click', () => this.minimize());
      this.root.querySelector('[data-cv2-action="minimize"]').addEventListener('click', () => this.minimize());
      this.root.querySelector('[data-cv2-action="close"]').addEventListener('click', () => this.minimize());
      this.sendBtn.addEventListener('click', () => this.send());
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
      });
      this.inputEl.addEventListener('input', () => {
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 80) + 'px';
      });
      this.onboardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this._submitOnboard();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.minimize();
      });
    }

    _scheduleGreeting() {
      if (sessionStorage.getItem('cv2_greeted')) return;
      setTimeout(() => {
        if (this.isOpen || sessionStorage.getItem('cv2_greeted')) return;
        this.greetingEl.textContent = this.config.greetingText;
        this.greetingEl.classList.remove('cv2-hidden');
        this.greetingEl.classList.add('cv2-greeting--visible');
        sessionStorage.setItem('cv2_greeted', '1');
        this.greetingEl.addEventListener('click', () => { this._hideGreeting(); this.open(); });
        setTimeout(() => this._hideGreeting(), this.config.greetingDurationMs);
      }, this.config.greetingDelayMs);
    }

    _scheduleTilt() {
      setInterval(() => {
        if (!this.isOpen && this.fab) {
          this.fab.classList.add('cv2-fab--tilt');
          setTimeout(() => this.fab.classList.remove('cv2-fab--tilt'), 700);
        }
      }, 18000);
    }

    _hideGreeting() {
      this.greetingEl.classList.remove('cv2-greeting--visible');
      this.greetingEl.classList.add('cv2-hidden');
    }

    _showOnboard() {
      this.onboardEl.classList.remove('cv2-hidden');
      this.onboardEl.classList.add('cv2-onboard--visible');
      this.chatBodyEl.classList.add('cv2-hidden');
      setTimeout(() => this.firstNameInput.focus(), 280);
    }

    _showChat() {
      this.onboardEl.classList.add('cv2-hidden');
      this.chatBodyEl.classList.remove('cv2-hidden');
    }

    open() {
      this._hideGreeting();
      this.isOpen = true;
      this.root.classList.add('creamy-v2--open');
      this.backdrop.classList.remove('cv2-hidden');
      this.windowEl.classList.remove('cv2-hidden');
      this.fab.classList.add('cv2-fab--hidden');
      this._track('creamy_v2_open');

      if (!this.isRegistered) {
        this._showOnboard();
        return;
      }

      this._showChat();
      this._updateHeader();
      setTimeout(() => this.inputEl.focus(), 280);
    }

    minimize() {
      this.isOpen = false;
      this.root.classList.remove('creamy-v2--open');
      this.backdrop.classList.add('cv2-hidden');
      this.windowEl.classList.add('cv2-hidden');
      this.fab.classList.remove('cv2-fab--hidden');
      this.fab.style.visibility = '';
      this.fab.style.opacity = '';
      this._track('creamy_v2_close');
    }

    _submitOnboard() {
      const nombre = this._validateName(this.firstNameInput.value);
      const apellido = this._validateName(this.lastNameInput.value);

      if (!nombre || !apellido) {
        this.onboardErrorEl.textContent = 'Ingresá tu nombre y apellido (solo letras, mínimo 2 caracteres).';
        this.onboardErrorEl.classList.remove('cv2-hidden');
        return;
      }

      this.onboardErrorEl.classList.add('cv2-hidden');
      this._saveVisitor(nombre, apellido);
      this._updateHeader();
      this._postEvent({
        event_type: 'visitor_registered',
        user_first_name: nombre,
        user_last_name: apellido,
      });
      this._track('visitor_registered', {
        session_id: this.sessionId,
        nombre,
        apellido,
        page_key: this.pageKey,
      });

      this._showChat();
      if (!this._greetedAfterRegister) {
        this._greetedAfterRegister = true;
        this._bot(this._personalGreeting());
      }
      setTimeout(() => this.inputEl.focus(), 200);
    }

    send(override) {
      if (!this.isRegistered) return;
      const text = (override || this.inputEl.value).trim();
      if (!text || this.isTyping) return;
      if (!override) { this.inputEl.value = ''; this.inputEl.style.height = 'auto'; }
      this._user(text);
      this._track('creamy_v2_message');
      this._api(text);
    }

    async _requestChat(payload, attempt = 0) {
      const res = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const retryable = (res.status === 502 || res.status === 503 || res.status === 504) && attempt < 1;
      if (retryable) {
        await new Promise((r) => setTimeout(r, 700));
        return this._requestChat(payload, attempt + 1);
      }
      return res;
    }

    async _api(userMessage) {
      this.isTyping = true;
      this.sendBtn.disabled = true;
      this._typingShow();
      const minWait = new Promise((r) =>
        setTimeout(r, this.config.typingDelayMin + Math.random() * (this.config.typingDelayMax - this.config.typingDelayMin))
      );

      const payload = {
        message: userMessage,
        conversation_history: this.history.slice(-10),
        session_id: this.sessionId,
        user_first_name: this.firstName,
        user_last_name: this.lastName,
        page_url: this.pageUrl,
        page_title: this.pageTitle,
        page_key: this.pageKey,
      };

      try {
        const [res] = await Promise.all([this._requestChat(payload), minWait]);

        this._typingHide();

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error || TECHNICAL_FALLBACK;
          this._bot(msg);
          if (err.fallback) this._maybeTechnicalCta();
          return;
        }

        const data = await res.json();
        const reply = data.reply || data.message || '';
        if (!reply) {
          this._bot('Recibí una respuesta vacía. ¿Podés reformular tu consulta?');
          return;
        }

        this.history.push({ role: 'user', content: userMessage });
        this.history.push({ role: 'assistant', content: reply });
        this._bot(reply);
        if (data.actions?.length) this._actions(this._filterActions(data.actions, userMessage));
      } catch (e) {
        this._typingHide();
        console.error('[CreamyV2]', e);
        this._bot(TECHNICAL_FALLBACK);
        this._maybeTechnicalCta();
      } finally {
        this.isTyping = false;
        this.sendBtn.disabled = false;
      }
    }

    _user(text) {
      const el = document.createElement('div');
      el.className = 'cv2-message cv2-message--user';
      el.innerHTML = `<div class="cv2-bubble">${this._esc(text)}</div>`;
      this.messagesEl.appendChild(el);
      this._scroll();
    }

    _filterActions(keys, userMessage) {
      const user = (userMessage || '').toLowerCase();
      const wantsHuman = /\b(whatsapp|asesor|humano|hablar con|contactar)\b/i.test(user);
      return keys.filter((key) => {
        if (key === 'WHATSAPP' && !wantsHuman) return false;
        return true;
      });
    }

    _maybeTechnicalCta() {
      if (this._technicalCtaShown) return;
      this._technicalCtaShown = true;
      this._actions(['WHATSAPP']);
    }

    _bot(text) {
      const el = document.createElement('div');
      el.className = 'cv2-message cv2-message--bot';
      el.innerHTML = `<div class="cv2-bubble">${this._fmt(text)}</div>`;
      this.messagesEl.appendChild(el);
      this._scroll();
    }

    _actions(keys, parentEl) {
      const container = document.createElement('div');
      container.className = 'cv2-actions';
      keys.forEach((key) => {
        const def = ACTION_MAP[key];
        if (!def) return;
        const url = this.config.urls[def.key];
        const a = document.createElement('a');
        a.href = url;
        a.className = `cv2-action-btn cv2-action-btn--${def.style}`;
        a.textContent = def.label;
        if (def.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.addEventListener('click', () => {
          this._track('creamy_v2_cta_' + key.toLowerCase(), { session_id: this.sessionId, cta: key });
          this._logCtaEvent(key);
        });
        container.appendChild(a);
      });
      const target = parentEl || this.messagesEl.querySelector('.cv2-message--bot:last-child');
      if (target) target.appendChild(container);
      this._scroll();
    }

    _typingShow() {
      const el = document.createElement('div');
      el.className = 'cv2-typing';
      el.id = 'cv2-typing';
      el.innerHTML = '<span class="cv2-typing-dot"></span><span class="cv2-typing-dot"></span><span class="cv2-typing-dot"></span>';
      this.messagesEl.appendChild(el);
      this._scroll();
    }

    _typingHide() {
      document.getElementById('cv2-typing')?.remove();
    }

    _scroll() {
      requestAnimationFrame(() => { this.messagesEl.scrollTop = this.messagesEl.scrollHeight; });
    }

    _fmt(text) {
      let html = this._esc(text);
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
      if (html.includes('<li>')) html = html.replace(/(<li>[\s\S]+)/, '<ul>$1</ul>');
      html = html.replace(/\n/g, '<br>');
      return html;
    }

    _esc(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    _track(name, data) {
      try {
        window.gtag?.('event', name, data || {});
        window.fbq?.('trackCustom', name, data || {});
        window.dataLayer?.push({ event: name, ...(data || {}) });
      } catch (_) { /* optional */ }
    }

    _postEvent(body) {
      try {
        fetch('/api/creamy-v2/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId,
            user_first_name: this.firstName || body.user_first_name || '',
            user_last_name: this.lastName || body.user_last_name || '',
            page_key: this.pageKey,
            page_url: this.pageUrl,
            user_agent: navigator.userAgent || '',
            ...body,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch (_) {}
    }

    _logCtaEvent(ctaKey) {
      const lastUser = [...this.history].reverse().find((m) => m.role === 'user');
      this._postEvent({
        cta: ctaKey,
        context_message: lastUser?.content || '',
      });
    }
  }

  function boot() {
    if (document.getElementById('creamy-v2')) return;
    window.creamyV2 = new CreamyV2();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

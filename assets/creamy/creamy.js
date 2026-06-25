/*!
 * CREAMY AI - Widget JavaScript
 * Fase C2 - Inteligencia Artificial Real con OpenAI
 * Arquitectura: docs/CREAMY_AI_ARCHITECTURE_v1.md
 * Encapsulado: clase CreamyAI, sin variables globales
 */
(function () {
  'use strict';

  // ============================================================
  // CONFIGURACION DEL WIDGET
  // ============================================================
  const CREAMY_CONFIG = {
    version: '2.0.0',
    fase: 'C2',
    name: 'Creamy AI',
    statusText: 'En linea',
    apiEndpoint: '/api/creamy/chat',
    welcomeMessage: "Hola, soy Creamy — el asistente de Laboratorio Genus. Puedo ayudarte a explorar nuestros servicios, resolver consultas tecnicas y orientarte en el desarrollo de tu producto cosmetico. ¿Por donde empezamos?",
    whatsappUrl: 'https://wa.me/5491124980861',
    configuradorUrl: '/cotizador.html',
    cotizacionUrl: '/contacto.html',
    typingDelayMin: 400,
    typingDelayMax: 900,
    avatarEmoji: "🧴",
  };

  const CREAMY_INITIAL_CHIPS = [
    { id: "develop", label: "🧪 Quiero desarrollar un producto" },
    { id: "services", label: "📋 Consultar servicios y precios" },
    { id: "technical", label: "⚗️ Tengo una consulta tecnica" },
    { id: "advisor", label: "💬 Hablar con un asesor" },
  ];

  const CREAMY_CONVERSION_CHIPS = [
    { id: "goto_config", label: "🧪 Crear mi producto", url: "/cotizador.html" },
    { id: "goto_quote", label: "📋 Solicitar cotizacion", url: "/contacto.html" },
    { id: "goto_wa", label: "💬 Hablar con un asesor", url: "https://wa.me/5491124980861", external: true },
  ];

  class CreamyAI {
    constructor() {
      this.isOpen = false;
      this.isMinimized = false;
      this.isTyping = false;
      this.conversationHistory = [];
      this.sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      this.messageCount = 0;
      this.pageUrl = window.location.href;
      this.pageTitle = document.title;
      this.init();
    }
    init() { this.render(); this.bindEvents(); setTimeout(() => this.animateIn(), 1500); }
    generateId() { return "msg_" + Date.now(); }
    render() {
      const wrapper = document.createElement("div");
      wrapper.id = "creamy-widget";
      wrapper.className = "creamy-wrapper";
      wrapper.innerHTML = this.getHTML();
      document.body.appendChild(wrapper);
      this.widget = document.getElementById("creamy-widget");
      this.bubble = document.querySelector(".creamy-bubble");
      this.chatWindow = document.querySelector(".creamy-chat-window");
      this.messagesContainer = document.querySelector(".creamy-messages");
      this.input = document.querySelector(".creamy-input");
      this.sendBtn = document.querySelector(".creamy-send-btn");
    }
    getHTML() {
      const avatar = CREAMY_CONFIG.avatarEmoji;
      return '<button class="creamy-bubble creamy-hidden" aria-label="Abrir chat Creamy AI" type="button">' +
        '<span class="creamy-bubble-emoji">' + avatar + '</span>' +
        '<span class="creamy-bubble-badge"></span>' +
        '</button>' +
        '<div class="creamy-chat-window creamy-hidden" role="dialog" aria-label="Chat Creamy AI">' +
        '<div class="creamy-header">' +
        '<div class="creamy-header-info">' +
        '<span class="creamy-header-avatar">' + avatar + '</span>' +
        '<div class="creamy-header-text">' +
        '<span class="creamy-header-name">Creamy AI</span>' +
        '<span class="creamy-header-status"><span class="creamy-status-dot"></span>En linea</span>' +
        '</div></div>' +
        '<div class="creamy-header-actions">' +
        '<button class="creamy-minimize-btn" aria-label="Minimizar" type="button">&#8212;</button>' +
        '<button class="creamy-close-btn" aria-label="Cerrar" type="button">&times;</button>' +
        '</div></div>' +
        '<div class="creamy-messages" role="log" aria-live="polite"></div>' +
        '<div class="creamy-input-area">' +
        '<textarea class="creamy-input" placeholder="Escribi tu consulta..." rows="1" maxlength="2000" aria-label="Mensaje para Creamy"></textarea>' +
        '<button class="creamy-send-btn" aria-label="Enviar" type="button">&#10148;</button>' +
        '</div></div>';
    }
    bindEvents() {
      this.bubble.addEventListener("click", () => this.toggle());
      document.querySelector(".creamy-minimize-btn").addEventListener("click", () => this.minimize());
      document.querySelector(".creamy-close-btn").addEventListener("click", () => this.close());
      this.sendBtn.addEventListener("click", () => this.sendUserMessage());
      this.input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.sendUserMessage(); } });
      this.input.addEventListener("input", () => { this.input.style.height = "auto"; this.input.style.height = Math.min(this.input.scrollHeight, 80) + "px"; });
    }
    animateIn() { this.bubble.classList.remove("creamy-hidden"); this.bubble.classList.add("creamy-slide-in"); }
    toggle() { this.isOpen ? this.minimize() : this.open(); }
    open() {
      this.isOpen = true; this.isMinimized = false;
      this.chatWindow.classList.remove("creamy-hidden");
      this.chatWindow.classList.add("creamy-slide-in");
      this.bubble.classList.add("creamy-hidden");
      if (this.messageCount === 0) this.showWelcome();
      setTimeout(() => this.input.focus(), 300);
    }
    minimize() { this.isOpen = false; this.chatWindow.classList.add("creamy-hidden"); this.bubble.classList.remove("creamy-hidden"); }
    close() { this.isOpen = false; this.chatWindow.classList.add("creamy-hidden"); this.bubble.classList.remove("creamy-hidden"); }
    showWelcome() { this.addBotMessage(CREAMY_CONFIG.welcomeMessage, CREAMY_INITIAL_CHIPS); }
    addUserMessage(text) {
      const div = document.createElement("div");
      div.className = "creamy-msg creamy-msg-user";
      div.innerHTML = "<div class=\"creamy-bubble-msg\">" + this.escapeHTML(text) + "</div>";
      this.messagesContainer.appendChild(div);
      this.scrollToBottom();
    }
    addBotMessage(text, chips) {
      const div = document.createElement("div");
      div.className = "creamy-msg creamy-msg-bot";
      let html = "<div class=\"creamy-bubble-msg\">" + this.formatText(text) + "</div>";
      if (chips && chips.length > 0) {
        html += "<div class=\"creamy-chips\">";
        chips.forEach(chip => {
          if (chip.url) {
            const target = chip.external ? " target=\"_blank\" rel=\"noopener\"" : "";
            html += "<a href=\"" + chip.url + "\"" + target + " class=\"creamy-chip creamy-chip-link\">" + this.escapeHTML(chip.label) + "</a>";
          } else {
            html += "<button class=\"creamy-chip\" data-chip-id=\"" + chip.id + "\" type=\"button\">" + this.escapeHTML(chip.label) + "</button>";
          }
        });
        html += "</div>";
      }
      div.innerHTML = html;
      this.messagesContainer.appendChild(div);
      div.querySelectorAll(".creamy-chip[data-chip-id]").forEach(btn => {
        btn.addEventListener("click", () => this.sendUserMessage(btn.textContent.trim()));
      });
      this.scrollToBottom();
      this.messageCount++;
    }
    showTyping() {
      const div = document.createElement("div");
      div.className = "creamy-msg creamy-msg-bot creamy-typing-indicator";
      div.id = "creamy-typing";
      div.innerHTML = "<div class=\"creamy-bubble-msg\"><span></span><span></span><span></span></div>";
      this.messagesContainer.appendChild(div);
      this.scrollToBottom();
    }
    hideTyping() { const t = document.getElementById("creamy-typing"); if (t) t.remove(); }
    scrollToBottom() { this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight; }
    formatText(text) {
      return this.escapeHTML(text)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
    }
    escapeHTML(str) { const d = document.createElement("div"); d.appendChild(document.createTextNode(str)); return d.innerHTML; }
    sendUserMessage(overrideText) {
      const text = overrideText || this.input.value.trim();
      if (!text || this.isTyping) return;
      if (!overrideText) { this.input.value = ""; this.input.style.height = "auto"; }
      this.addUserMessage(text);
      this.conversationHistory.push({ role: "user", content: text });
      this.callAPI(text);
    }
    async callAPI(userMessage) {
      this.isTyping = true;
      this.sendBtn.disabled = true;
      this.showTyping();
      const minDelay = new Promise(r => setTimeout(r, CREAMY_CONFIG.typingDelayMin + Math.random() * (CREAMY_CONFIG.typingDelayMax - CREAMY_CONFIG.typingDelayMin)));
      try {
        const [response] = await Promise.all([
          fetch(CREAMY_CONFIG.apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMessage,
              conversation_history: this.conversationHistory.slice(-12),
              session_id: this.sessionId,
              page_url: this.pageUrl,
              page_title: this.pageTitle
            })
          }),
          minDelay
        ]);
        this.hideTyping();
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (response.status === 429) {
            this.addBotMessage("Recibimos muchas consultas en este momento. Por favor espera unos minutos.", []);
          } else {
            this.addBotMessage(err.error || "Servicio no disponible. Contactanos por WhatsApp.", [{ id: "goto_wa", label: "💬 Abrir WhatsApp", url: CREAMY_CONFIG.whatsappUrl, external: true }]);
          }
          return;
        }
        const data = await response.json();
        const botMessage = data.message || "No pude procesar tu consulta.";
        this.conversationHistory.push({ role: "assistant", content: botMessage });
        const chips = data.showConversionChips ? CREAMY_CONVERSION_CHIPS : [];
        this.addBotMessage(botMessage, chips);
      } catch (err) {
        this.hideTyping();
        this.addBotMessage("No pude conectarme. Podes escribirnos directamente por WhatsApp.", [{ id: "goto_wa", label: "💬 Abrir WhatsApp", url: CREAMY_CONFIG.whatsappUrl, external: true }]);
      } finally {
        this.isTyping = false;
        this.sendBtn.disabled = false;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { window.creamyAI = new CreamyAI(); });
  } else {
    window.creamyAI = new CreamyAI();
  }

})();

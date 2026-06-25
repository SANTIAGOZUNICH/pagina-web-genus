/*!
 * CREAMY AI - Widget JavaScript
 * Fase C1 - Widget Visual con Mock Responses
 * Arquitectura: docs/CREAMY_AI_ARCHITECTURE_v1.md
 * Encapsulado: clase CreamyAI, sin variables globales
 */
(function () {
      'use strict';

      // ============================================================
      // CONFIGURACION DEL WIDGET
      // ============================================================
      const CREAMY_CONFIG = {
          version: '1.0.0',
          phase: 'C1',
          name: 'Creamy AI',
          statusText: 'En linea',
          welcomeMessage: 'Hola, soy Creamy \u2014 el asistente de Laboratorio Genus. Puedo ayudarte a explorar nuestros servicios, resolver consultas tecnicas y orientarte en el desarrollo de tu producto cosmetico. \u00bfPor donde empezamos?',
          whatsappUrl: 'https://wa.me/5491124980861',
          configuradorUrl: '/cotizador.html',
          cotizacionUrl: '/contacto.html',
          typingDelayMin: 800,
          typingDelayMax: 1400,
          avatarEmoji: '\uD83E\uDDF4',
    };

      // Quick chips iniciales
      const CREAMY_INITIAL_CHIPS = [
      { id: 'develop', label: '\uD83E\uDDEA Quiero desarrollar un producto' },
      { id: 'services', label: '\uD83D\uDCCB Consultar servicios y precios' },
      { id: 'technical', label: '\u2697\uFE0F Tengo una consulta tecnica' },
      { id: 'advisor', label: '\uD83D\uDCAC Hablar con un asesor' },
    ];

      // Chips de conversion
      const CREAMY_CONVERSION_CHIPS = [
      { id: 'goto_config', label: '\uD83E\uDDEA Crear mi producto', url: CREAMY_CONFIG.configuradorUrl },
      { id: 'goto_quote', label: '\uD83D\uDCCB Solicitar cotizacion', url: CREAMY_CONFIG.cotizacionUrl },
      { id: 'goto_wa', label: '\uD83D\uDCAC Hablar con un asesor', url: CREAMY_CONFIG.whatsappUrl, external: true },
    ];

      // Mock responses para C1
      const CREAMY_MOCK_RESPONSES = {
          develop: {
              text: '\u00a1Excelente! En Laboratorio Genus desarrollamos productos cosmeticos a medida. El MOQ minimo es de 500 unidades. Contame: \u00bfpara que zona es tu producto?',
              chips: [
          { id: 'zone_face', label: '\uD83D\uDC86 Cara' },
          { id: 'zone_body', label: '\uD83E\uDDB4 Cuerpo' },
          { id: 'zone_hair', label: '\uD83D\uDC87 Cabello' },
          { id: 'zone_beard', label: '\uD83E\uDDD4 Barba' },
          { id: 'zone_other', label: '\u2728 Otra' },
        ],
      },
          services: {
        text: 'Ofrecemos desarrollo cosmetico, fabricacion tercerizada y servicio llave en mano (disponible desde 5.000 unidades). Para una cotizacion personalizada, te puedo orientar o derivarte a nuestro equipo.',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          technical: {
              text: 'Estoy entrenado para responder consultas sobre activos, compatibilidades, textura y procesos. \uD83D\uDCDD Escribime tu consulta y te ayudo.',
        chips: [],
      },
          advisor: {
              text: '\u00a1Claro! Te comunico con nuestro equipo comercial. Podemos ayudarte a definir tu producto y darte una cotizacion.',
              chips: [
          { id: 'goto_wa', label: '\uD83D\uDCAC Abrir WhatsApp', url: CREAMY_CONFIG.whatsappUrl, external: true },
        ],
      },
          zone_face: {
              text: '\u00a1Perfecto! Para productos faciales trabajamos con serums, cremas hidratantes, contorno de ojos, mascarillas y mas. \u00bfQue objetivo busca tu producto?',
              chips: [
          { id: 'obj_hydration', label: '\uD83D\uDCA7 Hidratacion' },
          { id: 'obj_antiage', label: '\u2728 Antiage' },
          { id: 'obj_brightening', label: '\uD83C\uDF1F Iluminacion' },
          { id: 'obj_acne', label: '\uD83C\uDF3F Control acne' },
        ],
      },
          zone_body: {
              text: 'Para productos corporales fabricamos cremas, lociones, aceites secos, geles reductores y mas. \u00bfQue objetivo busca tu producto?',
              chips: [
          { id: 'obj_hydration', label: '\uD83D\uDCA7 Hidratacion' },
          { id: 'obj_firming', label: '\uD83D\uDCAA Reafirmante' },
          { id: 'obj_reducing', label: '\uD83D\uDCC9 Reductor' },
          { id: 'obj_solar', label: '\u2600\uFE0F Proteccion solar' },
        ],
      },
          zone_hair: {
              text: 'Para productos capilares trabajamos con shampoos, acondicionadores, mascarillas, tratamientos y serums capilares. \u00bfQue necesitas para tu linea?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          zone_beard: {
              text: 'Para cuidado de barba fabricamos aceites, balsamos en lata, cremas para afeitar y aftershave. \u00bfQue tipo de producto tenes en mente?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          zone_other: {
              text: 'Contame mas sobre el tipo de producto que estas pensando y te oriento sobre las posibilidades de desarrollo.',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_hydration: {
              text: '\u00a1Genial! La hidratacion es uno de nuestros fuertes. Trabajamos con activos como acido hialuronico, glicerina, ceramidas y mantecas naturales. El MOQ es de 500 unidades. \u00bfTe gustaria avanzar con una cotizacion?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_antiage: {
              text: 'Para productos antiage trabajamos con retinol, peptidos, vitamina C y niacinamida, entre otros activos. El MOQ es de 500 unidades. \u00bfAvanzamos?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_brightening: {
              text: '\u00a1Excelente eleccion! Para iluminacion usamos vitamina C estabilizada, niacinamida y extractos botanicos. MOQ desde 500 unidades.',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_acne: {
              text: 'Para control de acne trabajamos con acido salicilico, niacinamida, zinc y activos seborreguladores. Es importante la evaluacion tecnica previa. \u00bfTe comunico con nuestro equipo?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_firming: {
              text: '\u00a1Perfecto! Para productos reafirmantes trabajamos con cafeina, centella asiatica, retinol y peptidos tensores.',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_reducing: {
              text: 'Para lineas reductoras trabajamos con cafeina, extractos de te verde y activos drenantes. Siempre con formulacion segura y eficaz.',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          obj_solar: {
              text: 'Fabricamos protectores solares SPF 30 y SPF 50 con filtros fisicos y quimicos. Es un rubro con requisitos regulatorios especificos. \u00bfAvanzamos con una consulta?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
          default: {
        text: 'Entendi tu consulta. En Laboratorio Genus podemos ayudarte a desarrollar tu producto cosmetico a medida. \u00bfQue te gustaria hacer ahora?',
              chips: CREAMY_CONVERSION_CHIPS,
      },
    };

      // ============================================================
      // CLASE PRINCIPAL CreamyAI
      // ============================================================
      class CreamyAI {
        constructor() {
                this.isOpen = false;
                this.isInitialized = false;
          this.messageHistory = [];
                this.container = null;
                this.window = null;
                this.fab = null;
                this.messagesEl = null;
                this.textarea = null;
                this.typingEl = null;
          this._init();
        }

        _init() {
          if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => this._build());
              } else {
              this._build();
            }
          }

                // ============================================================
                // CONSTRUCCION DEL DOM
                // ============================================================
            _build() {
              if (this.isInitialized) return;
                    this.isInitialized = true;

              // Contenedor raiz (aislado)
              this.container = document.createElement('div');
                      this.container.className = 'creamy-widget';
                this.container.setAttribute('data-creamy', 'root');
                  this.container.setAttribute('aria-label', 'Creamy AI - Asistente de Laboratorio Genus');

                    // FAB (boton flotante)
                    this.fab = this._buildFab();

                          // Ventana de chat
                    this.window = this._buildWindow();
                    this.window.classList.add('creamy-hidden');

                      this.container.appendChild(this.fab);
                      this.container.appendChild(this.window);
                      document.body.appendChild(this.container);

                            // Evento de apertura/cierre
                      this.fab.addEventListener('click', () => this.open());

                            // Cerrar con Escape
                      document.addEventListener('keydown', (e) => {
                          if (e.key === 'Escape' && this.isOpen) this.close();
                            });
                      }

                        _buildFab() {
                          const btn = document.createElement('button');
                                  btn.className = 'creamy-fab';
                            btn.setAttribute('aria-label', 'Abrir Creamy AI');
                              btn.setAttribute('title', 'Creamy AI - Asistente Laboratorio Genus');
                                      btn.innerHTML = `
                                        <span class="creamy-fab-avatar-placeholder" aria-hidden="true">
                                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <ellipse cx="18" cy="20" rx="9" ry="11" fill="white" opacity="0.95"/>
                                              <rect x="15" y="3" width="6" height="10" rx="3" fill="white" opacity="0.9"/>
                                              <circle cx="18" cy="3.5" r="2.5" fill="white" opacity="0.8"/>
                                              <circle cx="14.5" cy="18.5" r="1.8" fill="#1E9BC0"/>
                                              <circle cx="21.5" cy="18.5" r="1.8" fill="#1E9BC0"/>
                                              <path d="M15 22.5 Q18 25 21 22.5" stroke="#1E9BC0" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                                            </svg>
                                          </span>
                                          <span class="creamy-fab-badge" aria-hidden="true"></span>
                                          `;
                                          return btn;
                                  }

                                    _buildWindow() {
                                      const win = document.createElement('div');
                                              win.className = 'creamy-window';
                                        win.setAttribute('role', 'dialog');
                                          win.setAttribute('aria-label', 'Chat con Creamy AI');
                                            win.setAttribute('aria-modal', 'true');

                                                    // Header
                                              const header = this._buildHeader();

                                                    // Messages area
                                              this.messagesEl = document.createElement('div');
                                                      this.messagesEl.className = 'creamy-messages';
                                                this.messagesEl.setAttribute('role', 'log');
                                                  this.messagesEl.setAttribute('aria-live', 'polite');
                                                    this.messagesEl.setAttribute('aria-label', 'Conversacion con Creamy');

                                                      // Typing indicator (oculto por defecto)
                                                      this.typingEl = this._buildTyping();
                                                      this.typingEl.classList.add('creamy-hidden');

                                                              // Input area
                                                        const inputArea = this._buildInputArea();

                                                              // Powered by
                                                        const powered = document.createElement('div');
                                                                powered.className = 'creamy-powered';
                                                                powered.innerHTML = 'Desarrollado por <strong>Laboratorio Genus</strong>';

                                                          win.appendChild(header);
                                                          win.appendChild(this.messagesEl);
                                                          win.appendChild(this.typingEl);
                                                          win.appendChild(inputArea);
                                                          win.appendChild(powered);

                                                                return win;
                                                        }

                                                          _buildHeader() {
                                                            const header = document.createElement('div');
                                                                    header.className = 'creamy-header';
                                                                    header.innerHTML = `
                                                                      <div class="creamy-header-avatar-placeholder" aria-hidden="true">
                                                                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <ellipse cx="11" cy="13" rx="6" ry="7" fill="white" opacity="0.9"/>
                                                                            <rect x="8.5" y="2" width="4" height="6" rx="2" fill="white" opacity="0.8"/>
                                                                            <circle cx="8.5" cy="11.5" r="1.2" fill="#1E9BC0"/>
                                                                            <circle cx="13.5" cy="11.5" r="1.2" fill="#1E9BC0"/>
                                                                            <path d="M9 14 Q11 16 13 14" stroke="#1E9BC0" stroke-width="0.8" fill="none" stroke-linecap="round"/>
                                                                          </svg>
                                                                        </div>
                                                                        <div class="creamy-header-info">
                                                                            <div class="creamy-header-name">Creamy AI</div>
                                                                              <div class="creamy-header-status">
                                                                                  <span class="creamy-header-dot" aria-hidden="true"></span>
                                                                                    <span class="creamy-header-status-text">En linea</span>
                                                                                    </div>
                                                                                  </div>
                                                                                  <div class="creamy-header-actions">
                                                                                      <button class="creamy-header-btn" id="creamy-minimize-btn" aria-label="Minimizar chat" title="Minimizar">
                                                                                          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="6.5" width="10" height="2" rx="1"/></svg>
                                                                                        </button>
                                                                                        <button class="creamy-header-btn" id="creamy-close-btn" aria-label="Cerrar chat" title="Cerrar">
                                                                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                                                                          </button>
                                                                                        </div>
                                                                                      `;

                                                                                header.querySelector('#creamy-minimize-btn').addEventListener('click', () => this.minimize());
                                                                                  header.querySelector('#creamy-close-btn').addEventListener('click', () => this.close());

                                                                                          return header;
                                                                                  }

                                                                                    _buildTyping() {
                                                                                      const typing = document.createElement('div');
                                                                                              typing.className = 'creamy-typing';
                                                                                        typing.setAttribute('aria-label', 'Creamy esta escribiendo');
                                                                                                typing.innerHTML = `
                                                                                                  <span class="creamy-typing-dot"></span>
                                                                                                    <span class="creamy-typing-dot"></span>
                                                                                                      <span class="creamy-typing-dot"></span>
                                                                                                      `;
                                                                                                      return typing;
                                                                                              }

                                                                                                _buildInputArea() {
                                                                                                  const area = document.createElement('div');
                                                                                                          area.className = 'creamy-input-area';
                                                                                                    
                                                                                                    const row = document.createElement('div');
                                                                                                            row.className = 'creamy-input-row';
                                                                                                      
                                                                                                      this.textarea = document.createElement('textarea');
                                                                                                              this.textarea.className = 'creamy-textarea';
                                                                                                              this.textarea.placeholder = 'Escribi tu consulta\u2026';
                                                                                                        this.textarea.setAttribute('rows', '1');
                                                                                                        this.textarea.setAttribute('aria-label', 'Escribi tu mensaje');
                                                                                                          this.textarea.setAttribute('autocomplete', 'off');
                                                                                                            
                                                                                                            const sendBtn = document.createElement('button');
                                                                                                              sendBtn.className = 'creamy-send-btn';
                                                                                                              sendBtn.setAttribute('aria-label', 'Enviar mensaje');
                                                                                                                sendBtn.innerHTML = `
                                                                                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                                                                                          <path d="M1.5 1.5L14.5 8L1.5 14.5V9.5L10.5 8L1.5 6.5V1.5Z"/>
                                                                                                                        </svg>
                                                                                                                      `;
                                                                                                                
                                                                                                                      // Auto-resize textarea
                                                                                                                this.textarea.addEventListener('input', () => {
                                                                                                                            this.textarea.style.height = 'auto';
                                                                                                                    this.textarea.style.height = Math.min(this.textarea.scrollHeight, 72) + 'px';
                                                                                                                    });
                                                                                                                
                                                                                                                // Send on Enter (sin Shift)
                                                                                                                this.textarea.addEventListener('keydown', (e) => {
                                                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                                                        e.preventDefault();
                                                                                                                        this._sendMessage();
                                                                                                                      }
                                                                                                                      });
                                                                                                                  
                                                                                                                  sendBtn.addEventListener('click', () => this._sendMessage());
                                                                                                                  
                                                                                                                  row.appendChild(this.textarea);
                                                                                                                  row.appendChild(sendBtn);
                                                                                                                  area.appendChild(row);
                                                                                                                        return area;
                                                                                                                }
                                                                                                                  
                                                                                                                      // ============================================================
                                                                                                                      // CONTROL DE APERTURA / CIERRE
                                                                                                                      // ============================================================
                                                                                                                  open() {
                                                                                                                          this.isOpen = true;
                                                                                                                    this.window.classList.remove('creamy-hidden');
                                                                                                                      this.fab.setAttribute('aria-expanded', 'true');
                                                                                                                        
                                                                                                                              // Bloquear scroll en mobile
                                                                                                                        if (window.innerWidth <= 768) {
                                                                                                                                  document.body.style.overflow = 'hidden';
                                                                                                                        }
                                                                                                                        
                                                                                                                              // Mostrar bienvenida solo la primera vez
                                                                                                                        if (this.messageHistory.length === 0) {
                                                                                                                          this._showWelcome();
                                                                                                                          } else {
                                                                                                                          this._scrollToBottom();
                                                                                                                        }
                                                                                                                        
                                                                                                                              // Focus en textarea
                                                                                                                        setTimeout(() => {
                                                                                                                            if (this.textarea) this.textarea.focus();
                                                                                                                              }, 350);
                                                                                                                        }
                                                                                                                          
                                                                                                                          close() {
                                                                                                                                  this.isOpen = false;
                                                                                                                            this.window.classList.add('creamy-hidden');
                                                                                                                              this.fab.setAttribute('aria-expanded', 'false');
                                                                                                                                      document.body.style.overflow = '';
                                                                                                                              }
                                                                                                                                
                                                                                                                                minimize() {
                                                                                                                                  this.close();
                                                                                                                                }
                                                                                                                                
                                                                                                                                    // ============================================================
                                                                                                                                    // MENSAJE DE BIENVENIDA
                                                                                                                                    // ============================================================
                                                                                                                                _showWelcome() {
                                                                                                                                        const delay = 300;
                                                                                                                                  setTimeout(() => {
                                                                                                                                              this._addBotMessage(CREAMY_CONFIG.welcomeMessage, CREAMY_INITIAL_CHIPS);
                                                                                                                                      }, delay);
                                                                                                                                }
                                                                                                                                
                                                                                                                                    // ============================================================
                                                                                                                                    // ENVIO DE MENSAJES
                                                                                                                                    // ============================================================
                                                                                                                                _sendMessage() {
                                                                                                                                  const text = this.textarea ? this.textarea.value.trim() : '';
                                                                                                                                  if (!text) return;
                                                                                                                                  
                                                                                                                                        // Limpiar input
                                                                                                                                        this.textarea.value = '';
                                                                                                                                        this.textarea.style.height = 'auto';
                                                                                                                                  
                                                                                                                                        // Agregar mensaje del usuario
                                                                                                                                  this._addUserMessage(text);
                                                                                                                                  
                                                                                                                                        // Procesar con mock
                                                                                                                                  this._processWithMock(text.toLowerCase(), null);
                                                                                                                                }
                                                                                                                                
                                                                                                                                _processWithMock(text, chipId) {
                                                                                                                                        // Mostrar typing
                                                                                                                                  this._showTyping();
                                                                                                                                  
                                                                                                                                        // Delay artificial
                                                                                                                                  const delay = CREAMY_CONFIG.typingDelayMin + Math.random() * (CREAMY_CONFIG.typingDelayMax - CREAMY_CONFIG.typingDelayMin);
                                                                                                                                  
                                                                                                                                  setTimeout(() => {
                                                                                                                                      this._hideTyping();
                                                                                                                                      const response = this._getMockResponse(text, chipId);
                                                                                                                                      this._addBotMessage(response.text, response.chips);
                                                                                                                                      }, delay);
                                                                                                                                }
                                                                                                                                
                                                                                                                                _getMockResponse(text, chipId) {
                                                                                                                                        // Si viene de un chip, usar directamente su ID
                                                                                                                                  if (chipId && CREAMY_MOCK_RESPONSES[chipId]) {
                                                                                                                                    return CREAMY_MOCK_RESPONSES[chipId];
                                                                                                                                  }
                                                                                                                                  
                                                                                                                                        // Deteccion por palabras clave
                                                                                                                                        const keywords = {
                                                                                                                                            develop: ['desarrollar', 'crear', 'fabricar', 'producto', 'hacer', 'quiero', 'nuevo'],
                                                                                                                                              services: ['servicio', 'precio', 'costo', 'cuanto', 'valor', 'presupuesto', 'cotiz'],
                                                                                                                                                technical: ['activo', 'ingrediente', 'formula', 'tecnica', 'compatibilidad', 'textura', 'proceso'],
                                                                                                                                                  advisor: ['asesor', 'hablar', 'contacto', 'persona', 'humano', 'equipo'],
                                                                                                                                            zone_face: ['cara', 'facial', 'rostro', 'piel'],
                                                                                                                                              zone_body: ['cuerpo', 'corporal', 'piel', 'crem'],
                                                                                                                                                        zone_hair: ['cabello', 'pelo', 'capilar', 'shampoo', 'champoo'],
                                                                                                                                                  zone_beard: ['barba', 'afeit', 'masculin'],
                                                                                                                                                  };
                                                                                                                                                    
                                                                                                                                                    for (const [key, words] of Object.entries(keywords)) {
                                                                                                                                                        if (words.some(w => text.includes(w))) {
                                                                                                                                                          return CREAMY_MOCK_RESPONSES[key] || CREAMY_MOCK_RESPONSES.default;
                                                                                                                                                        }
                                                                                                                                                      }
                                                                                                                                                      
                                                                                                                                                            return CREAMY_MOCK_RESPONSES.default;
                                                                                                                                                    }
                                                                                                                                                      
                                                                                                                                                          // ============================================================
                                                                                                                                                          // CONSTRUCCION DE MENSAJES EN DOM
                                                                                                                                                          // ============================================================
                                                                                                                                                      _addUserMessage(text) {
                                                                                                                                                        const msg = document.createElement('div');
                                                                                                                                                                msg.className = 'creamy-message creamy-message-user';
                                                                                                                                                          
                                                                                                                                                                const bubble = document.createElement('div');
                                                                                                                                                                  bubble.className = 'creamy-bubble';
                                                                                                                                                                  bubble.textContent = text;
                                                                                                                                                            
                                                                                                                                                                  const time = document.createElement('div');
                                                                                                                                                                    time.className = 'creamy-timestamp';
                                                                                                                                                              time.textContent = this._getTime();
                                                                                                                                                              
                                                                                                                                                              msg.appendChild(bubble);
                                                                                                                                                              msg.appendChild(time);
                                                                                                                                                              this.messagesEl.appendChild(msg);
                                                                                                                                                              
                                                                                                                                                                    this.messageHistory.push({ role: 'user', content: text });
                                                                                                                                                              this._scrollToBottom();
                                                                                                                                                            }
                                                                                                                                                              
                                                                                                                                                              _addBotMessage(text, chips) {
                                                                                                                                                                      const msg = document.createElement('div');
                                                                                                                                                                        msg.className = 'creamy-message creamy-message-bot';
                                                                                                                                                                  
                                                                                                                                                                        const bubble = document.createElement('div');
                                                                                                                                                                          bubble.className = 'creamy-bubble';
                                                                                                                                                                          bubble.textContent = text;
                                                                                                                                                                    
                                                                                                                                                                          const time = document.createElement('div');
                                                                                                                                                                            time.className = 'creamy-timestamp';
                                                                                                                                                                            time.textContent = 'Creamy \u00b7 ' + this._getTime();
                                                                                                                                                                      
                                                                                                                                                                      msg.appendChild(bubble);
                                                                                                                                                                      msg.appendChild(time);
                                                                                                                                                                      
                                                                                                                                                                            // Chips
                                                                                                                                                                            if (chips && chips.length > 0) {
                                                                                                                                                                                const chipsEl = this._buildChips(chips);
                                                                                                                                                                        msg.appendChild(chipsEl);
                                                                                                                                                                      }
                                                                                                                                                                      
                                                                                                                                                                      this.messagesEl.appendChild(msg);
                                                                                                                                                                            this.messageHistory.push({ role: 'assistant', content: text });
                                                                                                                                                                      this._scrollToBottom();
                                                                                                                                                                    }
                                                                                                                                                                      
                                                                                                                                                                      _buildChips(chips) {
                                                                                                                                                                              const wrapper = document.createElement('div');
                                                                                                                                                                                wrapper.className = 'creamy-chips';
                                                                                                                                                                          
                                                                                                                                                                                chips.forEach(chip => {
                                                                                                                                                                                      const btn = document.createElement('button');
                                                                                                                                                                                        btn.className = 'creamy-chip';
                                                                                                                                                                                if (chip.url) btn.classList.add('creamy-chip-cta');
                                                                                                                                                                                          btn.textContent = chip.label;
                                                                                                                                                                                          btn.setAttribute('type', 'button');
                                                                                                                                                                                    
                                                                                                                                                                                            btn.addEventListener('click', () => {
                                                                                                                                                                                                  if (chip.url) {
                                                                                                                                                                                                        // Chip de conversion - navegar
                                                                                                                                                                                                        if (chip.external) {
                                                                                                                                                                                                            window.open(chip.url, '_blank', 'noopener,noreferrer');
                                                                                                                                                                                                            } else {
                                                                                                                                                                                                                window.location.href = chip.url;
                                                                                                                                                                                                              }
                                                                                                                                                                                                          } else {
                                                                                                                                                                                                              // Chip de pregunta - simular mensaje del usuario
                                                                                                                                                                                                              this._addUserMessage(chip.label.replace(/^[\u{1F300}-\u{1FFFF}\u2600-\u26FF\u2700-\u27BF\uFE0F\s]+/u, '').trim());
                                                                                                                                                                                                              this._processWithMock('', chip.id);
                                                                                                                                                                                                            }
                                                                                                                                                                                                          // Deshabilitar todos los chips del mismo grupo
                                                                                                                                                                                                          const parentChips = wrapper.querySelectorAll('.creamy-chip');
                                                                                                                                                                                                            parentChips.forEach(c => {
                                                                                                                                                                                                                  c.disabled = true;
                                                                                                                                                                                                                  c.style.opacity = '0.5';
                                                                                                                                                                                                                  c.style.cursor = 'default';
                                                                                                                                                                                                                });
                                                                                                                                                                                                          });
                                                                                                                                                                                                
                                                                                                                                                                                                        wrapper.appendChild(btn);
                                                                                                                                                                                                });
                                                                                                                                                                                              
                                                                                                                                                                                                    return wrapper;
                                                                                                                                                                                            }
                                                                                                                                                                                            
                                                                                                                                                                                                // ============================================================
                                                                                                                                                                                                // TYPING INDICATOR
                                                                                                                                                                                                // ============================================================
                                                                                                                                                                                                _showTyping() {
                                                                                                                                                                                                    this.typingEl.classList.remove('creamy-hidden');
                                                                                                                                                                                                      this._scrollToBottom();
                                                                                                                                                                                              }
                                                                                                                                                                                                
                                                                                                                                                                                                    _hideTyping() {
                                                                                                                                                                                                        this.typingEl.classList.add('creamy-hidden');
                                                                                                                                                                                                        }
                                                                                                                                                                                                    
                                                                                                                                                                                                        // ============================================================
                                                                                                                                                                                                        // UTILIDADES
                                                                                                                                                                                                        // ============================================================
                                                                                                                                                                                                        _scrollToBottom() {
                                                                                                                                                                                                            requestAnimationFrame(() => {
                                                                                                                                                                                                                  if (this.messagesEl) {
                                                                                                                                                                                                                        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
                                                                                                                                                                                                                      }
                                                                                                                                                                                                                  });
                                                                                                                                                                                                            }
                                                                                                                                                                                                      
                                                                                                                                                                                                          _getTime() {
                                                                                                                                                                                                              const now = new Date();
                                                                                                                                                                                                              return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                                                                                                                                                                                                            }
                                                                                                                                                                                                        }
                                                                                                                                                                                                      
                                                                                                                                                                                                        // ============================================================
                                                                                                                                                                                                        // INICIALIZACION AUTOMATICA
                                                                                                                                                                                                        // No crea variables globales. Instancia unica encapsulada.
                                                                                                                                                                                                        // ============================================================
                                                                                                                                                                                                        if (!window.__creamyAI) {
                                                                                                                                                                                                              window.__creamyAI = new CreamyAI();
                                                                                                                                                                                                            }
                                                                                                                                                                                                        
                                                                                                                                                                                                        })();

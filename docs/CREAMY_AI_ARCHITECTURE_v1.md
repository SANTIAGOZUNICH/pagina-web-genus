**CREAMY AI**

**ARCHITECTURE v1.0**

Asistente Inteligente de Laboratorio Genus

Documento de Arquitectura Tecnica --- Uso Interno

Rol: Arquitecto Principal / CTO Digital

**Clasificacion: CONFIDENCIAL**

**1. Diagnostico de la Idea**

El concepto de Creamy AI es solido, oportuno y estrategicamente
relevante. La idea de un especialista virtual en desarrollo cosmético
que vive en el sitio web de Laboratorio Genus tiene potencial real de
diferenciacion competitiva en el mercado de fabricacion tercerizada en
Argentina.

**1.1 Que esta bien**

-   Vision clara: no es un FAQ, es un especialista virtual. Esa
    distincion es fundamental y bien articulada.

-   Objetivo comercial definido: convertir conversaciones en acciones
    medibles (configurador, cotizacion, WhatsApp).

-   Limites tecnico-comerciales claros: MOQ, restricciones de productos,
    reglas internas definidas.

-   Personaje Creamy: la mascota ya existe y tiene identidad visual. Eso
    es una ventaja enorme --- no parte de cero.

-   Arquitectura modular correcta: prefijo creamy-, carpeta
    independiente, sin contaminar el sitio.

-   Roadmap por fases: bien estructurado en terminos conceptuales.

**1.2 Que puede fallar**

+-----------------------------------------------------------------------+
| **⚠️ Riesgo 1: Scope creep en C1**                                    |
|                                                                       |
| La Fase C1 pide \'widget visual sin IA real\'. Si el Constructor      |
| agrega logica de chat o trata de anticipar C2, C1 se extiende y rompe |
| el aislamiento de fases. Solucion: C1 debe ser SOLO UI estatica con   |
| mock responses.                                                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **⚠️ Riesgo 2: Costo de OpenAI sin control**                          |
|                                                                       |
| Sin rate limiting ni sesion token budget, un usuario puede generar    |
| cientos de requests. Con GPT-4o, 1000 conversaciones diarias podrian  |
| costar USD 80-200/mes facilmente. Solucion: implementar rate limiting |
| desde C2.                                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **⚠️ Riesgo 3: El Modo Formulador es complejo para C5**               |
|                                                                       |
| Requiere que el configurador tenga una API o parametros en URL para   |
| preseleccionar campos. Si el configurador actual es un form estatico, |
| esto requiere refactorizacion que puede romper el flujo existente.    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **⚠️ Riesgo 4: Panel admin subestimado**                              |
|                                                                       |
| Se pide un panel con dashboard, filtros, exportacion, gestion de      |
| conocimiento y estadisticas de IA. Eso es un producto independiente.  |
| Si va en C4, C4 deberia ser dos fases (C4a: historial basico, C4b:    |
| dashboard completo).                                                  |
+-----------------------------------------------------------------------+

**2. Critica Profesional**

**2.1 Lo que conviene simplificar**

-   El Modo Formulador (C5) es correcto como vision de largo plazo, pero
    la \'ficha preliminar\' deberia ser primero una respuesta de texto
    enriquecido, y en una version posterior conectarse al configurador.
    No intentar hacer el autocompletado del configurador en C5 ---
    dejarlo para C6.

-   El panel admin: empezar con historial de conversaciones en Google
    Sheets (Fase C3b) antes de construir un panel custom (C4). Ahorra
    4-6 semanas de desarrollo.

-   Analytics: los eventos de Meta Pixel y Google Analytics son una sola
    tarde de trabajo. Incluirlos en C2, no en C3 separado.

-   La voz, WhatsApp Business API y CRM son correctamente escalabilidad
    futura --- bien identificados. No los incluyas en el roadmap activo.

**2.2 Lo que conviene hacer primero**

1.  Definir y aprobar el system prompt de Creamy AI antes de escribir
    una linea de codigo. Es el corazon del producto.

2.  Validar que el configurador actual tiene URL parametrizable. Si no
    lo tiene, el Modo Formulador no existe.

3.  Decidir el backend de almacenamiento antes de C2 para no migrarlo
    despues.

4.  Definir colores institucionales exactos (hex) de Genus para que el
    Constructor los use desde el dia uno.

**2.3 Lo que puede esperar**

-   Voz (text-to-speech o speech-to-text)

-   WhatsApp Business API real (vs link a wa.me que si va en C2)

-   Integracion con CRM

-   Envio automatico de resumen por email

-   Generacion de documentos PDF desde el chat

-   Multi-idioma

**3. Mejoras Propuestas al Concepto Original**

**3.1 Mensaje de bienvenida refinado**

Propuesta de texto inicial mas elegante y menos cargado de emojis:

> *\"Hola, soy Creamy --- el asistente de Laboratorio Genus. Puedo
> ayudarte a explorar nuestros servicios, resolver consultas tecnicas y
> orientarte en el desarrollo de tu producto cosmético. ¿Por donde
> empezamos?\"*

Racional: mas profesional, no sobre-explica, invita a la accion. El
\'por donde empezamos\' activa interes sin ser invasivo.

**3.2 Tagline del personaje**

  ----------------------- -----------------------------------------------
  **Opcion**              **Texto**

  Version original        Sacate las dudas con Creamy

  Alternativa A           Tu especialista en desarrollo cosmético

  Alternativa B           El experto cosmético que necesitabas
  (recomendada)           

  Alternativa C           Desarrollo cosmético, sin tecnicismos
  ----------------------- -----------------------------------------------

**3.3 Flujo de usuario indeciso --- mejora**

En lugar de hacer todas las preguntas de una vez (zona, objetivo,
publico, posicionamiento), proponer un flujo de chips interactivos en 2
pasos:

-   Paso 1: \'¿Para que zona es tu producto?\' --- chips: Cara / Cuerpo
    / Cabello / Barba / Otra

-   Paso 2: \'¿Que objetivo busca?\' --- chips dinamicos segun la zona
    elegida

-   Paso 3 opcional: \'¿A que publico esta dirigido?\' si la IA lo
    necesita para recomendar

Esto reduce friccion, mejora conversion y evita que el usuario sienta
que esta llenando un formulario.

**4. Arquitectura Recomendada**

Creamy AI se arquitecta como un micro-frontend autonomo que consume un
backend serverless dedicado, con la IA procesada en el servidor (nunca
en el cliente).

**4.1 Diagrama de alto nivel**

> \[Navegador del usuario\] \| \[Widget Creamy --- JS/CSS encapsulado\]
> \| HTTPS POST /api/chat \[Backend Creamy --- Node.js / Edge Function\]
> \| \| \[OpenAI API\] \[Base de Conocimiento\] \| \| \[Base de Datos
> --- Supabase\] \| \[Panel Admin --- Next.js privado\]

**4.2 Principios de aislamiento**

-   El widget es un archivo JS self-contained que se agrega con una sola
    linea en cada pagina.

-   No modifica el DOM global ni estilos existentes.

-   Todo el CSS esta bajo el namespace .creamy- para evitar colisiones.

-   Puede activarse/desactivarse sin tocar el sitio principal.

-   El backend vive en un subdominio separado:
    api.laboratoriogenus.com/creamy/

**5. Estructura de Carpetas**

**5.1 Frontend --- Widget**

> assets/ creamy/ creamy.js \# Entry point, clase Creamy, logica de UI
> creamy.css \# Estilos encapsulados (.creamy-\*) creamy-config.json \#
> Config publica: colores, textos, URLs creamy-knowledge.json \# Base de
> conocimiento local (fallback) creamy-avatar.png \# Imagen del
> personaje creamy-avatar-anim.gif \# Version animada (opcional) icons/
> \# Iconos SVG del widget sounds/ \# Sonido de notificacion (opcional)

**5.2 Backend --- API**

> backend/ creamy/ api/ chat.js \# Endpoint POST /chat --- procesa
> mensajes session.js \# Gestion de sesiones y contexto knowledge.js \#
> Endpoint GET /knowledge --- base de conocimiento analytics.js \#
> Endpoint POST /event --- registro de eventos lead.js \# Endpoint POST
> /lead --- guardar leads detectados middleware/ rateLimit.js \# Limite
> de requests por IP/sesion auth.js \# Autenticacion del panel admin
> sanitize.js \# Limpieza de inputs prompts/ system-prompt.txt \# System
> prompt principal de Creamy rules.txt \# Reglas internas del
> laboratorio knowledge/ products.json \# Productos y servicios
> actives.json \# Activos cosmeticos faq.json \# Preguntas frecuentes
> restrictions.json \# Restricciones (MOQ, no balm, etc) admin/
> dashboard.js \# Stats del panel conversations.js \# Historial
> knowledge-mgmt.js \# Gestion de base de conocimiento

**5.3 Panel Administrativo**

> admin/ \# Aplicacion separada (Next.js) pages/ login.jsx dashboard.jsx
> conversations/ index.jsx \# Listado con filtros \[id\].jsx \# Detalle
> de conversacion knowledge/ index.jsx \# Gestion de base de
> conocimiento analytics.jsx components/ ConversationCard.jsx
> KnowledgeEditor.jsx StatsChart.jsx

**6. Stack Tecnologico Recomendado**

**6.1 Frontend --- Widget**

  ----------------------- -----------------------------------------------
  **Capa**                **Tecnologia y razon**

  Lenguaje                JavaScript Vanilla (ES2020+) --- sin
                          frameworks. Cero dependencias externas.

  CSS                     CSS puro con namespace .creamy-. Variables CSS
                          para tematizacion.

  Animaciones             CSS transitions + Web Animations API. Sin GSAP
                          en C1.

  Integracion             Un \<script\> tag al final del \<body\>. Nada
                          mas.

  Build                   Opcional: esbuild para minificar en produccion.
  ----------------------- -----------------------------------------------

**6.2 Backend --- API**

  ----------------------- -----------------------------------------------
  **Capa**                **Tecnologia y razon**

  Runtime                 Node.js 20 (LTS). Familiar, rapido para deploy.

  Framework               Hono.js --- ultra-ligero, compatible con
                          Cloudflare Workers y Vercel Edge.

  Deploy                  Vercel (recomendado) o Cloudflare Workers.
                          Serverless = costo por uso.

  Auth Admin              NextAuth o JWT firmado. Simple y seguro.

  Rate Limiting           Upstash Redis (serverless Redis) para rate
                          limiting sin estado.
  ----------------------- -----------------------------------------------

**6.3 Inteligencia Artificial**

  ----------------------- -----------------------------------------------
  **Componente**          **Decision**

  Modelo                  GPT-4o-mini --- precio/calidad optimo para
                          asistente de soporte tecnico.

  Alternativa             GPT-4o para conversaciones complejas (Modo
                          Formulador).

  SDK                     OpenAI Node.js SDK oficial.

  Contexto                Ventana de 10-15 turnos. El system prompt nunca
                          se descarta.

  Streaming               SSE (Server-Sent Events) desde C2 para
                          respuestas en tiempo real.

  Embeddings              text-embedding-ada-002 para RAG en C4+
                          (busqueda semantica).
  ----------------------- -----------------------------------------------

**6.4 Base de Datos**

  ----------------------- -----------------------------------------------
  **Opcion**              **Evaluacion**

  RECOMENDADO             Supabase --- PostgreSQL gestionado, auth
                          incluida, dashboard visual, gratis hasta 500MB.

  Alternativa simple      Google Sheets via API --- cero costo, facil de
                          ver, pero no escala.

  Alternativa intermedia  Firebase Firestore --- bueno si ya usan
                          Firebase, pero mas caro.

  Evitar                  Backend propio con servidor dedicado ---
                          innecesario y mas costoso en esta etapa.
  ----------------------- -----------------------------------------------

+-----------------------------------------------------------------------+
| **✅ Decision recomendada: Supabase**                                 |
|                                                                       |
| Supabase ofrece PostgreSQL real (no NoSQL), Row Level Security,       |
| autenticacion integrada, dashboard visual para ver datos sin codigo,  |
| y generoso tier gratuito. Es la opcion que mejor escala de prototipo  |
| a produccion sin migracion.                                           |
+-----------------------------------------------------------------------+

**6.5 Panel Administrativo**

  ----------------------- -----------------------------------------------
  **Capa**                **Tecnologia**

  Framework               Next.js 14 (App Router) --- SSR, auth facil,
                          deploy en Vercel.

  UI Components           shadcn/ui --- componentes accesibles y sin
                          lock-in.

  Charts                  Recharts --- liviano y open source.

  Auth                    NextAuth con Google OAuth o credenciales
                          locales.
  ----------------------- -----------------------------------------------

**7. Frontend del Widget --- Especificacion UX/UI**

**7.1 Anatomia del widget**

**Boton flotante (estado cerrado)**

-   Posicion: fixed, bottom: 24px, right: 24px. z-index: 9999.

-   Contenido: avatar de Creamy + badge verde de estado.

-   Dimension: 64px x 64px circulo con sombra suave.

-   Animacion de entrada: slideInUp 400ms ease-out al cargar la pagina
    (despues de 1.5s delay para no molestar).

-   Animacion de hover: scale(1.08) con sombra ampliada.

-   Al hacer click: la ventana se expande con animation slideInUp +
    fadeIn.

**Ventana de chat (estado abierto)**

-   Dimension desktop: 380px ancho x 560px alto. Mobile: 100vw x 85vh
    (sheet inferior).

-   Header: logo Genus (pequeno) + texto \'Creamy AI\' + punto verde +
    \'En linea\'. Boton minimizar (---) y cerrar (x).

-   Body: scroll de burbujas de mensajes. El scroll es interno, no
    desplaza la pagina.

-   Input area: textarea auto-expandible (max 3 lineas) + boton enviar.
    Placeholder: \'Escribi tu consulta\...\'

-   Quick chips: 4 chips iniciales clickeables bajo el primer mensaje de
    Creamy.

**Burbujas de mensajes**

  ----------------------- -----------------------------------------------
  **Tipo**                **Estilo**

  Usuario                 Fondo azul Genus, texto blanco, alineacion
                          derecha, border-radius 18px 18px 4px 18px.

  Creamy                  Fondo gris muy claro (#F4F6F7), texto oscuro,
                          alineacion izquierda, border-radius 4px 18px
                          18px 18px.

  Sistema                 Fondo transparente, texto centrado gris,
                          tipografia pequeña. Para timestamps y avisos.

  Accion                  Botones con border azul Genus, sin fill. Al
                          hover: fill azul, texto blanco.
  ----------------------- -----------------------------------------------

**Indicador de escritura**

Tres puntos animados con efecto wave (dot 1, dot 2, dot 3 con delay
escalonado). Aparece mientras la API procesa. Desaparece cuando llega la
respuesta.

**7.2 Quick chips iniciales recomendados**

-   🧪 Quiero desarrollar un producto

-   📋 Consultar servicios y precios

-   ⚗️ Tengo una consulta tecnica

-   💬 Hablar con un asesor

**7.3 Quick chips de conversion (al detectar interes)**

-   🧪 Crear mi producto --- link al configurador

-   📋 Solicitar cotizacion --- link al formulario

-   💬 Hablar con un asesor --- wa.me/5491124980861

**7.4 Comportamiento responsive**

-   Desktop (\>768px): ventana flotante en esquina inferior derecha.

-   Mobile (\<768px): bottom sheet que ocupa 85% del alto de pantalla.
    El scroll de la pagina principal queda bloqueado mientras el chat
    esta abierto.

-   El boton flotante siempre visible en todas las resoluciones.

**8. Backend --- Especificacion de Endpoints**

**8.1 Endpoints principales**

  ----------------------------- ---------------------------------- ------------------
  **Endpoint**                  **Descripcion**                    **Fase**

  POST /creamy/chat             Recibe mensaje del usuario,        C2
                                contexto de sesion, devuelve       
                                respuesta de IA (stream o JSON)    

  POST /creamy/session          Crea nueva sesion, devuelve        C2
                                session_id unico                   

  POST /creamy/event            Registra evento de analytics       C3
                                (click, conversion)                

  POST /creamy/lead             Guarda datos de lead detectado por C3
                                la IA                              

  GET /creamy/knowledge         Devuelve base de conocimiento al   C2
                                sistema de IA                      

  GET /creamy/admin/stats       Dashboard de estadisticas          C4
                                (requiere auth)                    

  GET                           Listado filtrable de               C4
  /creamy/admin/conversations   conversaciones (auth)              

  PUT                           Actualiza entrada de base de       C4
  /creamy/admin/knowledge/:id   conocimiento (auth)                
  ----------------------------- ---------------------------------- ------------------

**8.2 Estructura del request /chat**

> POST /creamy/chat Content-Type: application/json { session_id:
> \'uuid-v4\', message: \'Quiero hacer un serum con vitamina C\',
> page_url: \'https://laboratoriogenus.com/servicios\', page_title:
> \'Servicios\', conversation_history: \[ { role: \'user\', content:
> \'\...\' }, { role: \'assistant\', content: \'\...\' } \] }

**8.3 Rate Limiting**

  ----------------------- -----------------------------------------------
  **Limite**              **Regla**

  Por IP                  Max 30 mensajes por hora por IP. Bloqueo
                          temporal de 1 hora.

  Por sesion              Max 50 mensajes por sesion de 24 horas.

  Global                  Si el costo diario supera USD 50, activar modo
                          de respuesta en cache.

  Anti-spam               Detectar mensajes repetitivos o sin contenido.
                          Ignorar despues de 3 intentos.

  Captcha                 No en C2. Evaluar en C3 si hay abuso detectado.
  ----------------------- -----------------------------------------------

**9. Inteligencia Artificial --- Especificacion**

**9.1 Modelo y configuracion**

  ----------------------- -----------------------------------------------
  **Parametro**           **Valor y razon**

  Modelo principal        gpt-4o-mini (costo: \~\$0.15/M tokens input,
                          \~\$0.60/M tokens output)

  Temperatura             0.4 --- respuestas consistentes sin ser
                          roboticas

  Max tokens respuesta    600 tokens --- suficiente para respuestas
                          tecnicas completas

  Contexto maximo         Ultimos 12 turnos de conversacion + system
                          prompt

  Streaming               Si --- SSE para respuesta caracter a caracter
                          (mejor UX)

  Timeout                 30 segundos. Si no responde, mensaje de error
                          amigable.
  ----------------------- -----------------------------------------------

**9.2 System Prompt --- Estructura**

El system prompt es el documento mas importante del proyecto. Debe
contener:

5.  Identidad: quien es Creamy, su tono, su especialidad.

6.  Reglas de laboratorio: MOQ, restricciones de productos, proceso.

7.  Conocimiento tecnico: activos, compatibilidades, texturas, procesos.

8.  Limites: lo que nunca debe decir ni prometer.

9.  Logica de derivacion: cuando enviar a configurador, cotizacion,
    WhatsApp.

10. Deteccion de intento: como identificar interes de compra.

11. Formato de respuesta: usar texto natural, no markdown excesivo, usar
    los chips de accion al final si corresponde.

**9.3 Base de conocimiento --- Estrategia RAG**

En C2, la base de conocimiento se inyecta directamente en el system
prompt (simple y efectivo). En C4+, migrar a RAG (Retrieval Augmented
Generation) con embeddings para que el conocimiento escale sin aumentar
el costo por token.

  ----------------------- -----------------------------------------------
  **Estrategia**          **Descripcion**

  C2 --- Prompt injection Todo el conocimiento va en el system prompt.
                          Limite: \~8000 tokens. Simple de implementar.

  C4 --- RAG con          El backend busca los fragmentos relevantes
  embeddings              antes de llamar a la IA. Escala a cientos de
                          productos.

  Formato del             JSON estructurado: { tipo, nombre, descripcion,
  conocimiento            restricciones, activos }

  Actualizacion           Desde el panel admin, sin tocar codigo. JSON
                          editable con validacion.
  ----------------------- -----------------------------------------------

**9.4 Deteccion de intension comercial**

La IA debe clasificar cada conversacion con una etiqueta de intencion al
final de cada respuesta (invisible para el usuario, guardada en la base
de datos):

-   EXPLORANDO --- usuario buscando informacion general

-   INTERESADO --- pregunto sobre procesos, precios, MOQ

-   LISTO_PARA_AVANZAR --- menciono un producto especifico o pidio
    cotizacion

-   LEAD_CALIFICADO --- dio datos de contacto o mostro interes de compra
    inmediato

Esta clasificacion alimenta el dashboard del panel admin y permite al
equipo comercial priorizar seguimiento.

**10. Base de Conocimiento --- Especificacion**

**10.1 Estructura de datos**

> // products.json \[ { \"id\": \"serum-vitamina-c\", \"tipo\":
> \"serum\", \"nombre\": \"Serum de Vitamina C\", \"descripcion\":
> \"Serum acuoso para iluminacion y antiage\...\",
> \"activos_compatibles\": \[\"vitamina-c\", \"niacinamida\",
> \"acido-hialuronico\"\], \"activos_incompatibles\":
> \[\"retinol-alta-conc\", \"aha-alta-conc\"\], \"moq\": 500,
> \"llave_en_mano\": false, \"envases_recomendados\": \[\"dosificador\",
> \"pipeta\"\], \"texturas\": \[\"fluido\", \"serum\"\] } \]

**10.2 Reglas internas (restrictions.json)**

> { \"moq_minimo\": 500, \"llave_en_mano_desde\": 5000,
> \"productos_no_disponibles\": \[\"balm_barra\"\],
> \"productos_disponibles_aclaracion\": { \"balm_lata\": \"Si fabricamos
> balsamos y pomadas en lata\" }, \"activos_evaluacion_tecnica\": true,
> \"claims_prohibidos\": \[\"cura\", \"trata\", \"medico\",
> \"terapeutico\"\], \"derivar_whatsapp\":
> \"https://wa.me/5491124980861\" }

**10.3 Mantenimiento**

-   El equipo de Genus puede editar el conocimiento desde el panel admin
    (C4) sin tocar codigo.

-   Cada cambio genera un log con usuario, fecha y campo modificado.

-   El sistema valida el JSON antes de guardar para evitar errores de
    formato.

-   Cambios se aplican en tiempo real sin necesidad de deploy.

**11. Base de Datos --- Esquema Supabase**

**11.1 Tablas principales**

  ----------------------- -----------------------------------------------
  **Tabla**               **Campos principales**

  creamy_sessions         session_id, created_at, page_url, page_title,
                          user_agent, ip_hash

  creamy_messages         id, session_id, role (user/assistant), content,
                          timestamp, tokens_used

  creamy_events           id, session_id, event_type, event_data (JSON),
                          timestamp

  creamy_leads            id, session_id, nombre, email, telefono,
                          producto_consultado, intention_level,
                          created_at

  creamy_knowledge        id, tipo, nombre, contenido (JSON), activo,
                          created_at, updated_at

  creamy_admin_users      id, email, password_hash, rol, last_login
  ----------------------- -----------------------------------------------

**11.2 Indices recomendados**

-   creamy_messages: INDEX en session_id, timestamp.

-   creamy_events: INDEX en event_type, timestamp.

-   creamy_leads: INDEX en intention_level, created_at.

-   creamy_sessions: INDEX en created_at, page_url.

**11.3 Retencion de datos**

-   Conversaciones: retener 12 meses por defecto.

-   Logs de eventos: retener 6 meses.

-   Leads: retener indefinidamente (dato comercial valioso).

-   Implementar purga automatica con Supabase Edge Functions o cron job.

**12. Panel Administrativo**

**12.1 Acceso y seguridad**

-   URL privada: admin.laboratoriogenus.com/creamy (o subpath
    /admin/creamy)

-   Login con usuario y contrasena. En C4 agregar 2FA via TOTP (Google
    Authenticator).

-   Sesion expira a las 8 horas. Refresh token silencioso.

-   Rate limiting en el endpoint de login: max 5 intentos por IP en 15
    minutos.

**12.2 Modulos del panel**

**Dashboard**

-   Tarjetas: conversaciones hoy / semana / mes.

-   Grafico de linea: volumen de conversaciones por dia (ultimos 30
    dias).

-   Top 5 productos consultados.

-   Tasa de conversion a cada accion (configurador, cotizacion,
    WhatsApp).

-   Distribucion de intenciones detectadas (donut chart).

**Historial de conversaciones**

-   Lista con: fecha, duracion, intencion, si genero lead, primer
    mensaje del usuario.

-   Filtros: fecha, intencion, producto, pagina de origen.

-   Busqueda por palabra clave (full text search en Supabase).

-   Vista de conversacion completa con timestamps.

-   Exportar a CSV.

**Gestion de conocimiento**

-   CRUD de productos, activos, servicios, reglas.

-   Editor de texto rico para descripciones.

-   Toggle activo/inactivo por entrada.

-   Vista previa de como Creamy usaria ese conocimiento.

**Estadisticas de IA**

-   Preguntas sin respuesta satisfactoria (detectadas por la IA).

-   Consultas repetidas (oportunidad de mejorar el conocimiento).

-   Activos y productos trending.

**13. Seguridad**

  ----------------------- -----------------------------------------------
  **Capa**                **Medida de seguridad**

  API Keys                La API key de OpenAI NUNCA va en el frontend.
                          Siempre en el backend (variable de entorno).

  CORS                    El endpoint /creamy/chat solo acepta requests
                          del dominio de Genus.

  Input sanitization      Todo input del usuario se sanitiza antes de
                          enviarse a la IA. Strip de HTML y JS.

  Prompt injection        El system prompt incluye instrucciones para
                          ignorar intentos de \'jailbreak\' o cambio de
                          rol.

  Rate limiting           Por IP y por sesion. Via Upstash Redis.

  PII                     Los IPs se guardan hasheados. Los datos
                          personales solo se guardan si el usuario los
                          proporciona voluntariamente.

  Admin auth              JWT con firma RS256. Refresh tokens con
                          rotacion.

  HTTPS                   Todo en HTTPS. HSTS habilitado. Certificado
                          automatico via Vercel.

  Logs                    Sin logging de contenido de conversaciones en
                          consola de produccion.

  ANMAT                   Creamy nunca hace claims terapeuticos. El
                          system prompt lo prohibe explicitamente.
  ----------------------- -----------------------------------------------

**14. Analytics**

**14.1 Eventos a registrar**

  --------------------------- ---------------------------------- ------------------
  **Evento**                  **Descripcion**                    **Fase**

  creamy_open                 Usuario abre el widget             C2

  creamy_close                Usuario cierra el widget           C2

  creamy_message_sent         Usuario envia un mensaje           C2

  creamy_quick_chip_click     Usuario clickea un chip rapido     C2

  creamy_lead_detected        IA detecta intencion de compra     C2

  creamy_click_configurator   Usuario clickea \'Crear mi         C2
                              producto\'                         

  creamy_click_quote          Usuario clickea \'Solicitar        C2
                              cotizacion\'                       

  creamy_click_whatsapp       Usuario clickea \'Hablar con       C2
                              asesor\'                           

  creamy_session_start        Nueva sesion iniciada              C2

  creamy_session_end          Sesion finalizada (close o         C3
                              timeout)                           

  creamy_formulador_used      Usuario uso el Modo Formulador     C5
  --------------------------- ---------------------------------- ------------------

**14.2 Integracion con Meta Pixel y Google Analytics**

-   El widget dispara window.dataLayer.push() y fbq() si estan
    disponibles en el DOM.

-   No requiere dependencias propias. Solo detecta si estan cargados y
    los usa.

-   Ejemplo: al click en configurador --- gtag(\'event\',
    \'creamy_click_configurator\').

-   Incluir en C2 (es media hora de trabajo, no justifica diferirlo).

**15. Costos Estimados**

**15.1 Costos de IA --- OpenAI**

Escenario base: 100 conversaciones/dia, promedio 10 mensajes de 150
tokens cada uno.

  ----------------------- -----------------------------------------------
  **Concepto**            **Estimacion**

  Tokens por conversacion \~3,000 tokens (input + output)

  Tokens por mes          \~9,000,000 tokens

  Costo gpt-4o-mini       \~USD 5-8/mes (escenario base)

  Costo con picos (500    \~USD 25-40/mes
  conv/dia)               

  Costo escenario abuso   Puede llegar a USD 200+/mes --- IMPLEMENTAR
  sin limites             RATE LIMITING
  ----------------------- -----------------------------------------------

**15.2 Costos de infraestructura**

  ----------------------- -----------------------------------------------
  **Servicio**            **Costo estimado**

  Vercel (backend +       Free tier cubre C1-C3. Pro USD 20/mes si se
  admin)                  supera el limite.

  Supabase (base de       Free tier: 500MB, 50,000 rows. Suficiente para
  datos)                  C2-C4. Pro USD 25/mes.

  Upstash Redis (rate     Free tier: 10,000 comandos/dia. Pro USD 10/mes.
  limiting)               

  Dominio admin           USD 12/ano si se quiere subdominio separado.
  (opcional)              

  CDN para assets de      Incluido en Vercel o usar el hosting actual de
  Creamy                  Genus.
  ----------------------- -----------------------------------------------

**15.3 Costo total estimado por fase**

  ----------------------- -----------------------------------------------
  **Fase**                **Costo mensual estimado**

  C1 --- Widget visual    USD 0/mes (solo desarrollo, sin IA ni infra)

  C2 --- IA conectada     USD 5-15/mes (OpenAI + Vercel free)

  C3 --- Registro y       USD 10-30/mes (+ Supabase)
  eventos                 

  C4 --- Panel admin      USD 15-45/mes (escenario base comodo)

  C5+ --- Crecimiento     USD 30-100/mes dependiendo del trafico
  ----------------------- -----------------------------------------------

+-----------------------------------------------------------------------+
| **💡 Recomendacion de costos**                                        |
|                                                                       |
| Comenzar con los tiers gratuitos de Vercel y Supabase. Solo pasar a   |
| tiers pagos cuando se superen los limites. Con rate limiting bien     |
| implementado, el costo de OpenAI en una primera etapa deberia         |
| mantenerse por debajo de USD 20/mes.                                  |
+-----------------------------------------------------------------------+

**16. Roadmap por Fases --- Version Revisada**

**FASE C1 --- Widget Visual (Sin IA)**

Objetivo: Creamy existe visualmente en todas las paginas. El Constructor
puede trabajar de forma autonoma.

  ----------------------- -----------------------------------------------
  **Concepto**            **Detalle**

  Duracion estimada       1-2 semanas

  Entregable              Widget funcional con UI completa, mock
                          responses, animaciones, responsive.

  Incluye                 Boton flotante, ventana de chat, burbujas,
                          chips rapidos, typing indicator,
                          minimizar/maximizar.

  NO incluye              IA real, base de datos, backend.

  Criterio de exito       Se puede agregar con una linea de HTML y no
                          rompe ninguna pagina del sitio.
  ----------------------- -----------------------------------------------

**FASE C2 --- IA Real + Conocimiento Base**

Objetivo: Creamy responde con inteligencia real usando GPT-4o-mini.

  ----------------------- -----------------------------------------------
  **Concepto**            **Detalle**

  Duracion estimada       2-3 semanas

  Entregable              Backend serverless, integracion OpenAI, system
                          prompt, base de conocimiento inicial.

  Incluye                 Streaming de respuestas, rate limiting,
                          analytics basicos, eventos GA y Meta Pixel.

  NO incluye              Base de datos de conversaciones, panel admin.

  Criterio de exito       Creamy responde correctamente preguntas sobre
                          MOQ, balsamos en barra, activos y procesos.
  ----------------------- -----------------------------------------------

**FASE C3 --- Registro, Leads y Derivaciones**

Objetivo: Todo queda registrado y las conversiones se miden.

  ----------------------- -----------------------------------------------
  **Concepto**            **Detalle**

  Duracion estimada       1-2 semanas

  Entregable              Supabase configurado, registro de
                          conversaciones, deteccion de leads, botones de
                          conversion.

  Incluye                 Tabla de sesiones, mensajes, eventos. Chips de
                          conversion. Google Sheets como backup inicial.

  NO incluye              Panel admin visual, Modo Formulador.

  Criterio de exito       Cada conversacion queda en la base de datos.
                          Los clicks a configurador/cotizacion/WA estan
                          medidos.
  ----------------------- -----------------------------------------------

**FASE C4 --- Panel Administrativo**

Objetivo: El equipo de Genus puede ver y gestionar Creamy sin tocar
codigo.

  ----------------------- -----------------------------------------------
  **Concepto**            **Detalle**

  Duracion estimada       3-4 semanas

  Entregable              App Next.js privada con dashboard, historial,
                          gestion de conocimiento.

  Incluye                 Login, stats basicas, historial filtrable, CRUD
                          de conocimiento, exportacion CSV.

  NO incluye              RAG con embeddings, estadisticas avanzadas de
                          IA.

  Criterio de exito       El equipo puede ver conversaciones, editar el
                          conocimiento y entender la conversion.
  ----------------------- -----------------------------------------------

**FASE C5 --- Modo Formulador**

Objetivo: Creamy genera fichas de producto y pre-configura el
configurador.

  ----------------------- -----------------------------------------------
  **Concepto**            **Detalle**

  Duracion estimada       2-3 semanas

  Pre-requisito CRITICO   El configurador de Genus debe aceptar
                          parametros por URL para preseleccion de campos.

  Entregable              Ficha de producto generada por IA + boton
                          \'Crear este producto\' que abre el
                          configurador preconfigurado.

  Incluye                 RAG para base de conocimiento ampliada, ficha
                          estructurada en JSON, deep link al
                          configurador.

  Criterio de exito       Usuario dice \'quiero una crema antiage
                          premium\' y obtiene una ficha con activos y
                          envase sugeridos.
  ----------------------- -----------------------------------------------

**FASE C6 --- Integraciones Avanzadas**

  ----------------------- -----------------------------------------------
  **Concepto**            **Detalle**

  Contenido               WhatsApp Business API, CRM, AppSheet, email
                          automatico, generacion de documentos PDF.

  Condicion               Iniciar cuando C5 este estable y haya traccion
                          real de conversaciones.

  Prioridad               BAJA --- puede esperar 6+ meses.
  ----------------------- -----------------------------------------------

**17. Que Implementar Primero y Por Que**

Orden exacto recomendado para el Constructor:

12. creamy.css --- el namespace y las variables CSS. Sin esto nada tiene
    estilo.

13. creamy.js --- clase Creamy, logica de apertura/cierre, burbujas con
    mock.

14. Integracion en una pagina de prueba (no en produccion todavia).

15. Revision visual con el equipo de Genus antes de seguir.

16. Deploy de C1 en produccion con el widget en TODAS las paginas.

17. Recien despues: backend y C2.

+-----------------------------------------------------------------------+
| **🚦 Regla de oro para el Constructor**                               |
|                                                                       |
| Nunca pasar a la siguiente fase sin que la anterior este en           |
| produccion y aprobada. El costo de \'deshacer\' crece                 |
| exponencialmente con cada fase.                                       |
+-----------------------------------------------------------------------+

**18. Que NO Implementar Todavia**

-   Voz (TTS/STT) --- complejidad alta, demanda baja en esta etapa.

-   WhatsApp Business API --- el link wa.me es suficiente para C1-C4.

-   Multi-idioma --- el mercado actual de Genus es hispanohablante.

-   Generacion de PDF desde el chat --- no hay caso de uso validado.

-   CRM propio --- usar los leads de Supabase antes de necesitar un CRM.

-   RAG con embeddings --- solo cuando la base de conocimiento supere
    \~50 productos.

-   Captcha --- solo si hay abuso real detectado post-launch.

-   Animacion de voz o avatar animado 3D --- no aporta conversion,
    agrega peso.

**19. Riesgos y Mitigaciones**

  ------------------ ---------------------------------- ------------------
  **Riesgo**         **Impacto**                        **Mitigacion**

  Costo IA           ALTO                               Rate limiting
  descontrolado                                         desde el primer
                                                        dia de C2. Budget
                                                        alerts en OpenAI.

  El Constructor no  MEDIO                              Auditoria de CSS
  aisla el CSS                                          despues de C1.
                                                        Verificar en 3
                                                        paginas distintas.

  System prompt      ALTO                               Iterar el system
  insuficiente                                          prompt antes de
                                                        lanzar C2. Testear
                                                        50 preguntas
                                                        clave.

  Configurador no    ALTO                               Verificar antes de
  parametrizable                                        planificar C5. Si
                                                        no es
                                                        parametrizable, C5
                                                        se redisena.

  Panel admin        MEDIO                              Separar C4 en C4a
  subestimado en                                        (historial) y C4b
  tiempo                                                (dashboard
                                                        completo).

  Respuestas         MEDIO                              Clause de
  incorrectas de                                        fallback:
  Creamy                                                \'Podemos
                                                        evaluarlo
                                                        tecnicamente\'.
                                                        Monitorear C3.

  Datos personales   BAJO                               Agregar aviso de
  sin consentimiento                                    privacidad en el
                                                        widget desde C2.
  ------------------ ---------------------------------- ------------------

**20. Decisiones Pendientes --- Requieren Respuesta del Equipo**

  ----------------------- -----------------------------------------------
  **Decision pendiente**  **Impacto**

  1\. Colores hex         Necesarios para el Constructor en C1.
  institucionales exactos 
  de Genus                

  2\. Tipografia exacta   Para que el widget sea coherente con la
  del sitio actual        identidad.

  3\. URL del             Para los links de conversion en C2.
  configurador actual     

  4\. El configurador     Critico para definir el alcance de C5.
  acepta parametros por   
  URL?                    

  5\. Quien administrara  Define el nivel de complejidad necesario.
  el panel admin?         

  6\. Hay politica de     Necesaria para mencionar en el widget.
  privacidad activa en el 
  sitio?                  

  7\. Existe un CRM       Define si en C6 se conecta o se crea.
  actualmente?            

  8\. Que considera Genus Para configurar los umbrales de deteccion de la
  un \'lead calificado\'? IA.
  ----------------------- -----------------------------------------------

**21. Prompt para el Constructor --- Fase C1**

+-----------------------------------------------------------------------+
| **📋 INSTRUCCIONES DE USO**                                           |
|                                                                       |
| El siguiente prompt esta listo para enviarse al Constructor (agente   |
| de codigo). Copiar y pegar completo. No agregar ni modificar nada sin |
| revision del Arquitecto.                                              |
+-----------------------------------------------------------------------+

**== PROMPT PARA EL CONSTRUCTOR --- CREAMY AI FASE C1 ==**

> Sos el Constructor del proyecto CREAMY AI de Laboratorio Genus. Tu
> tarea en esta fase (C1) es construir el WIDGET VISUAL de Creamy AI. No
> hay IA real en esta fase. Solo interfaz, animaciones y mock responses.
> REGLAS ABSOLUTAS: - No modificar ningun archivo existente del sitio. -
> No agregar estilos globales. Todo bajo el namespace .creamy- - No usar
> frameworks (React, Vue, etc). JavaScript Vanilla puro. - No usar
> librerıas externas. CSS y JS nativos unicamente. - El widget se activa
> con UNA sola linea HTML en cada pagina. - Debe funcionar en Chrome,
> Safari, Firefox y Edge. - Debe ser 100% responsive (desktop y mobile).
> ARCHIVOS A CREAR: - assets/creamy/creamy.css -
> assets/creamy/creamy.js - assets/creamy/creamy-config.json ESTRUCTURA
> DEL WIDGET: 1. BOTON FLOTANTE - fixed, bottom: 24px, right: 24px,
> z-index: 9999 - Circulo de 64px con imagen del personaje Creamy -
> Badge verde pequeno \'En linea\' en la esquina superior derecha -
> Animacion de entrada: slideInUp 400ms, con delay de 1500ms tras el
> load - Hover: scale(1.08) con transicion 200ms - Click: abre la
> ventana del chat 2. VENTANA DE CHAT - Desktop: 380px ancho x 560px
> alto - Mobile (\<768px): 100vw, 85vh, posicion inferior como sheet -
> Animacion apertura: slideInUp + fadeIn, 300ms - Header: logo texto
> \'Creamy AI\' + punto verde + \'En linea\' + botones minimizar y
> cerrar - Body: area de mensajes con scroll interno - Footer: input +
> boton enviar 3. MENSAJE INICIAL (mock, aparece automaticamente al
> abrir) \"Hola, soy Creamy --- el asistente de Laboratorio Genus. Puedo
> ayudarte a explorar nuestros servicios, resolver consultas tecnicas y
> orientarte en el desarrollo de tu producto cosmético. Por donde
> empezamos?\" 4. QUICK CHIPS (aparecen bajo el mensaje inicial) -
> Quiero desarrollar un producto - Consultar servicios y precios - Tengo
> una consulta tecnica - Hablar con un asesor 5. MOCK RESPONSES
> (respuestas estaticas para cada chip en C1) - \'Quiero desarrollar un
> producto\' -\> \'Excelente! En Laboratorio Genus desarrollamos
> productos cosméticos a medida. El MOQ minimo es de 500 unidades.
> Contame: para que zona es tu producto?\' + Chips: Cara \| Cuerpo \|
> Cabello \| Barba \| Otra - \'Consultar servicios y precios\' -\>
> \'Ofrecemos desarrollo cosmético, fabricacion tercerizada y servicio
> llave en mano (disponible desde 5000 unidades). Para una cotizacion
> personalizada, te puedo orientar o derivarte a nuestro equipo.\' +
> Chips de conversion (ver punto 6) - \'Tengo una consulta tecnica\' -\>
> \'Estoy entrenado para responder consultas sobre activos,
> compatibilidades, textura y procesos. Escribime tu consulta.\' -
> \'Hablar con un asesor\' -\> \'Claro! Te comunico con nuestro
> equipo.\' + Boton: Abrir WhatsApp (link: https://wa.me/5491124980861)
> 6. CHIPS DE CONVERSION Mostrar cuando hay intencion de compra o cuando
> el usuario lo solicita: - \[Crear mi producto\] -\> link al
> configurador (URL: pendiente de confirmar) - \[Solicitar cotizacion\]
> -\> link a pagina de cotizacion (URL: pendiente) - \[Hablar con un
> asesor\] -\> https://wa.me/5491124980861 7. TYPING INDICATOR - Tres
> puntos animados con efecto wave mientras \'procesa\' el mock
> response - Delay artificial de 800-1200ms antes de mostrar la
> respuesta - Hace que el widget se sienta vivo aunque sea mock 8.
> MINIMIZAR - El boton --- en el header minimiza la ventana de vuelta al
> boton flotante - El historial de mensajes se conserva en sesion (no se
> pierde al minimizar) COLORES (PROVISORIOS --- confirmar con el equipo
> de Genus): \--creamy-blue: #1E9BC0 \--creamy-dark: #0D5C73
> \--creamy-light: #D9F0F7 \--creamy-white: #FFFFFF
> \--creamy-gray-light: #F4F6F7 \--creamy-text: #2C3E50
> \--creamy-text-muted: #566573 \--creamy-green: #2ECC71
> \--creamy-shadow: rgba(0,0,0,0.12) TIPOGRAFIA: Usar la tipografia del
> sitio existente via herencia CSS (font-family: inherit) Fallback:
> system-ui, sans-serif INTEGRACION EN PAGINAS: Agregar al final del
> \<body\>, antes de \</body\>: \<link rel=\"stylesheet\"
> href=\"/assets/creamy/creamy.css\"\> \<script
> src=\"/assets/creamy/creamy.js\" defer\>\</script\> El widget se
> inicializa automaticamente al cargar. CRITERIOS DE ACEPTACION: \[ \]
> El widget aparece en todas las paginas sin errores de consola. \[ \]
> No rompe ningun estilo existente del sitio. \[ \] El chat se abre y se
> cierra correctamente. \[ \] Los quick chips responden con el mock
> correcto. \[ \] El typing indicator aparece antes de cada respuesta.
> \[ \] Es responsive en mobile (sheet inferior). \[ \] Se puede
> minimizar y el historial no se pierde. \[ \] Los botones de conversion
> redirigen correctamente. == FIN DEL PROMPT C1 ==

**CREAMY AI --- ARCHITECTURE v1.0**

Documento completado. Listo para pasar al Constructor.

Laboratorio Genus \| Confidencial \| 2025

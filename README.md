# Laboratorio Genus — Sitio Web + Creamy V2

## Creamy V2 — Asistente IA

Creamy V2 es el asistente inteligente de Laboratorio Genus. Utiliza **Google Gemini** como proveedor principal de IA.

### Proveedor IA

| Variable | Descripción |
|----------|-------------|
| `GEMINI_API_KEY` | **Obligatoria.** API key de [Google AI Studio](https://aistudio.google.com/apikey) |
| `CREAMY_GEMINI_MODEL` | Opcional. Default: `gemini-2.5-flash` |
| `CREAMY_AI_PROVIDER` | Opcional. `gemini` (default) o `openai` (legacy) |
| `OPENAI_API_KEY` | Solo si `CREAMY_AI_PROVIDER=openai` (legacy) |

### Obtener GEMINI_API_KEY

1. Ir a [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Crear un API key en Google AI Studio
3. Copiar la key (formato `AIza...`)

### Configurar en Vercel

1. Vercel Dashboard → `pagina-web-genus` → **Settings** → **Environment Variables**
2. Agregar `GEMINI_API_KEY` con tu key
3. Marcar **Preview** y **Production**
4. Redeploy

### Verificar que Creamy usa Gemini

```bash
# Health
curl https://tu-preview.vercel.app/api/creamy-v2/health

# Debug (probe real a Gemini)
curl https://tu-preview.vercel.app/api/creamy-v2/debug
```

Respuesta esperada en `/debug`:

```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "gemini_key_present": true,
  "can_connect": true,
  "status": "ok"
}
```

### Tests locales

```bash
npm install
GEMINI_API_KEY=AIza... npm run validate:creamy-gemini
npm run audit:creamy-ai
npm run test:creamy-v2-api
```

### Arquitectura IA

```
generateAIResponse()
 ├── GeminiProvider (default) — gemini-2.5-flash
 └── OpenAIProvider (legacy)
```

Knowledge base → solo contexto en system prompt. **No** genera respuestas hardcodeadas.

### Registro de conversaciones en Google Sheets

Creamy V2 guarda eventos en una planilla de Google.

**Pantalla inicial:** al abrir el chat por primera vez en la sesión, el usuario completa **Nombre** y **Apellido** (sin email, teléfono ni consentimiento).

**Eventos registrados:**

| tipo_evento | Cuándo |
|-------------|--------|
| `visitor_registered` | Al completar nombre y apellido |
| `user_message` | Cada mensaje del usuario |
| `assistant_message` | Cada respuesta de Creamy |
| `whatsapp_click` | Click en WhatsApp |
| `cotizacion_click` | Click en Cotización |
| `crear_producto_click` | Click en Crear producto |

**Columnas:** fecha, hora, session_id, nombre, apellido, página, tipo_evento, pregunta, respuesta, intención, producto, activos, proveedor IA, modelo, si usó IA, si usó fallback, user_agent.

#### Opción A — Apps Script Web App (recomendada)

1. Crear una planilla en Google Sheets.
2. **Extensiones → Apps Script** → pegar el código de `backend/creamy-v2/google-apps-script/sheets-webhook.gs`.
3. **Implementar → Nueva implementación → Aplicación web** (acceso: cualquiera).
4. En Vercel, agregar:

| Variable | Descripción |
|----------|-------------|
| `CREAMY_SHEETS_WEBHOOK_URL` | URL del Web App (`https://script.google.com/macros/s/.../exec`) |
| `CREAMY_SHEETS_WEBHOOK_SECRET` | Opcional. Secreto compartido con el script |

#### Opción B — Google Sheets API (service account)

| Variable | Descripción |
|----------|-------------|
| `CREAMY_SHEETS_SPREADSHEET_ID` | ID de la planilla |
| `CREAMY_SHEETS_CREDENTIALS` | JSON del service account (una línea) |
| `CREAMY_SHEETS_TAB` | Nombre de la pestaña (default: `Creamy Log`) |

Compartir la planilla con el `client_email` del service account (Editor).

Si no hay variables configuradas, el chat **sigue funcionando** sin guardar en Sheets.

```bash
npm run test:creamy-sheets
```

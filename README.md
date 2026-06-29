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

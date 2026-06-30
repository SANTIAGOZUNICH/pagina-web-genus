/**
 * Creamy V2 — Google Apps Script Web App (CRM)
 *
 * 1. Crear una planilla en Google Sheets
 * 2. Extensiones → Apps Script → pegar este archivo completo
 * 3. Ajustar SHEET_NAME y WEBHOOK_SECRET si hace falta
 * 4. Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquiera
 * 5. Copiar la URL del Web App a Vercel:
 *    CREAMY_SHEETS_WEBHOOK_URL=<url>
 * 6. (Opcional) Mismo valor en WEBHOOK_SECRET y CREAMY_SHEETS_WEBHOOK_SECRET
 */

const SHEET_NAME = 'Creamy Log';
const WEBHOOK_SECRET = ''; // opcional — mismo valor que CREAMY_SHEETS_WEBHOOK_SECRET en Vercel

const HEADERS = [
  'fecha',
  'hora',
  'session_id',
  'nombre',
  'apellido',
  'página',
  'url',
  'tipo_evento',
  'pregunta del usuario',
  'respuesta de Creamy',
  'intención detectada',
  'producto principal',
  'activo principal',
  'proveedor IA',
  'modelo',
  'tiempo conversación (seg)',
  'cantidad preguntas',
  'abrió WhatsApp',
  'abrió crear producto',
  'abrió cotización',
  'si usó IA',
  'si hubo error',
  'si usó fallback',
  'user_agent',
];

/**
 * GET — health check / verificación del Web App
 * Útil al probar la URL en el navegador o desde Vercel.
 */
function doGet(e) {
  try {
    const sheet = getLogSheet_();
    return json_({
      ok: true,
      service: 'creamy-v2-sheets-webhook',
      sheet: SHEET_NAME,
      columns: HEADERS.length,
      rows: Math.max(0, sheet.getLastRow() - 1),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return json_({
      ok: false,
      service: 'creamy-v2-sheets-webhook',
      error: String(err),
    });
  }
}

/**
 * POST — recibe eventos CRM desde Creamy V2 (Vercel)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'empty_body' });
    }

    if (WEBHOOK_SECRET) {
      const header = e.headers
        && (e.headers['X-Creamy-Secret'] || e.headers['x-creamy-secret']);
      if (header !== WEBHOOK_SECRET) {
        return json_({ ok: false, error: 'unauthorized' });
      }
    }

    let data;
    try {
      if (e.postData && e.postData.type === 'application/x-www-form-urlencoded' && e.parameter && e.parameter.payload) {
        data = JSON.parse(e.parameter.payload);
      } else if (e.postData && e.postData.contents) {
        data = JSON.parse(e.postData.contents);
      } else if (e.parameter && e.parameter.payload) {
        data = JSON.parse(e.parameter.payload);
      } else {
        return json_({ ok: false, error: 'empty_body' });
      }
    } catch (parseErr) {
      return json_({ ok: false, error: 'invalid_json', detail: String(parseErr) });
    }

    if (!data || typeof data !== 'object') {
      return json_({ ok: false, error: 'invalid_payload' });
    }

    const sheet = getLogSheet_();
    const row = buildRow_(data);
    sheet.appendRow(row);

    return json_({
      ok: true,
      appended: true,
      tipo_evento: data.tipo_evento || '',
      session_id: data.session_id || '',
    });
  } catch (err) {
    return json_({
      ok: false,
      error: 'server_error',
      detail: String(err),
    });
  }
}

/**
 * Obtiene o crea la hoja de log con encabezados CRM (24 columnas).
 */
function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    formatHeaderRow_(sheet);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    formatHeaderRow_(sheet);
    return sheet;
  }

  // Si la hoja existe pero le faltan columnas, actualizar fila 1
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (existing.length < HEADERS.length || existing[0] !== HEADERS[0]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    formatHeaderRow_(sheet);
  }

  return sheet;
}

/**
 * Construye la fila con las 24 columnas del CRM.
 */
function buildRow_(data) {
  return [
    data.fecha || '',
    data.hora || '',
    data.session_id || '',
    data.nombre || '',
    data.apellido || '',
    data['página'] || data.pagina || '',
    data.url || '',
    data.tipo_evento || '',
    data['pregunta del usuario'] || '',
    data['respuesta de Creamy'] || '',
    data['intención detectada'] || '',
    data['producto principal'] || '',
    data['activo principal'] || '',
    data['proveedor IA'] || '',
    data.modelo || '',
    data['tiempo conversación (seg)'] || '',
    data['cantidad preguntas'] || '',
    data['abrió WhatsApp'] || '',
    data['abrió crear producto'] || '',
    data['abrió cotización'] || '',
    data['si usó IA'] || '',
    data['si hubo error'] || '',
    data['si usó fallback'] || '',
    data.user_agent || '',
  ];
}

/**
 * Formato visual de la fila de encabezados.
 */
function formatHeaderRow_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#dff0f5');
  headerRange.setFontColor('#07172f');
  sheet.setColumnWidths(1, HEADERS.length, 140);
}

/**
 * Respuesta JSON estándar.
 */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

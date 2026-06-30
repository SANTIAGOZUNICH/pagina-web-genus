/**
 * Creamy V2 — Google Apps Script Web App
 *
 * 1. Crear una planilla en Google Sheets
 * 2. Extensions → Apps Script → pegar este código
 * 3. Ajustar SHEET_NAME si hace falta
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copiar la URL del Web App a Vercel:
 *    CREAMY_SHEETS_WEBHOOK_URL=<url>
 * 6. (Opcional) CREAMY_SHEETS_WEBHOOK_SECRET en Vercel y WEBHOOK_SECRET aquí
 */

const SHEET_NAME = 'Creamy Log';
const WEBHOOK_SECRET = ''; // mismo valor que CREAMY_SHEETS_WEBHOOK_SECRET en Vercel

const HEADERS = [
  'fecha', 'hora', 'session_id', 'nombre', 'página',
  'pregunta del usuario', 'respuesta de Creamy', 'intención detectada',
  'producto mencionado', 'activos mencionados', 'proveedor IA', 'modelo',
  'si usó IA', 'si usó fallback', 'evento CTA',
];

function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    if (WEBHOOK_SECRET) {
      const secret = (e.parameter && e.parameter.secret)
        || (e.postData && e.postData.type === 'application/json'
          ? JSON.parse(e.postData.contents)['x-creamy-secret']
          : null);
      const header = e && e.headers && (e.headers['X-Creamy-Secret'] || e.headers['x-creamy-secret']);
      if (secret !== WEBHOOK_SECRET && header !== WEBHOOK_SECRET) {
        return json_({ ok: false, error: 'unauthorized' });
      }
    }

    const data = JSON.parse(e.postData.contents);
    const sheet = getLogSheet_();
    sheet.appendRow([
      data.fecha || '',
      data.hora || '',
      data.session_id || '',
      data.nombre || '',
      data['página'] || data.pagina || '',
      data['pregunta del usuario'] || '',
      data['respuesta de Creamy'] || '',
      data['intención detectada'] || '',
      data['producto mencionado'] || '',
      data['activos mencionados'] || '',
      data['proveedor IA'] || '',
      data.modelo || '',
      data['si usó IA'] || '',
      data['si usó fallback'] || '',
      data['evento CTA'] || '',
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

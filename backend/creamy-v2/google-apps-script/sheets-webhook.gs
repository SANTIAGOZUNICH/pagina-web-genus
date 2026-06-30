/**
 * Creamy V2 — Google Apps Script Web App
 * Pegar en Extensions → Apps Script de la planilla.
 */

const SHEET_NAME = 'Creamy Log';
const WEBHOOK_SECRET = '';

const HEADERS = [
  'fecha', 'hora', 'session_id', 'nombre', 'apellido', 'página', 'tipo_evento',
  'pregunta del usuario', 'respuesta de Creamy', 'intención detectada',
  'producto mencionado', 'activos mencionados', 'proveedor IA', 'modelo',
  'si usó IA', 'si usó fallback', 'user_agent',
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
      const header = e && e.headers && (e.headers['X-Creamy-Secret'] || e.headers['x-creamy-secret']);
      if (header !== WEBHOOK_SECRET) {
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
      data.apellido || '',
      data['página'] || data.pagina || '',
      data.tipo_evento || '',
      data['pregunta del usuario'] || '',
      data['respuesta de Creamy'] || '',
      data['intención detectada'] || '',
      data['producto mencionado'] || '',
      data['activos mencionados'] || '',
      data['proveedor IA'] || '',
      data.modelo || '',
      data['si usó IA'] || '',
      data['si usó fallback'] || '',
      data.user_agent || '',
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

/**
 * Creamy V2 — Google Apps Script Web App (CRM)
 */

const SHEET_NAME = 'Creamy Log';
const WEBHOOK_SECRET = '';

const HEADERS = [
  'fecha', 'hora', 'session_id', 'nombre', 'apellido', 'página', 'url', 'tipo_evento',
  'pregunta del usuario', 'respuesta de Creamy', 'intención detectada',
  'producto principal', 'activo principal', 'proveedor IA', 'modelo',
  'tiempo conversación (seg)', 'cantidad preguntas',
  'abrió WhatsApp', 'abrió crear producto', 'abrió cotización',
  'si usó IA', 'si hubo error', 'si usó fallback', 'user_agent',
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

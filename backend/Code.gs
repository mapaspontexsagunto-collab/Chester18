/**
 * LA SALA CHESTER — backend de reservas
 * ---------------------------------------------------------
 * Guarda las reservas en una hoja de Google Sheets y expone
 * una API muy simple (GET para listar, POST para crear/actualizar)
 * que la web llama directamente por fetch().
 *
 * Cuando llega una reserva nueva, te manda un email de aviso.
 * Tú confirmas o rechazas desde la propia web (pestaña
 * "Acceso propietario") o directamente cambiando la columna
 * "status" en la hoja de cálculo.
 *
 * INSTALACIÓN (10 minutos, gratis):
 * 1. Crea una hoja de Google Sheets nueva.
 * 2. En esa hoja, en la primera fila, pon estas cabeceras
 *    (columnas A a K):
 *    id | date | turno | nombre | telefono | email | tipo | personas | mensaje | status | createdAt
 * 3. Extensiones → Apps Script. Borra el contenido de Code.gs
 *    que aparece por defecto y pega TODO este archivo.
 * 4. Cambia OWNER_EMAIL más abajo por tu email real.
 * 5. Arriba a la derecha: Implementar → Nueva implementación.
 *    Tipo: "Aplicación web". Ejecutar como: "Yo". Quién tiene
 *    acceso: "Cualquier usuario". Implementar.
 * 6. Copia la URL que te da (termina en /exec).
 * 7. Pégala en script.js, en CONFIG.BACKEND_URL, en la web.
 * 8. Listo: la web ya lee y escribe en tu Google Sheet en tiempo real.
 */

const SHEET_NAME = "Reservas";
const OWNER_EMAIL = "salachestervalencia@gmail.com";
const CODE_VERSION = "v3-2026-07-23-fix-invaliddate"; // cámbialo cuando vuelvas a editar, así sabrás si tu URL está al día

function getSheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

const COLUMNS = ["id","date","turno","nombre","telefono","email","tipo","personas","mensaje","status","createdAt"];

// Google Sheets convierte automáticamente el texto "2026-07-25" en un
// objeto Date real al guardarlo. Al leerlo de vuelta, getValues() nos
// devuelve ese objeto Date, no el texto original — por eso la web veía
// "Invalid Date". Esta función lo vuelve a pasar a texto "AAAA-MM-DD".
function asPlainValue(v){
  if (Object.prototype.toString.call(v) === "[object Date]"){
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return v;
}

function rowToObject(row){
  const obj = {};
  COLUMNS.forEach((c, i) => obj[c] = asPlainValue(row[i]));
  return obj;
}

function doGet(e){
  const action = e.parameter.action;

  // Diagnóstico: abre TU_URL?action=ping en el navegador para comprobar,
  // sin ambigüedad, qué versión del código está sirviendo esa URL de verdad.
  if (action === "ping"){
    const sheet = getSheet();
    return jsonOut({
      ok: true,
      version: CODE_VERSION,
      hora: new Date().toISOString(),
      hoja: SHEET_NAME,
      filasGuardadas: Math.max(sheet.getDataRange().getNumRows() - 1, 0),
    });
  }

  if (action === "list"){
    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();
    // Solo saltamos la primera fila si de verdad es una cabecera (empieza
    // por "id"). Así, si la hoja no tiene cabecera, no perdemos ninguna fila.
    const rows = values.filter((r, i) => r[0] && !(i === 0 && r[0] === "id"));
    const data = rows.map(rowToObject);
    return jsonOut(data);
  }

  return jsonOut({ ok: true, version: CODE_VERSION, msg: "API de reservas de La Sala Chester" });
}

function doPost(e){
  const body = JSON.parse(e.postData.contents);
  const sheet = getSheet();

  if (body.action === "create"){
    const id = Utilities.getUuid();
    const createdAt = new Date().toISOString();
    const row = [
      id, body.date, body.turno, body.nombre, body.telefono, body.email || "",
      body.tipo || "", body.personas || "", body.mensaje || "", "pendiente", createdAt,
    ];
    sheet.appendRow(row);

    // Si el email falla, NO debe tirar abajo la reserva: la fila ya está
    // guardada. Lo capturamos aparte y lo dejamos registrado en Ejecuciones.
    let emailError = null;
    try {
      notifyOwnerNewRequest(body);
    } catch (err) {
      emailError = String(err);
      console.error("Fallo al enviar el email de aviso: " + emailError);
    }

    return jsonOut({ ok: true, id, emailError });
  }

  if (body.action === "update"){
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++){
      if (values[i][0] === body.id){
        if (body.status === "rechazada"){
          sheet.deleteRow(i + 1);
        } else {
          sheet.getRange(i + 1, 10).setValue(body.status); // columna "status" = J
        }
        return jsonOut({ ok: true });
      }
    }
    return jsonOut({ ok: false, error: "No encontrado" });
  }

  return jsonOut({ ok: false, error: "Acción no reconocida" });
}

function notifyOwnerNewRequest(body){
  const subject = `Nueva solicitud · ${body.date} (${body.turno}) · La Sala Chester`;
  const message = `Nueva solicitud de reserva, pendiente de confirmar:\n\n`
    + `Fecha: ${body.date}\nFranja: ${body.turno}\nNombre: ${body.nombre}\n`
    + `Teléfono: ${body.telefono}\nEmail: ${body.email || "-"}\n`
    + `Tipo de evento: ${body.tipo || "-"}\nPersonas: ${body.personas || "-"}\n`
    + `Mensaje: ${body.mensaje || "-"}\n\n`
    + `Confírmala o recházala desde la web (Acceso propietario) o desde la hoja de cálculo.`;
  MailApp.sendEmail(OWNER_EMAIL, subject, message);

  // Aviso opcional gratuito por WhatsApp usando CallMeBot (servicio de terceros,
  // solo para notificarte a TI mismo, no para chatear con clientes):
  // 1. Añade el número de CallMeBot a tus contactos y mándale el mensaje que
  //    te piden en https://www.callmebot.com/blog/free-api-whatsapp-messages/
  // 2. Te dará tu "apikey" y tu número.
  // 3. Descomenta estas líneas y rellena los datos:
  //
  // const phone = "34XXXXXXXXX";
  // const apikey = "TU_APIKEY";
  // const text = encodeURIComponent(`Nueva solicitud ${body.date} (${body.turno}) de ${body.nombre}`);
  // UrlFetchApp.fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`);
}

/**
 * PRUEBA AISLADA — no la usa la web, es solo para ti.
 * Ábrela en el editor de Apps Script, elige "testEmail" en el desplegable
 * de funciones (arriba, al lado de "Depurar") y pulsa ▶ Ejecutar.
 * Si te llega el correo, MailApp funciona bien y el problema está en el
 * despliegue (la URL) o en la implementación web. Si NO te llega,
 * mira el mensaje de error que aparece abajo, en "Registro de ejecución".
 */
function testEmail(){
  MailApp.sendEmail(OWNER_EMAIL, "Prueba — La Sala Chester", "Si lees esto, el envío de emails funciona correctamente.");
  Logger.log("Email de prueba enviado a " + OWNER_EMAIL);
}

function jsonOut(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

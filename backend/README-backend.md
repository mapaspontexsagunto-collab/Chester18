# Conectar las reservas a un backend real (gratis, 10–15 min)

Ahora mismo la web funciona en **modo demo**: el calendario y las reservas
viven en la memoria del navegador (`RESERVATIONS` en `script.js`). Sirve
perfectamente para probar cómo se ve y se siente el flujo, pero cada
persona que abre la web ve sus propios datos, y se borran al recargar.

Para tener un calendario real —el mismo para todo el mundo, que avisa por
email cuando llega una solicitud y que tú confirmas a mano— usamos
**Google Sheets + Google Apps Script** como backend gratuito. No hace
falta contratar servidor ni base de datos.

## Paso a paso

1. **Crea una hoja de cálculo nueva** en [sheets.google.com](https://sheets.google.com).
2. En la fila 1, columnas A→K, escribe estas cabeceras exactamente así:
   ```
   id | date | turno | nombre | telefono | email | tipo | personas | mensaje | status | createdAt
   ```
3. Ve a **Extensiones → Apps Script**.
4. Borra lo que haya en `Code.gs` y pega el contenido completo del archivo
   [`Code.gs`](./Code.gs) de esta misma carpeta.
5. Cambia la línea `OWNER_EMAIL` por tu email real (donde quieres recibir
   el aviso de cada solicitud nueva).
6. Arriba a la derecha, botón **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Pulsa **Implementar** y autoriza los permisos (te va a avisar de que
     es un script "no verificado" — es normal porque es tuyo, dale a
     "Avanzado" → "Ir a [nombre del proyecto]").
7. Copia la URL que te da, termina en `/exec`.
8. Abre `script.js` en la web y pega esa URL en:
   ```js
   const CONFIG = {
     BACKEND_URL: "PEGA_AQUÍ_TU_URL",
     ...
   ```
9. Sube los archivos de nuevo a donde tengas la web (o simplemente
   recarga si la tienes en local). A partir de ahí, cada solicitud se
   guarda en tu Google Sheet, te llega un email, y cuando confirmas o
   rechazas desde el panel "Acceso propietario" de la web, se actualiza
   la hoja al momento.

## Cómo saber si tu URL está ejecutando el código actualizado (sin dudas)

Cada vez que edites `Code.gs`, sube el número de `CODE_VERSION` (por
ejemplo de `"v3-..."` a `"v4-..."`). Luego:

1. Guarda los cambios.
2. **Implementar → Administrar implementaciones** (NO "Nueva
   implementación" — eso crea una URL distinta y es la causa más
   habitual de que "los cambios no se noten").
3. Pulsa el ✏️ (lápiz) de la implementación que ya estás usando (la que
   tiene la misma URL que tienes pegada en `script.js`).
4. En "Versión", elige **Nueva versión** → **Implementar**. La URL no
   cambia, solo el código que hay detrás.
5. Abre en una pestaña nueva tu URL añadiendo `?action=ping` al final,
   así: `https://script.google.com/macros/s/TU_ID/exec?action=ping`
6. Deberías ver algo como:
   ```json
   {"ok":true,"version":"v4-...","hora":"...","hoja":"Reservas","filasGuardadas":2}
   ```
   Si el `"version"` que ves ahí **no** coincide con el que acabas de
   poner en el código, esa URL sigue sirviendo una versión antigua —
   busca si tienes más de una implementación en "Administrar
   implementaciones" y actualiza la que realmente usa tu web (la que
   coincide con `CONFIG.BACKEND_URL` en `script.js`).

## Sobre la pestaña "Hoja 1" vacía

El código guarda todo en una pestaña llamada **"Reservas"** (la crea él
solo si no existe). Si tu Google Sheet tiene además una pestaña "Hoja 1"
vacía con las cabeceras que añadiste a mano, es normal que esté vacía:
el código nunca escribe ahí. Los datos reales están en la pestaña
"Reservas". Puedes borrar "Hoja 1" sin problema, o dejarla — no afecta.


Google Apps Script no puede mandar WhatsApp "de fábrica". Hay dos caminos:

- **CallMeBot** (gratis, para avisarte solo a ti): sigues las
  instrucciones de <https://www.callmebot.com/blog/free-api-whatsapp-messages/>,
  añades tu apikey en `Code.gs` (está comentado, listo para descomentar)
  y recibes el aviso en tu propio WhatsApp. Es un servicio de terceros
  no oficial: válido para un aviso personal, no para volumen alto.
- **WhatsApp Business API / Twilio** (de pago, pero fiable y con soporte):
  recomendable si el negocio crece y quieres además confirmar
  automáticamente al cliente por WhatsApp, no solo avisarte a ti.

Con solo el email ya tienes el flujo completo que pediste: la reserva
entra como "pendiente", a ti te llega el aviso, y confirmas tú.

## Alternativas si no quieres tocar código

Si en algún momento prefieres no mantener este script, herramientas como
**Calendly**, **SimplyBook.me** o el plugin **Amelia** (WordPress) hacen
algo parecido de forma más "enlatada", con planes gratuitos limitados,
a cambio de menos control sobre el diseño y las franjas mañana/tarde/día
tal como las tienes aquí.

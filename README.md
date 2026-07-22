# La Sala Chester — web + sistema de reservas

Web para el alquiler de La Sala Chester (Carrer de les Arts i dels Oficis,
18 · Albors, Valencia), con calendario de disponibilidad y flujo de
reservas que siempre pasan por tu confirmación manual.

## Qué hay en esta carpeta

```
index.html              → la web (una sola página con todas las secciones)
style.css                → diseño (paleta, tipografías, componentes)
script.js                → calendario, formulario de reserva y panel de propietario
assets/                  → fotos reales de la sala + logo, ya optimizadas para web
backend/Code.gs          → backend real y gratuito (Google Sheets + Apps Script)
backend/README-backend.md → cómo conectarlo, paso a paso
```

## Cómo verla ahora mismo

Abre `index.html` con doble clic, o desde un editor con "Live Server".
Todo funciona ya: navegación, galería, tarifas, calendario y formulario.
El calendario está en **modo demo** (los datos viven en el navegador y
se reinician al recargar) — es intencionado, para que puedas probar todo
el flujo antes de conectar nada. Ver más abajo cómo hacerlo real.

## Las tarifas que propongo (y por qué)

No conocía tarifas publicadas de tu zona exacta, así que comparé tu sala
(80&nbsp;m², barrio de Albors) con negocios equivalentes en Valencia:

- **Locales de barrio / periferia de tamaño similar** (p. ej. un
  multiespacio de 100&nbsp;m² en Paiporta): de 70&nbsp;€ la mañana entre
  semana a 190&nbsp;€ el día completo en fin de semana.
- **Salas más céntricas o de mayor tamaño** (el tipo de local de tu tabla
  de referencia, con tarifas de 110–250&nbsp;€): apuntan más alto, pero
  suelen estar en zonas más caras o con más superficie/aforo.
- **Salas de reuniones sueltas en coworkings de Valencia**: desde
  15–20&nbsp;€/hora, como referencia mínima para el uso tipo "coworking".

Con esos tres puntos, propuse una tarifa a medio camino, algo por debajo
de tu tabla de referencia (porque tu sala es algo más pequeña y está en
un barrio residencial, no en el centro) pero por encima de las salas de
periferia más básicas (porque la tuya está muy bien acabada y tiene seis
ambientes distintos, no una sala diáfana sola). Están en la sección
"Tarifas" del `index.html` — puedes cambiarlas ahí mismo, son solo texto
en una tabla HTML.

## El calendario y las reservas: cómo funciona el flujo que pediste

1. Alguien elige un día y una franja (mañana / tarde / día completo) y
   manda sus datos.
2. La solicitud entra automáticamente como **"reservado sin confirmar"**
   (punto ámbar en el calendario) — nadie puede reservar dos veces la
   misma franja mientras esté así, para evitar choques.
3. Tú recibes el aviso (por email en cuanto conectes el backend, ver
   abajo) y decides: **confirmar** (pasa a rojo, "reservado y
   confirmado") o **rechazar** (libera la franja otra vez).
4. Todo esto se hace desde el botón "Acceso propietario" que hay junto
   al calendario, con un PIN (de demo: `1234`, cámbialo en `script.js`).

Ahora mismo esto ya funciona de verdad, pero solo en tu navegador. Para
que sea el **mismo calendario para todo el mundo** y te lleguen avisos
de verdad, sigue la guía de `backend/README-backend.md`: en 10–15
minutos conectas un Google Sheet gratuito que hace de base de datos, sin
tocar el resto del código.

## Publicar la web (que tenga una URL real)

Cualquiera de estas opciones funciona con estos mismos archivos, sin
cambiar nada:

- **Netlify / Vercel** (gratis): arrastras la carpeta entera a
  netlify.com/drop y ya tienes URL pública en segundos.
- **GitHub Pages** (gratis): subes la carpeta a un repositorio y activas
  Pages.
- **Hosting normal por FTP**: subes los archivos a la carpeta pública de
  tu hosting tal cual.

## Qué personalizar antes de publicarla

- `assets/`: si tienes fotos con mejor luz o quieres cambiar el orden de
  la galería, sustituye los archivos o reordena los bloques `.postcard`
  en `index.html`.
- Teléfono y WhatsApp: están centralizados en `CONFIG.OWNER_WHATSAPP`
  dentro de `script.js`, y en el `<footer>` de `index.html`.
- Email de contacto: en el `<footer>`.
- Textos y tarifas: directamente en `index.html`, son texto plano.

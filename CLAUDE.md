# HK Control de Plagas — notas para Claude Code

Sistema web para un negocio de control de plagas en **San Luis Potosí** (lada 444). Lo usa un encargado no técnico todos los días: registrar clientes, agendar servicios, mandar seguimientos por WhatsApp y ver cómo va el negocio.

## Quién hace qué
- **Frontend: Leonardo.** Todo lo visual (`index.html`, `css/`, `js/` excepto la capa de datos, `img/`, `fonts/`).
- **Backend: Jaziel.** Servidor, base de datos y autenticación.
- **WhatsApp se queda manual** (el front abre `wa.me` con el texto y la persona presiona enviar). No integrar la API de WhatsApp: por ahora no se va a usar.
- **La frontera es [js/store.js](js/store.js).** Las pantallas solo hablan con `Store`. Para conectar el servidor se cambia el interior de `store.js` sin cambiar su interfaz pública. Cualquier cambio de esa interfaz se acuerda con Leonardo.

**Si estás ayudando a Jaziel, empieza por [docs/BACKEND.md](docs/BACKEND.md)**: qué está hecho, el modelo de datos, las reglas de negocio, la propuesta de API y la lista de pendientes.

## Cómo está hecho el front
- HTML + CSS + JavaScript puro. Sin build, sin npm, sin framework. Se abre con doble clic en `index.html`.
- Cada archivo de `js/` es un módulo global (`U`, `Store`, `UI`, `Charts`, `C`, `Forms`, `Views`) declarado con `const`; el orden de los `<script>` en `index.html` importa.
- Rutas por hash (`#/inicio`, `#/cliente/<id>`…). Clics delegados con `data-action` en [js/app.js](js/app.js).
- Los datos viven hoy en `localStorage` (clave `controlPlagas.v1`). Las preferencias de pantalla (`controlPlagas.pref.*`) son de cada navegador y **no** van al servidor.
- Los archivos llevan versión en `index.html` (`?v=…`). Si cambias CSS o JS, súbela para que los navegadores no usen la copia vieja.

## Reglas que no hay que romper
- Textos de la interfaz en español sencillo, de usted, sin emojis.
- Fechas `AAAA-MM-DD` en hora local (America/Mexico_City), horas `HH:MM`, dinero en pesos enteros, teléfono guardado solo como 10 dígitos.
- Un mensaje de seguimiento **no** se marca como enviado hasta que la persona confirma que salió.
- No guardar llaves ni tokens en el front: todo lo secreto vive en el servidor.

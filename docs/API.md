# Contrato de la API — propuesta para acordar

**De:** Jaziel (backend) · **Para:** Leonardo (frontend) · **Estado:** acordado el 23 de noviembre de 2026; queda pendiente solo el punto de la sección 11

Parte de la propuesta de [BACKEND.md](BACKEND.md), sección 4, y la ajusta con lo que encontré al revisar cada llamada que las pantallas hacen a `Store`. La idea sigue igual: **`Store` mantiene sus mismas funciones síncronas**, guarda todo en memoria y manda los cambios al servidor por detrás. Las pantallas no cambian.

Las preguntas de la sección 9 ya tienen respuesta de Leonardo (sección 10), y el resto del documento ya está actualizado con esas respuestas. La sección 11 registra lo que se ajustó después y el único punto que falta confirmar.

---

## 1. Resumen de cambios respecto a BACKEND.md

| # | Problema encontrado | Propuesta |
|---|---|---|
| 1 | Los `id` se crean en el navegador (`U.uid()`) y la pantalla los usa en cuanto se crean. Si el servidor generara otro `id`, la pantalla quedaría apuntando a uno que no existe. | **El front crea el `id`** (UUID con `crypto.randomUUID()`) y el servidor lo acepta tal cual. Repetir la misma creación con el mismo `id` no duplica nada (sección 3.3). |
| 2 | El *Deshacer* de “Ya se hizo” manda `{ estado, fecha, seguimiento }` con `updateServicio`, pero el `PATCH` propuesto no aceptaba `seguimiento`. | `PATCH /api/servicios/:id` acepta también `seguimiento`. Además, endpoint específico para deshacer (sección 5.2). |
| 3 | `setMensajeSeguimiento` y las plantillas de Ajustes se guardan **con cada tecla**: serían decenas de peticiones por mensaje. | `Store` sigue guardando en memoria con cada tecla, pero **manda al servidor 800 ms después de la última tecla** (y al salir de la pantalla). Las pantallas no cambian. |
| 4 | Registrar un cliente hace 3 escrituras seguidas (cliente → servicio → comentario). Si se mandan en paralelo, el servicio puede llegar antes que el cliente. | `Store` manda las escrituras **en orden, una tras otra** (cola). No hace falta endpoint especial. |
| 5 | “Volver a cargar ejemplos” y “Borrar todos los clientes” no tenían endpoint, y la demo podría pisar datos reales. | Con servidor, **la demo solo existe sin conexión al servidor** (modo local). “Borrar todo” solo para administrador, con endpoint propio (sección 5.6). |
| 6 | El front calcula “hoy” con el reloj del dispositivo; el servidor podría estar en otra zona. | El servidor calcula todas las fechas en **`America/Mexico_City`**. Las fechas que pone el servidor (`fechaRegistro`, `fechaBloqueo`, `fechaSeguimientoEnviado`) **mandan** sobre las del front. |
| 7 | La regla “no guardar tokens en el front”. | Sesión con **cookie `HttpOnly`**; el JavaScript nunca ve un token (sección 4). |

---

## 2. Modelo de datos

Igual que [BACKEND.md §2](BACKEND.md#2-modelo-de-datos-actual), con estos agregados del servidor:

```text
Todos los registros (Cliente, Servicio, Comentario) llevan además:
  version: number          // empieza en 1 y sube con cada cambio (sección 3.4)
  actualizado: string      // ISO 8601, lo pone el servidor

Usuario (nuevo, solo servidor)
  id: string
  nombre: string
  usuario: string          // para iniciar sesión
  rol: 'admin' | 'tecnico'
  activo: boolean
```

- `id`: texto, no número. Así se pueden importar los respaldos actuales (`c01`, `s1`, `mwp74kw533hr7`…) sin cambiarlos.
- Al borrar un cliente se borran sus servicios y comentarios (en cascada).
- Validaciones del servidor (las mismas que el front):

| Campo | Regla |
|---|---|
| `telefono` | 10 dígitos (si llega `52` + 10, se guardan los 10 últimos) |
| `nombre`, `apellido`, `direccion` | obligatorios, sin espacios al inicio ni al final |
| `fecha` | `AAAA-MM-DD` válida |
| `hora` | `HH:MM`; obligatoria si `estado = 'pendiente'` |
| `precio` | entero ≥ 0 o `null` |
| `seguimientoDias` | 15, 20 o 30 |
| `tipo` | uno de la lista de BACKEND.md |
| servicio nuevo | no se puede crear para un cliente bloqueado |

---

## 3. Reglas generales

### 3.1 Formato
- JSON en UTF-8. Fechas y horas como en BACKEND.md. Dinero en pesos enteros.
- Prefijo: `/api`.

### 3.2 Errores
```json
{ "error": "No se pudo guardar porque el cliente está bloqueado." }
```
El texto es para el encargado: español sencillo, de usted, sin términos técnicos. Códigos:

| Código | Cuándo |
|---|---|
| 400 | dato inválido (el `error` dice cuál) |
| 401 | no ha iniciado sesión o la sesión venció |
| 403 | su usuario no tiene permiso para eso |
| 404 | ya no existe (otra persona lo borró) |
| 409 | otra persona lo cambió primero (sección 3.4) |
| 500 | error del servidor |

### 3.3 Creación sin duplicados
Un `POST` con un `id` que ya existe y **los mismos datos** responde `200` con el registro (no lo duplica). Así, si se cae la conexión y `Store` reintenta, no aparecen clientes repetidos. Si el `id` existe con datos distintos, responde `409`.

### 3.4 Dos personas editando a la vez
Cada `PATCH` manda la `version` que tenía el front. Si en el servidor ya es otra, responde `409` con el registro actual:

```json
{ "error": "Otra persona cambió este servicio. Se cargó la versión más reciente.", "actual": { ... } }
```
`Store` reemplaza su copia con `actual` y la pantalla se redibuja. Para un negocio de 1–3 usuarios es suficiente; no hace falta algo más complejo.

---

## 4. Inicio de sesión

```text
POST   /api/sesion    { usuario, contrasena }   → { usuario: { id, nombre, rol } }   + cookie
GET    /api/sesion                              → { usuario } | 401
DELETE /api/sesion                              (cerrar sesión)
```

- Cookie `HttpOnly; Secure; SameSite=Lax`, válida 30 días. El JavaScript no la puede leer, así que no hay tokens en el front.
- **El front y la API van en el mismo origen** (acordado, sección 10): el subdominio gratuito del hospedaje, con la API bajo `/api`. Así no hace falta CORS y la cookie no es de terceros (Safari en iPhone las bloquea). GitHub Pages ya no se usa.
- **Si se usa Firebase Hosting:** al pasar la petición a Cloud Functions, Hosting **elimina todas las cookies excepto una llamada `__session`**. La cookie de sesión debe llamarse exactamente `__session`; con otro nombre la función nunca la recibe y el inicio de sesión falla siempre. En los demás hospedajes el nombre es libre.
- Contraseñas guardadas con hash (argon2 o bcrypt). Bloqueo temporal tras 5 intentos fallidos.

### Permisos por rol

| Acción | admin | técnico |
|---|:-:|:-:|
| Ver clientes, agenda y seguimiento | ✓ | ✓ |
| Registrar clientes y servicios, comentar | ✓ | ✓ |
| Marcar “Ya se hizo”, enviar seguimiento | ✓ | ✓ |
| Ver el precio de servicios pendientes | ✓ | ✓ |
| Ver el precio de servicios realizados | ✓ | — |
| Poner precio al registrar un servicio | ✓ | ✓ *(por confirmar, sección 11)* |
| Cambiar el precio después | ✓ | — |
| Bloquear / desbloquear | ✓ | — |
| Eliminar cliente o comentario | ✓ | — |
| Ver “Negocio” (dinero) | ✓ | — |
| Ajustes, respaldo, borrar todo | ✓ | — |

El servidor **siempre** revisa el permiso, aunque el front esconda el botón. Para que el front sepa qué esconder: `Store.usuario()` devuelve `{ nombre, rol }` (función nueva, sección 8).

> Para la primera versión basta con un usuario `admin`. Los técnicos pueden venir después sin cambiar el contrato.

---

## 5. Endpoints

### 5.1 Carga inicial
```text
GET /api/datos   → { clientes, servicios, comentarios, ajustes, hoy: 'AAAA-MM-DD', usuario }
```
- `hoy` es la fecha en `America/Mexico_City`. Si no coincide con la del dispositivo, el front muestra un aviso (“La fecha de su equipo no es correcta”).
- Para un técnico, `precio` llega como `null` **solo en servicios `realizado`**. En los `pendiente` llega el precio, porque él es quien cobra. Lo mismo aplica a **todas** las respuestas, no solo a la carga inicial: si un técnico marca “Ya se hizo”, el servicio que recibe de vuelta ya trae `precio: null`.

### 5.2 Servicios

| Método y ruta | Cuerpo | Respuesta | Llamada en `Store` |
|---|---|---|---|
| `POST /api/servicios` | Servicio completo con `id` | Servicio | `addServicio` |
| `PATCH /api/servicios/:id` | `version` + cualquiera de: `fecha, hora, tipo, precio, estado, seguimientoDias, seguimiento, mensajeSeguimiento` | Servicio | `updateServicio`, `setMensajeSeguimiento` |
| `POST /api/servicios/:id/realizado` | `{ version }` | `{ servicio, antes }` | `marcarRealizado` |
| `POST /api/servicios/:id/deshacer-realizado` | `{ antes }` | Servicio | `deshacerRealizado` (nueva) |
| `POST /api/servicios/:id/seguimiento` | `{ estado: 'enviado' \| 'omitido' \| 'pendiente' }` | Servicio | `marcarSeguimiento` |

Reglas que aplica el servidor:
- `realizado`: si la fecha agendada es posterior a hoy, la fecha pasa a ser hoy; `seguimiento` vuelve a `pendiente`. Devuelve `antes = { estado, fecha, seguimiento }`.
- `deshacer-realizado`: solo funciona durante **15 segundos** después de marcarlo (el front ofrece 8; el margen cubre una conexión lenta). Después responde `409`.
- `seguimiento: 'enviado'` pone `fechaSeguimientoEnviado` = hoy (México). `pendiente` u `omitido` lo ponen en `null`.
- `mensajeSeguimiento` igual al texto de la plantilla → se guarda `null`.
- Técnico que manda `precio` en un `PATCH` → `403` (“Solo el administrador puede cambiar el precio.”).

> **Acordado (sección 10):** el *Deshacer* usará la función nueva `Store.deshacerRealizado(id, antes)`, que llama a `deshacer-realizado`. Leonardo cambia la llamada en `js/app.js`, que hoy usa `Store.updateServicio(s.id, antes)`.

### 5.3 Clientes

| Método y ruta | Cuerpo | Respuesta | Llamada en `Store` | Rol |
|---|---|---|---|---|
| `POST /api/clientes` | Cliente con `id` | Cliente | `addCliente` | todos |
| `PATCH /api/clientes/:id` | `version` + `nombre, apellido, telefono, direccion` | Cliente | `updateCliente` | todos |
| `DELETE /api/clientes/:id` | — | `204` | `deleteCliente` | admin |
| `POST /api/clientes/:id/bloqueo` | `{ motivo }` | `{ cliente, serviciosCancelados: [id], comentario }` | `bloquear` | admin |
| `DELETE /api/clientes/:id/bloqueo` | — | `{ cliente, comentario }` | `desbloquear` | admin |
| `GET /api/clientes/por-telefono/:tel` | — | `{ cliente } \| 404` | `buscarPorTelefono` (opcional) | todos |

- El `PATCH` **no** acepta `bloqueado`, `motivoBloqueo` ni `fechaBloqueo`: eso solo cambia con los endpoints de bloqueo, para que siempre queden el comentario y la cancelación.
- Los textos de los comentarios automáticos son exactamente `Cliente bloqueado. Motivo: …` y `Cliente desbloqueado.`
- Con los datos descargados al inicio, `buscarPorTelefono` puede seguir trabajando en memoria. El endpoint queda por si después se descarga solo una parte.

### 5.4 Comentarios

| Método y ruta | Cuerpo | Respuesta | Rol |
|---|---|---|---|
| `POST /api/comentarios` | Comentario con `id` | Comentario | todos |
| `DELETE /api/comentarios/:id` | — | `204` | admin |

La `fecha` del comentario la pone el servidor.

### 5.5 Ajustes

```text
GET   /api/ajustes                  → Ajustes
PATCH /api/ajustes   { campo: valor }  → Ajustes        (solo admin)
```
Las plantillas se mandan 800 ms después de la última tecla (igual que el mensaje personalizado).

### 5.6 Respaldo y borrado total (solo admin)

```text
GET    /api/respaldo                 → mismo JSON que “Descargar respaldo” (incluye app, version, exportado)
POST   /api/respaldo   { ...JSON }   → { clientes: n, servicios: n, comentarios: n }   (reemplaza todo)
DELETE /api/datos      { confirmar: 'BORRAR' }   → 204   (borra clientes, servicios y comentarios; deja ajustes y usuarios)
```
- Antes de un `POST /api/respaldo` o un `DELETE /api/datos`, el servidor guarda automáticamente una copia, para poder recuperar un error.
- El `POST /api/respaldo` es también **la migración**: el encargado descarga el respaldo de su navegador actual y lo carga una vez en el servidor.
- Respaldo automático diario en el servidor; se guardan los últimos 30.

---

## 6. Cómo trabaja `Store` con el servidor

Solo cambia el interior de `store.js`; las funciones y lo que devuelven siguen igual.

1. **Al arrancar:** `GET /api/sesion`. Sin sesión → pantalla de inicio de sesión (la hace Leonardo). Con sesión → `GET /api/datos` y se dibuja.
2. **Al escribir:** se cambia la memoria y se redibuja **al instante**; la petición entra a una **cola** que se manda en orden.
3. **Si una petición falla:**
   - Sin conexión → se reintenta al volver la conexión. La cola se guarda en `localStorage` para no perder cambios si se cierra la página.
   - `400`, `403`, `404` → se deshace ese cambio en memoria y se muestra el `error`.
   - `409` → se reemplaza con la versión del servidor y se muestra el `error`.
   - `401` → se manda a iniciar sesión; la cola se conserva.
4. **Al volver a la pestaña** (más de 5 minutos fuera): se vuelve a descargar todo, para ver lo que otros cambiaron.
5. **Avisos a la pantalla:** `Store.onEstado(fn)` informa `'guardando' | 'guardado' | 'sin-conexion' | 'error'`, para que Leonardo muestre el indicador.

---

## 7. Lo que se queda igual
- Todos los cálculos de pantallas (seguimientos por enviar, Negocio, gráficas, “volvió a contratar”) siguen en el front con los datos descargados.
- WhatsApp sigue manual (`wa.me`); el servidor no hace nada de WhatsApp.
- Las preferencias de pantalla (`controlPlagas.pref.*`) siguen en cada navegador.
- `exportJSON` e `importJSON` funcionan igual; por dentro usan los endpoints de respaldo.

---

## 8. Cambios a la interfaz pública de `Store` (aprobados)

Pocos, y todos son **agregados**; ninguna función existente cambia:

| Función nueva | Para qué |
|---|---|
| `Store.iniciar()` → `Promise` | Reemplaza a `load()` al arrancar con servidor (sesión + descarga). `load()` se queda para el modo local. |
| `Store.usuario()` → `{ nombre, rol } \| null` | Esconder lo que el técnico no puede hacer. |
| `Store.iniciarSesion(usuario, contrasena)` / `Store.cerrarSesion()` → `Promise` | Pantalla de inicio de sesión. |
| `Store.onEstado(fn)` | Indicador de guardando / sin conexión / error. |
| `Store.modoLocal()` → `boolean` | `true` sin servidor: se permite la demo y “Volver a cargar ejemplos”. |
| `Store.deshacerRealizado(id, antes)` | *Deshacer* de “Ya se hizo” (sección 5.2). Restaura `{ estado, fecha, seguimiento }` en memoria al instante y llama a `deshacer-realizado`. |

---

## 9. Decisiones a confirmar *(respondidas en la sección 10)*

1. **Servidor y base de datos.** Propongo **Supabase** (PostgreSQL + autenticación + respaldos), con los endpoints como funciones del lado del servidor, o un servidor Node pequeño con PostgreSQL. ¿Alguna preferencia por el hospedaje?
2. **Mismo dominio para front y API** (sin CORS) o front en GitHub Pages con CORS. Recomiendo el mismo dominio.
3. **Deshacer “Ya se hizo”:** que `Store` lo resuelva por dentro, o la función nueva `Store.deshacerRealizado`.
4. **Primera versión con un solo usuario admin**, y técnicos después. ¿De acuerdo?
5. **Precio oculto para técnicos.** ¿El técnico debe ver cuánto cobrar en el servicio del día? Si sí, se muestra el precio del servicio, pero no la pantalla Negocio.
6. **Versión en `index.html`** (`?v=…`): cuando cambie `store.js`, ¿la subo yo o la sube siempre Leonardo?

---

## 10. Respuestas de Leonardo (23 de noviembre de 2026)

Las secciones 1 a 8 las doy por buenas, incluidas las funciones nuevas de `Store` (sección 8). Yo hago en el front la pantalla de inicio de sesión, el indicador de `onEstado`, el aviso de fecha incorrecta y lo que se esconde según el rol.

### 1. Servidor y base de datos
Lo decides tú. Agrego **Firebase** como tercera opción junto a Supabase y Node, **si se adapta** a lo que ya tenemos. Cualquier opción debe cumplir lo siguiente:
- Las pantallas no cambian; solo cambia el interior de `store.js`.
- Nada secreto en el front.
- Las reglas de [BACKEND.md §3](BACKEND.md#3-reglas-de-negocio-que-el-servidor-debe-respetar) las aplica el servidor. Por ejemplo, bloquear al cliente, cancelar sus servicios y agregar el comentario ocurren en una sola operación.

Con Firebase veo esto:
- **Encaja así:** Hosting, más Cloud Functions atendiendo `/api` con una regla de reescritura, más Firestore. El front y la API quedan en el mismo dominio gratuito (`*.web.app`) y el contrato de este documento no cambia.
- **Puntos a revisar:**
  - Cloud Functions pide el plan **Blaze**, que se paga por uso, tiene cuota gratis y pide tarjeta. Hay que confirmarlo con el cliente.
  - Firestore no borra en cascada ni tiene llaves foráneas. Borrar un cliente y bloquearlo se hacen dentro de la función, con una transacción.
  - Si el front hablara directo con Firestore (SDK con reglas de seguridad) en lugar de la API, cambiarían el contrato y todo el interior de `Store`. Además, el SDK de Firebase Auth guarda la sesión en el navegador, lo que choca con la regla de no guardar tokens en el front. Si se usa Firebase Auth, que sea con **cookies de sesión del Admin SDK** (`createSessionCookie`) emitidas por la función, para mantener la cookie `HttpOnly` de la sección 4.
  - El respaldo diario puede ser una exportación programada de Firestore o una función que guarde el JSON.

Si Firebase obliga a cambiar el contrato o a poner tokens en el front, prefiero Supabase o Node.

### 2. Dominio y hospedaje
**El cliente dice que no hace falta dominio propio.** Puede quedarse en el subdominio gratuito del hospedaje que elijas: Netlify, Vercel, Cloudflare Pages o Firebase Hosting.

La única condición es que **la API responda en el mismo origen que el front, bajo `/api`**. Se puede hacer con las funciones del propio hospedaje o con una regla de reescritura o proxy hacia tu servidor.

La razón: si el front está en `algo.vercel.app` y la API en otro dominio (por ejemplo `*.supabase.co`), la cookie de sesión sería de terceros. Safari en iPhone bloquea ese tipo de cookies y el inicio de sesión fallaría en el celular. En el mismo origen, la cookie se queda en `SameSite=Lax` y no hace falta CORS.

GitHub Pages deja de servir, porque no permite `/api` ni reescrituras.

### 3. Deshacer "Ya se hizo"
Usemos la **función nueva `Store.deshacerRealizado(id, antes)`**. Es más clara que reconocer el caso por dentro. Yo cambio la llamada en `js/app.js` (hoy usa `Store.updateServicio(s.id, antes)`).

### 4. Primera versión con un solo admin
De acuerdo. Los técnicos vienen después.

### 5. Precio para técnicos
El técnico **sí ve el precio de sus servicios pendientes**, porque es quien cobra. Lo que no ve:
- el precio de los servicios ya realizados (llega `null`, para no exponer cuánto ha ganado el negocio);
- la pantalla Negocio;
- la tarjeta "Cobrado en el mes" de Inicio;
- la opción de editar el precio.

Yo escondo esas partes en el front según `Store.usuario().rol`.

### 6. Versión `?v=` en `index.html`
La sube **quien cambie el archivo, en el mismo commit**.

### Otro punto
- `id` con `crypto.randomUUID()`: de acuerdo. Ese cambio va dentro de `store.js`. Deja `U.uid()` como respaldo para los navegadores que no tengan `randomUUID`.

---

## 11. Ajustes después de las respuestas (Jaziel, 23 de noviembre de 2026)

Actualicé el documento con las respuestas de la sección 10 para que no se contradiga:

- **Precio para técnicos** (secciones 4, 5.1 y 5.2): el `precio` llega como `null` solo en servicios realizados, y eso aplica a todas las respuestas, no solo a la carga inicial. Si un técnico intenta cambiar el precio, la respuesta es `403`.
- **`Store.deshacerRealizado(id, antes)`** quedó en la tabla de la sección 8 y en la 5.2.
- **Mismo origen** en la sección 4, más un aviso para Firebase Hosting: la cookie de sesión debe llamarse `__session`, porque Hosting elimina todas las demás antes de pasarlas a Cloud Functions.

### Falta confirmar: ¿el técnico puede poner precio al registrar un servicio?

“No editar el precio” no cubre el caso de un técnico que registra un servicio nuevo, por ejemplo uno que “Se hizo hoy” y ya cobró. Propongo:

- **Sí puede ponerlo al registrar** (`POST /api/servicios` acepta `precio`), porque es quien cobra y, si no, ese dinero no aparecería en Negocio.
- **No puede cambiarlo después** (`PATCH` con `precio` → `403`).
- El campo de precio se muestra en el formulario de registro también para el técnico, y se esconde o se bloquea al editar un servicio.

Leonardo, si prefieres que el técnico nunca capture precio, el servidor ignora el `precio` que mande un técnico al crear y tú escondes el campo. Dime cuál de las dos.

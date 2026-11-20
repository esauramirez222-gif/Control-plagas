# HK Control de Plagas — Registro y seguimiento de clientes

Propuesta de sistema web para un negocio de control de plagas. Permite **registrar clientes**, **agendar servicios**, **dar seguimiento por WhatsApp** a los 15 días, 20 días o 1 mes, guardar **comentarios** y **bloquear** a clientes problemáticos.

Hecho **solo con HTML, CSS y JavaScript** (sin instalar nada). Está pensado para personas **poco familiarizadas con la tecnología**: letra grande, botones grandes con texto, colores con significado y mensajes en lenguaje sencillo.

---

## ▶️ Cómo abrirlo

**Opción 1 (la más fácil):** descargar el proyecto y dar **doble clic en `index.html`**. Se abre en el navegador.

**Opción 2 (servidor local):**

```bash
python3 -m http.server 8000
```

y abrir <http://localhost:8000>.

**Opción 3 (en internet, gratis):** activar **GitHub Pages** en el repositorio (*Settings → Pages → Branch: `main` / root*). Quedará en `https://<usuario>.github.io/Control-plagas/`.

> La primera vez que se abre, el sistema carga **15 clientes de ejemplo** (ficticios) con servicios, comentarios y seguimientos, para ver cómo funciona. Las fechas de ejemplo se calculan a partir del día de hoy, así que la demo siempre se ve “viva”.

---

## 🧭 Pantallas

| Pantalla | Para qué sirve |
|---|---|
| **Inicio** | Tres paneles: *Servicios de hoy* (anillo de avance y quién sigue), *Mensajes de seguimiento* (con *Empezar a enviar*) y *Cobrado en el mes* (comparado con el mes pasado al mismo día, con tendencia). Debajo, la hoja de ruta de hoy y una gráfica de los próximos 7 días (tocar un día lo abre en el calendario). |
| **Clientes** | Lista con buscador (nombre, teléfono o dirección), botón *Registrar cliente* y filtros: *Todos*, *Con servicio agendado* y *Bloqueados*. Cada tarjeta muestra el **último comentario** (o el **motivo del bloqueo**, si está bloqueado). |
| **Ficha del cliente** | Expediente del cliente: estado (activo, *cliente frecuente*), barra de contacto (*Llamar*, *WhatsApp*, *Cómo llegar*), **próximo servicio** con *Ya se hizo* / *Recordarle* / *Cambiar* (o, si no tiene, cuándo le tocaría según su frecuencia), notas, ubicación con mapa e **historial** con cifras, línea de 12 meses y precios. *Bloquear* y *Eliminar* quedan plegados en *Más opciones*. |
| **Agenda** | Dos vistas: **Lista** (hoja de ruta agrupada en *Atrasados*, *Hoy*, *Mañana*…) y **Calendario** mensual; al tocar un día se ve su ruta, lo ya realizado y lo cobrado. |
| **Seguimiento** | **Bandeja**: lista de pendientes a la izquierda y un mensaje a la vez a la derecha (vista tipo WhatsApp, editable); al confirmar el envío pasa solo al siguiente, con barra de avance del día. Debajo: franja de los próximos 30 días y **resultados** (cuántos clientes volvieron a contratar en los 45 días siguientes al mensaje). |
| **Negocio** | Cobrado, servicios realizados, cobro promedio y lo agendado por cobrar; gráficas de cobro por mes, qué servicio deja más y días con más trabajo; tabla de mejores clientes. Periodo de 6 o 12 meses. |
| **Ajustes** | Se guarda solo. Nombre del negocio y **ciudad** (para el mapa); editor de los mensajes de WhatsApp con **vista previa en vivo** y botones para insertar datos (nombre, fecha, hora…) sin escribir llaves; **respaldo** con la fecha del último (y aviso en Inicio si pasa más de un mes con datos reales); datos de ejemplo. |

---

## ✅ Cómo se cubre cada requisito

| Requisito | Solución |
|---|---|
| Registrar cliente con **nombre, apellido, teléfono y dirección** | Formulario de *Registrar cliente*, paso 1. Valida que el teléfono tenga 10 números. |
| Preguntar si la fecha de registro **es el día del servicio o no** | Paso 2 con tres opciones grandes: **“Se hizo hoy”**, **“Se hizo otro día”** (pide la fecha) o **“Todavía no”** (pide fecha y hora para agendarlo). |
| **Comentarios** del servicio o cliente (uno o más) | Se pueden agregar los que sean. Cada uno guarda fecha y hora. |
| Ver **primero el más reciente** y poder ver **todos** | La ficha muestra el más reciente resaltado y un botón **“Ver todos los comentarios (N)”**. |
| Seguimiento a los **15 días, 20 días o 1 mes** | Se elige al registrar/agendar. Cuando llega la fecha, el cliente aparece en **Seguimiento** y en el contador del menú. |
| **Mensaje por WhatsApp** | En **Seguimiento** cada cliente tiene su mensaje en un cuadro de texto que **se puede cambiar** (se guarda solo y aplica únicamente a ese cliente; botón *Volver al mensaje original*). El botón **“Enviar por WhatsApp”** abre WhatsApp con ese texto; solo se presiona *enviar*. Al regresar, la app pregunta si se envió y entonces lo marca (con opción de *Deshacer*). |
| Ver **servicios pendientes** con datos del cliente, **fecha y hora** | Pantalla **Agenda**. También se puede mandar un **recordatorio** por WhatsApp, marcar “Ya se hizo” o cambiar fecha/hora. |
| **Bloquear** clientes malos o con comentario negativo | Botón *Bloquear cliente* (pide el motivo). Al escribir un **comentario negativo**, el sistema pregunta si también se quiere bloquear. Si alguien intenta registrarse con el teléfono de un bloqueado, aparece una **alerta roja**. |
| Fácil de usar | Ver la sección de diseño. |

---

## 🎨 Decisiones de diseño (usabilidad)

- **Identidad de HK:** logotipo en SVG ([img/logo-hk.svg](img/logo-hk.svg), trazo provisional del PNG) y paleta tomada de él. Sin emojis en la interfaz.
- **Paleta "uniforme de técnico":** azul profundo `#0B2440` como superficie de marca (menú), azul `#0F3F6E` para acciones, y naranja de seguridad `#C2410C` como **único acento**, reservado para "hoy" y "ahora". Rojo = atrasado o bloqueado; verde = hecho; verde WhatsApp **solo** en lo que abre WhatsApp.
- **Tipografía Barlow** (inspirada en letreros y rotulación de vehículos), incluida en el proyecto para que funcione sin internet; la versión condensada se usa en títulos y horas.
- **Agenda como hoja de ruta:** hora grande, una línea que une las paradas y una marca naranja de **"Ahora"** entre lo que ya pasó y lo que sigue.
- **Inicio en una frase:** "Hoy tiene 3 servicios y 1 atrasado…", con cada número como enlace, en lugar de tarjetas de cifras.
- **Seguimiento como bandeja:** un mensaje a la vez, como burbuja de WhatsApp tal como lo recibirá el cliente; nada de tarjetas repetidas.
- **Gráficas propias en HTML/SVG** (sin librerías, funcionan sin internet): una serie por gráfica, barras ≤ 24 px, etiquetas solo en el máximo y el periodo actual, detalle al pasar el cursor o con teclado y tabla en *Ver datos*. Colores validados (contraste ≥ 3:1). Las comparaciones solo se muestran si hay datos suficientes para que sean justas.
- **Movimiento con propósito:** transiciones suaves entre pantallas (View Transitions), el indicador del menú se desliza, las gráficas crecen una sola vez al entrar, los números suben, y un servicio marcado como hecho sale con una animación corta. Todo se desactiva si el sistema pide *reducir movimiento*.
- **Una sola acción principal por fila** (*Ya se hizo*); las secundarias (*Recordarle*, *Cambiar*) son de texto para no saturar. Estados con punto de color + texto, sin pastillas.
- **Letra base de 17 px**, botones de al menos **44 px** de alto y textos siempre visibles junto a los íconos.
- **Lenguaje sencillo** (“Ya se hizo”, “Recordarle”, “Todavía no”) y fechas legibles (“Hoy”, “Mañana”, “viernes 20 de noviembre”, “10:00 a. m.”).
- **“Deshacer” en lugar de preguntar** en acciones frecuentes (“Ya se hizo”); confirmación solo en acciones destructivas (eliminar, bloquear, borrar todo).
- **Envío de WhatsApp confirmado:** al regresar de WhatsApp la app pregunta “¿Se envió el mensaje?” antes de marcarlo, para no dar por enviado algo que no salió.
- **Errores claros** debajo de cada campo (“El teléfono debe tener 10 números”).
- **Sin elementos repetidos:** *Registrar cliente* solo aparece en Inicio y Clientes; los bloqueados se consultan con el filtro de Clientes.
- **Celular primero:** en el teléfono el menú pasa abajo, como una app.
- **Accesibilidad (WCAG 2.1 AA):** contraste revisado (texto ≥ 4.5:1, bordes de campos ≥ 3:1), navegación con teclado, foco visible, foco atrapado dentro de las ventanas, errores anunciados a lectores de pantalla.

---

## 🗂️ Estructura del proyecto

```
Control-plagas/
├── index.html          # Estructura de la página y menú
├── fonts/              # Tipografía Barlow incluida (licencia OFL); funciona sin internet
├── img/
│   └── logo-hk.svg     # Logotipo (trazo provisional; reemplazar por el oficial)
├── css/
│   └── styles.css      # Estilos (variables de color, diseño responsivo)
└── js/
    ├── icons.js        # Íconos SVG
    ├── utils.js        # Fechas, teléfonos, enlaces de WhatsApp/llamada/mapa
    ├── store.js        # Datos: clientes, servicios, comentarios (localStorage)
    ├── demo-data.js    # Datos de ejemplo
    ├── ui.js           # Ventanas, confirmaciones, avisos, errores de formulario
    ├── charts.js       # Gráficas (columnas, barras, tendencia, anillo) y su tooltip
    ├── components.js   # Tarjetas reutilizables
    ├── forms.js        # Formularios (cliente, servicio, bloqueo)
    ├── views.js        # Pantallas
    └── app.js          # Navegación y acciones de los botones
```

### Modelo de datos

```text
Cliente    { id, nombre, apellido, telefono, direccion, fechaRegistro,
             bloqueado, motivoBloqueo, fechaBloqueo }
Servicio   { id, clienteId, tipo, fecha, hora,
             estado: pendiente | realizado | cancelado,
             precio /* pesos; lo cobrado o lo acordado (opcional) */,
             seguimientoDias: 15 | 20 | 30,
             seguimiento: pendiente | enviado | omitido, fechaSeguimientoEnviado,
             mensajeSeguimiento /* texto personalizado para ese cliente (opcional) */ }
Comentario { id, clienteId, texto, fecha, negativo }
Ajustes    { negocio, ciudad, plantillaSeguimiento, plantillaRecordatorio }
```

La fecha de seguimiento se calcula como `fecha del servicio realizado + seguimientoDias`.

---

## ⚠️ Limitaciones de esta versión (y cómo crecer)

1. **Los datos viven en el navegador** (`localStorage`). Si se borra el historial o se cambia de equipo, se pierden: por eso existe **Ajustes → Descargar respaldo**. Para usarlo en varios dispositivos se necesita una base de datos (por ejemplo Firebase o Supabase) — la capa `store.js` está aislada para facilitar ese cambio.
2. **WhatsApp no se envía 100 % automático.** Un sitio solo con HTML/CSS/JS no puede mandar mensajes sin intervención; el sistema **avisa cuándo toca**, **prepara el mensaje** y lo abre en WhatsApp con un clic. El envío totalmente automático requiere la **API de WhatsApp Business** (Meta o un proveedor como Twilio) y un pequeño servidor que revise cada día los seguimientos pendientes.
3. **El mapa necesita internet.** Todo lo demás funciona sin conexión. Al mostrar el mapa, la dirección del cliente se envía a Google Maps.
4. **No hay inicio de sesión.** Para separar “administrador” de “técnicos” haría falta un servidor con usuarios y contraseñas.

### Siguientes pasos sugeridos
- Base de datos en la nube + inicio de sesión.
- Envío automático de WhatsApp (API de WhatsApp Business).
- Precio/cobro por servicio y reporte mensual.
- Instalar como app en el celular (PWA, funciona sin internet).

---

## 🧪 Datos de ejemplo

Desde **Ajustes** se puede **volver a cargar** la demo o **borrar todos los clientes** para empezar a usarlo de verdad. Los nombres y teléfonos de ejemplo son ficticios.

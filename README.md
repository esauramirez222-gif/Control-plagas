# 🐜 Control de Plagas — Registro y seguimiento de clientes

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
| **Inicio** | Resumen del día: servicios de hoy, mensajes por enviar, próximos 7 días y avisos de servicios atrasados. Botones grandes para *Registrar cliente* y *Agendar servicio*. |
| **Clientes** | Lista con buscador (nombre, teléfono o dirección) y filtros: *Todos*, *Con servicio agendado*, *Bloqueados*. Cada tarjeta muestra el **último comentario**. |
| **Ficha del cliente** | Datos, botones de *Llamar* y *WhatsApp*, próximo servicio, **comentario más reciente** (con botón *Ver todos*), historial de servicios y opciones de administrador (bloquear / eliminar). |
| **Agenda** | Servicios pendientes con **datos del cliente, fecha y hora acordada**, agrupados en *Atrasados*, *Hoy*, *Mañana*, *Esta semana* y *Más adelante*. |
| **Seguimiento** | Mensajes de WhatsApp que toca enviar hoy (o que ya se pasaron), próximos 30 días y enviados recientemente. |
| **Bloqueados** | Clientes bloqueados con su motivo y botón para desbloquear. |
| **Ajustes** | Nombre del negocio, texto de los mensajes de WhatsApp, respaldo (descargar/cargar) y datos de ejemplo. |

---

## ✅ Cómo se cubre cada requisito

| Requisito | Solución |
|---|---|
| Registrar cliente con **nombre, apellido, teléfono y dirección** | Formulario de *Registrar cliente*, paso 1. Valida que el teléfono tenga 10 números. |
| Preguntar si la fecha de registro **es el día del servicio o no** | Paso 2 con tres opciones grandes: **“Se hizo hoy”**, **“Se hizo otro día”** (pide la fecha) o **“Todavía no”** (pide fecha y hora para agendarlo). |
| **Comentarios** del servicio o cliente (uno o más) | Se pueden agregar los que sean. Cada uno guarda fecha y hora. |
| Ver **primero el más reciente** y poder ver **todos** | La ficha muestra el más reciente resaltado y un botón **“Ver todos los comentarios (N)”**. |
| Seguimiento a los **15 días, 20 días o 1 mes** | Se elige al registrar/agendar. Cuando llega la fecha, el cliente aparece en **Seguimiento** y en el contador del menú. |
| **Mensaje por WhatsApp** | Botón **“Enviar por WhatsApp”**: abre WhatsApp con el mensaje ya escrito y personalizado; solo se presiona *enviar*. Queda marcado como enviado (con opción de *Deshacer*). |
| Ver **servicios pendientes** con datos del cliente, **fecha y hora** | Pantalla **Agenda**. También se puede mandar un **recordatorio** por WhatsApp, marcar “Ya se hizo” o cambiar fecha/hora. |
| **Bloquear** clientes malos o con comentario negativo | Botón *Bloquear cliente* (pide el motivo). Al escribir un **comentario negativo**, el sistema pregunta si también se quiere bloquear. Si alguien intenta registrarse con el teléfono de un bloqueado, aparece una **alerta roja**. |
| Fácil de usar | Ver la sección de diseño. |

---

## 🎨 Decisiones de diseño (usabilidad)

- **Letra base de 17 px**, botones de al menos **44 px** de alto y textos siempre visibles junto a los íconos.
- **Colores con significado constante:** verde = acción/bien, rojo = problema/bloqueado, ámbar = hoy, azul = información, verde WhatsApp = mensajes.
- **Lenguaje sencillo** (“Ya se hizo”, “Recordarle”, “Todavía no”) y fechas legibles (“Hoy”, “Mañana”, “viernes 20 de noviembre”, “10:00 a. m.”).
- **Confirmación** antes de acciones importantes, y **“Deshacer”** en las acciones rápidas.
- **Errores claros** debajo de cada campo (“El teléfono debe tener 10 números”).
- **Celular primero:** en el teléfono el menú pasa abajo (como una app) y aparece un botón flotante *Registrar cliente*.
- **Accesibilidad (WCAG 2.1 AA):** contraste revisado (texto ≥ 4.5:1, bordes de campos ≥ 3:1), navegación con teclado, foco visible, foco atrapado dentro de las ventanas, errores anunciados a lectores de pantalla.

---

## 🗂️ Estructura del proyecto

```
Control-plagas/
├── index.html          # Estructura de la página y menú
├── css/
│   └── styles.css      # Estilos (variables de color, diseño responsivo)
└── js/
    ├── icons.js        # Íconos SVG
    ├── utils.js        # Fechas, teléfonos, enlaces de WhatsApp/llamada/mapa
    ├── store.js        # Datos: clientes, servicios, comentarios (localStorage)
    ├── demo-data.js    # Datos de ejemplo
    ├── ui.js           # Ventanas, confirmaciones, avisos, errores de formulario
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
             seguimientoDias: 15 | 20 | 30,
             seguimiento: pendiente | enviado | omitido, fechaSeguimientoEnviado }
Comentario { id, clienteId, texto, fecha, negativo }
```

La fecha de seguimiento se calcula como `fecha del servicio realizado + seguimientoDias`.

---

## ⚠️ Limitaciones de esta versión (y cómo crecer)

1. **Los datos viven en el navegador** (`localStorage`). Si se borra el historial o se cambia de equipo, se pierden: por eso existe **Ajustes → Descargar respaldo**. Para usarlo en varios dispositivos se necesita una base de datos (por ejemplo Firebase o Supabase) — la capa `store.js` está aislada para facilitar ese cambio.
2. **WhatsApp no se envía 100 % automático.** Un sitio solo con HTML/CSS/JS no puede mandar mensajes sin intervención; el sistema **avisa cuándo toca**, **prepara el mensaje** y lo abre en WhatsApp con un clic. El envío totalmente automático requiere la **API de WhatsApp Business** (Meta o un proveedor como Twilio) y un pequeño servidor que revise cada día los seguimientos pendientes.
3. **No hay inicio de sesión.** Para separar “administrador” de “técnicos” haría falta un servidor con usuarios y contraseñas.

### Siguientes pasos sugeridos
- Base de datos en la nube + inicio de sesión.
- Envío automático de WhatsApp (API de WhatsApp Business).
- Precio/cobro por servicio y reporte mensual.
- Instalar como app en el celular (PWA, funciona sin internet).

---

## 🧪 Datos de ejemplo

Desde **Ajustes** se puede **volver a cargar** la demo o **borrar todos los clientes** para empezar a usarlo de verdad. Los nombres y teléfonos de ejemplo son ficticios.

# Entrega al backend (Jaziel)

Nota de Leonardo para Jaziel y su Claude Code, del 20 de noviembre de 2026. Resume el estado del frontend, lo que el servidor tiene que respetar y lo que falta. La **propuesta de API** (sección 4) es un punto de partida: hay que acordarla entre los dos antes de implementarla.

---

## 1. Qué ya está hecho (frontend)

Todo funciona hoy sin servidor, con datos en el navegador:

| Pantalla | Qué hace |
|---|---|
| **Inicio** | Panel de *Servicios de hoy* (avance y quién sigue), *Mensajes de seguimiento* por enviar, *Cobrado en el mes* con tendencia; ruta del día y gráfica de los próximos 7 días. |
| **Clientes** | Lista con búsqueda y filtros (todos, con servicio agendado, bloqueados). |
| **Ficha del cliente** | Contacto (llamar, WhatsApp, cómo llegar), próximo servicio con acciones, notas, mapa de Google, historial con precios y frecuencia. |
| **Agenda** | Vista de lista (hoja de ruta) y de calendario mensual. |
| **Seguimiento** | Bandeja: un mensaje a la vez, se abre WhatsApp con el texto y al regresar se confirma si se envió. Próximos 30 días y resultados (cuántos volvieron a contratar). |
| **Negocio** | Cobrado por mes, servicios por tipo, días con más trabajo, mejores clientes, lo agendado por cobrar. |
| **Ajustes** | Nombre del negocio, ciudad, plantillas de WhatsApp con vista previa, respaldo (exportar/importar JSON). |

Novedades de datos en esta etapa: **`precio`** en cada servicio y **`ciudad`** en ajustes.

---

## 2. Modelo de datos actual

Así se guarda hoy (`localStorage`, clave `controlPlagas.v1`). Es el formato que el servidor debería devolver para que el front no cambie.

```text
Cliente {
  id: string
  nombre: string
  apellido: string
  telefono: string          // solo dígitos, 10 (se acepta 52 + 10)
  direccion: string         // calle, número y colonia (sin ciudad)
  fechaRegistro: 'AAAA-MM-DD'
  bloqueado: boolean
  motivoBloqueo: string
  fechaBloqueo: 'AAAA-MM-DD' | null
}

Servicio {
  id: string
  clienteId: string
  tipo: 'Fumigación general' | 'Cucarachas' | 'Hormigas' | 'Termitas' | 'Chinches' | 'Alacranes'
      | 'Roedores' | 'Arañas' | 'Mosquitos' | 'Pulgas y garrapatas' | 'Otro'
  fecha: 'AAAA-MM-DD'       // día agendado, o día en que se hizo
  hora: 'HH:MM' | ''        // obligatoria si está pendiente
  estado: 'pendiente' | 'realizado' | 'cancelado'
  precio: number | null     // pesos enteros; lo cobrado o lo acordado
  seguimientoDias: 15 | 20 | 30
  seguimiento: 'pendiente' | 'enviado' | 'omitido'
  fechaSeguimientoEnviado: 'AAAA-MM-DD' | null
  mensajeSeguimiento: string | null   // texto personalizado solo para este servicio; null = usar la plantilla
}

Comentario {
  id: string
  clienteId: string
  texto: string
  fecha: string             // ISO 8601 con hora
  negativo: boolean
}

Ajustes {
  negocio: string                  // 'HK Control de Plagas'
  ciudad: string                   // 'San Luis Potosí, S.L.P.'; se agrega a la dirección para el mapa
  plantillaSeguimiento: string     // variables: {nombre} {negocio} {servicio} {dias} {fecha}
  plantillaRecordatorio: string    // variables: {nombre} {negocio} {servicio} {fecha} {hora} {direccion}
}
```

Campo extra en la raíz: `demo` (`2` para los datos de ejemplo, `'importado'` para respaldos). En el servidor no hace falta; sirve para no reemplazar datos reales por la demo.

---

## 3. Reglas de negocio que el servidor debe respetar

Hoy están implementadas en [js/store.js](../js/store.js). Si el servidor también calcula algo de esto, tiene que dar **exactamente** lo mismo.

1. **Fecha de seguimiento** = `fecha` del servicio realizado + `seguimientoDias`.
2. **Mensajes por enviar** = servicios `realizado`, con `seguimiento = 'pendiente'`, de clientes **no bloqueados**, cuya fecha de seguimiento es hoy o ya pasó.
3. **Marcar como realizado**: si se marca antes de la fecha agendada, la fecha pasa a ser **hoy** (de ahí se cuenta el seguimiento). La operación devuelve el estado anterior (`{ estado, fecha, seguimiento }`) porque el front ofrece **Deshacer** durante 8 segundos.
4. **Bloquear cliente**: guarda motivo y fecha, **cancela sus servicios pendientes** y agrega un comentario negativo `"Cliente bloqueado. Motivo: …"`. Al desbloquear se agrega el comentario `"Cliente desbloqueado."`.
5. **Teléfono duplicado**: al registrar se busca por los últimos 10 dígitos; si es de un bloqueado, el front avisa en rojo.
6. **Mensaje personalizado**: si el texto editado es igual al de la plantilla, se guarda `null` (no se guarda una copia).
7. **Seguimiento enviado**: se marca `enviado` solo cuando la persona confirma al regresar de WhatsApp. El envío es manual (`wa.me`) y así se queda.
8. **"Volvió a contratar"** (pantalla de resultados): el cliente agendó otro servicio no cancelado dentro de los **45 días** siguientes al mensaje.
9. **Zona horaria**: America/Mexico_City. "Hoy" siempre es la fecha local del negocio.

---

## 4. Propuesta de API (para acordar)

La idea que menos cambia el front: **`Store` sigue siendo una caché en memoria con las mismas funciones síncronas**. Al arrancar se descarga todo con una sola petición. Cada escritura actualiza la caché al instante (la pantalla responde sin esperar) y se manda al servidor; si falla, se revierte y se muestra un aviso. Para el tamaño de este negocio (cientos de clientes, miles de servicios) descargar todo al inicio es razonable.

```text
GET    /api/datos                         → { clientes, servicios, comentarios, ajustes }

POST   /api/clientes                      → Cliente
PATCH  /api/clientes/:id                  → Cliente
DELETE /api/clientes/:id                  (borra también sus servicios y comentarios)
POST   /api/clientes/:id/bloqueo  {motivo} → { cliente, serviciosCancelados, comentario }
DELETE /api/clientes/:id/bloqueo          → { cliente, comentario }

POST   /api/servicios                     → Servicio
PATCH  /api/servicios/:id                 → Servicio   (fecha, hora, tipo, precio, estado, seguimientoDias, mensajeSeguimiento)
POST   /api/servicios/:id/realizado       → { servicio, antes }
POST   /api/servicios/:id/seguimiento  {estado: 'enviado'|'omitido'|'pendiente'} → Servicio

POST   /api/comentarios                   → Comentario
DELETE /api/comentarios/:id

GET    /api/ajustes · PATCH /api/ajustes  → Ajustes
GET    /api/respaldo                      → JSON completo (mismo formato que "Descargar respaldo")
POST   /api/respaldo                      (reemplaza todo; pedir confirmación en el front)
```

Errores: `{ error: 'mensaje en español para mostrar al encargado' }` con el código HTTP adecuado. Los mensajes los muestra el front tal cual, así que deben estar escritos para una persona no técnica.

Cuando exista el servidor, Leonardo agrega en el front los estados de **cargando**, **sin conexión** y **error al guardar**.

---

## 5. Lo que falta, en orden

### Servidor y base de datos
- [ ] Base de datos con el modelo de la sección 2 (Supabase, Firebase o la que prefieras).
- [ ] Endpoints de la sección 4, o el contrato que acuerden.
- [ ] **Inicio de sesión.** Hoy cualquiera con el enlace ve todo. Mínimo: usuario del encargado. Ideal: roles *administrador* (borrar, bloquear, ver Negocio) y *técnico* (ver su ruta y marcar hecho).
- [ ] Respaldo automático diario en el servidor.
- [ ] Migración: importar el JSON de "Descargar respaldo" para no perder lo capturado en el navegador.
- [ ] Hospedaje: el front es estático (sirve GitHub Pages). Configurar CORS para su dominio.

### Fuera de alcance por ahora
- **API de WhatsApp: no se va a usar todavía.** El envío se queda como está: el front abre `wa.me` con el mensaje listo y la persona presiona enviar. No hace falta nada del lado del servidor para WhatsApp.

---

## 6. Datos útiles
- El negocio está en **San Luis Potosí** (lada 444, de 3 dígitos). Los datos de ejemplo usan lada 33 solo porque son ficticios.
- El mapa usa Google Maps sin llave (`maps.google.com/maps?q=…&output=embed`) y la ruta abre `google.com/maps/dir/?api=1&destination=…`. 
- Las gráficas, cálculos de Negocio y "volvió a contratar" se calculan en el front con los datos descargados. Si el volumen crece mucho, se pueden mover a endpoints de reportes.
- Las pruebas que se hicieron (funciones y diseño responsivo en 12 tamaños y 5 celulares) se corrieron con Chrome sin pantalla desde la máquina de Leonardo; todavía no están en el repositorio.

/* =====================================================================
   Capa de datos. Todo se guarda en el navegador (localStorage).
   Modelo:
     Cliente    { id, nombre, apellido, telefono, direccion, fechaRegistro,
                  bloqueado, motivoBloqueo, fechaBloqueo }
     Servicio   { id, clienteId, tipo, fecha, hora, estado: pendiente|realizado|cancelado,
                  precio (pesos; opcional: lo cobrado o lo acordado),
                  seguimientoDias: 15|20|30, seguimiento: pendiente|enviado|omitido,
                  fechaSeguimientoEnviado }
     Ajustes    { negocio, ciudad (se agrega a las direcciones para el mapa), plantillas }
     Comentario { id, clienteId, texto, fecha (ISO), negativo }
   ===================================================================== */
const Store = (() => {
  const KEY = 'controlPlagas.v1';

  const DEFAULT_AJUSTES = {
    negocio: 'HK Control de Plagas',
    ciudad: 'San Luis Potosí, S.L.P.',
    plantillaSeguimiento:
      'Hola {nombre}, le saluda {negocio}.\n\nHace {dias} días realizamos su servicio de {servicio}. ¿Cómo ha funcionado? ¿Ha vuelto a ver plagas?\n\nSi gusta, con gusto le agendamos su siguiente servicio. ¡Gracias por su confianza!',
    plantillaRecordatorio:
      'Hola {nombre}, le saluda {negocio}.\n\nLe recordamos su servicio de {servicio} programado para el {fecha} a las {hora} en {direccion}.\n\nSi necesita cambiar la hora, por favor avísenos. ¡Gracias!',
  };

  let data = { clientes: [], servicios: [], comentarios: [], ajustes: { ...DEFAULT_AJUSTES } };
  const listeners = new Set();

  /** Actualiza datos guardados con versiones anteriores (plantillas con emoji, nombre de la demo, etc.). */
  function migrar() {
    const a = data.ajustes;
    ['plantillaSeguimiento', 'plantillaRecordatorio'].forEach((k) => {
      if (typeof a[k] === 'string') a[k] = a[k].replace(/ ?🐜/g, '');
    });
    if (!a.negocio || a.negocio === 'Control de Plagas' || a.negocio === 'Fumigaciones El Escudo') a.negocio = DEFAULT_AJUSTES.negocio;
    // La ciudad por defecto de una versión anterior era un supuesto equivocado (Guadalajara)
    if (!a.ciudad || a.ciudad === 'Guadalajara, Jalisco') a.ciudad = DEFAULT_AJUSTES.ciudad;
    data.comentarios.forEach((m) => {
      if (typeof m.texto === 'string') m.texto = m.texto.replace(/^(🚫|✅)\s*/u, '');
    });
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = { ...data, ...parsed, ajustes: { ...DEFAULT_AJUSTES, ...(parsed.ajustes || {}) } };
        migrar();
        return true;
      }
    } catch (e) {
      console.warn('No se pudieron leer los datos guardados', e);
    }
    return false;
  }

  /** Guarda en el navegador. Con silent=true no redibuja la pantalla (útil mientras el usuario escribe). */
  function save(silent = false) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudieron guardar los datos', e);
    }
    if (!silent) listeners.forEach((fn) => fn());
  }

  const onChange = (fn) => listeners.add(fn);

  /** Identificador de registros nuevos. Lo crea el front y el servidor lo acepta tal cual (docs/API.md §1). */
  const nuevoId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : U.uid());

  /* ------------------------------ Servidor y sesión ------------------------------
     Contrato acordado en docs/API.md (secciones 6, 8 y 13). Hoy no hay servidor: todo trabaja en
     "modo local" con los datos de este navegador. Para conectar el servidor se cambia el interior de
     estas funciones; las pantallas ya las usan y no tienen que cambiar. */
  const estadoListeners = new Set();
  /**
   * Avisos para el indicador de guardado. Estados:
   *   'guardando' | 'guardado' | 'sin-conexion' | 'error' (detalle = texto del servidor) | 'sin-sesion' (401: pedir sesión).
   */
  const onEstado = (fn) => estadoListeners.add(fn);
  // En modo local nadie la llama; el servidor la usa al mandar la cola de cambios
  const avisarEstado = (estado, detalle = '') => estadoListeners.forEach((fn) => fn(estado, detalle));

  /** true = sin servidor: datos en este navegador, se permite la demo. */
  const modoLocal = () => true;
  /** Quién inició sesión: { nombre, rol: 'admin' | 'tecnico' }. null en modo local (puede hacer todo). */
  const usuario = () => null;
  /** Atajo para las pantallas: ¿puede ver dinero, bloquear, borrar y entrar a Ajustes? */
  const esAdmin = () => { const u = usuario(); return !u || u.rol === 'admin'; };
  /** Fecha de hoy según el servidor (America/Mexico_City), de GET /api/datos. null en modo local. */
  const hoyServidor = () => null;

  /**
   * Arranque. Resuelve true cuando los datos están listos para dibujar, o false si hay que iniciar sesión.
   * Si no se puede conectar, rechaza con un Error cuyo mensaje se muestra tal cual al encargado.
   */
  function iniciar() {
    // Primera vez (o demo de una versión sin precios): cargar los datos de ejemplo
    if ((!load() || esDemoAntigua()) && typeof buildDemoData === 'function') replaceAll(buildDemoData());
    return Promise.resolve(true);
  }
  /** Rechaza con un Error cuyo mensaje se muestra tal cual (ej. "Usuario o contraseña incorrectos."). */
  const iniciarSesion = () => Promise.reject(new Error('Todavía no hay servidor. La información se guarda en este navegador.'));
  const cerrarSesion = () => Promise.resolve();

  /* ------------------------------ Clientes ------------------------------ */
  const nombreCompleto = (c) => `${c.nombre} ${c.apellido}`.trim();
  /** Dirección + ciudad del negocio, para que el mapa la encuentre sin confundirse de ciudad. */
  const direccionMapa = (dir) => {
    const ciudad = (data.ajustes.ciudad || '').trim();
    return ciudad && !U.norm(dir).includes(U.norm(ciudad.split(',')[0])) ? `${dir}, ${ciudad}` : dir;
  };
  const getClientes = () => data.clientes;
  const getCliente = (id) => data.clientes.find((c) => c.id === id);
  const buscarPorTelefono = (tel, excludeId) => {
    const d = U.phoneDigits(tel).slice(-10);
    if (d.length < 10) return null;
    return data.clientes.find((c) => c.id !== excludeId && U.phoneDigits(c.telefono).slice(-10) === d) || null;
  };

  function addCliente({ nombre, apellido, telefono, direccion }) {
    const c = {
      id: nuevoId(), nombre: nombre.trim(), apellido: apellido.trim(), telefono: U.phoneDigits(telefono),
      direccion: direccion.trim(), fechaRegistro: U.todayStr(), bloqueado: false, motivoBloqueo: '', fechaBloqueo: null,
    };
    data.clientes.push(c);
    save();
    return c;
  }

  function updateCliente(id, patch) {
    const c = getCliente(id);
    if (!c) return;
    Object.assign(c, patch);
    if (patch.telefono) c.telefono = U.phoneDigits(patch.telefono);
    save();
  }

  function deleteCliente(id) {
    data.clientes = data.clientes.filter((c) => c.id !== id);
    data.servicios = data.servicios.filter((s) => s.clienteId !== id);
    data.comentarios = data.comentarios.filter((m) => m.clienteId !== id);
    save();
  }

  function bloquear(id, motivo) {
    const c = getCliente(id);
    if (!c) return;
    c.bloqueado = true;
    c.motivoBloqueo = motivo.trim();
    c.fechaBloqueo = U.todayStr();
    // El motivo también queda en el historial de comentarios
    data.comentarios.push({ id: nuevoId(), clienteId: id, texto: `Cliente bloqueado. Motivo: ${c.motivoBloqueo}`, fecha: new Date().toISOString(), negativo: true });
    // Los servicios pendientes de un cliente bloqueado se cancelan
    data.servicios.forEach((s) => {
      if (s.clienteId === id && s.estado === 'pendiente') s.estado = 'cancelado';
    });
    save();
  }

  function desbloquear(id) {
    const c = getCliente(id);
    if (!c) return;
    c.bloqueado = false;
    data.comentarios.push({ id: nuevoId(), clienteId: id, texto: 'Cliente desbloqueado.', fecha: new Date().toISOString(), negativo: false });
    c.motivoBloqueo = '';
    c.fechaBloqueo = null;
    save();
  }

  /* ------------------------------ Servicios ------------------------------ */
  const getServicio = (id) => data.servicios.find((s) => s.id === id);
  const getServicios = () => data.servicios;
  /** Precio de referencia por tipo de servicio: el promedio de lo que se ha cobrado. */
  function precioSugerido(tipo) {
    const ps = data.servicios.filter((s) => s.tipo === tipo && s.precio > 0).map((s) => s.precio);
    return ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length / 50) * 50 : null;
  }
  const sortServ = (a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''));

  const serviciosDe = (clienteId) => data.servicios.filter((s) => s.clienteId === clienteId).sort(sortServ).reverse();

  function addServicio({ clienteId, tipo, fecha, hora = '', estado, seguimientoDias, precio = null }) {
    const s = {
      id: nuevoId(), clienteId, tipo: tipo || 'Fumigación general', fecha, hora, estado, precio: precio > 0 ? Number(precio) : null,
      seguimientoDias: Number(seguimientoDias) || 30, seguimiento: 'pendiente', fechaSeguimientoEnviado: null,
    };
    data.servicios.push(s);
    save();
    return s;
  }

  function updateServicio(id, patch) {
    const s = getServicio(id);
    if (!s) return;
    Object.assign(s, patch);
    save();
  }

  /** Marca el servicio como hecho. Devuelve el estado anterior para poder deshacer. */
  function marcarRealizado(id) {
    const s = getServicio(id);
    if (!s) return null;
    const antes = { estado: s.estado, fecha: s.fecha, seguimiento: s.seguimiento };
    s.estado = 'realizado';
    // Si se hizo antes de lo agendado, la fecha real es hoy (de ahí se cuenta el seguimiento)
    if (U.diffDays(U.todayStr(), s.fecha) > 0) s.fecha = U.todayStr();
    s.seguimiento = 'pendiente';
    save();
    return antes;
  }

  /** Deshacer de "Ya se hizo": regresa { estado, fecha, seguimiento } a como estaban (POST …/deshacer-realizado). */
  function deshacerRealizado(id, antes) {
    const s = getServicio(id);
    if (!s || !antes) return;
    Object.assign(s, { estado: antes.estado, fecha: antes.fecha, seguimiento: antes.seguimiento });
    save();
  }

  /** Servicios agendados que aún no se hacen, ordenados por fecha y hora. */
  const pendientes = () => data.servicios
    .filter((s) => s.estado === 'pendiente' && !getCliente(s.clienteId)?.bloqueado)
    .sort(sortServ);

  const proximoServicio = (clienteId) => pendientes().find((s) => s.clienteId === clienteId) || null;
  const ultimoRealizado = (clienteId) => serviciosDe(clienteId).find((s) => s.estado === 'realizado') || null;

  /* ------------------------------ Seguimiento ------------------------------ */
  const fechaSeguimiento = (s) => U.addDays(s.fecha, s.seguimientoDias);

  /** Seguimientos de servicios realizados, con la fecha en que toca mandar el WhatsApp. */
  function seguimientos() {
    return data.servicios
      .filter((s) => s.estado === 'realizado')
      .map((s) => ({ servicio: s, cliente: getCliente(s.clienteId), fecha: fechaSeguimiento(s) }))
      .filter((x) => x.cliente)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Mensajes que ya toca (o ya debió) enviar hoy. Excluye clientes bloqueados. */
  const seguimientosPorEnviar = () => seguimientos()
    .filter((x) => x.servicio.seguimiento === 'pendiente' && !x.cliente.bloqueado && x.fecha <= U.todayStr());

  const seguimientosProximos = (dias = 30) => {
    const hoy = U.todayStr();
    const limite = U.addDays(hoy, dias);
    return seguimientos().filter((x) => x.servicio.seguimiento === 'pendiente' && !x.cliente.bloqueado && x.fecha > hoy && x.fecha <= limite);
  };

  const seguimientosEnviados = () => seguimientos()
    .filter((x) => x.servicio.seguimiento === 'enviado')
    .sort((a, b) => (b.servicio.fechaSeguimientoEnviado || '').localeCompare(a.servicio.fechaSeguimientoEnviado || ''));

  function marcarSeguimiento(servicioId, estado) {
    const s = getServicio(servicioId);
    if (!s) return;
    s.seguimiento = estado;
    s.fechaSeguimientoEnviado = estado === 'enviado' ? U.todayStr() : null;
    save();
  }

  /* ------------------------------ Comentarios ------------------------------ */
  const comentariosDe = (clienteId) => data.comentarios
    .filter((m) => m.clienteId === clienteId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimoComentario = (clienteId) => comentariosDe(clienteId)[0] || null;

  function addComentario(clienteId, texto, negativo = false) {
    const m = { id: nuevoId(), clienteId, texto: texto.trim(), fecha: new Date().toISOString(), negativo: !!negativo };
    data.comentarios.push(m);
    save();
    return m;
  }

  function deleteComentario(id) {
    data.comentarios = data.comentarios.filter((m) => m.id !== id);
    save();
  }

  /* ------------------------------ Mensajes ------------------------------ */
  /** Mensaje de seguimiento: el personalizado para ese cliente, o el de la plantilla general. */
  function mensajeSeguimiento(s) {
    return s.mensajeSeguimiento || mensajeSeguimientoOriginal(s);
  }

  /** Guarda (o borra, si viene vacío) el mensaje personalizado de un seguimiento. */
  function setMensajeSeguimiento(servicioId, texto, silent = true) {
    const s = getServicio(servicioId);
    if (!s) return;
    const limpio = (texto || '').trim();
    s.mensajeSeguimiento = limpio && limpio !== mensajeSeguimientoOriginal(s).trim() ? texto : null;
    save(silent);
  }

  function mensajeSeguimientoOriginal(s) {
    const c = getCliente(s.clienteId);
    return U.fillTemplate(data.ajustes.plantillaSeguimiento, {
      nombre: c.nombre, apellido: c.apellido, negocio: data.ajustes.negocio,
      dias: U.diffDays(s.fecha, U.todayStr()), servicio: s.tipo.toLowerCase(), fecha: U.formatDateLong(s.fecha),
    });
  }

  function mensajeRecordatorio(s) {
    const c = getCliente(s.clienteId);
    return U.fillTemplate(data.ajustes.plantillaRecordatorio, {
      nombre: c.nombre, apellido: c.apellido, negocio: data.ajustes.negocio, servicio: s.tipo.toLowerCase(),
      fecha: U.formatDateLong(s.fecha), hora: U.formatTime(s.hora), direccion: c.direccion,
    });
  }

  /* ------------------------------ Ajustes y respaldo ------------------------------ */
  const getAjustes = () => data.ajustes;
  /** Con silent=true guarda sin redibujar (para guardar mientras se escribe). */
  function setAjustes(patch, silent = false) {
    Object.assign(data.ajustes, patch);
    save(silent);
  }
  /** ¿Son los datos de ejemplo? (para no pedir respaldo de la demo) */
  const esDemo = () => data.demo === 2;

  const exportJSON = () => JSON.stringify({ app: 'control-plagas', version: 1, exportado: new Date().toISOString(), ...data }, null, 2);

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.clientes) || !Array.isArray(parsed.servicios) || !Array.isArray(parsed.comentarios)) {
      throw new Error('El archivo no parece un respaldo de esta aplicación.');
    }
    data = {
      clientes: parsed.clientes, servicios: parsed.servicios, comentarios: parsed.comentarios,
      ajustes: { ...DEFAULT_AJUSTES, ...(parsed.ajustes || {}) },
      demo: parsed.demo || 'importado', // un respaldo nunca se reemplaza por la demo
    };
    save();
  }

  function replaceAll(newData) {
    data = { ...newData, ajustes: { ...DEFAULT_AJUSTES, ...(newData.ajustes || {}) } };
    save();
  }

  /** ¿Son los datos de ejemplo de una versión anterior (sin precios)? Entonces conviene recargarlos. */
  const esDemoAntigua = () => data.clientes.some((c) => c.id === 'c01') && data.servicios.some((s) => s.id === 's1') && !data.demo;

  function clearAll() {
    data = { clientes: [], servicios: [], comentarios: [], ajustes: { ...data.ajustes } };
    save();
  }

  return {
    load, save, onChange, nombreCompleto, direccionMapa, getServicios, precioSugerido, getClientes, getCliente, buscarPorTelefono, addCliente, updateCliente,
    deleteCliente, bloquear, desbloquear, getServicio, serviciosDe, addServicio, updateServicio, marcarRealizado,
    pendientes, proximoServicio, ultimoRealizado, fechaSeguimiento, seguimientos, seguimientosPorEnviar,
    seguimientosProximos, seguimientosEnviados, marcarSeguimiento, comentariosDe, ultimoComentario, addComentario,
    deleteComentario, mensajeSeguimiento, mensajeSeguimientoOriginal, setMensajeSeguimiento, mensajeRecordatorio, getAjustes, setAjustes, exportJSON, importJSON,
    replaceAll, clearAll, esDemoAntigua, esDemo, DEFAULT_AJUSTES,
    // Servidor y sesión (docs/API.md §8 y §13)
    iniciar, iniciarSesion, cerrarSesion, usuario, esAdmin, modoLocal, onEstado, hoyServidor, deshacerRealizado,
  };
})();

/* Arranque, navegación y acciones de los botones. */
(() => {
  const main = document.getElementById('main');
  const NAV = [
    { route: 'inicio', label: 'Inicio', icon: 'home' },
    { route: 'clientes', label: 'Clientes', icon: 'users' },
    {
      route: 'agenda', label: 'Agenda', icon: 'calendar',
      badge: () => Store.pendientes().filter((s) => s.fecha <= U.todayStr()).length,
      alert: () => Store.pendientes().some((s) => s.fecha < U.todayStr()),
      badgeLabel: 'servicios para hoy o atrasados',
    },
    { route: 'seguimiento', label: 'Seguimiento', icon: 'whatsapp', badge: () => Store.seguimientosPorEnviar().length, badgeLabel: 'mensajes por enviar' },
    { route: 'negocio', label: 'Negocio', icon: 'chart', soloAdmin: true },
  ];
  // Pantallas que el técnico no puede abrir (docs/API.md §4)
  const SOLO_ADMIN = ['negocio', 'ajustes'];
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Cambia la pantalla con una transición suave (View Transitions) cuando el navegador la soporta. */
  function transicion(fn, tipo = 'page') {
    if (!document.startViewTransition || reduceMotion() || document.hidden) { fn(); return; }
    // A prueba de fallos: si el navegador no ejecuta la transición pronto, la pantalla se actualiza igual
    let hecho = false;
    const run = () => { if (!hecho) { hecho = true; fn(); } };
    document.documentElement.dataset.vt = tipo;
    const t = document.startViewTransition(run);
    setTimeout(run, 250);
    t.finished.catch(() => {}).finally(() => { delete document.documentElement.dataset.vt; });
  }

  /** Números que suben al entrar a una pantalla (una sola vez, no en cada redibujo). */
  function countUp(root) {
    if (reduceMotion()) return;
    const fmt = { money: U.money, pct: (n) => `${Math.round(n)}%`, int: (n) => String(Math.round(n)) };
    root.querySelectorAll('[data-countup]').forEach((el) => {
      const fin = Number(el.dataset.countup);
      const f = fmt[el.dataset.fmt] || fmt.int;
      if (!(fin > 0)) return;
      const t0 = performance.now();
      const dur = 700;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = f(fin * (1 - (1 - k) ** 3));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Navegación ---------- */
  const parseRoute = () => {
    const [, route = 'inicio', param] = (location.hash || '#/inicio').split('/');
    return { route, param };
  };

  function renderNav(active) {
    const navActive = active === 'cliente' ? 'clientes' : active;
    const admin = Store.esAdmin();
    document.getElementById('nav-list').innerHTML = NAV.filter((n) => admin || !n.soloAdmin).map((n) => {
      const b = n.badge ? n.badge() : 0;
      const alerta = n.alert ? n.alert() : false;
      return `<li><a href="#/${n.route}" class="nav__link ${navActive === n.route ? 'is-active' : ''}" ${navActive === n.route ? 'aria-current="page"' : ''}>
        ${Icon(n.icon)}<span>${n.label}</span>${b ? `<span class="nav__badge ${alerta ? 'nav__badge--alert' : ''}" aria-label="${b} ${n.badgeLabel}">${b}</span>` : ''}</a></li>`;
    }).join('');
    const s = document.querySelector('.nav__settings');
    s.className = `nav__settings nav__link ${active === 'ajustes' ? 'is-active' : ''}`;
    s.innerHTML = `${Icon('settings')}<span>Ajustes</span>`;
    s.hidden = !admin;
    document.querySelector('.topbar__settings').hidden = !admin;
    const u = Store.usuario();
    const salir = document.getElementById('btn-salir');
    salir.hidden = !u;
    if (u) { salir.title = `Cerrar sesión (${u.nombre})`; salir.setAttribute('aria-label', salir.title); }
    document.getElementById('brand-name').textContent = Store.getAjustes().negocio;
  }

  let lastRouteKey = '';
  /** Redibuja. Al cambiar de pantalla lo hace con transición; al actualizar datos, en el lugar. */
  function render() {
    const { route, param } = parseRoute();
    const key = `${route}/${param || ''}`;
    if (key !== lastRouteKey && lastRouteKey) transicion(pintar);
    else pintar();
  }

  function pintar() {
    const { route, param } = parseRoute();
    // Los bloqueados viven dentro de Clientes (filtro “Bloqueados”); se respeta el enlace antiguo
    if (route === 'bloqueados') {
      Views.ui.filtroClientes = 'bloqueados';
      location.replace('#/clientes');
      return;
    }
    if (SOLO_ADMIN.includes(route) && !Store.esAdmin()) {
      location.replace('#/inicio');
      return;
    }
    const views = {
      inicio: Views.inicio, clientes: Views.clientes, agenda: Views.agenda, seguimiento: Views.seguimiento,
      ajustes: Views.ajustes, negocio: Views.negocio, cliente: () => Views.cliente(param),
    };
    const view = (views[route] || Views.inicio)();
    const key = `${route}/${param || ''}`;
    const sameRoute = key === lastRouteKey;
    const scroll = window.scrollY;

    // Conservar texto que el usuario esté escribiendo si la pantalla se redibuja
    const draft = document.getElementById('nuevo-comentario')?.value;

    document.getElementById('page-title').textContent = view.title;
    document.getElementById('page-subtitle').textContent = view.subtitle || '';
    // Enlace para regresar (arriba del título, donde la gente lo busca)
    const back = document.getElementById('page-back');
    back.hidden = !view.back;
    if (view.back) { back.href = view.back.href; back.innerHTML = `${Icon('chevronLeft')} ${view.back.label}`; }
    document.getElementById('page-actions').innerHTML = view.actions || '';
    document.title = `${view.title} · ${Store.getAjustes().negocio}`;
    main.innerHTML = `<div class="view">${avisoFecha()}${view.html}</div>`;
    hydrateIcons(main);
    renderNav(route);
    // Las animaciones de entrada (gráficas que crecen, números que suben) solo al llegar a la pantalla
    if (!sameRoute) {
      main.dataset.enter = '1';
      countUp(main);
      clearTimeout(pintar.t);
      pintar.t = setTimeout(() => delete main.dataset.enter, 1400);
    }

    if (sameRoute) {
      window.scrollTo(0, scroll);
      if (draft) document.getElementById('nuevo-comentario').value = draft;
    } else {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    lastRouteKey = key;
  }

  /** Si la fecha del celular o la computadora no coincide con la del servidor, la agenda y los seguimientos saldrían mal. */
  function avisoFecha() {
    const hs = Store.hoyServidor();
    if (!hs || hs === U.todayStr()) return '';
    return `<div class="alert alert--warn" role="alert">${Icon('alert')}<div><strong>La fecha de su equipo no es correcta.</strong>
      Hoy es ${U.formatDateLong(hs, true)}. Corríjala en la configuración del celular o la computadora para que la agenda y los mensajes salgan en el día correcto.</div></div>`;
  }

  let listo = false; // no se dibuja nada hasta tener los datos (y la sesión, si hay servidor)
  window.addEventListener('hashchange', () => { if (listo) render(); });
  Store.onChange(() => { if (listo) render(); });

  /* ---------- Acciones (delegación de eventos) ---------- */
  const actions = {
    'nuevo-cliente': () => Forms.cliente(),
    'editar-cliente': (el) => Forms.cliente(el.dataset.id),
    'agendar-servicio': (el) => Forms.servicio({ clienteId: el.dataset.cliente || null, fecha: el.dataset.fecha || null }),
    'editar-servicio': (el) => Forms.servicio({ servicioId: el.dataset.id }),

    // Se marca al instante (es algo que se hace muchas veces al día) y se ofrece “Deshacer”.
    'servicio-realizado': async (el) => {
      const s = Store.getServicio(el.dataset.id);
      // La fila se despide con una animación corta; el dato se guarda pase lo que pase con la animación
      const fila = el.closest('.svc');
      if (fila && !reduceMotion() && fila.animate) {
        const a = fila.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px)' }], { duration: 220, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        await Promise.race([a.finished, new Promise((r) => setTimeout(r, 260))]);
      }
      const c = Store.getCliente(s.clienteId);
      const antes = Store.marcarRealizado(s.id);
      const seg = U.formatDateShort(Store.fechaSeguimiento(Store.getServicio(s.id)));
      UI.toast(`Servicio de ${U.esc(c.nombre)} marcado como hecho. Seguimiento por WhatsApp el ${seg}.`, 'ok', {
        actionText: 'Deshacer', duration: 8000, onAction: () => Store.deshacerRealizado(s.id, antes),
      });
    },

    'enviar-seguimiento': (el) => {
      const s = Store.getServicio(el.dataset.id);
      const c = Store.getCliente(s.clienteId);
      // Si el mensaje se editó en pantalla, se envía exactamente ese texto
      const caja = document.querySelector(`[data-msg="${s.id}"]`);
      if (caja) {
        if (!caja.value.trim()) {
          UI.toast('El mensaje está vacío. Escriba algo o use “Volver al mensaje original”.', 'error');
          caja.focus();
          return;
        }
        Store.setMensajeSeguimiento(s.id, caja.value);
      }
      const texto = caja ? caja.value : Store.mensajeSeguimiento(s);
      const w = window.open(U.waLink(c.telefono, texto), '_blank');
      if (!w) {
        UI.toast('No se pudo abrir WhatsApp. Revise que el navegador permita abrir ventanas nuevas.', 'error', { duration: 6000 });
        return;
      }
      w.opener = null;
      // No se marca como enviado hasta que la persona confirme al regresar a esta pantalla
      envioPendiente = { id: s.id, nombre: Store.nombreCompleto(c) };
    },

    'editar-mensaje': (el) => {
      const id = el.dataset.id;
      Views.ui.editMsg[id] = !Views.ui.editMsg[id];
      render();
      if (Views.ui.editMsg[id]) {
        const t = document.querySelector(`[data-msg="${id}"]`);
        t?.focus();
        t?.setSelectionRange(t.value.length, t.value.length);
      }
    },

    'ocultar-ayuda': () => {
      Views.ui.ayudaSeguimientoOculta = true;
      Views.pref.set('ayudaSeguimiento', 'oculta');
      render();
    },

    'restaurar-mensaje': (el) => {
      Store.setMensajeSeguimiento(el.dataset.id, '', false);
      UI.toast('Se volvió a poner el mensaje original');
    },

    'omitir-seguimiento': async (el) => {
      const ok = await UI.confirm({ title: 'No enviar mensaje', message: 'Este seguimiento ya no aparecerá en la lista de pendientes. ¿Continuar?', okText: 'Sí, no enviar' });
      if (!ok) return;
      const id = el.dataset.id;
      Store.marcarSeguimiento(id, 'omitido');
      UI.toast('Seguimiento quitado de la lista', 'info', { actionText: 'Deshacer', duration: 6000, onAction: () => Store.marcarSeguimiento(id, 'pendiente') });
    },

    bloquear: (el) => Forms.bloquear(el.dataset.id),
    desbloquear: async (el) => {
      const c = Store.getCliente(el.dataset.id);
      const ok = await UI.confirm({ title: 'Desbloquear cliente', message: `¿Quiere desbloquear a <strong>${U.esc(Store.nombreCompleto(c))}</strong>? Se le podrán volver a agendar servicios.`, okText: 'Sí, desbloquear' });
      if (!ok) return;
      Store.desbloquear(c.id);
      UI.toast(`${U.esc(c.nombre)} fue desbloqueado(a)`);
    },

    'eliminar-cliente': async (el) => {
      const c = Store.getCliente(el.dataset.id);
      const ok = await UI.confirm({
        title: 'Eliminar cliente',
        message: `Se borrará a <strong>${U.esc(Store.nombreCompleto(c))}</strong> con todos sus servicios y comentarios. <strong>Esto no se puede deshacer.</strong><br><br>Si solo no quiere volver a atenderlo, mejor use “Bloquear cliente”.`,
        okText: 'Sí, eliminar para siempre', danger: true,
      });
      if (!ok) return;
      location.hash = '#/clientes';
      Store.deleteCliente(c.id);
      UI.toast('Cliente eliminado', 'info');
    },

    'toggle-historial': (el) => {
      Views.ui.verHistorial[el.dataset.id] = !Views.ui.verHistorial[el.dataset.id];
      render();
    },
    'toggle-comentarios': (el) => {
      Views.ui.verTodosComentarios[el.dataset.id] = !Views.ui.verTodosComentarios[el.dataset.id];
      render();
    },
    'borrar-comentario': async (el) => {
      const ok = await UI.confirm({ title: 'Borrar comentario', message: '¿Seguro que quiere borrar este comentario?', okText: 'Sí, borrar', danger: true });
      if (!ok) return;
      Store.deleteComentario(el.dataset.id);
      UI.toast('Comentario borrado', 'info');
    },

    'agenda-vista': (el) => {
      Views.ui.agendaVista = el.dataset.vista;
      Views.pref.set('agendaVista', el.dataset.vista);
      transicion(pintar, 'swap');
    },
    'cal-mes': (el) => {
      const d = Number(el.dataset.delta);
      Views.ui.calMes = U.addMonths(Views.ui.calMes, d);
      transicion(pintar, d > 0 ? 'next' : 'prev');
    },
    'cal-hoy': () => {
      Views.ui.calMes = U.monthKey(U.todayStr());
      Views.ui.calDia = U.todayStr();
      transicion(pintar, 'swap');
    },
    'cal-dia': (el) => {
      Views.ui.calDia = el.dataset.fecha;
      if (U.monthKey(el.dataset.fecha) !== Views.ui.calMes) Views.ui.calMes = U.monthKey(el.dataset.fecha);
      transicion(pintar, 'day');
    },
    // Desde la gráfica de “Próximos 7 días”: abrir ese día en el calendario
    'ir-dia': (el) => {
      Views.ui.agendaVista = 'calendario';
      Views.ui.calDia = el.dataset.key;
      Views.ui.calMes = U.monthKey(el.dataset.key);
      location.hash = '#/agenda';
    },
    'seg-sel': (el) => {
      Views.ui.segSel = el.dataset.id;
      transicion(pintar, 'day');
      if (window.matchMedia('(max-width: 820px)').matches) document.querySelector('.inbox__detail')?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    },
    periodo: (el) => {
      Views.ui.periodo = Number(el.dataset.n);
      transicion(pintar, 'swap');
      main.dataset.enter = '1';
      setTimeout(() => delete main.dataset.enter, 1400);
    },

    'filtro-clientes': (el) => {
      Views.ui.filtroClientes = el.dataset.filtro;
      render();
    },

    exportar: () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `respaldo-clientes-${U.todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      Views.pref.set('ultimoRespaldo', U.todayStr());
      UI.toast('Respaldo descargado. Guárdelo en un lugar seguro (USB, correo o Drive).', 'ok', { duration: 5000 });
      render();
    },
    // Ajustes: agrega un dato ({nombre}, {fecha}…) donde está el cursor del mensaje
    'insertar-var': (el) => {
      const t = document.getElementById(el.dataset.target);
      if (!t) return;
      const ini = t.selectionStart ?? t.value.length;
      const fin = t.selectionEnd ?? t.value.length;
      t.setRangeText(`{${el.dataset.var}}`, ini, fin, 'end');
      t.focus();
      t.dispatchEvent(new Event('input', { bubbles: true }));
    },
    'restaurar-mensajes': () => {
      const { plantillaSeguimiento, plantillaRecordatorio } = Store.DEFAULT_AJUSTES;
      Store.setAjustes({ plantillaSeguimiento, plantillaRecordatorio });
      UI.toast('Mensajes restaurados');
    },
    'cargar-demo': async () => {
      const ok = await UI.confirm({ title: 'Cargar ejemplos', message: 'Se reemplazará toda la información actual por los clientes de ejemplo. ¿Continuar?', okText: 'Sí, cargar ejemplos', danger: true });
      if (!ok) return;
      Store.replaceAll(buildDemoData());
      UI.toast('Datos de ejemplo cargados');
    },
    'cerrar-sesion': async () => {
      const u = Store.usuario();
      const ok = await UI.confirm({ title: 'Cerrar sesión', message: `¿Quiere cerrar la sesión de <strong>${U.esc(u?.nombre || '')}</strong> en este equipo?`, okText: 'Sí, cerrar sesión' });
      if (!ok) return;
      try {
        await Store.cerrarSesion();
      } catch (err) {
        UI.toast(U.esc(err.message || 'No se pudo cerrar la sesión. Revise su conexión.'), 'error');
        return;
      }
      mostrarLogin();
    },
    reintentar: () => arrancar(),
    'borrar-todo': async () => {
      const ok = await UI.confirm({ title: 'Borrar todos los clientes', message: 'Se borrarán <strong>todos</strong> los clientes, servicios y comentarios. <strong>No se puede deshacer.</strong> Le recomendamos descargar un respaldo antes.', okText: 'Sí, borrar todo', danger: true });
      if (!ok) return;
      Store.clearAll();
      UI.toast('Se borró toda la información', 'info');
    },
  };

  /* ---------- Confirmar envío de WhatsApp al regresar a la app ---------- */
  let envioPendiente = null;
  let preguntando = false;
  async function preguntarEnvio() {
    if (!envioPendiente || preguntando || document.visibilityState !== 'visible') return;
    const { id, nombre } = envioPendiente;
    envioPendiente = null;
    preguntando = true;
    const ok = await UI.confirm({
      title: '¿Se envió el mensaje?',
      message: `¿Alcanzó a enviar el mensaje de WhatsApp a <strong>${U.esc(nombre)}</strong>?`,
      okText: 'Sí, se envió', cancelText: 'No, todavía no',
    });
    preguntando = false;
    if (ok) {
      Store.marcarSeguimiento(id, 'enviado');
      delete Views.ui.editMsg[id];
      UI.toast(`Mensaje a ${U.esc(nombre)} marcado como enviado`, 'ok', {
        actionText: 'Deshacer', duration: 6000, onAction: () => Store.marcarSeguimiento(id, 'pendiente'),
      });
    } else {
      UI.toast('Se queda en la lista de mensajes por enviar', 'info');
    }
  }
  window.addEventListener('focus', () => setTimeout(preguntarEnvio, 300));
  document.addEventListener('visibilitychange', () => setTimeout(preguntarEnvio, 300));

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    e.preventDefault();
    actions[el.dataset.action]?.(el);
  });

  /* ---------- Formularios que viven dentro de las pantallas ---------- */
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.id === 'form-login') {
      e.preventDefault();
      entrar(form);
      return;
    }
    if (form.id === 'form-comentario') {
      e.preventDefault();
      const fd = new FormData(form);
      const texto = (fd.get('texto') || '').trim();
      if (!UI.showErrors(form, texto ? {} : { texto: 'Escriba el comentario antes de agregarlo.' })) return;
      const id = form.dataset.cliente;
      const negativo = !!fd.get('negativo');
      form.querySelector('textarea').value = '';
      Store.addComentario(id, texto, negativo);
      UI.toast('Comentario agregado');
      const c = Store.getCliente(id);
      if (negativo && !c.bloqueado && Store.esAdmin()) {
        const ok = await UI.confirm({ title: 'Comentario negativo', message: `¿Quiere también <strong>bloquear</strong> a ${U.esc(Store.nombreCompleto(c))}?`, okText: 'Sí, bloquear', cancelText: 'No, solo guardar el comentario', danger: true });
        if (ok) Forms.bloquear(id, texto);
      }
    }
    if (form.id === 'form-ajustes') {
      e.preventDefault();
      const fd = new FormData(form);
      Store.setAjustes({
        negocio: (fd.get('negocio') || '').trim() || Store.DEFAULT_AJUSTES.negocio,
        ciudad: (fd.get('ciudad') || '').trim(),
        plantillaSeguimiento: fd.get('plantillaSeguimiento'), plantillaRecordatorio: fd.get('plantillaRecordatorio'),
      });
      UI.toast('Ajustes guardados');
    }
  });

  /** Ajustes: se guardan solos mientras se escribe (sin redibujar, para no perder el cursor). */
  function guardarAjuste(el) {
    let v = el.value;
    if (el.name === 'negocio') v = v.trim() || Store.DEFAULT_AJUSTES.negocio;
    if (el.name === 'ciudad') v = v.trim();
    Store.setAjustes({ [el.name]: v }, true);
    if (el.name === 'negocio') document.getElementById('brand-name').textContent = v;
    const sub = document.getElementById('page-subtitle');
    sub.textContent = 'Cambios guardados';
    sub.classList.add('is-saved');
    clearTimeout(guardarAjuste.t2);
    guardarAjuste.t2 = setTimeout(() => { sub.textContent = 'Los cambios se guardan solos'; sub.classList.remove('is-saved'); }, 2000);
  }

  // Búsqueda de clientes en vivo (sin redibujar toda la pantalla para no perder el cursor)
  document.addEventListener('input', (e) => {
    if (e.target.closest?.('#form-ajustes') && e.target.name) {
      if (e.target.dataset.preview) document.getElementById(e.target.dataset.preview).innerHTML = Views.vistaPrevia(e.target.value);
      clearTimeout(guardarAjuste.t);
      const el = e.target;
      guardarAjuste.t = setTimeout(() => guardarAjuste(el), 450);
      return;
    }
    // Mensaje de WhatsApp personalizado: se guarda solo mientras se escribe
    const msgId = e.target.dataset?.msg;
    if (msgId) {
      Store.setMensajeSeguimiento(msgId, e.target.value);
      const personalizado = !!Store.getServicio(msgId).mensajeSeguimiento;
      const estado = document.querySelector(`[data-msg-status="${msgId}"]`);
      const restaurar = document.querySelector(`[data-action="restaurar-mensaje"][data-id="${msgId}"]`);
      if (estado) estado.hidden = !personalizado;
      if (restaurar) restaurar.hidden = !personalizado;
      return;
    }
    if (e.target.id === 'buscar-clientes') {
      Views.ui.busqueda = e.target.value;
      document.getElementById('lista-clientes').innerHTML = Views.listaClientesHtml();
    }
  });

  // Cargar respaldo
  document.addEventListener('change', async (e) => {
    if (e.target.id !== 'importar' || !e.target.files[0]) return;
    const file = e.target.files[0];
    e.target.value = '';
    const ok = await UI.confirm({ title: 'Cargar respaldo', message: `Se reemplazará la información actual por la del archivo <strong>${U.esc(file.name)}</strong>. ¿Continuar?`, okText: 'Sí, cargar', danger: true });
    if (!ok) return;
    try {
      Store.importJSON(await file.text());
      UI.toast('Respaldo cargado correctamente');
    } catch (err) {
      UI.toast(`No se pudo cargar: ${U.esc(err.message)}`, 'error');
    }
  });

  /* ---------- Inicio de sesión (solo con servidor) ---------- */
  const appEl = document.querySelector('.app');

  function mostrarLogin(aviso = '') {
    listo = false;
    // Las ventanas abiertas se cierran: sin sesión no se puede guardar nada
    document.getElementById('modal-root').replaceChildren();
    document.body.classList.remove('no-scroll');
    appEl.hidden = true;
    let root = document.getElementById('login');
    if (!root) {
      root = document.createElement('main');
      root.id = 'login';
      root.className = 'login';
      document.body.prepend(root);
    }
    root.innerHTML = `
      <form class="login__card" id="form-login" novalidate>
        <img class="login__logo" src="img/logo-hk.svg" alt="" width="56" height="56">
        <h1 class="login__title">${U.esc(Store.getAjustes().negocio)}</h1>
        <p class="login__sub">Entre con su usuario para ver clientes, agenda y seguimientos.</p>
        ${aviso ? `<div class="alert alert--info">${Icon('info')}<div>${aviso}</div></div>` : ''}
        <div class="field"><label for="l-usuario">Usuario</label>
          <input id="l-usuario" name="usuario" autocomplete="username" autocapitalize="none" spellcheck="false"></div>
        <div class="field"><label for="l-contrasena">Contraseña</label>
          <input id="l-contrasena" name="contrasena" type="password" autocomplete="current-password"></div>
        <p class="login__error" id="login-error" role="alert"></p>
        <button class="btn btn--primary btn--lg btn--block" type="submit">Entrar</button>
      </form>`;
    document.title = `Iniciar sesión · ${Store.getAjustes().negocio}`;
    setTimeout(() => root.querySelector('#l-usuario')?.focus(), 50);
  }

  async function entrar(form) {
    const fd = new FormData(form);
    const usuario = (fd.get('usuario') || '').trim();
    const contrasena = fd.get('contrasena') || '';
    const errores = {};
    if (!usuario) errores.usuario = 'Escriba su usuario.';
    if (!contrasena) errores.contrasena = 'Escriba su contraseña.';
    if (!UI.showErrors(form, errores)) return;
    const btn = form.querySelector('[type=submit]');
    const msg = form.querySelector('#login-error');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    msg.textContent = '';
    try {
      await Store.iniciarSesion(usuario, contrasena);
      await arrancar();
    } catch (err) {
      msg.textContent = err.message || 'No se pudo iniciar sesión. Revise su conexión e intente de nuevo.';
      btn.disabled = false;
      btn.textContent = 'Entrar';
      const pass = form.querySelector('[name=contrasena]');
      pass.value = '';
      pass.focus();
    }
  }

  /* ---------- Indicador de guardado (solo con servidor) ---------- */
  const estadoEl = document.getElementById('save-state');
  let estadoT;
  let avisoSinConexion = false;
  const ESTADOS = {
    guardando: { texto: 'Guardando…', clase: '' },
    guardado: { texto: 'Guardado', clase: 'is-ok' },
    'sin-conexion': { texto: 'Sin conexión', clase: 'is-off', title: 'Puede seguir trabajando. Los cambios se guardan cuando vuelva el internet.' },
  };
  function mostrarEstado(nombre) {
    const e = ESTADOS[nombre];
    estadoEl.className = `save-state ${e.clase}`;
    estadoEl.textContent = e.texto;
    estadoEl.title = e.title || '';
    estadoEl.hidden = false;
  }
  Store.onEstado((estado, detalle) => {
    clearTimeout(estadoT);
    if (estado === 'guardando') {
      // Solo se muestra si tarda: guardar rápido no necesita aviso
      estadoT = setTimeout(() => mostrarEstado('guardando'), 400);
    } else if (estado === 'guardado') {
      avisoSinConexion = false;
      if (!estadoEl.hidden) { mostrarEstado('guardado'); estadoT = setTimeout(() => { estadoEl.hidden = true; }, 2000); }
    } else if (estado === 'sin-conexion') {
      mostrarEstado('sin-conexion');
      if (!avisoSinConexion) {
        avisoSinConexion = true;
        UI.toast('Se perdió la conexión. Puede seguir trabajando; los cambios se guardarán cuando vuelva el internet.', 'info', { duration: 6000 });
      }
    } else if (estado === 'error') {
      estadoEl.hidden = true;
      UI.toast(U.esc(detalle || 'No se pudo guardar el último cambio. Intente de nuevo.'), 'error', { duration: 7000 });
    } else if (estado === 'sin-sesion') {
      estadoEl.hidden = true;
      mostrarLogin('Su sesión terminó. Vuelva a entrar; lo que no se había guardado se guarda al entrar.');
    }
  });

  /* ---------- Arranque ---------- */
  async function arrancar() {
    listo = false;
    // Con servidor la descarga puede tardar; en modo local esto no se alcanza a ver
    if (appEl.hidden === false) main.innerHTML = '<div class="loading" role="status"><span class="loading__dot"></span>Cargando su información…</div>';
    try {
      const conSesion = await Store.iniciar();
      if (!conSesion) { mostrarLogin(); return; }
    } catch (err) {
      appEl.hidden = false;
      document.getElementById('login')?.remove();
      main.innerHTML = `<div class="empty"><h3>No se pudo cargar la información</h3>
        <p>${U.esc(err.message || 'Revise su conexión a internet.')}</p>
        <button class="btn btn--primary" data-action="reintentar">${Icon('refresh')} Intentar de nuevo</button></div>`;
      return;
    }
    document.getElementById('login')?.remove();
    appEl.hidden = false;
    listo = true;
    lastRouteKey = '';
    if (!location.hash) location.hash = '#/inicio';
    render();
  }

  hydrateIcons(document);
  Charts.init();
  arrancar();
})();

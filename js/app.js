/* Arranque, navegación y acciones de los botones. */
(() => {
  const main = document.getElementById('main');
  const NAV = [
    { route: 'inicio', label: 'Inicio', icon: 'home' },
    { route: 'clientes', label: 'Clientes', icon: 'users' },
    { route: 'agenda', label: 'Agenda', icon: 'calendar', badge: () => Store.pendientes().filter((s) => s.fecha <= U.todayStr()).length },
    { route: 'seguimiento', label: 'Seguimiento', icon: 'whatsapp', badge: () => Store.seguimientosPorEnviar().length },
    { route: 'bloqueados', label: 'Bloqueados', icon: 'ban' },
  ];

  /* ---------- Navegación ---------- */
  const parseRoute = () => {
    const [, route = 'inicio', param] = (location.hash || '#/inicio').split('/');
    return { route, param };
  };

  function renderNav(active) {
    const navActive = active === 'cliente' ? 'clientes' : active;
    document.getElementById('nav-list').innerHTML = NAV.map((n) => {
      const b = n.badge ? n.badge() : 0;
      return `<li><a href="#/${n.route}" class="nav__link ${navActive === n.route ? 'is-active' : ''}" ${navActive === n.route ? 'aria-current="page"' : ''}>
        ${Icon(n.icon)}<span>${n.label}</span>${b ? `<span class="nav__badge" aria-label="${b} pendientes">${b}</span>` : ''}</a></li>`;
    }).join('');
    const s = document.querySelector('.nav__settings');
    s.className = `nav__settings nav__link ${active === 'ajustes' ? 'is-active' : ''}`;
    s.innerHTML = `${Icon('settings')}<span>Ajustes</span>`;
    document.getElementById('brand-name').textContent = Store.getAjustes().negocio;
  }

  let lastRouteKey = '';
  function render() {
    const { route, param } = parseRoute();
    const views = {
      inicio: Views.inicio, clientes: Views.clientes, agenda: Views.agenda, seguimiento: Views.seguimiento,
      bloqueados: Views.bloqueados, ajustes: Views.ajustes, cliente: () => Views.cliente(param),
    };
    const view = (views[route] || Views.inicio)();
    const key = `${route}/${param || ''}`;
    const sameRoute = key === lastRouteKey;
    const scroll = window.scrollY;

    // Conservar texto que el usuario esté escribiendo si la pantalla se redibuja
    const draft = document.getElementById('nuevo-comentario')?.value;

    document.getElementById('page-title').textContent = view.title;
    document.getElementById('page-subtitle').textContent = view.subtitle || '';
    document.title = `${view.title} · ${Store.getAjustes().negocio}`;
    main.innerHTML = `<div class="view">${view.html}</div>`;
    // En Inicio ya hay un botón grande para registrar; no repetirlo arriba
    document.querySelector('.topbar__new').hidden = route === 'inicio';
    renderNav(route);

    if (sameRoute) {
      window.scrollTo(0, scroll);
      if (draft) document.getElementById('nuevo-comentario').value = draft;
    } else {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    lastRouteKey = key;
  }

  window.addEventListener('hashchange', render);
  Store.onChange(() => render());

  /* ---------- Acciones (delegación de eventos) ---------- */
  const actions = {
    'nuevo-cliente': () => Forms.cliente(),
    'editar-cliente': (el) => Forms.cliente(el.dataset.id),
    'agendar-servicio': (el) => Forms.servicio({ clienteId: el.dataset.cliente || null }),
    'editar-servicio': (el) => Forms.servicio({ servicioId: el.dataset.id }),

    'servicio-realizado': async (el) => {
      const s = Store.getServicio(el.dataset.id);
      const c = Store.getCliente(s.clienteId);
      const plazo = s.seguimientoDias === 30 ? '1 mes' : `${s.seguimientoDias} días`;
      const ok = await UI.confirm({
        title: '¿Ya se hizo el servicio?',
        message: `Se marcará como <strong>realizado</strong> el servicio de <strong>${U.esc(s.tipo)}</strong> de <strong>${U.esc(Store.nombreCompleto(c))}</strong>.<br><br>En <strong>${plazo}</strong> el sistema le recordará enviarle el mensaje de seguimiento.`,
        okText: 'Sí, ya se hizo',
      });
      if (!ok) return;
      Store.marcarRealizado(s.id);
      UI.toast('Servicio marcado como hecho. ¡Buen trabajo!');
    },

    'enviar-seguimiento': (el) => {
      const s = Store.getServicio(el.dataset.id);
      const c = Store.getCliente(s.clienteId);
      window.open(U.waLink(c.telefono, Store.mensajeSeguimiento(s)), '_blank', 'noopener');
      Store.marcarSeguimiento(s.id, 'enviado');
      UI.toast(`Mensaje para ${U.esc(c.nombre)} marcado como enviado`, 'ok', {
        actionText: 'Deshacer', duration: 6000, onAction: () => Store.marcarSeguimiento(s.id, 'pendiente'),
      });
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
      UI.toast('Respaldo descargado');
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
    'borrar-todo': async () => {
      const ok = await UI.confirm({ title: 'Borrar todos los clientes', message: 'Se borrarán <strong>todos</strong> los clientes, servicios y comentarios. <strong>No se puede deshacer.</strong> Le recomendamos descargar un respaldo antes.', okText: 'Sí, borrar todo', danger: true });
      if (!ok) return;
      Store.clearAll();
      UI.toast('Se borró toda la información', 'info');
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    e.preventDefault();
    actions[el.dataset.action]?.(el);
  });

  /* ---------- Formularios que viven dentro de las pantallas ---------- */
  document.addEventListener('submit', async (e) => {
    const form = e.target;
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
      if (negativo && !c.bloqueado) {
        const ok = await UI.confirm({ title: 'Comentario negativo', message: `¿Quiere también <strong>bloquear</strong> a ${U.esc(Store.nombreCompleto(c))}?`, okText: 'Sí, bloquear', cancelText: 'No, solo guardar el comentario', danger: true });
        if (ok) Forms.bloquear(id, texto);
      }
    }
    if (form.id === 'form-ajustes') {
      e.preventDefault();
      const fd = new FormData(form);
      Store.setAjustes({
        negocio: (fd.get('negocio') || '').trim() || 'Control de Plagas',
        plantillaSeguimiento: fd.get('plantillaSeguimiento'), plantillaRecordatorio: fd.get('plantillaRecordatorio'),
      });
      UI.toast('Ajustes guardados');
    }
  });

  // Búsqueda de clientes en vivo (sin redibujar toda la pantalla para no perder el cursor)
  document.addEventListener('input', (e) => {
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

  /* ---------- Inicio ---------- */
  hydrateIcons(document);
  if (!Store.load()) Store.replaceAll(buildDemoData()); // primera vez: cargar demo
  if (!location.hash) location.hash = '#/inicio';
  render();
})();

/* Pantallas de la aplicación. Cada una devuelve { title, subtitle, html }. */
const Views = (() => {
  const esc = U.esc;
  const ui = { filtroClientes: 'todos', busqueda: '', verTodosComentarios: {} };

  /* ============================== INICIO ============================== */
  function inicio() {
    const hoy = U.todayStr();
    const pend = Store.pendientes();
    const deHoy = pend.filter((s) => s.fecha === hoy);
    const atrasados = pend.filter((s) => s.fecha < hoy);
    const semana = pend.filter((s) => s.fecha > hoy && s.fecha <= U.addDays(hoy, 7));
    const porEnviar = Store.seguimientosPorEnviar();
    const activos = Store.getClientes().filter((c) => !c.bloqueado).length;
    const negocio = Store.getAjustes().negocio;

    const h = new Date().getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

    const tile = (href, icon, n, label, kind) => `
      <a class="tile tile--${kind}" href="${href}">
        <span class="tile__icon">${Icon(icon)}</span>
        <span class="tile__num">${n}</span>
        <span class="tile__label">${label}</span>
      </a>`;

    const pendientesHoy = [...atrasados, ...deHoy];
    return {
      title: `${saludo} 👋`,
      subtitle: `Hoy es ${U.formatDateLong(hoy, true)} · ${esc(negocio)}`,
      html: `
        <div class="quick-actions">
          <button class="big-action big-action--primary" data-action="nuevo-cliente">
            ${Icon('plus')}<span><strong>Registrar cliente</strong><small>Cliente nuevo y su servicio</small></span></button>
          <button class="big-action" data-action="agendar-servicio">
            ${Icon('calendar')}<span><strong>Agendar servicio</strong><small>Para un cliente que ya existe</small></span></button>
        </div>

        <div class="tiles">
          ${tile('#/agenda', 'clock', deHoy.length, deHoy.length === 1 ? 'Servicio para hoy' : 'Servicios para hoy', 'warn')}
          ${tile('#/seguimiento', 'whatsapp', porEnviar.length, porEnviar.length === 1 ? 'Mensaje por enviar' : 'Mensajes por enviar', 'wa')}
          ${tile('#/agenda', 'calendar', semana.length, 'Próximos 7 días', 'info')}
          ${tile('#/clientes', 'users', activos, 'Clientes activos', 'neutral')}
        </div>

        ${atrasados.length ? `<div class="alert alert--danger alert--big">${Icon('alert')}<div><strong>Hay ${U.plural(atrasados.length, 'servicio atrasado', 'servicios atrasados')}.</strong> La fecha ya pasó y no se marcaron como hechos. <a href="#/agenda">Revisar agenda</a></div></div>` : ''}

        <div class="two-col">
          ${C.section(atrasados.length ? 'Servicios de hoy y atrasados' : 'Servicios de hoy', pendientesHoy.length,
            pendientesHoy.length ? `<div class="stack">${pendientesHoy.map((s) => C.servicioCard(s)).join('')}</div>`
              : C.empty('check', 'No hay servicios para hoy', 'Puede agendar uno con el botón “Agendar servicio”.'),
            { icon: 'clock' })}
          ${C.section('Mensajes de seguimiento por enviar', porEnviar.length,
            porEnviar.length ? `<div class="stack">${porEnviar.slice(0, 3).map((x) => C.seguimientoCard(x)).join('')}</div>
              ${porEnviar.length > 3 ? `<a class="btn btn--soft btn--block" href="#/seguimiento">Ver los ${porEnviar.length} mensajes ${Icon('chevronRight')}</a>` : ''}`
              : C.empty('message', 'Todo al día', 'No hay mensajes de seguimiento pendientes hoy.'),
            { icon: 'whatsapp' })}
        </div>`,
    };
  }

  /* ============================== CLIENTES ============================== */
  function clientes() {
    const todos = Store.getClientes();
    const filtros = [
      ['todos', 'Todos', todos.filter((c) => !c.bloqueado).length],
      ['pendiente', 'Con servicio agendado', todos.filter((c) => !c.bloqueado && Store.proximoServicio(c.id)).length],
      ['bloqueados', 'Bloqueados', todos.filter((c) => c.bloqueado).length],
    ];
    return {
      title: 'Clientes',
      subtitle: `${U.plural(todos.length, 'cliente registrado', 'clientes registrados')}`,
      html: `
        <div class="toolbar">
          <div class="search search--lg"><span class="search__icon">${Icon('search')}</span>
            <input id="buscar-clientes" type="search" placeholder="Buscar por nombre, teléfono o dirección" value="${esc(ui.busqueda)}" aria-label="Buscar cliente"></div>
          <div class="segmented" role="group" aria-label="Mostrar">
            ${filtros.map(([k, l, n]) => `<button type="button" aria-pressed="${ui.filtroClientes === k}" data-action="filtro-clientes" data-filtro="${k}">${l} <span class="count">${n}</span></button>`).join('')}
          </div>
        </div>
        <div id="lista-clientes" class="grid-cards">${listaClientesHtml()}</div>`,
    };
  }

  function listaClientesHtml() {
    const q = U.norm(ui.busqueda.trim());
    const qd = U.phoneDigits(ui.busqueda);
    let list = Store.getClientes().filter((c) => {
      if (ui.filtroClientes === 'bloqueados') return c.bloqueado;
      if (c.bloqueado) return false;
      if (ui.filtroClientes === 'pendiente') return !!Store.proximoServicio(c.id);
      return true;
    });
    if (q) {
      list = list.filter((c) => U.norm(`${c.nombre} ${c.apellido} ${c.direccion}`).includes(q) || (qd.length >= 3 && c.telefono.includes(qd)));
    }
    // Orden alfabético: es el más fácil de entender para encontrar a alguien
    list.sort((a, b) => Store.nombreCompleto(a).localeCompare(Store.nombreCompleto(b), 'es'));
    if (!list.length) {
      return q ? C.empty('search', 'No se encontró ningún cliente', `Revise cómo lo escribió o registre uno nuevo.`, `<button class="btn btn--primary btn--lg" data-action="nuevo-cliente">${Icon('plus')} Registrar cliente</button>`)
        : ui.filtroClientes === 'bloqueados' ? C.empty('check', 'No hay clientes bloqueados', 'Qué bueno. 🙂')
          : C.empty('users', 'Todavía no hay clientes aquí', '', `<button class="btn btn--primary btn--lg" data-action="nuevo-cliente">${Icon('plus')} Registrar cliente</button>`);
    }
    return list.map(C.clienteCard).join('');
  }

  /* ============================== DETALLE DE CLIENTE ============================== */
  function cliente(id) {
    const c = Store.getCliente(id);
    if (!c) {
      return { title: 'Cliente no encontrado', html: C.empty('users', 'Este cliente ya no existe', 'Puede que se haya eliminado.', '<a class="btn btn--primary btn--lg" href="#/clientes">Ir a Clientes</a>') };
    }
    const comentarios = Store.comentariosDe(id);
    const verTodos = ui.verTodosComentarios[id];
    const servicios = Store.serviciosDe(id);
    const prox = Store.proximoServicio(id);
    const ult = Store.ultimoRealizado(id);

    // Primero se ve el comentario más reciente; los demás se despliegan con un botón.
    const comentariosHtml = `
      ${comentarios.length ? `
        <ul class="comments">
          ${(verTodos ? comentarios : comentarios.slice(0, 1)).map((m, i) => C.comentarioItem(m, { highlight: i === 0 })).join('')}
        </ul>
        ${comentarios.length > 1 ? `<button class="btn btn--soft btn--block" data-action="toggle-comentarios" data-id="${id}" aria-expanded="${!!verTodos}">
          ${verTodos ? 'Mostrar solo el más reciente' : `Ver todos los comentarios (${comentarios.length})`}</button>` : ''}`
        : '<p class="muted">Todavía no hay comentarios.</p>'}
      <form class="comment-form" id="form-comentario" data-cliente="${id}" novalidate>
        <div class="field">
          <label for="nuevo-comentario">Agregar un comentario nuevo</label>
          <textarea id="nuevo-comentario" name="texto" rows="2" placeholder="Ej. Se revisó la cocina, quedó satisfecho…"></textarea>
        </div>
        <div class="comment-form__row">
          <label class="check"><input type="checkbox" name="negativo"> <span>Es un comentario <strong>negativo</strong> (problema con el cliente)</span></label>
          <button class="btn btn--primary" type="submit">${Icon('plus')} Agregar comentario</button>
        </div>
      </form>`;

    const historialHtml = servicios.length ? `
      <ol class="timeline">
        ${servicios.map((s) => {
          const segFecha = Store.fechaSeguimiento(s);
          let seg = '';
          if (s.estado === 'realizado') {
            seg = s.seguimiento === 'enviado' ? `WhatsApp de seguimiento enviado el ${U.formatDateShort(s.fechaSeguimientoEnviado)}`
              : s.seguimiento === 'omitido' ? 'Seguimiento no enviado'
                : `Seguimiento por WhatsApp: ${U.formatDateShort(segFecha)} (${U.relativeDay(segFecha).toLowerCase()})`;
          }
          return `
          <li class="timeline__item timeline__item--${s.estado}">
            <div class="timeline__head">
              <strong>${esc(s.tipo)}</strong> ${C.estadoServicio(s)}
            </div>
            <p>${Icon('calendar')} ${U.capitalize(U.formatDateLong(s.fecha))}${s.hora ? ` · ${U.formatTime(s.hora)}` : ''}</p>
            ${seg ? `<p class="muted">${Icon('whatsapp')} ${seg}</p>` : ''}
            ${s.estado === 'pendiente' ? `<div class="btn-row">
              <button class="btn btn--primary btn--sm" data-action="servicio-realizado" data-id="${s.id}">${Icon('check')} Ya se hizo</button>
              <button class="btn btn--ghost btn--sm" data-action="editar-servicio" data-id="${s.id}">${Icon('edit')} Cambiar</button></div>` : ''}
          </li>`;
        }).join('')}
      </ol>` : '<p class="muted">Sin servicios registrados.</p>';

    return {
      title: Store.nombreCompleto(c),
      subtitle: `Cliente desde el ${U.formatDateLong(c.fechaRegistro, true)}`,
      back: '#/clientes',
      html: `
        <a class="back-link" href="#/clientes">${Icon('chevronLeft')} Volver a clientes</a>
        ${c.bloqueado ? `
          <div class="alert alert--danger alert--big">${Icon('ban')}<div>
            <strong>Cliente bloqueado</strong> desde el ${U.formatDateLong(c.fechaBloqueo, true)}.<br>Motivo: ${esc(c.motivoBloqueo)}</div>
            <button class="btn btn--soft" data-action="desbloquear" data-id="${id}">${Icon('unlock')} Desbloquear</button></div>` : ''}

        <div class="detail">
          <div class="detail__main">
            <section class="card profile">
              <div class="profile__head">
                ${C.avatar(c)}
                <div>
                  <h2>${esc(Store.nombreCompleto(c))}</h2>
                  ${c.bloqueado ? C.badge('Bloqueado', 'danger', 'ban') : C.badge('Activo', 'ok', 'check')}
                </div>
              </div>
              <dl class="profile__data">
                <div><dt>${Icon('phone')} Teléfono</dt><dd><a href="${U.telLink(c.telefono)}">${esc(U.phoneDisplay(c.telefono))}</a></dd></div>
                <div><dt>${Icon('pin')} Dirección</dt><dd><a href="${U.mapsLink(c.direccion)}" target="_blank" rel="noopener">${esc(c.direccion)}</a></dd></div>
                <div><dt>${Icon('history')} Último servicio</dt><dd>${ult ? `${U.capitalize(U.formatDateLong(ult.fecha))} · ${esc(ult.tipo)}` : 'Ninguno'}</dd></div>
                <div><dt>${Icon('calendar')} Próximo servicio</dt><dd>${prox ? `<strong>${U.capitalize(U.formatDateLong(prox.fecha))} a las ${U.formatTime(prox.hora)}</strong>` : 'No tiene'}</dd></div>
              </dl>
              ${C.contactButtons(c)}
              <div class="btn-row">
                ${c.bloqueado ? '' : `<button class="btn btn--primary btn--lg" data-action="agendar-servicio" data-cliente="${id}">${Icon('calendar')} Registrar o agendar servicio</button>`}
                <button class="btn btn--ghost" data-action="editar-cliente" data-id="${id}">${Icon('edit')} Editar datos</button>
              </div>
            </section>

            ${C.section('Comentarios', comentarios.length, `<div class="card">${comentariosHtml}</div>`, { icon: 'comment' })}
          </div>

          <aside class="detail__side">
            ${C.section('Historial de servicios', servicios.length, `<div class="card">${historialHtml}</div>`, { icon: 'history' })}
            <section class="card admin-box">
              <h3>${Icon('settings')} Opciones del administrador</h3>
              ${c.bloqueado
                ? `<button class="btn btn--soft btn--block" data-action="desbloquear" data-id="${id}">${Icon('unlock')} Desbloquear cliente</button>`
                : `<button class="btn btn--danger-ghost btn--block" data-action="bloquear" data-id="${id}">${Icon('ban')} Bloquear cliente</button>`}
              <button class="btn btn--ghost btn--block btn--sm" data-action="eliminar-cliente" data-id="${id}">${Icon('trash')} Eliminar cliente para siempre</button>
            </section>
          </aside>
        </div>`,
    };
  }

  /* ============================== AGENDA ============================== */
  function agenda() {
    const hoy = U.todayStr();
    const pend = Store.pendientes();
    const grupos = [
      ['Atrasados', 'Ya pasó la fecha. Márquelos como hechos o cámbielos de día.', pend.filter((s) => s.fecha < hoy), 'danger', 'alert'],
      ['Hoy', U.capitalize(U.formatDateLong(hoy)), pend.filter((s) => s.fecha === hoy), 'warn', 'clock'],
      ['Mañana', U.capitalize(U.formatDateLong(U.addDays(hoy, 1))), pend.filter((s) => s.fecha === U.addDays(hoy, 1)), '', 'calendar'],
      ['Esta semana', 'Próximos 7 días', pend.filter((s) => s.fecha > U.addDays(hoy, 1) && s.fecha <= U.addDays(hoy, 7)), '', 'calendar'],
      ['Más adelante', '', pend.filter((s) => s.fecha > U.addDays(hoy, 7)), '', 'calendar'],
    ];
    return {
      title: 'Servicios pendientes',
      subtitle: `${U.plural(pend.length, 'servicio agendado', 'servicios agendados')}, ordenados por fecha y hora`,
      html: `
        <div class="toolbar toolbar--end">
          <button class="btn btn--primary btn--lg" data-action="agendar-servicio">${Icon('plus')} Agendar servicio</button>
        </div>
        ${pend.length ? grupos.filter((g) => g[2].length).map(([t, note, list, kind, icon]) =>
          C.section(t, list.length, `<div class="stack">${list.map((s) => C.servicioCard(s)).join('')}</div>`, { kind, icon, note })).join('')
          : C.empty('calendar', 'No hay servicios agendados', 'Cuando agende un servicio aparecerá aquí con la fecha y hora.', `<button class="btn btn--primary btn--lg" data-action="agendar-servicio">${Icon('plus')} Agendar servicio</button>`)}`,
    };
  }

  /* ============================== SEGUIMIENTO ============================== */
  function seguimiento() {
    const porEnviar = Store.seguimientosPorEnviar();
    const proximos = Store.seguimientosProximos(30);
    const enviados = Store.seguimientosEnviados().slice(0, 10);
    return {
      title: 'Seguimiento por WhatsApp',
      subtitle: 'Mensajes a clientes 15 días, 20 días o 1 mes después de su servicio',
      html: `
        <div class="alert alert--info">${Icon('info')}<div>
          <strong>¿Cómo funciona?</strong> Toque <strong>“Enviar por WhatsApp”</strong>. Se abrirá WhatsApp con el mensaje ya escrito;
          solo presione <strong>enviar</strong> ✈️. El sistema lo marca como enviado para que no se le olvide a quién ya le escribió.</div></div>
        ${C.section('Por enviar hoy', porEnviar.length,
          porEnviar.length ? `<div class="stack">${porEnviar.map((x) => C.seguimientoCard(x)).join('')}</div>`
            : C.empty('check', '¡Todo al día!', 'No hay mensajes pendientes por enviar hoy.'),
          { icon: 'whatsapp', kind: porEnviar.length ? 'wa' : '' })}
        ${C.section('Próximos 30 días', proximos.length,
          proximos.length ? `<div class="grid-cards">${proximos.map((x) => C.seguimientoCard(x, { mode: 'proximo' })).join('')}</div>`
            : '<p class="muted">No hay seguimientos en los próximos 30 días.</p>',
          { icon: 'calendar' })}
        ${C.section('Enviados recientemente', enviados.length,
          enviados.length ? `<div class="grid-cards">${enviados.map((x) => C.seguimientoCard(x, { mode: 'enviado' })).join('')}</div>`
            : '<p class="muted">Aún no se ha enviado ningún mensaje.</p>',
          { icon: 'check' })}`,
    };
  }

  /* ============================== BLOQUEADOS ============================== */
  function bloqueados() {
    const list = Store.getClientes().filter((c) => c.bloqueado)
      .sort((a, b) => (b.fechaBloqueo || '').localeCompare(a.fechaBloqueo || ''));
    return {
      title: 'Clientes bloqueados',
      subtitle: 'Clientes a los que ya no se les da servicio',
      html: list.length ? `
        <div class="alert alert--info">${Icon('info')}<div>A estos clientes <strong>no se les pueden agendar servicios</strong> ni se les envían mensajes de seguimiento. Si alguien con su teléfono se vuelve a registrar, el sistema le avisará.</div></div>
        <div class="stack">${list.map((c) => {
          const neg = Store.comentariosDe(c.id).filter((m) => m.negativo && !m.texto.startsWith('🚫'));
          return `
          <article class="card blocked-card">
            <div class="blocked-card__head">
              ${C.avatar(c)}
              <div><a href="#/cliente/${c.id}" class="blocked-card__name">${esc(Store.nombreCompleto(c))}</a>
                <p class="muted">${esc(U.phoneDisplay(c.telefono))} · ${esc(c.direccion)}</p></div>
              ${C.badge(`Desde ${U.formatDateShort(c.fechaBloqueo)}`, 'danger', 'ban')}
            </div>
            <p class="blocked-card__reason"><strong>Motivo:</strong> ${esc(c.motivoBloqueo)}</p>
            ${neg.length ? `<p class="muted">${U.plural(neg.length, 'comentario negativo', 'comentarios negativos')} en su historial.</p>` : ''}
            <div class="btn-row">
              <a class="btn btn--ghost" href="#/cliente/${c.id}">Ver cliente</a>
              <button class="btn btn--soft" data-action="desbloquear" data-id="${c.id}">${Icon('unlock')} Desbloquear</button>
            </div>
          </article>`;
        }).join('')}</div>`
        : C.empty('check', 'No hay clientes bloqueados', 'Para bloquear a un cliente, entre a su ficha y use “Bloquear cliente”.'),
    };
  }

  /* ============================== AJUSTES ============================== */
  function ajustes() {
    const a = Store.getAjustes();
    return {
      title: 'Ajustes',
      subtitle: 'Datos del negocio, mensajes y respaldo',
      html: `
        <form id="form-ajustes" class="card settings" novalidate>
          <h2>Datos del negocio</h2>
          <div class="field"><label for="a-negocio">Nombre del negocio</label>
            <input id="a-negocio" name="negocio" value="${esc(a.negocio)}"></div>

          <h2>Mensajes de WhatsApp</h2>
          <p class="hint">Puede usar estas palabras entre llaves y el sistema las cambia automáticamente:
            <code>{nombre}</code> <code>{negocio}</code> <code>{servicio}</code> <code>{dias}</code> <code>{fecha}</code> <code>{hora}</code> <code>{direccion}</code></p>
          <div class="field"><label for="a-seg">Mensaje de seguimiento (después del servicio)</label>
            <textarea id="a-seg" name="plantillaSeguimiento" rows="6">${esc(a.plantillaSeguimiento)}</textarea></div>
          <div class="field"><label for="a-rec">Mensaje de recordatorio (antes del servicio)</label>
            <textarea id="a-rec" name="plantillaRecordatorio" rows="6">${esc(a.plantillaRecordatorio)}</textarea></div>
          <div class="btn-row">
            <button class="btn btn--primary btn--lg" type="submit">${Icon('check')} Guardar ajustes</button>
            <button class="btn btn--ghost" type="button" data-action="restaurar-mensajes">Restaurar mensajes originales</button>
          </div>
        </form>

        <section class="card settings">
          <h2>Respaldo de la información</h2>
          <p class="hint">La información se guarda en <strong>este navegador</strong>. Descargue un respaldo de vez en cuando para no perderla
            (por ejemplo, si cambia de computadora o borra el historial).</p>
          <div class="btn-row">
            <button class="btn btn--soft btn--lg" data-action="exportar">${Icon('download')} Descargar respaldo</button>
            <label class="btn btn--ghost btn--lg">${Icon('upload')} Cargar respaldo<input type="file" accept="application/json,.json" id="importar" hidden></label>
          </div>
        </section>

        <section class="card settings settings--danger">
          <h2>Datos de demostración</h2>
          <p class="hint">Esta versión trae clientes de ejemplo para probar el sistema. Cuando vaya a usarlo de verdad, borre los datos de ejemplo.</p>
          <div class="btn-row">
            <button class="btn btn--soft" data-action="cargar-demo">${Icon('refresh')} Volver a cargar ejemplos</button>
            <button class="btn btn--danger-ghost" data-action="borrar-todo">${Icon('trash')} Borrar todos los clientes</button>
          </div>
        </section>`,
    };
  }

  return { inicio, clientes, listaClientesHtml, cliente, agenda, seguimiento, bloqueados, ajustes, ui };
})();

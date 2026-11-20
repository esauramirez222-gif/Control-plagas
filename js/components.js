/* Bloques visuales reutilizables (filas, tarjetas, etiquetas, estados vacíos). Devuelven HTML. */
const C = (() => {
  const esc = U.esc;

  const avatar = (c) => {
    const ini = `${c.nombre[0] || ''}${c.apellido[0] || ''}`.toUpperCase();
    return `<span class="avatar ${c.bloqueado ? 'avatar--blocked' : ''}" aria-hidden="true">${esc(ini)}</span>`;
  };

  const badge = (text, kind = 'neutral', icon) =>
    `<span class="badge badge--${kind}">${icon ? Icon(icon) : ''}${esc(text)}</span>`;

  const empty = (icon, title, text = '', action = '') => `
    <div class="empty">
      <span class="empty__icon">${Icon(icon)}</span>
      <h3>${title}</h3>
      ${text ? `<p>${text}</p>` : ''}
      ${action}
    </div>`;

  /** Sección con título y conteo. `aside` va a la derecha del título (p. ej. un enlace “Ver todo”). */
  const section = (title, count, inner, { kind = '', note = '', aside = '' } = {}) => `
    <section class="section ${kind ? `section--${kind}` : ''}">
      <div class="section__head">
        <h2 class="section__title">${kind === 'danger' ? Icon('alert') : ''}${title}${count != null ? `<span class="count">${count}</span>` : ''}</h2>
        ${aside}
      </div>
      ${note ? `<p class="section__note">${note}</p>` : ''}
      ${inner}
    </section>`;

  const plazoTexto = (dias) => (dias === 30 ? '1 mes' : `${dias} días`);

  /** Botones de contacto rápido. */
  const contactButtons = (c) => `
    <div class="btn-row">
      <a class="btn btn--ghost" href="${U.telLink(c.telefono)}">${Icon('phone')} Llamar</a>
      <a class="btn btn--wa-ghost" href="${U.waLink(c.telefono, `Hola ${c.nombre}, `)}" target="_blank" rel="noopener">${Icon('whatsapp')} WhatsApp</a>
    </div>`;

  const estadoServicio = (s) => {
    if (s.estado === 'realizado') return badge('Realizado', 'ok', 'check');
    if (s.estado === 'cancelado') return badge('Cancelado', 'neutral');
    const n = U.diffDays(U.todayStr(), s.fecha);
    if (n < 0) return badge(`Atrasado ${U.plural(-n, 'día', 'días')}`, 'danger');
    if (n === 0) return badge('Hoy', 'warn');
    return badge('Pendiente', 'info');
  };

  /* ------------------------------ Clientes ------------------------------ */
  const clientesHeader = () => `
    <div class="client-row client-row--head" aria-hidden="true">
      <span>Cliente</span><span>Dirección y último servicio</span><span>Último comentario</span><span>Próximo servicio</span><span></span>
    </div>`;

  /** Fila de cliente para la lista. */
  function clienteRow(c) {
    const ultimo = Store.ultimoComentario(c.id);
    const prox = Store.proximoServicio(c.id);
    const ult = Store.ultimoRealizado(c.id);
    let estado = '<span class="muted">Ninguno</span>';
    if (c.bloqueado) estado = badge('Bloqueado', 'danger', 'ban');
    else if (prox) {
      const n = U.diffDays(U.todayStr(), prox.fecha);
      estado = badge(n < 0 ? 'Atrasado' : U.relativeDay(prox.fecha), n < 0 ? 'danger' : n === 0 ? 'warn' : 'info');
    }
    const nota = c.bloqueado
      ? `<span class="client-row__note is-negative">Motivo: ${esc(c.motivoBloqueo)}</span>`
      : ultimo ? `<span class="client-row__note ${ultimo.negativo ? 'is-negative' : ''}">${esc(ultimo.texto)}</span>` : '<span class="muted">Sin comentarios</span>';
    return `
      <a class="client-row ${c.bloqueado ? 'client-row--blocked' : ''}" href="#/cliente/${c.id}">
        <span class="client-row__id">
          <strong>${esc(Store.nombreCompleto(c))}</strong>
          <span class="num">${esc(U.phoneDisplay(c.telefono))}</span>
        </span>
        <span class="client-row__where">
          <span class="client-row__addr">${esc(c.direccion)}</span>
          <span class="muted">${ult ? `${esc(ult.tipo)}, ${U.formatDateShort(ult.fecha)}` : 'Sin servicios realizados'}</span>
        </span>
        ${nota}
        <span class="client-row__status">${estado}</span>
        <span class="client-row__chev">${Icon('chevronRight')}</span>
      </a>`;
  }

  /* ------------------------------ Servicios ------------------------------ */
  /** Parada de la hoja de ruta (agenda e inicio): hora grande, punto en la línea, datos y una sola acción principal. */
  function servicioRow(s) {
    const c = Store.getCliente(s.clienteId);
    if (!c) return '';
    const n = U.diffDays(U.todayStr(), s.fecha);
    let cuando = '';
    if (n < 0) cuando = `Hace ${U.plural(-n, 'día', 'días')}`;
    else if (n > 1) cuando = U.capitalize(U.formatDateDay(s.fecha));
    // "10:00 a. m." → hora grande + "a. m." pequeño debajo
    const [hh, ...resto] = U.formatTime(s.hora).split(' ');
    return `
      <li class="svc ${n < 0 ? 'svc--late' : n === 0 ? 'svc--today' : ''}">
        <div class="svc__when">
          <span class="svc__time num">${hh}</span>
          <span class="svc__ampm">${resto.join(' ')}</span>
          ${cuando ? `<span class="svc__date">${cuando}</span>` : ''}
        </div>
        <span class="svc__dot" aria-hidden="true"></span>
        <div class="svc__main">
          <a class="svc__name" href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a>
          <p class="svc__meta">
            <span class="svc__type">${esc(s.tipo)}${s.precio ? ` <span class="svc__price num">${U.money(s.precio)}</span>` : ''}</span>
            <a href="${U.telLink(c.telefono)}" class="num">${Icon('phone')}${esc(U.phoneDisplay(c.telefono))}</a>
            <a href="${U.mapsLink(c.direccion)}" target="_blank" rel="noopener">${Icon('pin')}${esc(c.direccion)}</a>
          </p>
        </div>
        <div class="svc__actions">
          <button class="btn btn--primary btn--sm" data-action="servicio-realizado" data-id="${s.id}">${Icon('check')} Ya se hizo</button>
          <a class="btn btn--wa-text btn--sm" href="${U.waLink(c.telefono, Store.mensajeRecordatorio(s))}" target="_blank" rel="noopener">${Icon('whatsapp')} Recordarle</a>
          <button class="btn btn--text btn--sm" data-action="editar-servicio" data-id="${s.id}">Cambiar</button>
        </div>
      </li>`;
  }

  /** Servicio ya realizado (vista del día en el calendario). */
  function hechoRow(s) {
    const c = Store.getCliente(s.clienteId);
    if (!c) return '';
    return `
      <li class="done-row">
        <span class="done-row__icon">${Icon('check')}</span>
        <span class="done-row__main"><a href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a>
          <small>${esc(s.tipo)}${s.hora ? `, ${U.formatTime(s.hora)}` : ''}</small></span>
        <span class="done-row__price num">${s.precio ? U.money(s.precio) : '<span class="muted">Sin precio</span>'}</span>
      </li>`;
  }

  /** Marca naranja de “Ahora” dentro de la hoja de ruta de hoy. */
  const ahoraRow = () => {
    const d = new Date();
    const hora = U.formatTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    return `<li class="now" aria-label="Ahora, ${hora}"><span class="now__label num">Ahora ${hora.split(' ')[0]}</span><span class="now__dot"></span><span class="now__line"></span></li>`;
  };

  /** Lista de servicios como hoja de ruta. Con `ahora`, inserta la marca de la hora actual entre los servicios de hoy. */
  const serviciosList = (list, { ahora = false } = {}) => {
    const hoy = U.todayStr();
    const d = new Date();
    const yaHora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    let puesto = !ahora || !list.some((s) => s.fecha === hoy);
    let html = '';
    list.forEach((s) => {
      if (!puesto && s.fecha === hoy && (s.hora || '00:00') > yaHora) { html += ahoraRow(); puesto = true; }
      html += servicioRow(s);
    });
    if (!puesto) html += ahoraRow();
    return `<ul class="route">${html}</ul>`;
  };

  /* ------------------------------ Seguimiento ------------------------------ */
  const estadoSeguimiento = (fecha) => {
    const atraso = U.diffDays(fecha, U.todayStr());
    return atraso > 0 ? badge(`Atrasado ${U.plural(atraso, 'día', 'días')}`, 'danger') : badge('Toca hoy', 'warn');
  };

  /** Elemento de la bandeja de mensajes por enviar. */
  function inboxItem(x, selected) {
    const { servicio: s, cliente: c, fecha } = x;
    const atraso = U.diffDays(fecha, U.todayStr());
    return `
      <li><button type="button" class="inbox__item ${selected ? 'is-selected' : ''}" data-action="seg-sel" data-id="${s.id}" ${selected ? 'aria-current="true"' : ''}>
        <span class="inbox__name">${esc(Store.nombreCompleto(c))}</span>
        <span class="inbox__sub">${esc(s.tipo)}, hecho el ${U.formatDateShort(s.fecha)}</span>
        <span class="inbox__when">${atraso > 0 ? badge(`${U.plural(atraso, 'día', 'días')} tarde`, 'danger') : badge('Hoy', 'warn')}</span>
      </button></li>`;
  }

  /** Mapa de la dirección. Todo el mapa es un enlace a la ruta en Google Maps desde donde esté la persona. */
  function mapa(direccion, { alto = 220 } = {}) {
    const q = Store.direccionMapa(direccion);
    return `
      <div class="map" style="--map-h:${alto}px">
        <iframe class="map__frame" src="${U.mapsEmbed(q)}" loading="lazy" tabindex="-1" aria-hidden="true"
          referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>
        <a class="map__link" href="${U.mapsDir(q)}" target="_blank" rel="noopener" aria-label="Cómo llegar a ${esc(direccion)} (abre Google Maps)">
          <span class="map__cta">${Icon('navigate')} Cómo llegar</span>
        </a>
      </div>`;
  }

  /** Calendario del mes (semana de lunes a domingo). porDia: { 'AAAA-MM-DD': [servicios] } */
  function calendario(mesKey, seleccionado, porDia) {
    const [y, m] = mesKey.split('-').map(Number);
    const primero = new Date(y, m - 1, 1);
    const inicio = new Date(primero);
    inicio.setDate(1 - ((primero.getDay() + 6) % 7)); // lunes anterior
    const hoy = U.todayStr();
    const dias = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      if (i % 7 === 0 && i >= 28 && d.getMonth() !== m - 1) break; // semanas completas, sin semana sobrante
      dias.push(U.toDateStr(d));
    }
    const chip = (s) => {
      const c = Store.getCliente(s.clienteId);
      const late = s.estado === 'pendiente' && s.fecha < hoy;
      const k = s.estado === 'realizado' ? 'done' : late ? 'late' : 'pend';
      return `<span class="cal-chip cal-chip--${k}"><b class="num">${s.hora ? U.formatTime(s.hora).split(' ')[0] : ''}</b> ${esc(c ? c.nombre.split(' ')[0] : '')}</span>`;
    };
    return `
      <div class="cal__grid" role="grid" aria-label="${U.monthName(mesKey)}">
        ${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => `<span class="cal__dow" aria-hidden="true">${d}</span>`).join('')}
        ${dias.map((f) => {
          const list = (porDia[f] || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
          const fuera = U.monthKey(f) !== mesKey;
          const late = list.some((s) => s.estado === 'pendiente' && s.fecha < hoy);
          return `
            <button type="button" class="cal__day ${fuera ? 'is-out' : ''} ${f === hoy ? 'is-today' : ''} ${f === seleccionado ? 'is-sel' : ''}"
              data-action="cal-dia" data-fecha="${f}" aria-pressed="${f === seleccionado}"
              aria-label="${U.formatDateLong(f)}: ${list.length ? U.plural(list.length, 'servicio', 'servicios') : 'sin servicios'}">
              <span class="cal__num num">${U.parseDate(f).getDate()}</span>
              <span class="cal__chips">${list.slice(0, 3).map(chip).join('')}${list.length > 3 ? `<span class="cal-more">+${list.length - 3} más</span>` : ''}</span>
              ${list.length ? `<span class="cal__count ${late ? 'is-late' : ''} num">${list.length}</span>` : ''}
            </button>`;
        }).join('')}
      </div>`;
  }

  /** Detalle del mensaje seleccionado en la bandeja: vista previa tipo WhatsApp y edición en el mismo lugar. */
  function seguimientoCard(x, { editando = false, siguiente = null } = {}) {
    const { servicio: s, cliente: c, fecha } = x;
    const personalizado = !!s.mensajeSeguimiento;
    const msg = Store.mensajeSeguimiento(s);
    const cuerpo = editando ? `
      <div class="fu__editor">
        <div class="fu__editor-head">
          <label for="msg-${s.id}">Mensaje para ${esc(c.nombre)}</label>
          <span class="badge badge--info" data-msg-status="${s.id}" ${personalizado ? '' : 'hidden'}>Personalizado</span>
        </div>
        <textarea id="msg-${s.id}" data-msg="${s.id}" rows="6">${esc(msg)}</textarea>
        <p class="hint">Los cambios se guardan solos y solo aplican a este cliente.</p>
        <div class="btn-row btn-row--tight">
          <button type="button" class="btn btn--ghost btn--sm" data-action="editar-mensaje" data-id="${s.id}">${Icon('check')} Listo</button>
          <button type="button" class="btn btn--text btn--sm" data-action="restaurar-mensaje" data-id="${s.id}" ${personalizado ? '' : 'hidden'}>${Icon('refresh')} Volver al mensaje original</button>
        </div>
      </div>` : `
      <div class="fu__preview">
        <div class="fu__bubble"><p>${esc(msg).replace(/\n+/g, '<br>')}</p>
          <span class="fu__bubble-meta">${personalizado ? 'Personalizado' : 'Mensaje de la plantilla'}</span></div>
      </div>`;
    return `
      <article class="fu" data-sel="${s.id}">
        <div class="fu__head">
          <div class="fu__who">
            <a class="fu__name" href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a>
            <span class="num muted">${esc(U.phoneDisplay(c.telefono))}</span>
          </div>
          ${estadoSeguimiento(fecha)}
        </div>
        <p class="fu__info">${esc(s.tipo)}, realizado el ${U.formatDateLong(s.fecha)}${s.precio ? ` por ${U.money(s.precio)}` : ''}. Seguimiento a ${plazoTexto(s.seguimientoDias)}.</p>
        <div class="chat">${cuerpo}</div>
        <div class="btn-row">
          <button class="btn btn--wa btn--lg" data-action="enviar-seguimiento" data-id="${s.id}">${Icon('whatsapp')} Enviar por WhatsApp</button>
          ${editando ? '' : `<button class="btn btn--ghost btn--lg" data-action="editar-mensaje" data-id="${s.id}">${Icon('edit')} Editar mensaje</button>`}
        </div>
        <div class="fu__more">
          <button class="btn btn--text btn--sm" data-action="agendar-servicio" data-cliente="${c.id}">${Icon('calendar')} Agendar otro servicio</button>
          <button class="btn btn--text btn--sm" data-action="omitir-seguimiento" data-id="${s.id}">No enviar este mensaje</button>
          ${siguiente ? `<button class="btn btn--text btn--sm fu__next" data-action="seg-sel" data-id="${siguiente.servicio.id}">Siguiente: ${esc(siguiente.cliente.nombre)} ${Icon('chevronRight')}</button>` : ''}
        </div>
      </article>`;
  }

  /** Fila compacta de seguimiento. mode: 'enviar' (con botón) | 'proximo' | 'enviado'. */
  function seguimientoRow(x, { mode = 'enviar' } = {}) {
    const { servicio: s, cliente: c, fecha } = x;
    let derecha = '';
    if (mode === 'enviar') derecha = `<button class="btn btn--wa btn--sm" data-action="enviar-seguimiento" data-id="${s.id}">${Icon('whatsapp')} Enviar</button>`;
    else if (mode === 'proximo') derecha = `<span class="fu-row__date">${U.relativeDay(fecha)}<small class="num">${U.formatDateDay(fecha)}</small></span>`;
    else derecha = badge(`Enviado el ${U.formatDateShort(s.fechaSeguimientoEnviado)}`, 'ok', 'check');
    return `
      <li class="fu-row">
        <div class="fu-row__main">
          <a class="fu-row__name" href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a>
          <span class="fu-row__info">${esc(s.tipo)}, hecho el ${U.formatDateShort(s.fecha)}</span>
          ${mode === 'enviar' ? estadoSeguimiento(fecha) : ''}
        </div>
        ${derecha}
      </li>`;
  }

  /* ------------------------------ Comentarios ------------------------------ */
  /** Comentario (el más reciente va resaltado). */
  function comentarioItem(m, { highlight = false } = {}) {
    return `
      <li class="comment ${m.negativo ? 'comment--negative' : ''} ${highlight ? 'comment--latest' : ''}">
        <div class="comment__meta">
          <time class="num">${U.formatDateTime(m.fecha)}</time>
          ${highlight ? badge('Más reciente', 'info') : ''}
          ${m.negativo ? badge('Negativo', 'danger') : ''}
          <button class="icon-btn icon-btn--sm" data-action="borrar-comentario" data-id="${m.id}" aria-label="Borrar comentario" title="Borrar comentario">${Icon('trash')}</button>
        </div>
        <p>${esc(m.texto).replace(/\n/g, '<br>')}</p>
      </li>`;
  }

  return {
    avatar, badge, empty, section, contactButtons, estadoServicio, clientesHeader, clienteRow, servicioRow, serviciosList, ahoraRow,
    seguimientoCard, seguimientoRow, comentarioItem, plazoTexto, inboxItem, mapa, calendario, hechoRow,
  };
})();

/* Bloques visuales reutilizables (tarjetas, etiquetas, estados vacíos). Devuelven HTML. */
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
      <div class="empty__icon">${Icon(icon)}</div>
      <h3>${title}</h3>
      ${text ? `<p>${text}</p>` : ''}
      ${action}
    </div>`;

  const section = (title, count, inner, { kind = '', icon = '', note = '' } = {}) => `
    <section class="section ${kind ? `section--${kind}` : ''}">
      <h2 class="section__title">${icon ? Icon(icon) : ''}${title}${count != null ? `<span class="count">${count}</span>` : ''}</h2>
      ${note ? `<p class="section__note">${note}</p>` : ''}
      ${inner}
    </section>`;

  /** Botones de contacto rápido. */
  const contactButtons = (c, { waMsg, compact = false } = {}) => `
    <div class="btn-row">
      <a class="btn btn--soft ${compact ? '' : 'btn--lg'}" href="${U.telLink(c.telefono)}">${Icon('phone')} Llamar</a>
      <a class="btn btn--wa ${compact ? '' : 'btn--lg'}" href="${U.waLink(c.telefono, waMsg || `Hola ${c.nombre}, `)}" target="_blank" rel="noopener">${Icon('whatsapp')} WhatsApp</a>
    </div>`;

  const estadoServicio = (s) => {
    if (s.estado === 'realizado') return badge('Realizado', 'ok', 'check');
    if (s.estado === 'cancelado') return badge('Cancelado', 'neutral', 'x');
    const n = U.diffDays(U.todayStr(), s.fecha);
    if (n < 0) return badge(`Atrasado ${U.plural(-n, 'día', 'días')}`, 'danger', 'alert');
    if (n === 0) return badge('Hoy', 'warn', 'clock');
    return badge('Pendiente', 'info', 'clock');
  };

  /** Tarjeta de cliente para la lista. */
  function clienteCard(c) {
    const ultimo = Store.ultimoComentario(c.id);
    const prox = Store.proximoServicio(c.id);
    const ult = Store.ultimoRealizado(c.id);
    return `
      <a class="card card--link client-card ${c.bloqueado ? 'client-card--blocked' : ''}" href="#/cliente/${c.id}">
        <div class="client-card__head">
          ${avatar(c)}
          <div class="client-card__id">
            <h3>${esc(Store.nombreCompleto(c))}</h3>
            <p class="muted">${Icon('phone')} ${esc(U.phoneDisplay(c.telefono))}</p>
          </div>
          ${c.bloqueado ? badge('Bloqueado', 'danger', 'ban') : prox ? badge(`Servicio ${U.relativeDay(prox.fecha).toLowerCase()}`, U.diffDays(U.todayStr(), prox.fecha) <= 0 ? 'warn' : 'info', 'calendar') : ''}
          <span class="chev">${Icon('chevronRight')}</span>
        </div>
        <p class="client-card__addr">${Icon('pin')} ${esc(c.direccion)}</p>
        <div class="client-card__meta">
          <span>${Icon('history')} Último servicio: <strong>${ult ? `${U.formatDateShort(ult.fecha)} · ${esc(ult.tipo)}` : 'Ninguno'}</strong></span>
        </div>
        ${ultimo ? `<p class="client-card__comment ${ultimo.negativo ? 'is-negative' : ''}">${Icon('comment')} <span>“${esc(ultimo.texto)}”</span></p>` : ''}
      </a>`;
  }

  /** Tarjeta de servicio pendiente (agenda). */
  function servicioCard(s, { showClient = true } = {}) {
    const c = Store.getCliente(s.clienteId);
    if (!c) return '';
    const n = U.diffDays(U.todayStr(), s.fecha);
    return `
      <article class="card service-card ${n < 0 ? 'service-card--late' : n === 0 ? 'service-card--today' : ''}">
        <div class="service-card__when">
          <span class="service-card__time">${U.formatTime(s.hora)}</span>
          <span class="service-card__date">${U.capitalize(U.relativeDay(s.fecha))}</span>
          <span class="service-card__day">${U.formatDateShort(s.fecha)}</span>
        </div>
        <div class="service-card__body">
          <div class="service-card__top">
            ${showClient ? `<a class="service-card__name" href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a>` : ''}
            ${estadoServicio(s)}
          </div>
          <p class="service-card__type">${Icon('bug')} ${esc(s.tipo)}</p>
          ${showClient ? `
          <p>${Icon('phone')} <a href="${U.telLink(c.telefono)}">${esc(U.phoneDisplay(c.telefono))}</a></p>
          <p>${Icon('pin')} <a href="${U.mapsLink(c.direccion)}" target="_blank" rel="noopener">${esc(c.direccion)}</a></p>` : ''}
          <div class="btn-row">
            <button class="btn btn--primary" data-action="servicio-realizado" data-id="${s.id}">${Icon('check')} Ya se hizo</button>
            <a class="btn btn--wa" href="${U.waLink(c.telefono, Store.mensajeRecordatorio(s))}" target="_blank" rel="noopener">${Icon('whatsapp')} Recordarle</a>
            <button class="btn btn--ghost" data-action="editar-servicio" data-id="${s.id}">${Icon('edit')} Cambiar</button>
          </div>
        </div>
      </article>`;
  }

  /** Tarjeta de seguimiento por WhatsApp. */
  function seguimientoCard(x, { mode = 'enviar' } = {}) {
    const { servicio: s, cliente: c, fecha } = x;
    const hoy = U.todayStr();
    const atraso = U.diffDays(fecha, hoy);
    let estado = '';
    if (mode === 'enviar') {
      estado = atraso > 0 ? badge(`Se debió enviar hace ${U.plural(atraso, 'día', 'días')}`, 'danger', 'alert') : badge('Toca enviar hoy', 'warn', 'clock');
    } else if (mode === 'proximo') {
      estado = badge(`${U.relativeDay(fecha)} · ${U.formatDateShort(fecha)}`, 'info', 'calendar');
    } else {
      estado = badge(`Enviado el ${U.formatDateShort(s.fechaSeguimientoEnviado)}`, 'ok', 'check');
    }
    const plazo = s.seguimientoDias === 30 ? '1 mes' : `${s.seguimientoDias} días`;
    return `
      <article class="card followup-card">
        <div class="followup-card__head">
          ${avatar(c)}
          <div>
            <a class="followup-card__name" href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a>
            <p class="muted">${esc(U.phoneDisplay(c.telefono))}</p>
          </div>
          ${estado}
        </div>
        <p class="followup-card__info">
          Servicio de <strong>${esc(s.tipo)}</strong> realizado el <strong>${U.formatDateLong(s.fecha)}</strong>.
          Seguimiento acordado: <strong>${plazo}</strong>.
        </p>
        ${mode === 'enviar' ? `
        <details class="followup-card__preview">
          <summary>Ver el mensaje que se enviará</summary>
          <p>${esc(Store.mensajeSeguimiento(s)).replace(/\n/g, '<br>')}</p>
        </details>
        <div class="btn-row">
          <button class="btn btn--wa btn--lg" data-action="enviar-seguimiento" data-id="${s.id}">${Icon('whatsapp')} Enviar por WhatsApp</button>
          <button class="btn btn--soft" data-action="agendar-servicio" data-cliente="${c.id}">${Icon('calendar')} Agendar otro servicio</button>
          <button class="btn btn--ghost" data-action="omitir-seguimiento" data-id="${s.id}">No enviar</button>
        </div>` : ''}
      </article>`;
  }

  /** Lista de comentarios (el más reciente primero). */
  function comentarioItem(m, { highlight = false } = {}) {
    return `
      <li class="comment ${m.negativo ? 'comment--negative' : ''} ${highlight ? 'comment--latest' : ''}">
        <div class="comment__meta">
          ${highlight ? badge('Más reciente', 'info') : ''}
          ${m.negativo ? badge('Negativo', 'danger', 'alert') : ''}
          <time>${U.formatDateTime(m.fecha)}</time>
          <button class="icon-btn icon-btn--sm" data-action="borrar-comentario" data-id="${m.id}" aria-label="Borrar comentario" title="Borrar comentario">${Icon('trash')}</button>
        </div>
        <p>${esc(m.texto).replace(/\n/g, '<br>')}</p>
      </li>`;
  }

  return { avatar, badge, empty, section, contactButtons, estadoServicio, clienteCard, servicioCard, seguimientoCard, comentarioItem };
})();

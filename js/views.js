/* Pantallas de la aplicación. Cada una devuelve { title, subtitle, actions, html }. */
const Views = (() => {
  const esc = U.esc;

  // Preferencias de este navegador (si no se puede leer, se usa el valor por defecto)
  const pref = {
    get(k) { try { return localStorage.getItem(`controlPlagas.pref.${k}`); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(`controlPlagas.pref.${k}`, v); } catch (e) { /* sin almacenamiento */ } },
  };

  const ui = {
    filtroClientes: 'todos', busqueda: '', verTodosComentarios: {}, verHistorial: {}, editMsg: {},
    ayudaSeguimientoOculta: pref.get('ayudaSeguimiento') === 'oculta',
    agendaVista: pref.get('agendaVista') === 'calendario' ? 'calendario' : 'lista',
    calMes: U.monthKey(U.todayStr()), calDia: U.todayStr(),
    segSel: null, periodo: 6,
  };

  const btnRegistrar = (extra = '') => `<button class="btn btn--primary ${extra}" data-action="nuevo-cliente">${Icon('plus')} Registrar cliente</button>`;
  const btnAgendar = (kind = 'primary', cliente = '') => `<button class="btn btn--${kind}" data-action="agendar-servicio" ${cliente ? `data-cliente="${cliente}"` : ''}>${Icon('calendar')} Agendar servicio</button>`;
  const linkVer = (href, text) => `<a class="link-more" href="${href}">${text}</a>`;
  const ahoraHM = () => { const d = new Date(); return `${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  /* ============================== CIFRAS DEL NEGOCIO ============================== */
  const St = {
    realizados: () => Store.getServicios().filter((s) => s.estado === 'realizado' && Store.getCliente(s.clienteId)),
    /** Las últimas n claves de mes, terminando en el mes actual. */
    meses: (n) => { const cur = U.monthKey(U.todayStr()); return Array.from({ length: n }, (_, i) => U.addMonths(cur, i - (n - 1))); },
    delMes: (k) => St.realizados().filter((s) => U.monthKey(s.fecha) === k),
    suma: (list) => list.reduce((a, s) => a + (s.precio || 0), 0),
    /** Envíos de seguimiento desde una fecha, y cuántos clientes volvieron a contratar después del mensaje. */
    /** ¿Hay registros desde esa fecha? (si no, comparar contra ese periodo engañaría) */
    cubre: (fecha) => St.realizados().some((s) => s.fecha <= fecha),
    conversion(desde) {
      const env = Store.seguimientosEnviados().filter((x) => (x.servicio.fechaSeguimientoEnviado || '') >= desde);
      // Cuenta como "volvió" si agendó otro servicio dentro de los 45 días siguientes al mensaje
      const volvieron = env.filter((x) => Store.getServicios().some((o) => o.clienteId === x.cliente.id && o.id !== x.servicio.id
        && o.estado !== 'cancelado' && o.fecha >= x.servicio.fechaSeguimientoEnviado && o.fecha <= U.addDays(x.servicio.fechaSeguimientoEnviado, 45)));
      return { env, volvieron };
    },
  };

  /** Cambio contra un periodo anterior. Subir es bueno (ingresos, servicios). */
  function delta(cur, prev, contra) {
    if (!prev) return '';
    const p = Math.round(((cur - prev) / prev) * 100);
    if (p === 0) return `<span class="delta">Igual que ${contra}</span>`;
    return `<span class="delta ${p > 0 ? 'delta--up' : 'delta--down'}">${Icon(p > 0 ? 'arrowUp' : 'arrowDown')}<b class="num">${Math.abs(p)}%</b> vs ${contra}</span>`;
  }

  /** Cifra con etiqueta. `countup` hace que el número suba al entrar a la pantalla. */
  const kpi = ({ label, value, raw, fmt = 'int', extra = '' }) => `
    <div class="kpi">
      <span class="kpi__label">${label}</span>
      <span class="kpi__value" ${raw != null ? `data-countup="${raw}" data-fmt="${fmt}"` : ''}>${value}</span>
      ${extra}
    </div>`;

  /** Recordatorio de respaldo: solo con datos reales y si pasó más de un mes (o nunca se ha hecho). */
  function avisoRespaldo() {
    if (!Store.modoLocal() || Store.esDemo() || !Store.getClientes().length) return '';
    const ultimo = pref.get('ultimoRespaldo');
    const dias = ultimo ? U.diffDays(ultimo, U.todayStr()) : null;
    if (dias != null && dias <= 30) return '';
    return `<div class="alert alert--warn">${Icon('alert')}<div>${dias == null ? 'Todavía no ha descargado un respaldo de su información.' : `Hace ${dias} días que no descarga un respaldo.`}
      Si se borra el navegador, la información se pierde.</div>
      <button class="btn btn--ghost btn--sm" data-action="exportar">${Icon('download')} Descargar respaldo</button></div>`;
  }

  /* ============================== INICIO ============================== */
  function inicio() {
    const hoy = U.todayStr();
    const pend = Store.pendientes();
    const atrasados = pend.filter((s) => s.fecha < hoy);
    const deHoy = pend.filter((s) => s.fecha === hoy);
    const hechosHoy = St.realizados().filter((s) => s.fecha === hoy);
    const totalHoy = deHoy.length + hechosHoy.length;
    const ahora = ahoraHM();
    const sigue = deHoy.find((s) => (s.hora || '') >= ahora) || deHoy[0];
    const sigueC = sigue && Store.getCliente(sigue.clienteId);

    const porEnviar = Store.seguimientosPorEnviar();
    const conAtraso = porEnviar.filter((x) => x.fecha < hoy).length;
    const enviadosHoy = Store.seguimientosEnviados().filter((x) => x.servicio.fechaSeguimientoEnviado === hoy).length;

    const mes = U.monthKey(hoy);
    const meses = St.meses(6);
    const cobrado = St.suma(St.delMes(mes));
    const mesAnt = U.addMonths(mes, -1);
    // Comparación justa: lo cobrado el mes pasado hasta el mismo día
    const diaHoy = U.parseDate(hoy).getDate();
    const cobradoAntMismoDia = St.suma(St.delMes(mesAnt).filter((s) => U.parseDate(s.fecha).getDate() <= diaHoy));

    // Próximos 7 días
    const semana = Array.from({ length: 7 }, (_, i) => U.addDays(hoy, i + 1)).map((f) => {
      const list = pend.filter((s) => s.fecha === f);
      const d = U.parseDate(f);
      return {
        key: f, label: `${U.DIAS_CORTOS[d.getDay()]} ${d.getDate()}`, full: U.capitalize(U.formatDateLong(f)), value: list.length,
        sub: list.map((s) => Store.getCliente(s.clienteId)?.nombre).slice(0, 3).join(', ') + (list.length > 3 ? '…' : ''),
        cobro: St.suma(list),
      };
    });
    const totalSemana = semana.reduce((a, d) => a + d.value, 0);
    const cobroSemana = semana.reduce((a, d) => a + d.cobro, 0);
    const pendientesHoy = [...atrasados, ...deHoy];
    const admin = Store.esAdmin();

    return {
      title: new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches',
      subtitle: U.capitalize(U.formatDateLong(hoy, true)),
      actions: `${btnAgendar('ghost')}${btnRegistrar()}`,
      html: `
        ${avisoRespaldo()}
        <div class="pulse ${admin ? '' : 'pulse--2'}">
          <article class="pulse__card">
            <h2 class="pulse__title">Servicios de hoy</h2>
            <div class="pulse__row">
              <div class="pulse__ring">${Charts.ring(hechosHoy.length, totalHoy)}
                <span class="pulse__ringtxt"><b class="num">${hechosHoy.length}</b><small>de ${totalHoy}</small></span></div>
              <div class="pulse__text">
                <p class="pulse__big">${deHoy.length ? `${U.plural(deHoy.length, 'falta', 'faltan')}` : totalHoy ? 'Todo hecho' : 'Día libre'}</p>
                ${sigue ? `<p class="pulse__meta">Sigue a las <strong class="num">${U.formatTime(sigue.hora)}</strong> con ${esc(sigueC.nombre)}</p>` : ''}
                ${atrasados.length ? `<p class="pulse__meta">${C.badge(`${U.plural(atrasados.length, 'atrasado', 'atrasados')} de otros días`, 'danger')}</p>` : ''}
              </div>
            </div>
            ${linkVer('#/agenda', 'Ver agenda')}
          </article>

          <article class="pulse__card">
            <h2 class="pulse__title">Mensajes de seguimiento</h2>
            <div class="pulse__row">
              <p class="pulse__num num" data-countup="${porEnviar.length}" data-fmt="int">${porEnviar.length}</p>
              <div class="pulse__text">
                <p class="pulse__big">${porEnviar.length ? 'por enviar' : 'Todo al día'}</p>
                ${conAtraso ? `<p class="pulse__meta">${C.badge(`${conAtraso} ya con atraso`, 'danger')}</p>` : ''}
                ${enviadosHoy ? `<p class="pulse__meta">${C.badge(`${U.plural(enviadosHoy, 'enviado', 'enviados')} hoy`, 'ok')}</p>` : ''}
              </div>
            </div>
            ${porEnviar.length ? `<a class="btn btn--wa btn--sm pulse__cta" href="#/seguimiento">${Icon('whatsapp')} Empezar a enviar</a>` : linkVer('#/seguimiento', 'Ver seguimiento')}
          </article>

          ${admin ? `<article class="pulse__card">
            <h2 class="pulse__title">Cobrado en ${U.MESES[U.parseDate(hoy).getMonth()]}</h2>
            <div class="pulse__row pulse__row--money">
              <div>
                <p class="pulse__money" title="Comparado con lo cobrado en los meses anteriores hasta el mismo día" data-countup="${cobrado}" data-fmt="money">${U.money(cobrado)}</p>
                ${delta(cobrado, cobradoAntMismoDia, `${U.monthName(mesAnt, true)} al día ${diaHoy}`)}
              </div>
              ${Charts.sparkline(meses.map((k) => St.suma(St.delMes(k).filter((s) => U.parseDate(s.fecha).getDate() <= diaHoy))))}
            </div>
            ${linkVer('#/negocio', 'Ver negocio')}
          </article>` : ''}
        </div>

        <div class="home-grid">
          ${C.section('Agenda de hoy', pendientesHoy.length,
            pendientesHoy.length ? C.serviciosList(pendientesHoy, { ahora: true })
              : C.empty('check', totalHoy ? 'Todo lo de hoy ya está hecho' : 'No hay servicios para hoy', 'Cuando agende uno aparecerá aquí.'),
            { aside: linkVer('#/agenda', 'Ver agenda') })}
          ${C.section('Próximos 7 días', totalSemana, `
            <div class="card card--chart">
              ${totalSemana ? Charts.columns(semana, {
                format: (n) => U.plural(n, 'servicio', 'servicios'), short: (n) => String(Math.round(n)),
                highlight: -1, height: 170, cols: ['Día', 'Servicios'], action: 'ir-dia', integer: true,
              }) : '<p class="muted">No hay servicios agendados en los próximos 7 días.</p>'}
              ${cobroSemana ? `<p class="chart__foot"><span class="num">${U.money(cobroSemana)}</span> por cobrar en estos servicios</p>` : ''}
            </div>`)}
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
      subtitle: U.plural(todos.length, 'cliente registrado', 'clientes registrados'),
      actions: btnRegistrar(),
      html: `
        <div class="toolbar">
          <div class="search"><span class="search__icon">${Icon('search')}</span>
            <input id="buscar-clientes" type="search" placeholder="Buscar por nombre, teléfono o dirección" value="${esc(ui.busqueda)}" aria-label="Buscar cliente"></div>
          <div class="segmented" role="group" aria-label="Mostrar">
            ${filtros.map(([k, l, n]) => `<button type="button" aria-pressed="${ui.filtroClientes === k}" data-action="filtro-clientes" data-filtro="${k}">${l} <span class="count">${n}</span></button>`).join('')}
          </div>
        </div>
        ${ui.filtroClientes === 'bloqueados' ? `<div class="alert alert--info">${Icon('info')}<div>A los clientes bloqueados no se les pueden agendar servicios ni enviar seguimientos. Si alguien con su teléfono se vuelve a registrar, el sistema avisará. Para desbloquear, entre a su ficha.</div></div>` : ''}
        <div id="lista-clientes">${listaClientesHtml()}</div>`,
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
      return q ? C.empty('search', 'No se encontró ningún cliente', 'Revise cómo lo escribió o registre uno nuevo.', btnRegistrar())
        : ui.filtroClientes === 'bloqueados' ? C.empty('check', 'No hay clientes bloqueados', 'Para bloquear a un cliente, entre a su ficha y use “Bloquear cliente”.')
          : C.empty('users', 'Todavía no hay clientes aquí', '', btnRegistrar());
    }
    return `<div class="client-list">${C.clientesHeader()}${list.map(C.clienteRow).join('')}</div>`;
  }

  /* ============================== FICHA DEL CLIENTE ============================== */
  function cliente(id) {
    const c = Store.getCliente(id);
    if (!c) {
      return { title: 'Cliente no encontrado', back: { href: '#/clientes', label: 'Clientes' }, html: C.empty('users', 'Este cliente ya no existe', 'Puede que se haya eliminado.', '<a class="btn btn--primary" href="#/clientes">Ir a Clientes</a>') };
    }
    const hoy = U.todayStr();
    const comentarios = Store.comentariosDe(id);
    const servicios = Store.serviciosDe(id); // del más reciente al más antiguo
    const pendientes = servicios.filter((s) => s.estado === 'pendiente').reverse(); // el más próximo primero
    const hechos = servicios.filter((s) => s.estado === 'realizado');
    const ultimo = hechos[0];
    const total = St.suma(hechos);
    const conPrecio = hechos.filter((s) => s.precio > 0);
    const admin = Store.esAdmin();
    const frecuente = hechos.filter((s) => s.fecha >= U.addDays(hoy, -365)).length >= 3;

    // ¿Cada cuánto viene? Promedio de días entre servicios realizados
    let cada = null;
    if (hechos.length >= 2) {
      const f = hechos.map((s) => s.fecha).sort();
      cada = Math.round(U.diffDays(f[0], f[f.length - 1]) / (f.length - 1));
    }
    const cadaTxt = cada ? (cada < 45 ? `cada ${cada} días` : `cada ${Math.round(cada / 30)} meses`) : '';

    /* --- Próximo servicio: tarjeta con las acciones del día --- */
    const p = pendientes[0];
    let proximo;
    if (c.bloqueado) {
      proximo = '<p class="next__none">No se le pueden agendar servicios mientras esté bloqueado.</p>';
    } else if (p) {
      const n = U.diffDays(hoy, p.fecha);
      proximo = `
        <div class="next__when ${n < 0 ? 'is-late' : n === 0 ? 'is-today' : ''}">
          <span class="next__day">${n < 0 ? `Atrasado ${U.plural(-n, 'día', 'días')}` : U.relativeDay(p.fecha)}</span>
          <span class="next__date">${U.capitalize(U.formatDateLong(p.fecha))}, ${U.formatTime(p.hora)}</span>
        </div>
        <p class="next__what"><strong>${esc(p.tipo)}</strong>${p.precio ? ` <span class="num">${U.money(p.precio)}</span>` : ''}</p>
        <div class="btn-row">
          <button class="btn btn--primary" data-action="servicio-realizado" data-id="${p.id}">${Icon('check')} Ya se hizo</button>
          <a class="btn btn--wa-text" href="${U.waLink(c.telefono, Store.mensajeRecordatorio(p))}" target="_blank" rel="noopener">${Icon('whatsapp')} Recordarle</a>
          <button class="btn btn--text" data-action="editar-servicio" data-id="${p.id}">Cambiar</button>
        </div>
        ${pendientes.length > 1 ? `<p class="next__also">También agendado: ${pendientes.slice(1).map((s) => `${esc(s.tipo)}, ${U.formatDateDay(s.fecha)}`).join('; ')}</p>` : ''}`;
    } else {
      const toca = ultimo && cada ? U.addDays(ultimo.fecha, cada) : null;
      const seg = ultimo && ultimo.seguimiento === 'pendiente' ? Store.fechaSeguimiento(ultimo) : null;
      proximo = `
        <p class="next__none">Sin servicio agendado</p>
        ${toca ? `<p class="next__hint">Por su frecuencia, le tocaría ${toca <= hoy ? '<strong>ya</strong>' : `alrededor del <strong>${U.formatDateLong(toca)}</strong>`}.</p>` : ''}
        ${seg ? `<p class="next__hint">Mensaje de seguimiento: ${seg <= hoy ? '<a href="#/seguimiento">toca enviarlo</a>' : U.formatDateLong(seg)}.</p>` : ''}
        <div class="btn-row">${btnAgendar('primary', id)}</div>`;
    }

    /* --- Notas: escribir arriba, las más recientes primero --- */
    const verTodos = ui.verTodosComentarios[id];
    const notas = `
      <form class="note-form" id="form-comentario" data-cliente="${id}" novalidate>
        <div class="field">
          <label for="nuevo-comentario" class="sr-only">Agregar una nota</label>
          <textarea id="nuevo-comentario" name="texto" rows="2" placeholder="Agregar una nota. Ej. Tiene perro, avisar antes de llegar"></textarea>
        </div>
        <div class="comment-form__row">
          <label class="check"><input type="checkbox" name="negativo"> <span>Es <strong>negativa</strong> (problema con el cliente)</span></label>
          <button class="btn btn--primary btn--sm" type="submit">Agregar nota</button>
        </div>
      </form>
      ${comentarios.length ? `
        <ul class="comments">${(verTodos ? comentarios : comentarios.slice(0, 3)).map((m, i) => C.comentarioItem(m, { highlight: i === 0 })).join('')}</ul>
        ${comentarios.length > 3 ? `<button class="btn btn--text btn--block" data-action="toggle-comentarios" data-id="${id}" aria-expanded="${!!verTodos}">
          ${verTodos ? 'Mostrar solo las más recientes' : `Ver las ${comentarios.length} notas`}</button>` : ''}`
        : '<p class="muted notes__empty">Todavía no hay notas de este cliente.</p>'}`;

    /* --- Historial: línea de 12 meses + lista --- */
    const ini = `${U.addMonths(U.monthKey(hoy), -11)}-01`;
    const dHoy = U.parseDate(hoy);
    const fin = U.toDateStr(new Date(dHoy.getFullYear(), dHoy.getMonth() + 1, 0));
    const largo = U.diffDays(ini, fin);
    const pos = (f) => ((U.diffDays(ini, f) / largo) * 100).toFixed(2);
    const enLinea = servicios.filter((s) => s.estado !== 'cancelado' && s.fecha >= ini && s.fecha <= fin);
    const meses = Array.from({ length: 12 }, (_, i) => U.addMonths(U.monthKey(ini), i));
    const cadencia = `
      <div class="cadence" role="img" aria-label="${U.plural(enLinea.length, 'servicio', 'servicios')} en los últimos 12 meses">
        ${meses.map((k, i) => `<span class="cadence__m" style="--x:${pos(`${k}-01`)}%">${i % 2 === 0 ? U.monthName(k, true) : ''}</span>`).join('')}
        <span class="cadence__now" style="--x:${pos(hoy)}%" title="Hoy"></span>
        ${enLinea.map((s, i) => `<span class="cadence__dot ${s.estado === 'pendiente' ? 'is-pend' : ''}" style="--x:${pos(s.fecha)}%; --i:${i}" tabindex="0"
          data-tip-v="${esc(s.tipo)}${s.precio ? `, ${U.money(s.precio)}` : ''}" data-tip-l="${U.capitalize(U.formatDateLong(s.fecha))}" data-tip-s="${s.estado === 'pendiente' ? 'Agendado' : 'Realizado'}"></span>`).join('')}
      </div>`;
    const verHist = ui.verHistorial[id];
    const historial = servicios.length ? `
      <ol class="timeline">
        ${(verHist ? servicios : servicios.slice(0, 5)).map((s) => {
          let seg = '';
          if (s.estado === 'realizado') {
            const sf = Store.fechaSeguimiento(s);
            seg = s.seguimiento === 'enviado' ? `Seguimiento enviado el ${U.formatDateShort(s.fechaSeguimientoEnviado)}`
              : s.seguimiento === 'omitido' ? 'Seguimiento no enviado'
                : `Seguimiento por WhatsApp: ${U.formatDateShort(sf)} (${U.relativeDay(sf).toLowerCase()})`;
          }
          return `
          <li class="timeline__item timeline__item--${s.estado}">
            <div class="timeline__head">
              <strong>${esc(s.tipo)}</strong> ${C.estadoServicio(s)}
              ${s.precio ? `<span class="timeline__price num">${U.money(s.precio)}</span>` : ''}
            </div>
            <p class="num">${U.capitalize(U.formatDateLong(s.fecha))}${s.hora ? `, ${U.formatTime(s.hora)}` : ''}</p>
            ${seg ? `<p class="muted">${seg}</p>` : ''}
          </li>`;
        }).join('')}
      </ol>
      ${servicios.length > 5 ? `<button class="btn btn--text btn--block" data-action="toggle-historial" data-id="${id}" aria-expanded="${!!verHist}">
        ${verHist ? 'Mostrar solo los más recientes' : `Ver todo el historial (${servicios.length})`}</button>` : ''}`
      : '<p class="muted">Sin servicios registrados.</p>';

    return {
      title: Store.nombreCompleto(c),
      back: { href: '#/clientes', label: 'Clientes' },
      actions: `<button class="btn btn--ghost" data-action="editar-cliente" data-id="${id}">${Icon('edit')} Editar datos</button>
        ${c.bloqueado ? '' : btnAgendar('primary', id)}`,
      html: `
        <div class="client-tags">
          ${c.bloqueado ? C.badge('Bloqueado', 'danger', 'ban') : C.badge('Activo', 'ok')}
          ${frecuente && !c.bloqueado ? '<span class="tag">Cliente frecuente</span>' : ''}
          <span class="muted">Cliente desde ${U.monthName(U.monthKey(c.fechaRegistro))}</span>
        </div>

        ${c.bloqueado ? `
          <div class="alert alert--danger">${Icon('ban')}<div>
            <strong>Cliente bloqueado</strong> desde el ${U.formatDateLong(c.fechaBloqueo, true)}. Motivo: ${esc(c.motivoBloqueo)}</div>
            ${admin ? `<button class="btn btn--ghost btn--sm" data-action="desbloquear" data-id="${id}">${Icon('unlock')} Desbloquear</button>` : ''}</div>` : ''}

        <nav class="contact-bar" aria-label="Contactar">
          <a class="contact-btn" href="${U.telLink(c.telefono)}">${Icon('phone')}<span><b>Llamar</b><small class="num">${esc(U.phoneDisplay(c.telefono))}</small></span></a>
          <a class="contact-btn contact-btn--wa" href="${U.waLink(c.telefono, `Hola ${c.nombre}, `)}" target="_blank" rel="noopener">${Icon('whatsapp')}<span><b>WhatsApp</b><small>Escribirle un mensaje</small></span></a>
          <a class="contact-btn" href="${U.mapsDir(Store.direccionMapa(c.direccion))}" target="_blank" rel="noopener">${Icon('navigate')}<span><b>Cómo llegar</b><small>Abre Google Maps</small></span></a>
        </nav>

        <div class="client-layout">
          <div class="client-layout__col">
            <section class="card next" aria-labelledby="t-next">
              <h2 class="card__title" id="t-next">Próximo servicio</h2>
              ${proximo}
            </section>
            <section class="card notes" aria-labelledby="t-notes">
              <h2 class="card__title" id="t-notes">Notas ${comentarios.length ? `<span class="count">${comentarios.length}</span>` : ''}</h2>
              ${notas}
            </section>
          </div>

          <div class="client-layout__col">
            <section class="card loc" aria-labelledby="t-loc">
              <h2 class="card__title" id="t-loc">Ubicación</h2>
              <p class="loc__addr">${esc(c.direccion)}</p>
              ${C.mapa(c.direccion, { alto: 230 })}
            </section>
            <section class="card hist" aria-labelledby="t-hist">
              <div class="card__head"><h2 class="card__title" id="t-hist">Historial</h2>${cadaTxt ? `<span class="muted">Viene ${cadaTxt} aprox.</span>` : ''}</div>
              <div class="hist__stats">
                <div><b>${hechos.length}</b><span>${hechos.length === 1 ? 'servicio' : 'servicios'}</span></div>
                ${admin ? `<div><b>${U.money(total)}</b><span>cobrado en total</span></div>
                <div><b>${conPrecio.length ? U.money(St.suma(conPrecio) / conPrecio.length) : '—'}</b><span>por servicio</span></div>` : ''}
              </div>
              ${cadencia}
              ${historial}
            </section>
            ${admin ? `<details class="more-opts">
              <summary>Más opciones</summary>
              <div class="more-opts__body">
                ${c.bloqueado
                  ? `<button class="btn btn--ghost btn--block" data-action="desbloquear" data-id="${id}">${Icon('unlock')} Desbloquear cliente</button>`
                  : `<button class="btn btn--danger-ghost btn--block" data-action="bloquear" data-id="${id}">${Icon('ban')} Bloquear cliente</button>`}
                <button class="btn btn--text btn--block btn--sm" data-action="eliminar-cliente" data-id="${id}">${Icon('trash')} Eliminar cliente para siempre</button>
              </div>
            </details>` : ''}
          </div>
        </div>`,
    };
  }

  /* ============================== AGENDA ============================== */
  function agenda() {
    const hoy = U.todayStr();
    const pend = Store.pendientes();
    const toggle = `
      <div class="segmented segmented--icons" role="group" aria-label="Cómo ver la agenda">
        <button type="button" data-action="agenda-vista" data-vista="lista" aria-pressed="${ui.agendaVista === 'lista'}">${Icon('list')} Lista</button>
        <button type="button" data-action="agenda-vista" data-vista="calendario" aria-pressed="${ui.agendaVista === 'calendario'}">${Icon('grid')} Calendario</button>
      </div>`;
    const base = {
      title: 'Agenda',
      subtitle: `${U.plural(pend.length, 'servicio pendiente', 'servicios pendientes')}, por fecha y hora`,
      actions: btnAgendar(),
    };
    if (ui.agendaVista === 'calendario') return { ...base, html: `<div class="toolbar">${toggle}</div>${calendarioHtml()}` };

    const manana = U.addDays(hoy, 1);
    const grupos = [
      ['Atrasados', 'Ya pasó la fecha. Márquelos como hechos o cámbielos de día.', pend.filter((s) => s.fecha < hoy), 'danger'],
      ['Hoy', U.capitalize(U.formatDateLong(hoy)), pend.filter((s) => s.fecha === hoy), ''],
      ['Mañana', U.capitalize(U.formatDateLong(manana)), pend.filter((s) => s.fecha === manana), ''],
      ['Esta semana', '', pend.filter((s) => s.fecha > manana && s.fecha <= U.addDays(hoy, 7)), ''],
      ['Más adelante', '', pend.filter((s) => s.fecha > U.addDays(hoy, 7)), ''],
    ];
    return {
      ...base,
      html: `<div class="toolbar">${toggle}</div>` + (pend.length
        ? grupos.filter((g) => g[2].length).map(([t, note, list, kind]) => C.section(t, list.length, C.serviciosList(list, { ahora: t === 'Hoy' }), { kind, note })).join('')
        : C.empty('calendar', 'No hay servicios agendados', 'Cuando agende un servicio aparecerá aquí con la fecha y hora.', btnAgendar())),
    };
  }

  function calendarioHtml() {
    const hoy = U.todayStr();
    const porDia = {};
    Store.getServicios().forEach((s) => {
      if (s.estado === 'cancelado') return;
      const c = Store.getCliente(s.clienteId);
      if (!c || (c.bloqueado && s.estado === 'pendiente')) return;
      (porDia[s.fecha] = porDia[s.fecha] || []).push(s);
    });
    const delMes = Object.keys(porDia).filter((f) => U.monthKey(f) === ui.calMes).flatMap((f) => porDia[f]);
    const dia = ui.calDia;
    const lista = (porDia[dia] || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const pendDia = lista.filter((s) => s.estado === 'pendiente');
    const hechosDia = lista.filter((s) => s.estado === 'realizado');

    return `
      <div class="cal-layout">
        <section class="card cal" aria-label="Calendario">
          <div class="cal__head">
            <div>
              <h2 class="cal__title">${U.capitalize(U.monthName(ui.calMes))}</h2>
              <p class="cal__sum muted">${U.plural(delMes.length, 'servicio', 'servicios')}${Store.esAdmin() && St.suma(delMes) ? `, <span class="num">${U.money(St.suma(delMes))}</span>` : ''}</p>
            </div>
            <div class="cal__nav">
              <button type="button" class="icon-btn" data-action="cal-mes" data-delta="-1" aria-label="Mes anterior">${Icon('chevronLeft')}</button>
              <button type="button" class="btn btn--ghost btn--sm" data-action="cal-hoy">Hoy</button>
              <button type="button" class="icon-btn" data-action="cal-mes" data-delta="1" aria-label="Mes siguiente">${Icon('chevronRight')}</button>
            </div>
          </div>
          ${C.calendario(ui.calMes, dia, porDia)}
          <p class="cal__legend" aria-hidden="true">
            <span class="cal-chip cal-chip--pend">Agendado</span><span class="cal-chip cal-chip--late">Atrasado</span><span class="cal-chip cal-chip--done">Hecho</span>
          </p>
        </section>

        <section class="day-panel" aria-live="polite">
          <div class="day-panel__head">
            <h2 class="day-panel__title">${dia === hoy ? 'Hoy' : U.capitalize(U.relativeDay(dia))}</h2>
            <p class="muted">${U.capitalize(U.formatDateLong(dia))}${Store.esAdmin() && St.suma(lista) ? `, <span class="num">${U.money(St.suma(lista))}</span>` : ''}</p>
          </div>
          ${pendDia.length ? C.serviciosList(pendDia, { ahora: dia === hoy }) : ''}
          ${hechosDia.length ? `<h3 class="day-panel__sub">Ya realizados</h3><ul class="rows done-list">${hechosDia.map(C.hechoRow).join('')}</ul>` : ''}
          ${!lista.length ? `<div class="empty empty--soft"><h3>Día libre</h3><p>No hay servicios este día.</p>
            ${dia >= hoy ? `<button class="btn btn--primary" data-action="agendar-servicio" data-fecha="${dia}">${Icon('calendar')} Agendar para este día</button>` : ''}</div>` : ''}
        </section>
      </div>`;
  }

  /* ============================== SEGUIMIENTO ============================== */
  function seguimiento() {
    const hoy = U.todayStr();
    const porEnviar = Store.seguimientosPorEnviar();
    const proximos = Store.seguimientosProximos(30);
    const enviadosHoy = Store.seguimientosEnviados().filter((x) => x.servicio.fechaSeguimientoEnviado === hoy).length;
    const sel = porEnviar.find((x) => x.servicio.id === ui.segSel) || porEnviar[0];
    const iSel = porEnviar.indexOf(sel);
    const siguiente = porEnviar[iSel + 1] || (iSel > 0 ? porEnviar[0] : null);
    const lote = porEnviar.length + enviadosHoy;

    // Resultados: envíos de los últimos 6 meses y cuántos volvieron a contratar
    const meses = St.meses(6);
    const { env, volvieron } = St.conversion(`${meses[0]}-01`);
    const porMes = meses.map((k) => ({
      label: U.monthName(k, true), full: U.capitalize(U.monthName(k)),
      value: env.filter((x) => U.monthKey(x.servicio.fechaSeguimientoEnviado) === k).length,
    }));

    // Próximos 30 días: franja por día + lista agrupada por semana
    const dias = Array.from({ length: 30 }, (_, i) => U.addDays(hoy, i + 1));
    const semanas = [
      ['Esta semana', proximos.filter((x) => x.fecha <= U.addDays(hoy, 7))],
      ['La próxima semana', proximos.filter((x) => x.fecha > U.addDays(hoy, 7) && x.fecha <= U.addDays(hoy, 14))],
      ['Más adelante', proximos.filter((x) => x.fecha > U.addDays(hoy, 14))],
    ].filter((g) => g[1].length);

    return {
      title: 'Seguimiento',
      subtitle: 'Mensajes de WhatsApp a los 15 días, 20 días o 1 mes del servicio',
      html: `
        ${ui.ayudaSeguimientoOculta ? '' : `<div class="alert alert--info">${Icon('info')}<div>
          Revise el mensaje y toque <strong>Enviar por WhatsApp</strong>. Al regresar, el sistema le pregunta si se envió y pasa solo al siguiente.</div>
          <button class="btn btn--ghost btn--sm" data-action="ocultar-ayuda">Entendido</button></div>`}

        ${porEnviar.length ? `
          <div class="batch">
            <p class="batch__txt"><strong class="num">${enviadosHoy} de ${lote}</strong> mensajes enviados hoy</p>
            <div class="batch__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lote}" aria-valuenow="${enviadosHoy}" aria-label="Mensajes enviados hoy">
              <span style="--p:${pct(enviadosHoy, lote)}%"></span></div>
          </div>
          <div class="inbox">
            <div class="inbox__side">
              <h2 class="inbox__title">Por enviar <span class="count">${porEnviar.length}</span></h2>
              <ul class="inbox__list">${porEnviar.map((x) => C.inboxItem(x, x === sel)).join('')}</ul>
            </div>
            <section class="inbox__detail card" aria-label="Mensaje seleccionado">
              ${C.seguimientoCard(sel, { editando: !!ui.editMsg[sel.servicio.id], siguiente })}
            </section>
          </div>`
          : `<div class="done-hero card">${Icon('check')}<div><h2>Todo al día</h2><p class="muted">${enviadosHoy ? `Hoy se enviaron ${U.plural(enviadosHoy, 'mensaje', 'mensajes')}. ` : ''}No hay mensajes pendientes por enviar.</p></div></div>`}

        <div class="two-col two-col--fu">
          ${C.section('Próximos 30 días', proximos.length, proximos.length ? `
            <div class="card">
              <div class="strip" aria-hidden="true">
                ${dias.map((f, i) => {
                  const n = proximos.filter((x) => x.fecha === f);
                  const d = U.parseDate(f);
                  return `<div class="strip__day ${d.getDay() === 1 ? 'is-week' : ''}" ${n.length ? `data-tip-l="${U.capitalize(U.formatDateLong(f))}" data-tip-v="${U.plural(n.length, 'mensaje', 'mensajes')}" data-tip-s="${esc(n.map((x) => x.cliente.nombre).join(', '))}"` : ''}>
                    <span class="strip__dots">${n.map(() => '<i></i>').join('')}</span>
                    ${d.getDay() === 1 ? `<span class="strip__lbl">${U.DIAS_CORTOS[d.getDay()]} ${d.getDate()}</span>` : ''}
                  </div>`;
                }).join('')}
              </div>
              ${semanas.map(([t, list]) => `
                <h3 class="fu-group">${t}</h3>
                <ul class="fu-list">${list.map((x) => `
                  <li><a href="#/cliente/${x.cliente.id}">${esc(Store.nombreCompleto(x.cliente))}</a>
                    <span class="fu-list__date num">${U.formatDateDay(x.fecha)}</span>
                    <span class="fu-list__tipo">${esc(x.servicio.tipo)}</span></li>`).join('')}
                </ul>`).join('')}
            </div>` : '<div class="card"><p class="muted">No hay seguimientos en los próximos 30 días.</p></div>')}

          ${C.section('Resultados del seguimiento', null, `
            <div class="card">
              <div class="kpis kpis--2">
                ${kpi({ label: 'Mensajes enviados en 6 meses', value: env.length, raw: env.length })}
                ${kpi({ label: 'Volvieron a contratar', value: `${pct(volvieron.length, env.length)}%`, raw: pct(volvieron.length, env.length), fmt: 'pct',
                  extra: `<span class="kpi__sub">${volvieron.length} de ${env.length} agendaron otro servicio en los 45 días siguientes</span>` })}
              </div>
              ${env.length ? Charts.columns(porMes, { format: (n) => U.plural(n, 'mensaje', 'mensajes'), short: (n) => String(Math.round(n)), height: 140, cols: ['Mes', 'Mensajes enviados'], integer: true }) : ''}
              ${env.length ? `<details class="sent"><summary>Ver los últimos enviados</summary>
                <ul class="rows">${Store.seguimientosEnviados().slice(0, 8).map((x) => C.seguimientoRow(x, { mode: 'enviado' })).join('')}</ul></details>` : ''}
            </div>`)}
        </div>`,
    };
  }

  /* ============================== NEGOCIO ============================== */
  function negocio() {
    const n = ui.periodo;
    const meses = St.meses(n);
    const desde = `${meses[0]}-01`;
    const enPeriodo = St.realizados().filter((s) => s.fecha >= desde);
    const conPrecio = enPeriodo.filter((s) => s.precio > 0);
    const sinPrecio = enPeriodo.length - conPrecio.length;
    const total = St.suma(enPeriodo);
    const hoy = U.todayStr();
    const inicioAnt = `${U.addMonths(meses[0], -n)}-01`;
    const anterior = St.realizados().filter((s) => s.fecha >= inicioAnt && s.fecha < desde);
    const comparar = St.cubre(U.addDays(inicioAnt, 15)); // solo si hay registros de todo el periodo anterior
    const porCobrar = Store.pendientes().filter((s) => s.fecha <= U.addDays(hoy, 30));

    const porMes = meses.map((k) => {
      const l = St.delMes(k);
      const enCurso = k === U.monthKey(hoy);
      return { label: U.monthName(k, true), full: U.capitalize(U.monthName(k)) + (enCurso ? ' (en curso)' : ''), value: St.suma(l), sub: U.plural(l.length, 'servicio', 'servicios') };
    });

    const tipos = {};
    enPeriodo.forEach((s) => { (tipos[s.tipo] = tipos[s.tipo] || []).push(s); });
    const porTipo = Object.entries(tipos).map(([t, l]) => ({ label: t, value: St.suma(l), sub: U.plural(l.length, 'servicio', 'servicios') }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    const dows = [1, 2, 3, 4, 5, 6, 0];
    const porDia = dows.map((dw) => {
      const l = enPeriodo.filter((s) => U.parseDate(s.fecha).getDay() === dw);
      return { label: U.DIAS_CORTOS[dw], full: U.capitalize(U.DIAS[dw]), value: l.length };
    });
    const iMaxDia = porDia.reduce((b, d, i) => (d.value > porDia[b].value ? i : b), 0);

    const clientesT = {};
    enPeriodo.forEach((s) => { (clientesT[s.clienteId] = clientesT[s.clienteId] || []).push(s); });
    const mejores = Object.entries(clientesT).map(([cid, l]) => ({ c: Store.getCliente(cid), l, total: St.suma(l) }))
      .sort((a, b) => b.total - a.total).slice(0, 6);
    const repiten = Object.values(clientesT).filter((l) => l.length > 1).length;

    return {
      title: 'Negocio',
      subtitle: 'Cuánto entra, qué se vende más y quiénes son los mejores clientes',
      html: `
        <div class="toolbar">
          <div class="segmented" role="group" aria-label="Periodo">
            ${[[6, 'Últimos 6 meses'], [12, 'Últimos 12 meses']].map(([v, l]) => `<button type="button" data-action="periodo" data-n="${v}" aria-pressed="${n === v}">${l}</button>`).join('')}
          </div>
        </div>

        <div class="kpis kpis--4">
          ${kpi({ label: 'Cobrado', value: U.money(total), raw: total, fmt: 'money', extra: comparar ? delta(total, St.suma(anterior), `los ${n} meses anteriores`) : '' })}
          ${kpi({ label: 'Servicios realizados', value: enPeriodo.length, raw: enPeriodo.length, extra: comparar ? delta(enPeriodo.length, anterior.length, `los ${n} meses anteriores`) : '' })}
          ${kpi({ label: 'Cobro promedio por servicio', value: conPrecio.length ? U.money(total / conPrecio.length) : '—', raw: conPrecio.length ? Math.round(total / conPrecio.length) : null, fmt: 'money' })}
          ${kpi({ label: 'Agendado por cobrar', value: U.money(St.suma(porCobrar)), raw: St.suma(porCobrar), fmt: 'money', extra: `<span class="kpi__sub">${U.plural(porCobrar.length, 'servicio', 'servicios')} en los próximos 30 días</span>` })}
        </div>
        ${sinPrecio ? `<p class="hint hint--note">${Icon('info')} ${U.plural(sinPrecio, 'servicio realizado no tiene', 'servicios realizados no tienen')} precio registrado. Agréguelo con “Cambiar” para que las cifras sean exactas.</p>` : ''}

        <div class="biz-grid">
          <section class="card biz-grid__wide">
            <h2 class="card__title">Cobrado por mes</h2>
            ${Charts.columns(porMes, { format: U.money, short: U.moneyShort, height: 220, cols: ['Mes', 'Cobrado'] })}
          </section>
          <section class="card">
            <h2 class="card__title">Qué servicio deja más</h2>
            ${porTipo.length ? Charts.hbars(porTipo, { format: U.money, cols: ['Servicio', 'Cobrado'] }) : '<p class="muted">Sin datos en este periodo.</p>'}
          </section>
          <section class="card">
            <h2 class="card__title">Días con más trabajo</h2>
            <p class="card__note">Servicios realizados según el día de la semana. Útil para planear rutas y descansos.</p>
            ${Charts.columns(porDia, { format: (v) => U.plural(v, 'servicio', 'servicios'), short: (v) => String(Math.round(v)), highlight: iMaxDia, height: 170, cols: ['Día', 'Servicios'], integer: true })}
          </section>
          <section class="card biz-grid__wide">
            <div class="card__head"><h2 class="card__title">Mejores clientes</h2>
              <span class="muted">${repiten} de ${Object.keys(clientesT).length} clientes repitieron en el periodo</span></div>
            <table class="table">
              <thead><tr><th>Cliente</th><th class="num">Servicios</th><th class="num">Total</th><th>Último servicio</th></tr></thead>
              <tbody>${mejores.map(({ c, l, total: t }) => `
                <tr><td><a href="#/cliente/${c.id}">${esc(Store.nombreCompleto(c))}</a></td>
                  <td class="num">${l.length}</td><td class="num"><strong>${U.money(t)}</strong></td>
                  <td>${U.formatDateShort(l.map((s) => s.fecha).sort().pop())}</td></tr>`).join('')}
              </tbody>
            </table>
          </section>
        </div>`,
    };
  }

  /* ============================== AJUSTES ============================== */
  // Datos que se pueden insertar en cada mensaje (se tocan, no se escriben con llaves)
  const VARS = {
    plantillaSeguimiento: [['nombre', 'Nombre del cliente'], ['negocio', 'Nombre del negocio'], ['servicio', 'Servicio'], ['dias', 'Días desde el servicio'], ['fecha', 'Fecha del servicio']],
    plantillaRecordatorio: [['nombre', 'Nombre del cliente'], ['negocio', 'Nombre del negocio'], ['servicio', 'Servicio'], ['fecha', 'Fecha'], ['hora', 'Hora'], ['direccion', 'Dirección']],
  };

  /** Datos de un cliente real (o de ejemplo) para la vista previa de los mensajes. */
  function muestra() {
    const s = Store.getServicios().find((x) => x.estado === 'realizado' && Store.getCliente(x.clienteId));
    const c = s && Store.getCliente(s.clienteId);
    return {
      nombre: c?.nombre || 'María', apellido: c?.apellido || '', negocio: Store.getAjustes().negocio,
      servicio: (s?.tipo || 'Cucarachas').toLowerCase(), dias: 30,
      fecha: U.formatDateLong(U.addDays(U.todayStr(), 1)), hora: U.formatTime('10:00'), direccion: c?.direccion || 'Av. Hidalgo 1450, Col. Centro',
    };
  }
  const vistaPrevia = (tpl) => esc(U.fillTemplate(tpl || '', muestra())).replace(/\n/g, '<br>');

  function ajustes() {
    const a = Store.getAjustes();
    const ultimo = pref.get('ultimoRespaldo');
    const dias = ultimo ? U.diffDays(ultimo, U.todayStr()) : null;
    const nS = Store.getServicios().length;
    const nC = Store.getClientes().length;
    const local = Store.modoLocal();

    const editor = (name, titulo, ayuda) => `
      <div class="tpl">
        <div class="tpl__edit">
          <label for="a-${name}" class="tpl__label">${titulo}</label>
          <p class="hint">${ayuda}</p>
          <div class="var-chips" role="group" aria-label="Agregar un dato al mensaje">
            ${VARS[name].map(([k, l]) => `<button type="button" class="var-chip" data-action="insertar-var" data-var="${k}" data-target="a-${name}">${Icon('plus')} ${l}</button>`).join('')}
          </div>
          <textarea id="a-${name}" name="${name}" rows="7" data-preview="p-${name}">${esc(a[name])}</textarea>
        </div>
        <div class="tpl__preview">
          <span class="tpl__label">Así lo recibirá ${esc(muestra().nombre)}</span>
          <div class="chat"><div class="fu__preview"><div class="fu__bubble"><p id="p-${name}">${vistaPrevia(a[name])}</p>
            <span class="fu__bubble-meta">Vista previa</span></div></div></div>
        </div>
      </div>`;

    return {
      title: 'Ajustes',
      subtitle: 'Los cambios se guardan solos',
      html: `
        <form id="form-ajustes" class="settings-page" novalidate>
          <section class="set" aria-labelledby="s-neg">
            <div class="set__intro">
              <h2 id="s-neg">Negocio</h2>
              <p>El nombre aparece en los mensajes de WhatsApp. La ciudad se usa para ubicar las direcciones en el mapa.</p>
            </div>
            <div class="set__body card">
              <div class="grid-2">
                <div class="field"><label for="a-negocio">Nombre del negocio</label>
                  <input id="a-negocio" name="negocio" value="${esc(a.negocio)}" autocomplete="organization"></div>
                <div class="field"><label for="a-ciudad">Ciudad</label>
                  <input id="a-ciudad" name="ciudad" value="${esc(a.ciudad)}" placeholder="Ej. San Luis Potosí, S.L.P."></div>
              </div>
            </div>
          </section>

          <section class="set" aria-labelledby="s-msg">
            <div class="set__intro">
              <h2 id="s-msg">Mensajes de WhatsApp</h2>
              <p>Cada mensaje se llena solo con los datos del cliente. Toque un dato para agregarlo donde está el cursor.</p>
              <button type="button" class="btn btn--text btn--sm" data-action="restaurar-mensajes">${Icon('refresh')} Volver a los mensajes originales</button>
            </div>
            <div class="set__body card">
              ${editor('plantillaSeguimiento', 'Mensaje de seguimiento', 'Se envía a los 15 días, 20 días o 1 mes del servicio.')}
              ${editor('plantillaRecordatorio', 'Recordatorio antes del servicio', 'Se usa con el botón “Recordarle” de la agenda.')}
            </div>
          </section>
        </form>

        <section class="set" aria-labelledby="s-resp">
          <div class="set__intro">
            <h2 id="s-resp">Respaldo</h2>
            <p>${local ? 'La información vive en <strong>este navegador</strong>. Si se borra el historial o cambia de computadora, se pierde sin un respaldo.'
              : 'La información se guarda en el servidor y se respalda sola cada día. Aquí puede descargar una copia cuando quiera.'}</p>
          </div>
          <div class="set__body card">
            ${local ? `<div class="backup ${dias == null || dias > 30 ? 'backup--warn' : ''}">
              ${Icon(dias == null || dias > 30 ? 'alert' : 'check')}
              <div>
                <strong>${dias == null ? 'Todavía no ha descargado ningún respaldo' : dias === 0 ? 'Último respaldo: hoy' : `Último respaldo: hace ${U.plural(dias, 'día', 'días')}`}</strong>
                <p class="muted">Se guardan ${U.plural(nC, 'cliente', 'clientes')}, ${U.plural(nS, 'servicio', 'servicios')} y todas las notas. Recomendado: una vez por semana.</p>
              </div>
            </div>` : `<p class="muted">La copia incluye ${U.plural(nC, 'cliente', 'clientes')}, ${U.plural(nS, 'servicio', 'servicios')} y todas las notas. Cargar un respaldo reemplaza toda la información del servidor.</p>`}
            <div class="btn-row">
              <button type="button" class="btn btn--primary" data-action="exportar">${Icon('download')} Descargar respaldo</button>
              <label class="btn btn--ghost">${Icon('upload')} Cargar un respaldo<input type="file" accept="application/json,.json" id="importar" hidden></label>
            </div>
          </div>
        </section>

        <section class="set" aria-labelledby="s-demo">
          <div class="set__intro">
            <h2 id="s-demo">${local ? 'Datos de ejemplo' : 'Borrar información'}</h2>
            <p>${local ? 'Para probar el sistema. Antes de usarlo de verdad, borre los ejemplos.' : 'Borra todos los clientes, servicios y notas. Antes, el servidor guarda una copia por si fue un error.'}</p>
          </div>
          <div class="set__body card card--danger">
            <div class="btn-row btn-row--flush">
              ${local ? `<button type="button" class="btn btn--ghost" data-action="cargar-demo">${Icon('refresh')} Volver a cargar ejemplos</button>` : ''}
              <button type="button" class="btn btn--danger-ghost" data-action="borrar-todo">${Icon('trash')} Borrar todos los clientes</button>
            </div>
          </div>
        </section>`,
    };
  }

  return { inicio, clientes, listaClientesHtml, cliente, agenda, seguimiento, negocio, ajustes, ui, pref, St, vistaPrevia };
})();

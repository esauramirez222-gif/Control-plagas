/* Formularios: registrar/editar cliente, registrar/agendar/editar servicio, bloquear. */
const Forms = (() => {
  const esc = U.esc;
  const TIPOS = ['Fumigación general', 'Cucarachas', 'Hormigas', 'Termitas', 'Chinches', 'Alacranes',
    'Roedores', 'Arañas', 'Mosquitos', 'Pulgas y garrapatas', 'Otro'];

  /* ---------- Fragmentos compartidos ---------- */
  const tipoSelect = (sel = 'Fumigación general') => `
    <div class="field">
      <label for="f-tipo">¿Qué servicio es?</label>
      <select id="f-tipo" name="tipo">${TIPOS.map((t) => `<option ${t === sel ? 'selected' : ''}>${t}</option>`).join('')}</select>
    </div>`;

  /**
   * Precio del servicio (opcional). El sugerido sale del promedio de lo cobrado por ese tipo de servicio.
   * El técnico pone el precio al registrar, pero no lo puede cambiar después (docs/API.md §12).
   */
  const precioField = (val = '', { editando = false } = {}) => {
    const bloqueado = editando && !Store.esAdmin();
    return `
    <div class="field"><label for="f-precio">Precio del servicio <span class="muted">(opcional)</span></label>
      <div class="money-input"><span aria-hidden="true">$</span>
        <input id="f-precio" name="precio" type="number" inputmode="numeric" min="0" step="50" value="${val ?? ''}" ${bloqueado ? 'disabled aria-describedby="precio-solo-admin"' : ''}></div>
      ${bloqueado ? '<p class="hint hint--below" id="precio-solo-admin">Solo el administrador puede cambiar el precio.</p>' : '<p class="hint hint--below" data-sugerido></p>'}</div>`;
  };

  /** Cambia el precio sugerido cuando se elige otro tipo de servicio. */
  function wirePrecio(form) {
    const tipo = form.querySelector('[name=tipo]');
    const input = form.querySelector('[name=precio]');
    const hint = form.querySelector('[data-sugerido]');
    if (!hint || input.disabled) return;
    // El técnico no recibe los precios de lo ya hecho: el promedio no sería confiable
    const sugerir = Store.esAdmin();
    const update = () => {
      const sug = sugerir ? Store.precioSugerido(tipo.value) : null;
      input.placeholder = sug ? String(sug) : 'Ej. 650';
      hint.innerHTML = sug ? `Normalmente se cobra <strong class="num">${U.money(sug)}</strong> por ${esc(tipo.value.toLowerCase())}. <button type="button" class="link-btn" data-usar-precio="${sug}">Usar este precio</button>` : '';
    };
    tipo.addEventListener('change', update);
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-usar-precio]');
      if (b) { input.value = b.dataset.usarPrecio; input.focus(); }
    });
    update();
  }

  /** Vista previa del mapa mientras se escribe la dirección. */
  function wireMapa(form) {
    const dir = form.querySelector('[name=direccion]');
    const box = form.querySelector('#map-prev');
    let t;
    const update = () => {
      const v = dir.value.trim();
      box.innerHTML = v.length >= 8 ? `${C.mapa(v, { alto: 190 })}
        <p class="hint hint--below">Se busca en el mapa como: <strong>${esc(Store.direccionMapa(v))}</strong>.
        Revise que el punto sea el correcto. Si el cliente está en otro municipio, escríbalo al final de la dirección.
        La ciudad se cambia en <a href="#/ajustes" data-close>Ajustes</a>.</p>` : '';
    };
    dir.addEventListener('input', () => { clearTimeout(t); t = setTimeout(update, 900); });
    update();
  }

  const seguimientoRadios = (val = 30) => `
    <fieldset class="field">
      <legend>¿En cuánto tiempo se le manda mensaje de seguimiento?</legend>
      <p class="hint">Es lo que se le propuso al cliente. El sistema le avisará cuando toque enviarlo por WhatsApp.</p>
      <div class="choice-row">
        ${[[15, '15 días'], [20, '20 días'], [30, '1 mes']].map(([v, l]) => `
          <label class="chip-radio"><input type="radio" name="seguimientoDias" value="${v}" ${Number(val) === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div>
    </fieldset>`;

  /** Pregunta clave: ¿el servicio fue hoy, otro día, o se va a agendar? */
  const cuandoFieldset = (def = 'hoy', step = '', fechaAg = U.addDays(U.todayStr(), 1)) => `
    <fieldset class="field">
      <legend>${step}¿Cuándo es o fue el servicio?</legend>
      <div class="choice-cards">
        <label class="choice-card"><input type="radio" name="cuando" value="hoy" ${def === 'hoy' ? 'checked' : ''}>
          <span>${Icon('check')}<strong>Se hizo hoy</strong><small>${U.capitalize(U.formatDateLong(U.todayStr()))}</small></span></label>
        <label class="choice-card"><input type="radio" name="cuando" value="antes" ${def === 'antes' ? 'checked' : ''}>
          <span>${Icon('history')}<strong>Se hizo otro día</strong><small>Lo estoy registrando después</small></span></label>
        <label class="choice-card"><input type="radio" name="cuando" value="agendar" ${def === 'agendar' ? 'checked' : ''}>
          <span>${Icon('calendar')}<strong>Todavía no</strong><small>Quiero agendarlo</small></span></label>
      </div>
      <div class="cuando-extra" data-show="antes">
        <div class="field"><label for="f-fecha-antes">¿Qué día se hizo?</label>
          <input type="date" id="f-fecha-antes" name="fechaAntes" max="${U.addDays(U.todayStr(), -1)}" value="${U.addDays(U.todayStr(), -1)}"></div>
      </div>
      <div class="cuando-extra grid-2" data-show="agendar">
        <div class="field"><label for="f-fecha-ag">¿Qué día?</label>
          <input type="date" id="f-fecha-ag" name="fechaAgendar" min="${U.todayStr()}" value="${fechaAg}"></div>
        <div class="field"><label for="f-hora">¿A qué hora se acordó?</label>
          <input type="time" id="f-hora" name="hora" value="10:00"></div>
      </div>
    </fieldset>`;

  function wireCuando(form) {
    const update = () => {
      const v = form.querySelector('[name=cuando]:checked')?.value;
      form.querySelectorAll('.cuando-extra').forEach((el) => { el.hidden = el.dataset.show !== v; });
    };
    form.querySelectorAll('[name=cuando]').forEach((r) => r.addEventListener('change', update));
    update();
  }

  /** Convierte la respuesta de "¿cuándo?" en fecha/hora/estado y valida. */
  function leerCuando(fd, errors) {
    const cuando = fd.get('cuando');
    const hoy = U.todayStr();
    if (cuando === 'hoy') return { fecha: hoy, hora: '', estado: 'realizado' };
    if (cuando === 'antes') {
      const f = fd.get('fechaAntes');
      if (!f) errors.fechaAntes = 'Elija el día en que se hizo el servicio.';
      else if (f > hoy) errors.fechaAntes = 'Esa fecha todavía no llega. Si es a futuro, elija “Todavía no”.';
      return { fecha: f, hora: '', estado: 'realizado' };
    }
    const f = fd.get('fechaAgendar');
    const h = fd.get('hora');
    if (!f) errors.fechaAgendar = 'Elija el día del servicio.';
    else if (f < hoy) errors.fechaAgendar = 'Esa fecha ya pasó. Si ya se hizo, elija “Se hizo otro día”.';
    if (!h) errors.hora = 'Escriba la hora acordada con el cliente.';
    return { fecha: f, hora: h, estado: 'pendiente' };
  }

  /* ---------- Cliente ---------- */
  function cliente(id) {
    const c = id ? Store.getCliente(id) : null;
    const editing = !!c;
    const m = UI.modal({
      title: editing ? 'Editar datos del cliente' : 'Registrar cliente nuevo',
      size: 'lg',
      body: `
        <form id="form-cliente" novalidate>
          <h3 class="form-step"><span>1</span> Datos del cliente</h3>
          <div class="grid-2">
            <div class="field"><label for="f-nombre">Nombre</label>
              <input id="f-nombre" name="nombre" autocomplete="off" placeholder="Ej. María" value="${esc(c?.nombre)}"></div>
            <div class="field"><label for="f-apellido">Apellido(s)</label>
              <input id="f-apellido" name="apellido" autocomplete="off" placeholder="Ej. González Pérez" value="${esc(c?.apellido)}"></div>
          </div>
          <div class="field"><label for="f-tel">Teléfono (WhatsApp)</label>
            <input id="f-tel" name="telefono" type="tel" inputmode="numeric" autocomplete="off" placeholder="10 dígitos, ej. 444 123 4567" value="${esc(c ? U.phoneDisplay(c.telefono) : '')}">
            <div id="tel-aviso"></div></div>
          <div class="field"><label for="f-dir">Dirección</label>
            <textarea id="f-dir" name="direccion" rows="2" placeholder="Calle, número y colonia. Ej. Av. Cordillera de los Himalaya 216, Lomas 4a Sección">${esc(c?.direccion)}</textarea>
            <div id="map-prev" class="map-prev"></div></div>
          ${editing ? '' : `
          <h3 class="form-step"><span>2</span> Servicio</h3>
          ${cuandoFieldset('hoy')}
          <div class="grid-2">${tipoSelect()}${precioField()}</div>
          <h3 class="form-step"><span>3</span> Seguimiento</h3>
          ${seguimientoRadios(30)}
          <h3 class="form-step"><span>4</span> Comentario <small>(opcional)</small></h3>
          <div class="field"><label for="f-com" class="sr-only">Comentario</label>
            <textarea id="f-com" name="comentario" rows="3" placeholder="Ej. Tiene perro, avisar antes de llegar. Cucarachas en la cocina."></textarea></div>`}
        </form>`,
      footer: `<button class="btn btn--ghost btn--lg" data-close>Cancelar</button>
               <button class="btn btn--primary btn--lg" type="submit" form="form-cliente">${Icon('check')} ${editing ? 'Guardar cambios' : 'Registrar cliente'}</button>`,
    });

    const form = m.el.querySelector('form');
    if (!editing) { wireCuando(form); wirePrecio(form); }
    wireMapa(form);

    // Aviso en vivo si el teléfono ya existe (y alerta roja si está bloqueado)
    const telInput = form.querySelector('[name=telefono]');
    const aviso = form.querySelector('#tel-aviso');
    const checkTel = () => {
      const dup = Store.buscarPorTelefono(telInput.value, c?.id);
      if (!dup) { aviso.innerHTML = ''; return; }
      aviso.innerHTML = dup.bloqueado
        ? `<div class="alert alert--danger">${Icon('ban')}<div><strong>¡Cuidado! Este teléfono es de un cliente BLOQUEADO:</strong> ${esc(Store.nombreCompleto(dup))}.<br>Motivo: ${esc(dup.motivoBloqueo)} <a href="#/cliente/${dup.id}" data-close>Ver cliente</a></div></div>`
        : `<div class="alert alert--warn">${Icon('info')}<div>Este teléfono ya está registrado a nombre de <strong>${esc(Store.nombreCompleto(dup))}</strong>. <a href="#/cliente/${dup.id}" data-close>Ver cliente</a></div></div>`;
    };
    telInput.addEventListener('input', checkTel);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const errors = {};
      const val = {
        nombre: (fd.get('nombre') || '').trim(), apellido: (fd.get('apellido') || '').trim(),
        telefono: fd.get('telefono') || '', direccion: (fd.get('direccion') || '').trim(),
      };
      if (!val.nombre) errors.nombre = 'Escriba el nombre.';
      if (!val.apellido) errors.apellido = 'Escriba el apellido.';
      const digits = U.phoneDigits(val.telefono);
      if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('52'))) errors.telefono = 'El teléfono debe tener 10 números.';
      if (!val.direccion) errors.direccion = 'Escriba la dirección.';
      let serv;
      if (!editing) serv = leerCuando(fd, errors);
      if (!UI.showErrors(form, errors)) return;

      if (editing) {
        Store.updateCliente(c.id, val);
        m.close();
        UI.toast('Datos del cliente guardados');
        return;
      }
      const dup = Store.buscarPorTelefono(val.telefono);
      if (dup?.bloqueado && !form.dataset.confirmedBlocked) {
        form.dataset.confirmedBlocked = '1';
        UI.toast('Este teléfono es de un cliente bloqueado. Presione “Registrar” otra vez si de todos modos quiere registrarlo.', 'error', { duration: 6000 });
        return;
      }
      const nuevo = Store.addCliente(val);
      Store.addServicio({ clienteId: nuevo.id, tipo: fd.get('tipo'), seguimientoDias: fd.get('seguimientoDias'), precio: Number(fd.get('precio')) || null, ...serv });
      const com = (fd.get('comentario') || '').trim();
      if (com) Store.addComentario(nuevo.id, com);
      m.close();
      UI.toast(`${esc(nuevo.nombre)} quedó registrado(a)`);
      location.hash = `#/cliente/${nuevo.id}`;
    });
  }

  /* ---------- Servicio (nuevo o editar) ---------- */
  function servicio({ clienteId = null, servicioId = null, cuando = 'agendar', fecha = null } = {}) {
    const s = servicioId ? Store.getServicio(servicioId) : null;
    const editing = !!s;
    let selected = clienteId || s?.clienteId || null;

    const pickerHtml = () => `
      <div class="field">
        <label for="f-buscar-cli">¿Para qué cliente?</label>
        <div class="search"><span class="search__icon">${Icon('search')}</span>
          <input id="f-buscar-cli" type="search" placeholder="Escriba nombre o teléfono" autocomplete="off"></div>
        <input type="hidden" name="clienteId">
        <ul class="picker" id="picker"></ul>
      </div>`;

    const m = UI.modal({
      title: editing ? 'Cambiar servicio' : 'Registrar o agendar servicio',
      size: 'lg',
      body: `
        <form id="form-servicio" novalidate>
          ${selected ? `<div class="selected-client">${C.avatar(Store.getCliente(selected))}<div><strong>${esc(Store.nombreCompleto(Store.getCliente(selected)))}</strong><p class="muted">${esc(Store.getCliente(selected).direccion)}</p></div></div><input type="hidden" name="clienteId" value="${selected}">` : pickerHtml()}
          ${editing ? `
            <div class="grid-2">
              <div class="field"><label for="f-fecha">Día</label><input type="date" id="f-fecha" name="fecha" value="${s.fecha}"></div>
              <div class="field"><label for="f-hora">Hora acordada</label><input type="time" id="f-hora" name="hora" value="${s.hora}"></div>
            </div>` : cuandoFieldset(cuando, '', fecha || U.addDays(U.todayStr(), 1))}
          <div class="grid-2">${tipoSelect(s?.tipo)}${precioField(s?.precio, { editando: editing })}</div>
          ${seguimientoRadios(s?.seguimientoDias || 30)}
          ${editing ? `<div class="danger-zone"><button type="button" class="btn btn--danger-ghost" data-cancelar>${Icon('x')} Cancelar este servicio</button></div>` : ''}
        </form>`,
      footer: `<button class="btn btn--ghost btn--lg" data-close>Regresar</button>
               <button class="btn btn--primary btn--lg" type="submit" form="form-servicio">${Icon('check')} Guardar</button>`,
    });
    const form = m.el.querySelector('form');
    if (!editing) wireCuando(form);
    wirePrecio(form);

    // Selector de cliente con búsqueda
    if (!selected) {
      const input = form.querySelector('#f-buscar-cli');
      const list = form.querySelector('#picker');
      const hidden = form.querySelector('[name=clienteId]');
      const render = () => {
        const q = U.norm(input.value);
        const qd = U.phoneDigits(input.value);
        const res = Store.getClientes()
          .filter((c) => !q || U.norm(Store.nombreCompleto(c)).includes(q) || (qd && c.telefono.includes(qd)))
          .sort((a, b) => Store.nombreCompleto(a).localeCompare(Store.nombreCompleto(b)))
          .slice(0, 8);
        list.innerHTML = res.length ? res.map((c) => `
          <li><button type="button" class="picker__item ${hidden.value === c.id ? 'is-selected' : ''}" data-pick="${c.id}" ${c.bloqueado ? 'disabled' : ''}>
            ${C.avatar(c)}<span><strong>${esc(Store.nombreCompleto(c))}</strong><small>${c.bloqueado ? 'Bloqueado: no se le pueden agendar servicios' : esc(U.phoneDisplay(c.telefono))}</small></span>
            ${hidden.value === c.id ? Icon('check') : ''}</button></li>`).join('')
          : '<li class="muted picker__none">No se encontró. Si es nuevo, primero regístrelo con “Registrar cliente”.</li>';
      };
      input.addEventListener('input', render);
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b) return;
        hidden.value = b.dataset.pick;
        render();
      });
      render();
    }

    form.querySelector('[data-cancelar]')?.addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Cancelar servicio', message: '¿Seguro que quiere cancelar este servicio? Ya no aparecerá en la agenda.', okText: 'Sí, cancelar servicio', danger: true });
      if (!ok) return;
      Store.updateServicio(s.id, { estado: 'cancelado' });
      m.close();
      UI.toast('Servicio cancelado', 'info');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const errors = {};
      const cid = fd.get('clienteId');
      if (!cid) errors.clienteId = 'Toque el nombre del cliente en la lista.';
      let datos;
      if (editing) {
        datos = { fecha: fd.get('fecha'), hora: fd.get('hora') };
        if (!datos.fecha) errors.fecha = 'Elija el día.';
        if (s.estado === 'pendiente' && !datos.hora) errors.hora = 'Escriba la hora acordada.';
      } else {
        datos = leerCuando(fd, errors);
      }
      if (!UI.showErrors(form, errors)) {
        if (errors.clienteId) form.querySelector('#f-buscar-cli')?.focus();
        return;
      }
      const common = { tipo: fd.get('tipo'), seguimientoDias: Number(fd.get('seguimientoDias')), precio: Number(fd.get('precio')) || null };
      // Campo bloqueado (técnico editando): no se manda el precio, así el servidor no responde 403
      if (form.querySelector('[name=precio]').disabled) delete common.precio;
      if (editing) {
        Store.updateServicio(s.id, { ...datos, ...common });
        UI.toast('Servicio actualizado');
      } else {
        Store.addServicio({ clienteId: cid, ...common, ...datos });
        UI.toast(datos.estado === 'pendiente' ? `Servicio agendado para ${U.formatDateLong(datos.fecha)} a las ${U.formatTime(datos.hora)}` : 'Servicio registrado');
      }
      m.close();
    });
  }

  /* ---------- Bloquear ---------- */
  function bloquear(id, motivoSugerido = '') {
    const c = Store.getCliente(id);
    const m = UI.modal({
      title: 'Bloquear cliente',
      body: `
        <form id="form-bloq" novalidate>
          <div class="alert alert--danger">${Icon('ban')}<div>
            Va a bloquear a <strong>${esc(Store.nombreCompleto(c))}</strong>.<br>
            No se le podrán agendar servicios, no aparecerá en los seguimientos y sus servicios pendientes se cancelarán.
            Puede desbloquearlo después si cambia de opinión.</div></div>
          <div class="field"><label for="f-motivo">¿Por qué lo bloquea?</label>
            <textarea id="f-motivo" name="motivo" rows="3" placeholder="Ej. No pagó, fue grosero, canceló varias veces...">${esc(motivoSugerido)}</textarea></div>
        </form>`,
      footer: `<button class="btn btn--ghost btn--lg" data-close>Regresar</button>
               <button class="btn btn--danger btn--lg" type="submit" form="form-bloq">${Icon('ban')} Bloquear cliente</button>`,
    });
    const form = m.el.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const motivo = new FormData(form).get('motivo').trim();
      if (!UI.showErrors(form, motivo ? {} : { motivo: 'Escriba el motivo. Así se acordará después.' })) return;
      Store.bloquear(id, motivo);
      m.close();
      UI.toast(`${esc(c.nombre)} fue bloqueado(a)`, 'info');
    });
  }

  return { cliente, servicio, bloquear, TIPOS };
})();

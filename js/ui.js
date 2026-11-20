/* Piezas de interfaz reutilizables: ventanas (modales), confirmaciones y avisos. */
const UI = (() => {
  const modalRoot = () => document.getElementById('modal-root');
  let lastFocus = null;

  /**
   * Abre una ventana. Devuelve { el, close }.
   * opts: { title, body (html), footer (html), size: 'md'|'lg', onClose }
   */
  function modal({ title, body, footer = '', size = 'md', onClose } = {}) {
    lastFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal modal--${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header">
          <h2 id="modal-title">${title}</h2>
          <button class="icon-btn" data-close aria-label="Cerrar">${Icon('x')}</button>
        </header>
        <div class="modal__body">${body}</div>
        ${footer ? `<footer class="modal__footer">${footer}</footer>` : ''}
      </div>`;
    modalRoot().appendChild(wrap);
    document.body.classList.add('no-scroll');
    hydrateIcons(wrap);

    const close = () => {
      wrap.classList.add('is-closing');
      setTimeout(() => {
        wrap.remove();
        if (!modalRoot().children.length) document.body.classList.remove('no-scroll');
        lastFocus?.focus?.();
      }, 150);
      document.removeEventListener('keydown', onKey);
      onClose?.();
    };
    const onKey = (e) => {
      if (modalRoot().lastElementChild !== wrap) return;
      if (e.key === 'Escape') close();
      // Mantener el foco del teclado dentro de la ventana (WCAG 2.4.3)
      if (e.key === 'Tab') {
        const f = [...wrap.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, summary')]
          .filter((el) => el.offsetParent !== null || el.type === 'radio');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });

    setTimeout(() => wrap.querySelector('input:not([type=radio]):not([type=checkbox]), textarea, select, .btn--primary')?.focus(), 50);
    return { el: wrap, close };
  }

  /** Pregunta de sí/no. Devuelve una promesa con true/false. */
  function confirm({ title = '¿Está seguro?', message = '', okText = 'Sí, continuar', cancelText = 'No, regresar', danger = false } = {}) {
    return new Promise((resolve) => {
      let answered = false;
      const m = modal({
        title,
        body: `<div class="confirm ${danger ? 'confirm--danger' : ''}">
                 <div class="confirm__icon">${Icon(danger ? 'alert' : 'info')}</div>
                 <p>${message}</p>
               </div>`,
        footer: `<button class="btn btn--ghost btn--lg" data-close>${cancelText}</button>
                 <button class="btn btn--lg ${danger ? 'btn--danger' : 'btn--primary'}" data-ok>${okText}</button>`,
        onClose: () => { if (!answered) resolve(false); },
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => {
        answered = true;
        resolve(true);
        m.close();
      });
    });
  }

  /** Aviso breve en la parte inferior de la pantalla. type: ok | error | info */
  function toast(message, type = 'ok', { actionText, onAction, duration = 3500 } = {}) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${Icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check')}<span>${message}</span>
      ${actionText ? `<button class="toast__action">${actionText}</button>` : ''}`;
    root.appendChild(el);
    const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.toast__action')?.addEventListener('click', () => { onAction?.(); remove(); });
    setTimeout(remove, duration);
  }

  /** Muestra errores de validación debajo de cada campo. */
  function showErrors(form, errors) {
    form.querySelectorAll('.field__error').forEach((e) => e.remove());
    form.querySelectorAll('.is-invalid').forEach((e) => {
      e.classList.remove('is-invalid');
      e.removeAttribute('aria-invalid');
      e.removeAttribute('aria-describedby');
    });
    const keys = Object.keys(errors);
    keys.forEach((name) => {
      const input = form.querySelector(`[name="${name}"]`);
      const field = input?.closest('.field') || input?.closest('fieldset');
      if (!field) return;
      const errId = `err-${name}`;
      input.classList.add('is-invalid');
      // El lector de pantalla anuncia el error y lo asocia al campo (WCAG 3.3.1)
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errId);
      field.insertAdjacentHTML('beforeend', `<p class="field__error" id="${errId}" role="alert">${Icon('alert')} ${errors[name]}</p>`);
    });
    if (keys.length) form.querySelector(`[name="${keys[0]}"]`)?.focus();
    return keys.length === 0;
  }

  return { modal, confirm, toast, showErrors };
})();

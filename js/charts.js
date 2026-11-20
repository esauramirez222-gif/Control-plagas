/* =====================================================================
   Gráficas en HTML/SVG puro (sin librerías: funciona sin internet).
   Reglas (skill de visualización de datos):
     · Una sola serie por gráfica → sin leyenda; el título dice qué se mide.
     · Barras ≤ 24 px, punta redondeada de 4 px, base recta; cuadrícula de 1 px discreta.
     · Etiquetas selectivas (el máximo y el periodo actual), nunca un número en cada barra.
     · Tooltip al pasar el cursor o con el teclado; siempre hay tabla con los datos.
     · El texto nunca usa el color de la serie.
   ===================================================================== */
const Charts = (() => {
  const esc = U.esc;

  /** Máximo "redondo" para el eje (1, 2, 2.5, 5 × 10ⁿ). */
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = 10 ** Math.floor(Math.log10(v));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }

  const tabla = (data, format, cols) => `
    <details class="chart__table"><summary>Ver datos</summary>
      <table><thead><tr><th>${cols[0]}</th><th>${cols[1]}</th></tr></thead>
      <tbody>${data.map((d) => `<tr><td>${esc(d.full || d.label)}</td><td class="num">${format(d.value)}</td></tr>`).join('')}</tbody></table>
    </details>`;

  /**
   * Columnas (tiempo o categorías ordenadas).
   * data: [{ label, full, value, sub }]  opts: { format, short, highlight (índice), height, cols, href }
   */
  function columns(data, { format = String, short = format, highlight = data.length - 1, height = 200, cols = ['Periodo', 'Valor'], action = '', integer = false } = {}) {
    let max = niceMax(Math.max(...data.map((d) => d.value), 0));
    // Conteos: el eje solo muestra números enteros (0, 1, 2… nunca 0.5)
    if (integer) max = Math.max(2, Math.ceil(max / 2) * 2);
    const ticks = [0, max / 2, max];
    const iMax = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
    return `
      <figure class="chart chart--cols" style="--h:${height}px; --n:${data.length}">
        <div class="chart__plot">
          <div class="chart__grid" aria-hidden="true">
            ${ticks.map((t) => `<span style="--y:${t / max}"><i>${short(t)}</i></span>`).join('')}
          </div>
          <div class="chart__cols">
            ${data.map((d, i) => `
              <div class="chart__col ${i === highlight ? 'is-hl' : ''}" tabindex="0" role="img"
                aria-label="${esc(d.full || d.label)}: ${esc(format(d.value))}${d.sub ? `, ${esc(d.sub)}` : ''}"
                data-tip-l="${esc(d.full || d.label)}" data-tip-v="${esc(format(d.value))}" data-tip-s="${esc(d.sub || '')}"
                ${action && d.key ? `data-action="${action}" data-key="${d.key}"` : ''}>
                <span class="chart__bar" style="--v:${d.value / max}; --i:${i}"></span>
                ${(i === highlight || i === iMax) && d.value > 0 ? `<b class="chart__val num" style="--v:${d.value / max}; --i:${i}">${esc(short(d.value))}</b>` : ''}
              </div>`).join('')}
          </div>
        </div>
        <div class="chart__x" aria-hidden="true">${data.map((d, i) => `<span class="${i === highlight ? 'is-hl' : ''}">${esc(d.label)}</span>`).join('')}</div>
        ${tabla(data, format, cols)}
      </figure>`;
  }

  /** Barras horizontales ordenadas de mayor a menor (comparar categorías). data: [{label, value, sub}] */
  function hbars(data, { format = String, cols = ['Categoría', 'Valor'] } = {}) {
    const max = Math.max(...data.map((d) => d.value), 1);
    return `
      <figure class="chart">
        <ul class="hbars">
          ${data.map((d, i) => `
            <li class="hbars__row" tabindex="0" data-tip-l="${esc(d.label)}" data-tip-v="${esc(format(d.value))}" data-tip-s="${esc(d.sub || '')}">
              <span class="hbars__label">${esc(d.label)}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</span>
              <span class="hbars__track"><span class="hbars__bar" style="--v:${d.value / max}; --i:${i}"></span></span>
              <span class="hbars__val num">${esc(format(d.value))}</span>
            </li>`).join('')}
        </ul>
        ${tabla(data, format, cols)}
      </figure>`;
  }

  /** Línea de tendencia pequeña: periodos anteriores en tono suave, el último marcado. */
  function sparkline(values, { w = 132, h = 40 } = {}) {
    if (values.length < 2) return '';
    const max = Math.max(...values, 1);
    const pad = 5;
    const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (values.length - 1), h - pad - (v / max) * (h - pad * 2)]);
    const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
    const [lx, ly] = pts[pts.length - 1];
    return `
      <svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
        <polygon class="spark__area" points="${pad},${h - pad} ${line} ${lx.toFixed(1)},${h - pad}"/>
        <polyline class="spark__line" points="${line}" pathLength="1"/>
        <circle class="spark__dot" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4"/>
      </svg>`;
  }

  /** Anillo de avance (hechos de un total). */
  function ring(done, total, { size = 76, stroke = 8 } = {}) {
    const r = (size - stroke) / 2;
    const frac = total ? done / total : 0;
    return `
      <svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
        <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
        <circle class="ring__fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
          pathLength="100" style="--p:${(frac * 100).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>`;
  }

  /* ---------- Tooltip único para todas las gráficas (texto con textContent) ---------- */
  function init() {
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.setAttribute('role', 'presentation');
    tip.innerHTML = '<strong></strong><span></span><small></small>';
    document.body.appendChild(tip);
    const [v, l, s] = tip.children;
    const show = (el, x, y) => {
      v.textContent = el.dataset.tipV;
      l.textContent = el.dataset.tipL;
      s.textContent = el.dataset.tipS || '';
      s.hidden = !el.dataset.tipS;
      tip.classList.add('is-on');
      const r = tip.getBoundingClientRect();
      const left = Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8);
      tip.style.transform = `translate(${left}px, ${Math.max(8, y - r.height - 14)}px)`;
    };
    const hide = () => tip.classList.remove('is-on');
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest?.('[data-tip-v]');
      if (el) show(el, e.clientX, e.clientY); else hide();
    });
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest?.('[data-tip-v]');
      if (!el) return hide();
      const r = el.getBoundingClientRect();
      show(el, r.left + r.width / 2, r.top);
    });
    document.addEventListener('focusout', hide);
    window.addEventListener('scroll', hide, { passive: true });
  }

  return { columns, hbars, sparkline, ring, init, niceMax };
})();

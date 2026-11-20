/* Utilidades generales: fechas, texto, teléfonos y enlaces. */
const U = (() => {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- Fechas (siempre en formato local "AAAA-MM-DD" para evitar errores de zona horaria) ---------- */
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const todayStr = () => toDateStr(new Date());
  const addDays = (s, n) => {
    const d = parseDate(s);
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  };
  /** Días de a → b (positivo si b es después de a). */
  const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

  const formatDateLong = (s, withYear = false) => {
    const d = parseDate(s);
    const base = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
    return withYear || d.getFullYear() !== new Date().getFullYear() ? `${base} de ${d.getFullYear()}` : base;
  };
  const formatDateShort = (s) => {
    const d = parseDate(s);
    const y = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}${y}`;
  };
  /** "lun 23 nov" */
  const formatDateDay = (s) => {
    const d = parseDate(s);
    return `${DIAS[d.getDay()].slice(0, 3)} ${formatDateShort(s)}`;
  };
  const formatTime = (t) => {
    if (!t) return 'Sin hora';
    let [h, m] = t.split(':').map(Number);
    const suf = h >= 12 ? 'p. m.' : 'a. m.';
    h = h % 12 || 12;
    return `${h}:${pad(m)} ${suf}`;
  };
  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return `${formatDateShort(toDateStr(d))}, ${formatTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`;
  };
  /** "Hoy", "Mañana", "Ayer", "En 5 días", "Hace 3 días" */
  const relativeDay = (s) => {
    const n = diffDays(todayStr(), s);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    if (n === -1) return 'Ayer';
    if (n > 1) return `En ${n} días`;
    return `Hace ${-n} días`;
  };
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  /* ---------- Texto ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  /* ---------- Teléfonos (México por defecto) ---------- */
  const phoneDigits = (p) => String(p ?? '').replace(/\D/g, '');
  /** CDMX (55/56), Guadalajara (33) y Monterrey (81) usan lada de 2 dígitos: "33 1234 5678".
      El resto del país usa lada de 3: "444 123 4567" (San Luis Potosí). */
  const phoneDisplay = (p) => {
    const d = phoneDigits(p).slice(-10);
    if (d.length !== 10) return p;
    return /^(55|56|33|81)/.test(d) ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  };
  /** Número internacional para WhatsApp: si son 10 dígitos se antepone 52 (México). */
  const phoneIntl = (p) => {
    const d = phoneDigits(p);
    return d.length === 10 ? `52${d}` : d;
  };
  const waLink = (phone, msg) => `https://wa.me/${phoneIntl(phone)}?text=${encodeURIComponent(msg)}`;
  const telLink = (phone) => `tel:+${phoneIntl(phone)}`;
  const mapsLink = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  /** Ruta en Google Maps desde donde esté la persona hasta la dirección. */
  const mapsDir = (addr) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
  /** Mapa incrustable (no requiere clave de API). */
  const mapsEmbed = (addr) => `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=16&output=embed`;

  /* ---------- Dinero (pesos mexicanos) ---------- */
  const money = (n) => (n == null || Number.isNaN(n) ? '—' : `$${Math.round(n).toLocaleString('es-MX')}`);
  /** "$12.4 mil" para ejes y cifras compactas */
  const moneyShort = (n) => (n >= 1000 ? `$${(n / 1000).toLocaleString('es-MX', { maximumFractionDigits: n >= 10000 ? 0 : 1 })} mil` : money(n));

  /* ---------- Meses ---------- */
  const monthKey = (s) => String(s).slice(0, 7); // "2026-11"
  const addMonths = (key, n) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };
  const monthName = (key, short = false) => {
    const [y, m] = key.split('-').map(Number);
    return (short ? MESES_CORTOS : MESES)[m - 1] + (short ? '' : ` ${y}`);
  };
  const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  /** Reemplaza {variables} en una plantilla de mensaje. */
  const fillTemplate = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

  return {
    toDateStr, parseDate, todayStr, addDays, diffDays, formatDateLong, formatDateShort, formatDateDay, formatTime,
    formatDateTime, relativeDay, capitalize, esc, norm, uid, plural, phoneDigits, phoneDisplay,
    phoneIntl, waLink, telLink, mapsLink, mapsDir, mapsEmbed, fillTemplate, money, moneyShort, monthKey, addMonths, monthName,
    DIAS, DIAS_CORTOS, MESES, MESES_CORTOS, pad,
  };
})();

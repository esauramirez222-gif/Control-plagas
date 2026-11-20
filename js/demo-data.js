/* =====================================================================
   Datos de demostración. Las fechas se calculan a partir de HOY para que
   la demo siempre tenga servicios de hoy, atrasados, próximos y
   seguimientos por enviar. (Teléfonos y personas son ficticios.)
   ===================================================================== */
function buildDemoData() {
  const hoy = U.todayStr();
  const d = (n) => U.addDays(hoy, n);
  const iso = (n, h = 10, m = 0) => {
    const x = U.parseDate(d(n));
    x.setHours(h, m);
    return x.toISOString();
  };

  // [id, nombre, apellido, teléfono, dirección, díasDesdeRegistro]
  const clientes = [
    ['c01', 'María', 'González Pérez', '3312458790', 'Av. Hidalgo 1450, Col. Centro', -120],
    ['c02', 'José Luis', 'Ramírez Torres', '3398127654', 'Calle Morelos 230, Col. Americana', -95],
    ['c03', 'Guadalupe', 'Hernández Ruiz', '3321904567', 'Privada Los Pinos 12, Fracc. Las Flores', -80],
    ['c04', 'Restaurante', 'El Buen Sazón', '3345671289', 'Av. Juárez 880, Local 3, Col. Centro', -200],
    ['c05', 'Roberto', 'Sánchez Medina', '3310987345', 'Calle Pino Suárez 45, Col. Jardines', -60],
    ['c06', 'Ana Karen', 'López Castillo', '3376543210', 'Calle Encino 908, Col. Bosques', -45],
    ['c07', 'Fernando', 'Díaz Ortega', '3387612345', 'Av. Patria 2100, Depto. 4B, Col. Providencia', -38],
    ['c08', 'Patricia', 'Morales Vega', '3365498721', 'Calle Allende 77, Col. San Juan', -30],
    ['c09', 'Miguel Ángel', 'Cruz Flores', '3354327890', 'Calle Reforma 512, Col. Moderna', -150],
    ['c10', 'Escuela', 'Primaria Benito Juárez', '3332109876', 'Calle Independencia 300, Col. Obrera', -25],
    ['c11', 'Sofía', 'Navarro Ríos', '3343218765', 'Calle Nogal 18, Fracc. Valle Real', -20],
    ['c12', 'Héctor', 'Jiménez Salas', '3376540981', 'Av. Vallarta 3456, Col. Arcos', -90],
    ['c13', 'Laura', 'Martínez Aguilar', '3390871234', 'Calle Cedro 66, Col. Del Valle', -10],
    ['c14', 'Carlos', 'Mendoza Ibarra', '3329876501', 'Calle Libertad 1020, Col. Centro', -5],
    ['c15', 'Rosa Elena', 'Vargas Luna', '3318273645', 'Calle Colón 405, Col. Mezquitán', -2],
  ].map(([id, nombre, apellido, telefono, direccion, reg]) => ({
    id, nombre, apellido, telefono, direccion, fechaRegistro: d(reg), bloqueado: false, motivoBloqueo: '', fechaBloqueo: null,
  }));

  // Clientes bloqueados de ejemplo
  Object.assign(clientes.find((c) => c.id === 'c05'), {
    bloqueado: true, fechaBloqueo: d(-40), motivoBloqueo: 'No pagó el último servicio y fue grosero con el técnico.',
  });
  Object.assign(clientes.find((c) => c.id === 'c12'), {
    bloqueado: true, fechaBloqueo: d(-15), motivoBloqueo: 'Canceló 3 veces a última hora sin avisar.',
  });

  let n = 0;
  // [clienteId, tipo, díasRelativos, hora, estado, seguimientoDias, seguimiento]
  const servicios = [
    // Historial antiguo
    ['c01', 'Fumigación general', -120, '10:00', 'realizado', 30, 'enviado'],
    ['c01', 'Cucarachas', -45, '09:30', 'realizado', 30, 'pendiente'],     // seguimiento atrasado (15 días)
    ['c02', 'Termitas', -95, '11:00', 'realizado', 30, 'enviado'],
    ['c02', 'Termitas', -20, '11:00', 'realizado', 20, 'pendiente'],       // toca HOY
    ['c03', 'Alacranes', -80, '16:00', 'realizado', 30, 'enviado'],
    ['c03', 'Alacranes', -15, '16:00', 'realizado', 15, 'pendiente'],      // toca HOY
    ['c04', 'Roedores', -200, '07:00', 'realizado', 30, 'enviado'],
    ['c04', 'Fumigación general', -32, '07:00', 'realizado', 30, 'pendiente'], // atrasado 2 días
    ['c04', 'Roedores', 2, '07:00', 'pendiente', 30, 'pendiente'],
    ['c05', 'Chinches', -60, '12:00', 'realizado', 15, 'omitido'],
    ['c06', 'Hormigas', -45, '13:00', 'realizado', 15, 'enviado'],
    ['c06', 'Hormigas', -10, '13:00', 'realizado', 15, 'pendiente'],       // próximo (en 5 días)
    ['c07', 'Cucarachas', -38, '18:00', 'realizado', 30, 'pendiente'],     // atrasado 8 días
    ['c07', 'Cucarachas', 0, '18:30', 'pendiente', 30, 'pendiente'],       // HOY
    ['c08', 'Mosquitos', -30, '10:30', 'realizado', 30, 'pendiente'],      // toca HOY
    ['c09', 'Termitas', -150, '09:00', 'realizado', 30, 'enviado'],
    ['c09', 'Fumigación general', -2, '09:00', 'pendiente', 30, 'pendiente'], // servicio atrasado
    ['c10', 'Fumigación general', -25, '08:00', 'realizado', 30, 'pendiente'], // próximo (en 5 días)
    ['c10', 'Cucarachas', 6, '08:00', 'pendiente', 30, 'pendiente'],
    ['c11', 'Chinches', -20, '17:00', 'realizado', 20, 'pendiente'],       // toca HOY
    ['c12', 'Hormigas', -90, '15:00', 'realizado', 30, 'omitido'],
    ['c13', 'Arañas', -10, '12:30', 'realizado', 15, 'pendiente'],         // próximo (en 5 días)
    ['c13', 'Arañas', 0, '10:00', 'pendiente', 15, 'pendiente'],           // HOY
    ['c14', 'Cucarachas', -5, '11:30', 'realizado', 20, 'pendiente'],
    ['c14', 'Cucarachas', 1, '11:30', 'pendiente', 20, 'pendiente'],       // MAÑANA
    ['c15', 'Fumigación general', 0, '16:00', 'pendiente', 30, 'pendiente'], // HOY
    ['c15', 'Alacranes', 12, '09:00', 'pendiente', 30, 'pendiente'],
    ['c03', 'Fumigación general', 4, '13:00', 'pendiente', 30, 'pendiente'],
    ['c11', 'Chinches', 25, '17:00', 'pendiente', 20, 'pendiente'],
  ].map(([clienteId, tipo, rel, hora, estado, seguimientoDias, seguimiento]) => ({
    id: `s${++n}`, clienteId, tipo, fecha: d(rel), hora, estado, seguimientoDias, seguimiento,
    fechaSeguimientoEnviado: seguimiento === 'enviado' ? d(rel + seguimientoDias) : null,
  }));

  // Precios: base por plaga; negocios y escuelas pagan más (superficie mayor)
  const BASE = {
    'Fumigación general': 950, Cucarachas: 650, Hormigas: 550, Termitas: 2200, Chinches: 1400,
    Alacranes: 750, Roedores: 1100, Arañas: 600, Mosquitos: 700, 'Pulgas y garrapatas': 800,
  };
  const FACTOR = { c04: 1.6, c10: 2.2, c14: 1.3 };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const precio = (cid, tipo) => Math.round(((BASE[tipo] || 800) * (FACTOR[cid] || 1) * (0.9 + rnd() * 0.25)) / 50) * 50;
  servicios.forEach((s) => { s.precio = precio(s.clienteId, s.tipo); });

  // Historial de ~7 meses para que los reportes tengan datos (crece poco a poco, como un negocio real)
  const activos = ['c01', 'c02', 'c03', 'c04', 'c06', 'c07', 'c08', 'c09', 'c10', 'c11', 'c13', 'c14', 'c15'];
  const tipos = ['Cucarachas', 'Cucarachas', 'Fumigación general', 'Fumigación general', 'Hormigas', 'Alacranes',
    'Termitas', 'Roedores', 'Chinches', 'Arañas', 'Mosquitos', 'Cucarachas'];
  const horas = ['08:00', '09:00', '10:00', '11:30', '13:00', '16:00', '17:30'];
  const hoyD = U.parseDate(hoy);
  const porMes = [5, 6, 7, 7, 9, 10, 11]; // de hace 7 meses a hace 1 mes
  porMes.forEach((cuantos, i) => {
    const mesAtras = 7 - i;
    for (let k = 0; k < cuantos; k++) {
      const f = new Date(hoyD.getFullYear(), hoyD.getMonth() - mesAtras, 1 + Math.floor(rnd() * 27));
      if (f.getDay() === 0) f.setDate(f.getDate() - 1); // los domingos no se trabaja
      const rel = U.diffDays(hoy, U.toDateStr(f));
      if (rel > -32) continue; // el mes reciente ya lo cubren los datos de arriba
      const cid = activos[Math.floor(rnd() * activos.length)];
      const tipo = tipos[Math.floor(rnd() * tipos.length)];
      const dias = [15, 20, 30][Math.floor(rnd() * 3)];
      const enviado = rnd() > 0.2;
      servicios.push({
        id: `h${++n}`, clienteId: cid, tipo, fecha: d(rel), hora: horas[Math.floor(rnd() * horas.length)], estado: 'realizado',
        precio: precio(cid, tipo), seguimientoDias: dias, seguimiento: enviado ? 'enviado' : 'omitido',
        fechaSeguimientoEnviado: enviado ? d(rel + dias) : null,
      });
    }
  });
  // Este mes: algunos servicios ya hechos (con su seguimiento todavía por venir)
  for (let k = 0; k < 6 && hoyD.getDate() > 2; k++) {
    const rel = -1 - Math.floor(rnd() * (hoyD.getDate() - 1));
    const cid = activos[Math.floor(rnd() * activos.length)];
    const tipo = tipos[Math.floor(rnd() * tipos.length)];
    servicios.push({
      id: `h${++n}`, clienteId: cid, tipo, fecha: d(rel), hora: horas[Math.floor(rnd() * horas.length)], estado: 'realizado',
      precio: precio(cid, tipo), seguimientoDias: 30, seguimiento: 'pendiente', fechaSeguimientoEnviado: null,
    });
  }

  // Coherencia: nadie puede ser "cliente desde" después de su primer servicio
  clientes.forEach((c) => {
    const primero = servicios.filter((s) => s.clienteId === c.id).map((s) => s.fecha).sort()[0];
    if (primero && primero < c.fechaRegistro) c.fechaRegistro = primero;
  });

  n = 0;
  // [clienteId, texto, díasRelativos, hora, negativo]
  const comentarios = [
    ['c01', 'Casa de dos pisos, tiene perro grande en el patio. Avisar antes de llegar.', -120, 9, false],
    ['c01', 'Muy amable, pagó en efectivo. Pide que la próxima vez se revise también la cocina.', -45, 11, false],
    ['c02', 'Termitas en la puerta de la cochera y el closet de la recámara principal.', -95, 12, false],
    ['c02', 'Se aplicó tratamiento. Recomendar revisar muebles de madera.', -20, 13, false],
    ['c03', 'Hay niños pequeños, usar producto sin olor.', -80, 17, false],
    ['c03', 'Encontró 2 alacranes después del servicio, se le explicó que es normal la primera semana.', -10, 10, false],
    ['c04', 'Cliente empresarial: requiere factura. Servicio antes de abrir (7 am).', -200, 8, false],
    ['c04', 'Contrato mensual de control de roedores. Buen pagador.', -32, 8, false],
    ['c05', 'Discutió el precio al final del servicio.', -60, 13, true],
    ['c05', 'No pagó el saldo pendiente. No contesta llamadas.', -42, 18, true],
    ['c06', 'Hormigas en la cocina y el jardín.', -45, 14, false],
    ['c06', 'Muy contenta con el resultado. Recomendó a su vecina.', -10, 14, false],
    ['c07', 'Departamento en 4º piso, no hay elevador.', -38, 19, false],
    ['c08', 'Muchos mosquitos por el canal cercano. Sugerir servicio cada mes en temporada de lluvias.', -30, 11, false],
    ['c09', 'Casa grande con bodega. Llevar escalera.', -150, 10, false],
    ['c10', 'Hablar con la directora. Solo se puede fumigar en fin de semana o antes de las 8 am.', -25, 9, false],
    ['c11', 'Chinches en colchones. Se le pidió lavar ropa de cama con agua caliente.', -20, 18, false],
    ['c12', 'Canceló el día del servicio, ya estábamos en camino.', -40, 15, true],
    ['c12', 'Volvió a cancelar a última hora.', -18, 16, true],
    ['c13', 'Arañas en el jardín y la cochera.', -10, 13, false],
    ['c14', 'Local comercial (tienda de abarrotes).', -5, 12, false],
    ['c15', 'Llamó por recomendación de Ana Karen López.', -2, 10, false],
  ].map(([clienteId, texto, rel, h, negativo]) => ({ id: `m${++n}`, clienteId, texto, fecha: iso(rel, h, 15), negativo }));

  // Los bloqueos también quedan registrados como comentario
  comentarios.push(
    { id: 'm-b1', clienteId: 'c05', texto: 'Cliente bloqueado. Motivo: No pagó el último servicio y fue grosero con el técnico.', fecha: iso(-40, 9), negativo: true },
    { id: 'm-b2', clienteId: 'c12', texto: 'Cliente bloqueado. Motivo: Canceló 3 veces a última hora sin avisar.', fecha: iso(-15, 9), negativo: true },
  );

  // demo: 2 → versión con precios e historial (las demos antiguas se actualizan solas)
  return { demo: 2, clientes, servicios, comentarios, ajustes: { negocio: 'HK Control de Plagas' } };
}

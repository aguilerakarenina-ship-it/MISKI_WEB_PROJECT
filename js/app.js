/* ── CuidaGest · App JS ─────────────────────────── */
// El objeto DB (caché + sincronización con Supabase) se define en
// js/supabase-config.js, que debe cargarse ANTES de este archivo.

// Carga datos de ejemplo SOLO si la base de datos está vacía
// (ni Supabase ni localStorage tienen registros de auxiliares).
function seedData() {
  if ((DB.get('auxiliares', []) || []).length > 0) return;

  DB.set('auxiliares', [
    { id: 1, nombre: 'María González',  iniciales: 'MG', rut: '4521001', valor_hora: 13,  color: 'green', activo: true },
    { id: 2, nombre: 'Juan Rodríguez',  iniciales: 'JR', rut: '6789002', valor_hora: 13,  color: 'amber', activo: true },
    { id: 3, nombre: 'Carmen Pérez',    iniciales: 'CP', rut: '5634003', valor_hora: 13,  color: 'green', activo: true },
    { id: 4, nombre: 'Ana Rivas',       iniciales: 'AR', rut: '7890004', valor_hora: 13,  color: 'blue',  activo: true },
    { id: 5, nombre: 'Luis Vargas',     iniciales: 'LV', rut: '3412005', valor_hora: 13,  color: 'amber', activo: true },
    { id: 6, nombre: 'Pedro Soto',      iniciales: 'PS', rut: '9023006', valor_hora: 13,  color: 'green', activo: true },
  ]);

  DB.set('usuarios', [
    { id: 1, nombre: 'Roberto Salinas', ci: '4521367', telefono: '70011223', direccion: 'Av. Arce #245, La Paz', tipo: 'asociado', obs: '' },
    { id: 2, nombre: 'Gabriela Flores', ci: '6789012', telefono: '76543210', direccion: 'Calle Murillo #102, La Paz', tipo: 'externo', obs: 'Requiere apoyo por las tardes' },
  ]);
  DB.set('ventas', []);

  const hoy = new Date();
  const mes = hoy.getMonth(); const año = hoy.getFullYear();
  const f = (d) => `${año}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  DB.set('asistencia', [
    { id: 1, aux_id: 1, fecha: f(hoy.getDate()), entrada: '08:02', salida: '16:05', horas: 8.05, usuario_id: 1 },
    { id: 2, aux_id: 2, fecha: f(hoy.getDate()), entrada: '08:15', salida: null,    horas: null, usuario_id: 1 },
    { id: 3, aux_id: 4, fecha: f(hoy.getDate()), entrada: null,    salida: null,    horas: null, usuario_id: null },
    { id: 4, aux_id: 1, fecha: f(hoy.getDate()-1), entrada: '08:00', salida: '16:00', horas: 8.0, usuario_id: 1 },
    { id: 5, aux_id: 3, fecha: f(hoy.getDate()-1), entrada: '08:10', salida: '16:20', horas: 8.17, usuario_id: 1 },
    { id: 6, aux_id: 2, fecha: f(hoy.getDate()-1), entrada: '14:00', salida: '22:00', horas: 8.0, usuario_id: 1 },
  ]);

  const turnos = [];
  let tid = 1;
  const turnoHorarios = { 'mañana': ['06:00','14:00'], 'tarde': ['14:00','22:00'], 'noche': ['22:00','06:00'] };
  const auxturnos = [
    [1,'mañana'],[2,'tarde'],[3,'mañana'],[4,'tarde'],[5,'mañana'],[6,'noche']
  ];
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(año, mes, d);
    if (dt.getMonth() !== mes) break;
    if (dt.getDay() !== 0 && dt.getDay() !== 6) {
      auxturnos.slice(0, 3 + (d % 3)).forEach(([aid, turno]) => {
        const [hi, hf] = turnoHorarios[turno];
        turnos.push({ id: tid++, aux_id: aid, fecha: f(d), turno, hora_inicio: hi, hora_fin: hf, horas: calcDuracionTurno(hi, hf), usuario_id: 1, paciente: 'Roberto Salinas' });
      });
    }
  }
  DB.set('turnos', turnos);
}

// ── Navigation ─────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  const nav = document.querySelector(`[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  // Update topbar
  const titles = {
    dashboard: ['Panel principal', 'Bienvenido/a — resumen del día'],
    asistencia: ['Control de asistencia', 'Registro de entradas y salidas'],
    cronograma: ['Cronograma mensual', 'Planificación de turnos'],
    pagos: ['Planilla de pagos', 'Cálculo automático de remuneraciones'],
    boletas: ['Generar boletas', 'Boletas de pago en PDF'],
    auxiliares: ['Asistentes', 'Gestión de asistentes REVIBO'],
    usuarios: ['Registro de Usuarios', 'Usuarios asociados y externos'],
    ventas: ['Venta de Servicios de Asistencia Personal', 'Gestión de servicios a usuarios externos'],
    retencion: ['Retención de Gastos Administrativos', 'Totales de retención generados por servicios'],
    informe: ['Informe Económico', 'Resumen consolidado de horas y montos'],
  };
  const t = titles[page] || ['CuidaGest', ''];
  document.getElementById('page-title').textContent = t[0];
  document.getElementById('page-sub').textContent = t[1];
  renderPage(page);
  window.scrollTo(0, 0);
}

function renderPage(page) {
  if (page === 'dashboard')   renderDashboard();
  if (page === 'asistencia')  renderAsistencia();
  if (page === 'cronograma')  renderCronograma();
  if (page === 'pagos')       renderPagos();
  if (page === 'boletas')     renderBoletas();
  if (page === 'auxiliares')  renderAuxiliares();
  if (page === 'usuarios')    renderUsuarios();
  if (page === 'ventas')      renderVentas();
  if (page === 'retencion')   renderRetencion();
  if (page === 'informe')     renderInforme();
}

// ── Helpers ────────────────────────────────────────
const $ = (s, ctx) => (ctx||document).querySelector(s);
const $$ = (s, ctx) => [...(ctx||document).querySelectorAll(s)];
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = n => n != null ? new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '—';
const fmtHoras = h => {
  if (h == null) return '—';
  const totalMinutes = Math.round(h * 60);
  const horas = Math.floor(totalMinutes / 60);
  const minutos = totalMinutes % 60;
  return `${horas}h ${String(minutos).padStart(2, '0')}m`;
};

const numberToSpanishWords = n => {
  if (n === 0) return 'cero';
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const toWords = num => {
    if (num === 0) return '';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const u = num % 10;
      const t = Math.floor(num / 10);
      if (t === 2) return u === 0 ? tens[t] : `veinti${units[u]}`;
      return u === 0 ? tens[t] : `${tens[t]} y ${units[u]}`;
    }
    if (num === 100) return 'cien';
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      return `${hundreds[h]}${rest ? ' ' + toWords(rest) : ''}`;
    }
    if (num < 1000000) {
      const miles = Math.floor(num / 1000);
      const rest = num % 1000;
      const prefix = miles === 1 ? 'mil' : `${toWords(miles)} mil`;
      return `${prefix}${rest ? ' ' + toWords(rest) : ''}`;
    }
    const millones = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const prefix = millones === 1 ? 'un millón' : `${toWords(millones)} millones`;
    return `${prefix}${rest ? ' ' + toWords(rest) : ''}`;
  };

  return toWords(n);
};

const amountLiteral = n => {
  if (n == null) return '—';
  const totalCentavos = Math.round(n * 100);
  const enteros = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  const palabras = numberToSpanishWords(enteros);
  const primera = palabras.charAt(0).toUpperCase() + palabras.slice(1);
  return `Son: ${primera} ${String(centavos).padStart(2, '0')}/100 Bolivianos.`;
};

const today = () => new Date().toISOString().slice(0,10);

// Calcula la duración (en horas decimales) entre hora_inicio y hora_fin.
// Soporta turnos que cruzan la medianoche (ej. 22:00 -> 06:00).
function calcDuracionTurno(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const [ih, im] = horaInicio.split(':').map(Number);
  const [fh, fm] = horaFin.split(':').map(Number);
  let diff = (fh*60 + fm) - (ih*60 + im);
  if (diff <= 0) diff += 24*60; // turno nocturno cruza medianoche
  return +(diff/60).toFixed(2);
}

function horasDesdeEntrada(entrada) {
  if (!entrada) return null;
  const [eh, em] = entrada.split(':').map(Number);
  const now = new Date();
  const diff = (now.getHours()*60 + now.getMinutes()) - (eh*60 + em);
  return diff > 0 ? +(diff/60).toFixed(2) : 0;
}

function avatarClass(aux) {
  return { green:'avatar-green', amber:'avatar-amber', red:'avatar-red', blue:'avatar-blue' }[aux.color] || 'avatar-green';
}

// ── DASHBOARD ──────────────────────────────────────
function renderDashboard() {
  const asis = DB.get('asistencia', []);
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  const hoyStr = today();
  const hoyAsis = asis.filter(a => a.fecha === hoyStr);

  const presentes = hoyAsis.filter(a => a.entrada && !a.salida || (a.entrada && a.salida)).length;
  const completos = hoyAsis.filter(a => a.entrada && a.salida).length;
  const enCurso = hoyAsis.filter(a => a.entrada && !a.salida).length;
  const sinRegistro = auxs.filter(a => !hoyAsis.find(h => h.aux_id === a.id)).length;

  const asisEste = asis.filter(a => a.fecha.startsWith(hoyStr.slice(0,7)));
  const totalHoras = asisEste.reduce((s,a) => s + (a.horas || 0), 0);

  $('#dash-presentes').textContent = presentes;
  $('#dash-completados').textContent = completos;
  $('#dash-en-curso').textContent = enCurso;
  $('#dash-sin-reg').textContent = sinRegistro;
  $('#dash-horas').textContent = Math.round(totalHoras);

  // Tabla asistencia hoy
  const tbody = $('#dash-asis-tbody');
  if (!tbody) return;
  tbody.innerHTML = auxs.slice(0, 6).map(aux => {
    const reg = hoyAsis.find(a => a.aux_id === aux.id);
    let estado, badgeClass;
    if (!reg) { estado = 'Sin registrar'; badgeClass = 'badge-amber'; }
    else if (reg.entrada && reg.salida) { estado = 'Completo'; badgeClass = 'badge-green'; }
    else if (reg.entrada) { estado = 'Trabajando'; badgeClass = 'badge-blue'; }
    else { estado = 'Ausente'; badgeClass = 'badge-red'; }

    return `<tr>
      <td><div class="td-name">
        <div class="avatar ${avatarClass(aux)}">${esc(aux.iniciales)}</div>
        <div><div class="td-main">${esc(aux.nombre)}</div>
        <div class="td-sub">Asistente REVIBO</div></div>
      </div></td>
      <td>${reg?.entrada || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${reg?.salida  || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${reg?.horas ? fmtHoras(reg.horas) : (reg?.entrada ? '<span style="color:var(--amber-mid)">En curso</span>' : '<span style="color:var(--text-muted)">—</span>')}</td>
      <td><span class="badge ${badgeClass}">${estado}</span></td>
    </tr>`;
  }).join('');

  // Alertas
  const alertasEl = $('#dash-alertas');
  const alertas = [];
  if (sinRegistro > 0) alertas.push({ type: 'warning', txt: `${sinRegistro} Asistente(es) sin registrar entrada hoy` });
  if (enCurso > 0) alertas.push({ type: 'info', txt: `${enCurso} Asistente(es) en turno activo actualmente` });
  const turnos = DB.get('turnos', []);
  const turnosHoy = turnos.filter(t => t.fecha === hoyStr);
  if (turnosHoy.length === 0) alertas.push({ type: 'warning', txt: 'No hay turnos programados para hoy en el cronograma' });
  alertas.push({ type: 'success', txt: supabaseClient ? 'Sistema funcionando correctamente · Datos sincronizados con Supabase' : 'Sistema funcionando correctamente · Datos guardados localmente' });
  if (alertasEl) alertasEl.innerHTML = alertas.map(a => `
    <div class="alert alert-${a.type}">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${esc(a.txt)}
    </div>`).join('');
}

// ── ASISTENCIA ─────────────────────────────────────
function renderAsistencia() {
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  const asis = DB.get('asistencia', []);
  const hoyStr = today();

  // Populate select de asistentes
  const sel = $('#asis-aux-select');
  if (sel) {
    sel.innerHTML = '<option value="">— Seleccionar Asistente —</option>' +
      auxs.map(a => {
        const reg = asis.find(r => r.aux_id === a.id && r.fecha === hoyStr);
        const nota = !reg ? '' : (reg.entrada && !reg.salida ? ' (en turno)' : (reg.salida ? ' ✓' : ''));
        return `<option value="${a.id}">${esc(a.nombre)}${nota}</option>`;
      }).join('');
  }

  // Populate select de usuarios asociados
  const selUsu = $('#asis-usuario-select');
  if (selUsu) {
    const usuarios = DB.get('usuarios', []).filter(u => u.tipo === 'asociado');
    const cur = selUsu.value;
    selUsu.innerHTML = '<option value="">— Seleccionar Usuario Asociado —</option>' +
      usuarios.map(u => `<option value="${u.id}">${esc(u.nombre)}</option>`).join('');
    if (cur) selUsu.value = cur;
  }

  // Tabla hoy
  renderAsistenciaTabla(hoyStr);
}

function renderAsistenciaTabla(fechaStr) {
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  const usuarios = DB.get('usuarios', []);
  const asis = DB.get('asistencia', []);
  const hoyAsis = asis.filter(a => a.fecha === fechaStr);
  const tbody = $('#asis-tabla-body');
  if (!tbody) return;

  let total = 0;
  tbody.innerHTML = auxs.map(aux => {
    const reg = hoyAsis.find(a => a.aux_id === aux.id);
    let estado, badgeClass, horasTxt;
    if (!reg || (!reg.entrada && !reg.salida)) { estado = 'Sin registrar'; badgeClass = 'badge-amber'; horasTxt = '—'; }
    else if (reg.entrada && reg.salida) {
      estado = 'Completo'; badgeClass = 'badge-green';
      horasTxt = fmtHoras(reg.horas);
      total += reg.horas || 0;
    } else if (reg.entrada) {
      estado = 'Trabajando'; badgeClass = 'badge-blue';
      const hCurso = horasDesdeEntrada(reg.entrada);
      horasTxt = `${fmtHoras(hCurso)} (en curso)`;
    } else { estado = 'Ausente'; badgeClass = 'badge-red'; horasTxt = '0h'; }

    const usuario = reg && reg.usuario_id ? usuarios.find(u => u.id === reg.usuario_id) : null;
    const usuarioTxt = usuario ? esc(usuario.nombre) : '<span style="color:var(--text-muted)">—</span>';

    const acciones = reg && reg.entrada && !reg.salida
      ? `<button class="btn btn-sm btn-danger" onclick="registrarSalida(${aux.id})">Registrar salida</button>`
      : (!reg || !reg.entrada
        ? `<button class="btn btn-sm btn-primary" onclick="registrarEntradaDirecta(${aux.id})">Registrar entrada</button>`
        : `<span style="color:var(--text-muted); font-size:12px;">Completo</span>`);

    return `<tr>
      <td><div class="td-name">
        <div class="avatar ${avatarClass(aux)}">${esc(aux.iniciales)}</div>
        <div><div class="td-main">${esc(aux.nombre)}</div>
        <div class="td-sub">Asistente REVIBO</div></div>
      </div></td>
      <td>${usuarioTxt}</td>
      <td>${reg?.entrada || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${reg?.salida  || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${horasTxt}</td>
      <td><span class="badge ${badgeClass}">${estado}</span></td>
      <td>${acciones}</td>
    </tr>`;
  }).join('');

  const totEl = $('#asis-total-horas');
  if (totEl) totEl.textContent = fmtHoras(total) + ' registradas hoy';
}

function registrarAsistencia() {
  const sel = $('#asis-aux-select');
  const tipo = $('#asis-tipo-select');
  const horaEl = $('#asis-hora');
  const selUsu = $('#asis-usuario-select');
  if (!sel || !sel.value) { showToast('Selecciona un Asistente', 'error'); return; }

  const auxId = parseInt(sel.value);
  const tipoVal = tipo ? tipo.value : 'entrada';
  const hora = horaEl ? horaEl.value : new Date().toTimeString().slice(0,5);
  const usuarioId = selUsu && selUsu.value ? parseInt(selUsu.value) : null;
  const auxs = DB.get('auxiliares', []);
  const aux = auxs.find(a => a.id === auxId);
  const asis = DB.get('asistencia', []);
  const hoyStr = today();
  const reg = asis.find(a => a.aux_id === auxId && a.fecha === hoyStr);

  if (tipoVal === 'entrada') {
    if (reg && reg.entrada) { showToast('Ya existe entrada registrada', 'error'); return; }
    if (!usuarioId) { showToast('Selecciona el Usuario Asociado al que se brinda el servicio', 'error'); return; }
    if (reg) { reg.entrada = hora; reg.usuario_id = usuarioId; }
    else { asis.push({ id: Date.now(), aux_id: auxId, fecha: hoyStr, entrada: hora, salida: null, horas: null, usuario_id: usuarioId }); }
    DB.set('asistencia', asis);
    showToast(`Entrada registrada para ${aux.nombre} a las ${hora}`, 'success');
  } else {
    if (!reg || !reg.entrada) { showToast('Primero debe registrarse la entrada', 'error'); return; }
    if (reg.salida) { showToast('La salida ya fue registrada', 'error'); return; }
    const [eh, em] = reg.entrada.split(':').map(Number);
    const [sh, sm] = hora.split(':').map(Number);
    const horas = +((sh*60+sm - eh*60-em) / 60).toFixed(2);
    reg.salida = hora; reg.horas = horas > 0 ? horas : 0;
    DB.set('asistencia', asis);
    showToast(`Salida registrada · ${fmtHoras(horas)} trabajadas`, 'success');
  }

  renderAsistenciaTabla(hoyStr);
  renderDashboard();
}

function registrarEntradaDirecta(auxId) {
  const selUsu = $('#asis-usuario-select');
  const usuarioId = selUsu && selUsu.value ? parseInt(selUsu.value) : null;
  if (!usuarioId) { showToast('Selecciona primero el Usuario Asociado en el formulario', 'error'); return; }
  const hora = new Date().toTimeString().slice(0,5);
  const asis = DB.get('asistencia', []);
  const hoyStr = today();
  const auxs = DB.get('auxiliares', []);
  const aux = auxs.find(a => a.id === auxId);
  asis.push({ id: Date.now(), aux_id: auxId, fecha: hoyStr, entrada: hora, salida: null, horas: null, usuario_id: usuarioId });
  DB.set('asistencia', asis);
  showToast(`Entrada registrada para ${aux.nombre}`, 'success');
  renderAsistenciaTabla(hoyStr);
}

function registrarSalida(auxId) {
  const hora = new Date().toTimeString().slice(0,5);
  const asis = DB.get('asistencia', []);
  const hoyStr = today();
  const reg = asis.find(a => a.aux_id === auxId && a.fecha === hoyStr);
  const auxs = DB.get('auxiliares', []);
  const aux = auxs.find(a => a.id === auxId);
  if (!reg) return;
  const [eh, em] = reg.entrada.split(':').map(Number);
  const [sh, sm] = hora.split(':').map(Number);
  reg.salida = hora;
  reg.horas = +((sh*60+sm - eh*60-em) / 60).toFixed(2);
  DB.set('asistencia', asis);
  showToast(`Salida de ${aux.nombre} · ${fmtHoras(reg.horas)}`, 'success');
  renderAsistenciaTabla(hoyStr);
}

// ── CRONOGRAMA ─────────────────────────────────────
let calMes, calAño;
function renderCronograma() {
  const now = new Date();
  if (!calMes) calMes = now.getMonth();
  if (!calAño) calAño = now.getFullYear();
  renderCalendario();
  populateCronogramaForm();
}

// Determina la clase visual del turno según la hora de inicio
function claseTurnoPorHora(horaInicio) {
  if (!horaInicio) return 'chip-m';
  const h = parseInt(horaInicio.split(':')[0], 10);
  if (h >= 6 && h < 14) return 'chip-m';   // mañana
  if (h >= 14 && h < 22) return 'chip-t';  // tarde
  return 'chip-n';                          // noche
}

function renderCalendario() {
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const el = $('#cal-mes-label');
  if (el) el.textContent = names[calMes] + ' ' + calAño;

  const turnos = DB.get('turnos', []);
  const auxs = DB.get('auxiliares', []);
  const grid = $('#cal-grid-body');
  if (!grid) return;

  const primerDia = new Date(calAño, calMes, 1).getDay();
  const offset = primerDia === 0 ? 6 : primerDia - 1;
  const diasMes = new Date(calAño, calMes + 1, 0).getDate();
  const diasAnterior = new Date(calAño, calMes, 0).getDate();
  const hoyStr = today();

  let html = '';
  for (let i = 0; i < offset; i++) {
    html += `<div class="cal-cell other-month"><div class="cal-num">${diasAnterior - offset + 1 + i}</div></div>`;
  }
  for (let d = 1; d <= diasMes; d++) {
    const dt = new Date(calAño, calMes, d);
    const wd = dt.getDay();
    const weekend = wd === 0 || wd === 6;
    const fStr = `${calAño}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = fStr === hoyStr;
    const dayTurnos = turnos.filter(t => t.fecha === fStr);
    const chips = dayTurnos.slice(0,3).map(t => {
      const aux = auxs.find(a => a.id === t.aux_id);
      const cls = claseTurnoPorHora(t.hora_inicio);
      return `<div class="shift-chip ${cls}">${aux ? aux.iniciales : '?'}</div>`;
    }).join('');
    const more = dayTurnos.length > 3 ? `<div style="font-size:10px;color:var(--text-muted);">+${dayTurnos.length-3} más</div>` : '';
    html += `<div class="cal-cell${weekend?' weekend':''}${isToday?' today':''}" onclick="verDiaCronograma('${fStr}')">
      <div class="cal-num">${d}</div>${chips}${more}</div>`;
  }
  const restante = (7 - (offset + diasMes) % 7) % 7;
  for (let i = 1; i <= restante; i++) {
    html += `<div class="cal-cell other-month"><div class="cal-num">${i}</div></div>`;
  }
  grid.innerHTML = html;
}

function calPrev() { if (calMes === 0) { calMes = 11; calAño--; } else calMes--; renderCalendario(); }
function calNext() { if (calMes === 11) { calMes = 0; calAño++; } else calMes++; renderCalendario(); }

function populateCronogramaForm() {
  const sel = $('#turno-aux-select');
  if (sel) {
    const auxs = DB.get('auxiliares', []).filter(a => a.activo);
    sel.innerHTML = '<option value="">— Auxiliar —</option>' + auxs.map(a =>
      `<option value="${a.id}">${esc(a.nombre)}</option>`).join('');
  }

  const selUsu = $('#turno-usuario-select');
  if (selUsu) {
    const usuarios = DB.get('usuarios', []).filter(u => u.tipo === 'asociado');
    const cur = selUsu.value;
    selUsu.innerHTML = '<option value="">— Seleccionar Usuario Asociado —</option>' +
      usuarios.map(u => `<option value="${u.id}">${esc(u.nombre)}</option>`).join('');
    if (cur) selUsu.value = cur;
  }
}

function agregarTurno() {
  const auxId = parseInt($('#turno-aux-select').value);
  const fecha = $('#turno-fecha').value;
  const horaInicio = $('#turno-hora-inicio').value;
  const horaFin = $('#turno-hora-fin').value;
  const usuarioSel = $('#turno-usuario-select');
  const usuarioId = usuarioSel && usuarioSel.value ? parseInt(usuarioSel.value) : null;
  if (!auxId || !fecha || !horaInicio || !horaFin) { showToast('Completa todos los campos requeridos', 'error'); return; }
  if (!usuarioId) { showToast('Selecciona el Usuario Asociado', 'error'); return; }
  const turnos = DB.get('turnos', []);
  const dup = turnos.find(t => t.aux_id === auxId && t.fecha === fecha && t.hora_inicio === horaInicio && t.hora_fin === horaFin);
  if (dup) { showToast('Este turno ya existe', 'error'); return; }
  const horas = calcDuracionTurno(horaInicio, horaFin);
  const turno = claseTurnoPorHora(horaInicio) === 'chip-m' ? 'mañana' : claseTurnoPorHora(horaInicio) === 'chip-t' ? 'tarde' : 'noche';
  const usuarios = DB.get('usuarios', []);
  const usuario = usuarios.find(u => u.id === usuarioId);
  turnos.push({ id: Date.now(), aux_id: auxId, fecha, turno, hora_inicio: horaInicio, hora_fin: horaFin, horas, usuario_id: usuarioId, paciente: usuario ? usuario.nombre : 'Sin asignar' });
  DB.set('turnos', turnos);
  showToast(`Turno agregado correctamente · ${fmtHoras(horas)}`, 'success');
  renderCalendario();
}

function verDiaCronograma(fecha) {
  const turnos = DB.get('turnos', []).filter(t => t.fecha === fecha);
  const auxs = DB.get('auxiliares', []);
  const dd = new Date(fecha + 'T12:00:00');
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  let html = `<h3 style="font-size:14px;font-weight:600;margin-bottom:12px">${dd.toLocaleDateString('es-CL', opts)}</h3>`;
  if (turnos.length === 0) {
    html += '<p style="color:var(--text-muted);font-size:13px;">Sin turnos programados para este día.</p>';
  } else {
    html += turnos.map(t => {
      const aux = auxs.find(a => a.id === t.aux_id);
      const cls = claseTurnoPorHora(t.hora_inicio);
      const horas = t.horas != null ? t.horas : calcDuracionTurno(t.hora_inicio, t.hora_fin);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-border)">
        <span class="shift-chip ${cls}" style="min-width:80px;text-align:center">${t.hora_inicio || '—'}–${t.hora_fin || '—'}</span>
        <div><div style="font-weight:500;font-size:13px">${aux ? esc(aux.nombre) : '?'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${fmtHoras(horas)} · ${esc(t.paciente)}</div></div>
        <button onclick="eliminarTurno(${t.id},'${fecha}')" class="btn btn-sm btn-danger" style="margin-left:auto">✕</button>
      </div>`;
    }).join('');
  }
  html += `<div style="margin-top:12px;font-size:12px;color:var(--text-muted)">Haz clic en un turno para editarlo, o usa el formulario de la izquierda para agregar.</div>`;
  const panel = $('#cal-day-panel');
  if (panel) panel.innerHTML = html;
}

function eliminarTurno(id, fecha) {
  if (!confirm('¿Eliminar este turno?')) return;
  let turnos = DB.get('turnos', []);
  turnos = turnos.filter(t => t.id !== id);
  DB.set('turnos', turnos);
  showToast('Turno eliminado', 'success');
  renderCalendario();
  verDiaCronograma(fecha);
}

// Genera e imprime una tabla A4 con todos los turnos del mes visible
function imprimirCalendario() {
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const turnos = DB.get('turnos', []).filter(t => t.fecha.startsWith(`${calAño}-${String(calMes+1).padStart(2,'0')}`));
  const auxs = DB.get('auxiliares', []);
  turnos.sort((a,b) => a.fecha === b.fecha ? (a.hora_inicio || '').localeCompare(b.hora_inicio || '') : a.fecha.localeCompare(b.fecha));

  const rows = turnos.map(t => {
    const aux = auxs.find(a => a.id === t.aux_id);
    const horas = t.horas != null ? t.horas : calcDuracionTurno(t.hora_inicio, t.hora_fin);
    const dd = new Date(t.fecha + 'T12:00:00');
    return `<tr>
      <td>${dd.toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' })}</td>
      <td>${aux ? esc(aux.nombre) : '?'}</td>
      <td>${esc(t.paciente)}</td>
      <td>${t.hora_inicio || '—'}</td>
      <td>${t.hora_fin || '—'}</td>
      <td>${fmtHoras(horas)}</td>
    </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Cronograma — ${names[calMes]} ${calAño}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: 'IBM Plex Sans', Arial, sans-serif; color:#2C2C2A; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 13px; font-weight:400; color:#5F5E5A; margin-bottom: 18px; }
      table { width:100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #D3D1C7; padding: 6px 8px; text-align: left; }
      th { background:#E1F5EE; color:#0F6E56; text-transform: uppercase; font-size: 10px; letter-spacing:.04em; }
      tr:nth-child(even) td { background:#FAFAF8; }
    </style></head><body>
    <h1>Cronograma de Asistencia Personal — REVIBO</h1>
    <h2>Período: ${names[calMes]} ${calAño}</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Asistente</th><th>Usuario</th><th>Hora inicio</th><th>Hora fin</th><th>Total horas</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#5F5E5A">Sin turnos programados este mes</td></tr>'}</tbody>
    </table>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// ── PAGOS ──────────────────────────────────────────
function renderPagos() {
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  const asis = DB.get('asistencia', []);
  const mesSel = $('#pagos-mes')?.value || today().slice(0,8);

  const asisM = asis.filter(a => a.fecha.startsWith(mesSel));

  let totalBruto = 0, totalEmpresa = 0, totalCentro = 0, totalHoras = 0;

  const rows = auxs.map(aux => {
    const regs = asisM.filter(a => a.aux_id === aux.id && a.horas);
    const horas = regs.reduce((s,r) => s + (r.horas || 0), 0);
    const bruto = (horas * aux.valor_hora);
    const empresa = bruto * 0.8;
    const centro  = bruto - empresa;
    totalBruto   += bruto;
    totalEmpresa += empresa;
    totalCentro  += centro;
    totalHoras   += horas;
    return { aux, horas, bruto, empresa, centro };
  });

  $('#pay-total-bruto').textContent  = 'Bs.' + fmt(totalBruto);
  $('#pay-total-empresa').textContent = 'Bs.' + fmt(totalEmpresa);
  $('#pay-total-centro').textContent  = 'Bs.' + fmt(totalCentro);
 // $('#pay-total-horas').textContent   = Math.round(totalHoras) + 'h';
  $('#pay-total-horas').textContent   = fmtHoras(totalHoras);
  const tbody = $('#pagos-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `<tr>
    <td><div class="td-name">
      <div class="avatar ${avatarClass(r.aux)}">${esc(r.aux.iniciales)}</div>
      <div><div class="td-main">${esc(r.aux.nombre)}</div>
      <span class="badge badge-sub">Subvencionado REVIBO</span></div>
    </div></td>
    <td>${r.horas ? fmtHoras(r.horas) : '<span style="color:var(--text-muted)">—</span>'}</td>
    <td>Bs.${fmt(r.aux.valor_hora)}</td>
    <td style="font-weight:500">Bs.${fmt(r.bruto)}</td>
    <td style="color:var(--green-dark);font-weight:500">${r.empresa ? 'Bs.'+fmt(r.empresa) : '<span style="color:var(--text-muted)">—</span>'}</td>
    <td style="color:var(--red-mid);font-weight:500">Bs.${fmt(r.centro)}</td>
    <td><button class="btn btn-sm btn-primary" onclick="generarBoletaDesde(${r.aux.id})">Boleta</button></td>
  </tr>`).join('');
}

// ── BOLETAS ────────────────────────────────────────
let boletaAuxId = null;
function renderBoletas() {
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  const sel = $('#boleta-aux-select');
  if (sel) sel.innerHTML = '<option value="">— Seleccionar asistente —</option>' +
    auxs.map(a => `<option value="${a.id}">${esc(a.nombre)}</option>`).join('');
  const mesSel = $('#boleta-mes');
  if (mesSel && !mesSel.value) mesSel.value = today().slice(0,7);
  if (boletaAuxId) { if (sel) sel.value = boletaAuxId; generarBoleta(); boletaAuxId = null; }
}

function generarBoletaDesde(auxId) {
  boletaAuxId = auxId;
  navigate('boletas');
}

function generarBoleta() {
  const auxId = parseInt($('#boleta-aux-select')?.value);
  const mes = $('#boleta-mes')?.value || today().slice(0,7);
  if (!auxId) { $('#boleta-output').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">Selecciona un Asistente para generar la boleta.</p>'; return; }

  const auxs = DB.get('auxiliares', []);
  const asis = DB.get('asistencia', []);
  const aux = auxs.find(a => a.id === auxId);
  const regs = asis.filter(a => a.aux_id === auxId && a.fecha.startsWith(mes) && a.horas);
  const horas = regs.reduce((s,r) => s + r.horas, 0);
  const bruto = horas * aux.valor_hora;
  const empresa = bruto * 0.8;
  const centro = bruto - empresa;
  const liquido = bruto;
  const dias = regs.length;
  const mesNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [mYear, mNum] = mes.split('-').map(Number);
  const mesNombre = mesNames[mNum - 1] + ' ' + mYear;
  const numBoleta = String(mNum).padStart(4,'0');

  const html = `<div class="boleta-preview" id="boleta-printable">
    <div class="boleta-top">
      <div>
        <div style="font-size:16px;font-weight:600">Red de Vida independiente Bolivia  </div>
        <div style="font-size:12px;opacity:.8">RECIBO DE PAGOS POR SERVICIOS DE ASISTENCIA PERSONAL</div>
        <div class="topbar-center" style="display: flex; justify-content: center; align-items: center;">
        <img src="media/revibologo.svg" alt="Logo o Imagen" style="max-height: 55px; width: auto; object-fit: contain;">
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;opacity:.7">Boleta N°</div>
        <div contenteditable="true" style="font-size:22px; font-weight:600; border-bottom: 1px dashed #999; outline: none;">${numBoleta}</div>
        <div style="font-size:12px;opacity:.75">${mesNombre}</div>
      </div>
    </div>

    <div class="boleta-section" style="display:flex;align-items:center;gap:14px">
      <div class="avatar ${avatarClass(aux)}" style="width:44px;height:44px;font-size:14px">${esc(aux.iniciales)}</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:600">${esc(aux.nombre)}</div>
        <div style="font-size:12px;color:var(--text-muted)">Asistente · C.I. ${esc(aux.rut || aux.ci || '—')}</div>
      </div>
     
    </div>

    <div class="boleta-section">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Detalle de horas</div>
      <div class="boleta-row"><span style="color:var(--text-muted)">Período</span><span>01/${String(mNum).padStart(2,'0')}/${mYear} – ${new Date(mYear,mNum,0).getDate()}/${String(mNum).padStart(2,'0')}/${mYear}</span></div>
      <div class="boleta-row"><span style="color:var(--text-muted)">Días trabajados</span><span>${dias} días</span></div>
      <div class="boleta-row"><span style="color:var(--text-muted)">Horas trabajadas</span><span style="font-weight:500">${fmtHoras(horas)}</span></div>
      <div class="boleta-row"><span style="color:var(--text-muted)">Valor hora</span><span>Bs.${fmt(aux.valor_hora)}</span></div>
    </div>

    <div class="boleta-section">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Liquidación</div>
      <div class="boleta-row"><span style="color:var(--text-muted)">${fmt(horas)} h × Bs.${fmt(aux.valor_hora)}</span><span>Bs.${fmt(bruto)}</span></div>
    </div>

    <div class="boleta-total-bar">
      <div class="boleta-row"><span style="color:var(--text-muted);font-size:13px">Total</span><span style="font-weight:500">Bs.${fmt(bruto)}</span></div>
     
      <div class="boleta-total-big">
        <span style="font-size:15px;font-weight:600;color:var(--green-dark)">Estipendio por pagar</span>
        <span style="font-size:24px;font-weight:600;color:var(--green-dark)">Bs.${fmt(liquido)}</span>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-muted);line-height:1.4">${amountLiteral(liquido)}</div>
    </div>

    <div class="boleta-footer">
      <div><div class="firma-box"></div><div style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:4px">Responsable de Contabilidad</div></div>
      <div style="text-align:center;font-size:10px;color:var(--text-muted)">Emitido: ${new Date().toLocaleDateString('es-CL')}<br>ReViBo</div>
      <div><div class="firma-box"></div><div style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:4px">Asistente Personal</div></div>
    </div>
  </div>`;

  $('#boleta-output').innerHTML = html;
}

function imprimirBoleta() {
  if (!$('#boleta-printable')) { showToast('Genera una boleta primero', 'error'); return; }
  window.print();
}

// ── AUXILIARES ─────────────────────────────────────
function renderAuxiliares() {
  const auxs = DB.get('auxiliares', []);
  const tbody = $('#aux-tbody');
  if (!tbody) return;
  tbody.innerHTML = auxs.map(aux => `<tr>
    <td><div class="td-name">
      <div class="avatar ${avatarClass(aux)}">${esc(aux.iniciales)}</div>
      <div><div class="td-main">${esc(aux.nombre)}</div><div class="td-sub">CI ${esc(aux.rut || aux.ci || '—')}</div></div>
    </div></td>
    <td><span class="badge badge-sub">REVIBO (80%)</span></td>
    <td>Bs.${fmt(aux.valor_hora)}/hora</td>
    <td><span class="badge badge-${aux.activo ? 'green':'gray'}">${aux.activo ? 'Activo':'Inactivo'}</span></td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="editarAuxiliar(${aux.id})">Editar</button>
      <button class="btn btn-sm btn-danger" onclick="toggleAuxiliar(${aux.id})" style="margin-left:4px">${aux.activo ? 'Desactivar':'Activar'}</button>
      <button class="btn btn-sm" onclick="eliminarAuxiliar(${aux.id})" style="margin-left:4px;background:var(--red-mid);color:white;border-color:var(--red-mid)">Eliminar</button>

    </td>
  </tr>`).join('');
}

function toggleAuxiliar(id) {
  const auxs = DB.get('auxiliares', []);
  const aux = auxs.find(a => a.id === id);
  if (!aux) return;
  aux.activo = !aux.activo;
  DB.set('auxiliares', auxs);
  showToast(`${aux.nombre} ${aux.activo ? 'activado':'desactivado'}`, 'success');
  renderAuxiliares();
}

function eliminarAuxiliar(id) {
  const auxs = DB.get('auxiliares', []);
  const aux = auxs.find(a => a.id === id);
  if (!aux) return;
  if (!confirm(`¿Eliminar a ${aux.nombre}?\nEsta acción no se puede deshacer y borrará también su historial de asistencia.`)) return;
  DB.set('auxiliares', auxs.filter(a => a.id !== id));
  DB.set('asistencia', DB.get('asistencia', []).filter(a => a.aux_id !== id));
  DB.set('turnos', DB.get('turnos', []).filter(t => t.aux_id !== id));
  showToast(`${aux.nombre} eliminado/a`, 'success');
  renderAuxiliares();
}

function agregarAuxiliar() {
  const nombre = $('#new-aux-nombre')?.value?.trim();
  const rut    = $('#new-aux-rut')?.value?.trim();
  const vh     = parseFloat($('#new-aux-vh')?.value);
  if (!nombre || !rut || isNaN(vh)) { showToast('Completa todos los campos', 'error'); return; }
  const auxs = DB.get('auxiliares', []);
  const ini = nombre.split(' ').slice(0,2).map(w => w[0].toUpperCase()).join('');
  auxs.push({ id: Date.now(), nombre, iniciales: ini, rut, valor_hora: vh, color: 'green', activo: true });
  DB.set('auxiliares', auxs);
  showToast(`${nombre} agregado/a correctamente`, 'success');
  closeModal('modal-nuevo-aux');
  renderAuxiliares();
}

function editarAuxiliar(id) {
  const auxs = DB.get('auxiliares', []);
  const aux = auxs.find(a => a.id === id);
  if (!aux) return;
  const nuevaVh = prompt(`Nuevo valor hora para ${aux.nombre} (actual: Bs.${fmt(aux.valor_hora)}):`, aux.valor_hora);
  if (nuevaVh === null) return;
  const v = parseFloat(nuevaVh);
  if (isNaN(v)) { showToast('Valor inválido', 'error'); return; }
  aux.valor_hora = v;
  DB.set('auxiliares', auxs);
  showToast('Valor hora actualizado', 'success');
  renderAuxiliares();
}

// ── USUARIOS ───────────────────────────────────────
function renderUsuarios() {
  const usuarios = DB.get('usuarios', []);
  const tbody = $('#usu-tbody');
  if (!tbody) return;
  const term = ($('#usu-buscar')?.value || '').toLowerCase().trim();
  const filtrados = usuarios.filter(u =>
    !term || u.nombre.toLowerCase().includes(term) || u.ci.toLowerCase().includes(term));

  tbody.innerHTML = filtrados.map(u => `<tr>
    <td><div class="td-main">${esc(u.nombre)}</div></td>
    <td>${esc(u.ci)}</td>
    <td>${esc(u.telefono || '—')}</td>
    <td>${esc(u.direccion || '—')}</td>
    <td><span class="badge badge-${u.tipo === 'asociado' ? 'green':'amber'}">${u.tipo === 'asociado' ? 'Asociado':'Externo'}</span></td>
    <td>${esc(u.obs || '—')}</td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="editarUsuario(${u.id})">Editar</button>
      <button class="btn btn-sm" onclick="eliminarUsuario(${u.id})" style="margin-left:4px;background:var(--red-mid);color:white;border-color:var(--red-mid)">Eliminar</button>
    </td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Sin usuarios registrados</td></tr>`;

  populateUsuariosExternosSelect();
}

function buscarUsuarios() { renderUsuarios(); }

function agregarUsuario() {
  const nombre = $('#new-usu-nombre')?.value?.trim();
  const ci = $('#new-usu-ci')?.value?.trim();
  const telefono = $('#new-usu-telefono')?.value?.trim();
  const direccion = $('#new-usu-direccion')?.value?.trim();
  const tipo = $('#new-usu-tipo')?.value;
  const obs = $('#new-usu-obs')?.value?.trim();
  if (!nombre || !ci || !tipo) { showToast('Completa nombre, CI y tipo de usuario', 'error'); return; }
  const usuarios = DB.get('usuarios', []);
  usuarios.push({ id: Date.now(), nombre, ci, telefono, direccion, tipo, obs });
  DB.set('usuarios', usuarios);
  showToast(`${nombre} agregado/a correctamente`, 'success');
  closeModal('modal-nuevo-usu');
  ['new-usu-nombre','new-usu-ci','new-usu-telefono','new-usu-direccion','new-usu-obs'].forEach(id => { const el = $('#'+id); if (el) el.value = ''; });
  renderUsuarios();
}

function editarUsuario(id) {
  const usuarios = DB.get('usuarios', []);
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  const nuevoNombre = prompt('Nombre completo:', u.nombre);
  if (nuevoNombre === null) return;
  const nuevoTel = prompt('Teléfono:', u.telefono || '');
  if (nuevoTel === null) return;
  const nuevaDir = prompt('Dirección:', u.direccion || '');
  if (nuevaDir === null) return;
  u.nombre = nuevoNombre.trim() || u.nombre;
  u.telefono = nuevoTel.trim();
  u.direccion = nuevaDir.trim();
  DB.set('usuarios', usuarios);
  showToast('Usuario actualizado', 'success');
  renderUsuarios();
}

function eliminarUsuario(id) {
  const usuarios = DB.get('usuarios', []);
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return;
  DB.set('usuarios', usuarios.filter(x => x.id !== id));
  showToast(`${u.nombre} eliminado/a`, 'success');
  renderUsuarios();
}

// ── VENTA DE SERVICIOS DE ASISTENCIA PERSONAL ───────
const TARIFA_PAGO_ASISTENTE = 13; // Bs/hora pagados al asistente
const TARIFA_COBRO_USUARIO  = 15; // Bs/hora cobrados al usuario externo
const RETENCION_POR_HORA    = TARIFA_COBRO_USUARIO - TARIFA_PAGO_ASISTENTE; // 2 Bs/hora

function populateUsuariosExternosSelect() {
  const sel = $('#venta-usuario-select');
  if (!sel) return;
  const usuarios = DB.get('usuarios', []).filter(u => u.tipo === 'externo');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar usuario externo —</option>' +
    usuarios.map(u => `<option value="${u.id}">${esc(u.nombre)} (CI ${esc(u.ci)})</option>`).join('');
  if (cur) sel.value = cur;
}

function populateVentasAuxSelect() {
  const sel = $('#venta-aux-select');
  if (!sel) return;
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  sel.innerHTML = '<option value="">— Seleccionar asistente —</option>' +
    auxs.map(a => `<option value="${a.id}">${esc(a.nombre)}</option>`).join('');
}

function renderVentas() {
  populateUsuariosExternosSelect();
  populateVentasAuxSelect();

  const fechaEl = $('#venta-fecha');
  if (fechaEl && !fechaEl.value) fechaEl.value = today();

  calcularPreviewVenta();

  const ventas = DB.get('ventas', []);
  const usuarios = DB.get('usuarios', []);
  const auxs = DB.get('auxiliares', []);
  const tbody = $('#venta-tbody');
  if (!tbody) return;
const ordenadas = [...ventas].sort((a,b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  tbody.innerHTML = ordenadas.map(v => {
    const usuario = usuarios.find(u => u.id === v.usuario_id);
    const aux = auxs.find(a => a.id === v.aux_id);
    return `<tr>
      <td>${v.fecha}</td>
      <td>${usuario ? esc(usuario.nombre) : '—'}</td>
      <td>${aux ? esc(aux.nombre) : '—'}</td>
      <td>${v.hora_inicio} – ${v.hora_fin}</td>
      <td>${fmtHoras(v.horas)}</td>
      <td>Bs.${fmt(v.pago_asistente)}</td>
      <td>Bs.${fmt(v.cobro_usuario)}</td>
      <td style="color:var(--amber-mid);font-weight:500">Bs.${fmt(v.retencion)}</td>
      <td><button class="btn btn-sm" onclick="eliminarVenta(${v.id})" style="background:var(--red-mid);color:white;border-color:var(--red-mid)">Eliminar</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">Sin servicios registrados</td></tr>`;

  // Resumen de totales
  const totHoras = ventas.reduce((s,v) => s + (v.horas || 0), 0);
  const totPago = ventas.reduce((s,v) => s + (v.pago_asistente || 0), 0);
  const totCobro = ventas.reduce((s,v) => s + (v.cobro_usuario || 0), 0);
  const totRetencion = ventas.reduce((s,v) => s + (v.retencion || 0), 0);
  const resumenEl = $('#venta-resumen');
  if (resumenEl) {
    resumenEl.innerHTML = `
      <div><span style="color:var(--text-muted)">Total horas</span><br><strong>${fmtHoras(totHoras)}</strong></div>
      <div><span style="color:var(--text-muted)">Total pago asistentes</span><br><strong>Bs.${fmt(totPago)}</strong></div>
      <div><span style="color:var(--text-muted)">Total cobrado a usuarios</span><br><strong>Bs.${fmt(totCobro)}</strong></div>
      <div><span style="color:var(--amber-mid)">Total retención REVIBO</span><br><strong style="color:var(--amber-mid)">Bs.${fmt(totRetencion)}</strong></div>`;
  }
}
function imprimirVentas() {
  const ventas = DB.get('ventas', []);
  const usuarios = DB.get('usuarios', []);
  const auxs = DB.get('auxiliares', []);
  const ordenadas = [...ventas].sort((a,b) => a.fecha.localeCompare(b.fecha));

  const rows = ordenadas.map(v => {
    const usuario = usuarios.find(u => u.id === v.usuario_id);
    const aux = auxs.find(a => a.id === v.aux_id);
    return `<tr>
      <td>${v.fecha}</td>
      <td>${usuario ? esc(usuario.nombre) : '—'}</td>
      <td>${aux ? esc(aux.nombre) : '—'}</td>
      <td>${v.hora_inicio} – ${v.hora_fin}</td>
      <td>${fmtHoras(v.horas)}</td>
      <td>Bs.${fmt(v.pago_asistente)}</td>
      <td>Bs.${fmt(v.cobro_usuario)}</td>
      <td>Bs.${fmt(v.retencion)}</td>
    </tr>`;
  }).join('');

  const totHoras = ventas.reduce((s,v) => s + (v.horas || 0), 0);
  const totPago = ventas.reduce((s,v) => s + (v.pago_asistente || 0), 0);
  const totCobro = ventas.reduce((s,v) => s + (v.cobro_usuario || 0), 0);
  const totRetencion = ventas.reduce((s,v) => s + (v.retencion || 0), 0);

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Informe de Venta de Servicios — REVIBO</title>
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: 'IBM Plex Sans', Arial, sans-serif; color:#2C2C2A; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 13px; font-weight:400; color:#5F5E5A; margin-bottom: 18px; }
      table { width:100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
      th, td { border: 1px solid #D3D1C7; padding: 6px 8px; text-align: left; }
      th { background:#E1F5EE; color:#0F6E56; text-transform: uppercase; font-size: 10px; letter-spacing:.04em; }
      tr:nth-child(even) td { background:#FAFAF8; }
      .resumen { display:flex; gap:28px; font-size:13px; }
      .resumen div span { display:block; color:#5F5E5A; font-size:11px; margin-bottom:2px; }
      .resumen div strong { font-size:15px; }
    </style></head><body>
    <h1>Venta de Servicios de Asistencia Personal — REVIBO</h1>
    <h2>Informe generado el ${new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' })}</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Asistente</th><th>Horario</th><th>Horas</th><th>Pago asistente</th><th>Cobro usuario</th><th>Retención</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#5F5E5A">Sin servicios registrados</td></tr>'}</tbody>
    </table>
    <div class="resumen">
      <div><span>Total horas</span><strong>${fmtHoras(totHoras)}</strong></div>
      <div><span>Total pago asistentes</span><strong>Bs.${fmt(totPago)}</strong></div>
      <div><span>Total cobrado a usuarios</span><strong>Bs.${fmt(totCobro)}</strong></div>
      <div><span>Total retención REVIBO</span><strong>Bs.${fmt(totRetencion)}</strong></div>
    </div>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function calcularPreviewVenta() {
  const hi = $('#venta-hora-inicio')?.value;
  const hf = $('#venta-hora-fin')?.value;
  const preview = $('#venta-preview');
  if (!preview) return;
  if (!hi || !hf) { preview.innerHTML = ''; return; }
  const horas = calcDuracionTurno(hi, hf);
  const pago = +(horas * TARIFA_PAGO_ASISTENTE).toFixed(2);
  const cobro = +(horas * TARIFA_COBRO_USUARIO).toFixed(2);
  const retencion = +(horas * RETENCION_POR_HORA).toFixed(2);
  preview.innerHTML = `
    <div class="boleta-row"><span style="color:var(--text-muted)">Total horas</span><span style="font-weight:500">${fmtHoras(horas)}</span></div>
    <div class="boleta-row"><span style="color:var(--text-muted)">Pago al asistente (Bs.${TARIFA_PAGO_ASISTENTE}/h)</span><span>Bs.${fmt(pago)}</span></div>
    <div class="boleta-row"><span style="color:var(--text-muted)">Cobro al usuario (Bs.${TARIFA_COBRO_USUARIO}/h)</span><span>Bs.${fmt(cobro)}</span></div>
    <div class="boleta-row"><span style="color:var(--amber-mid);font-weight:500">Retención administrativa (Bs.${RETENCION_POR_HORA}/h)</span><span style="color:var(--amber-mid);font-weight:500">Bs.${fmt(retencion)}</span></div>`;
}

function registrarVenta() {
  const usuarioId = parseInt($('#venta-usuario-select')?.value);
  const auxId = parseInt($('#venta-aux-select')?.value);
  const fecha = $('#venta-fecha')?.value;
  const hi = $('#venta-hora-inicio')?.value;
  const hf = $('#venta-hora-fin')?.value;
  if (!usuarioId || !auxId || !fecha || !hi || !hf) { showToast('Completa todos los campos', 'error'); return; }

  const horas = calcDuracionTurno(hi, hf);
  if (horas <= 0) { showToast('El horario ingresado no es válido', 'error'); return; }

  const pago_asistente = +(horas * TARIFA_PAGO_ASISTENTE).toFixed(2);
  const cobro_usuario  = +(horas * TARIFA_COBRO_USUARIO).toFixed(2);
  const retencion      = +(horas * RETENCION_POR_HORA).toFixed(2);

  const ventas = DB.get('ventas', []);
  ventas.push({
    id: Date.now(), usuario_id: usuarioId, aux_id: auxId, fecha,
    hora_inicio: hi, hora_fin: hf, horas,
    pago_asistente, cobro_usuario, retencion
  });
  DB.set('ventas', ventas);
  showToast(`Servicio registrado · ${fmtHoras(horas)} · Retención Bs.${fmt(retencion)}`, 'success');
  renderVentas();
}

function eliminarVenta(id) {
  if (!confirm('¿Eliminar este registro de servicio?')) return;
  const ventas = DB.get('ventas', []);
  DB.set('ventas', ventas.filter(v => v.id !== id));
  showToast('Registro eliminado', 'success');
  renderVentas();
  renderRetencion();
}

// ── RETENCIÓN DE GASTOS ADMINISTRATIVOS ─────────────
function renderRetencion() {
  const ventas = DB.get('ventas', []);
  const usuarios = DB.get('usuarios', []);
  const auxs = DB.get('auxiliares', []);
  const tbody = $('#retencion-tbody');
  if (!tbody) return;

  const ordenadas = [...ventas].sort((a,b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  tbody.innerHTML = ordenadas.map(v => {
    const usuario = usuarios.find(u => u.id === v.usuario_id);
    const aux = auxs.find(a => a.id === v.aux_id);
    return `<tr>
      <td>${v.fecha}</td>
      <td>${usuario ? esc(usuario.nombre) : '—'}</td>
      <td>${aux ? esc(aux.nombre) : '—'}</td>
      <td>${fmtHoras(v.horas)}</td>
      <td style="color:var(--amber-mid);font-weight:500">Bs.${fmt(v.retencion)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Sin registros de retención</td></tr>`;

  // Totales mensuales
  const porMes = {};
  let totalGeneral = 0;
  ventas.forEach(v => {
    const mesKey = v.fecha.slice(0,7);
    porMes[mesKey] = (porMes[mesKey] || 0) + v.retencion;
    totalGeneral += v.retencion;
  });

  const mesActual = today().slice(0,7);
  const añoActual = today().slice(0,4);
  const totalMes = porMes[mesActual] || 0;
  let totalAño = 0;
  Object.entries(porMes).forEach(([k,v]) => { if (k.startsWith(añoActual)) totalAño += v; });

  const elMes = $('#retencion-total-mes');
  const elAño = $('#retencion-total-anio');
  const elGen = $('#retencion-total-general');
  if (elMes) elMes.textContent = 'Bs.' + fmt(totalMes);
  if (elAño) elAño.textContent = 'Bs.' + fmt(totalAño);
  if (elGen) elGen.textContent = 'Bs.' + fmt(totalGeneral);

  // Tabla de totales mensuales
  const tbodyMes = $('#retencion-mensual-tbody');
  if (tbodyMes) {
    const mesNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const keys = Object.keys(porMes).sort().reverse();
    tbodyMes.innerHTML = keys.map(k => {
      const [y,m] = k.split('-');
      return `<tr><td>${mesNames[parseInt(m,10)-1]} ${y}</td><td style="font-weight:500">Bs.${fmt(porMes[k])}</td></tr>`;
    }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:16px">Sin datos</td></tr>`;
  }
}

// ── INFORME ECONÓMICO ───────────────────────────────
const TARIFA_POR_HORA = 13; // Bs por hora

const NOMBRES_MES = {
  '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril',
  '05':'Mayo','06':'Junio','07':'Julio','08':'Agosto',
  '09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'
};

// Recolecta filas consolidadas de asistencia (horario interno) y ventas (servicios externos)
function obtenerFilasInforme() {
  const asis = DB.get('asistencia', []).filter(a => a.horas);
  const ventas = DB.get('ventas', []);
  const auxs = DB.get('auxiliares', []);
  const usuarios = DB.get('usuarios', []);

  const filas = [];
  asis.forEach(a => {
    const aux = auxs.find(x => x.id === a.aux_id);
    const usuario = a.usuario_id ? usuarios.find(x => x.id === a.usuario_id) : null;
    filas.push({
      usuario: usuario ? usuario.nombre : 'Sin usuario asignado',
      asistente: aux ? aux.nombre : '—',
      asistente_id: a.aux_id,
      usuario_id: a.usuario_id || null,
      fecha: a.fecha,
      horas: a.horas || 0
    });
  });
  ventas.forEach(v => {
    const aux = auxs.find(x => x.id === v.aux_id);
    const usuario = usuarios.find(x => x.id === v.usuario_id);
    filas.push({
      usuario: usuario ? usuario.nombre : '—',
      asistente: aux ? aux.nombre : '—',
      asistente_id: v.aux_id,
      usuario_id: v.usuario_id,
      fecha: v.fecha,
      horas: v.horas || 0
    });
  });
  return filas;
}

// Agrupa filas por (asistente, usuario) y suma horas
function agruparPorAsistenteUsuario(filas) {
  const mapa = {};
  filas.forEach(f => {
    const key = `${f.asistente}||${f.usuario}`;
    if (!mapa[key]) mapa[key] = { asistente: f.asistente, usuario: f.usuario, horas: 0 };
    mapa[key].horas += f.horas;
  });
  return Object.values(mapa).sort((a,b) => a.asistente.localeCompare(b.asistente) || a.usuario.localeCompare(b.usuario));
}

function renderInforme() {
  const mes  = $('#informe-mes-sel')?.value;
  const anio = $('#informe-anio-sel')?.value;

  let filas = obtenerFilasInforme();
  if (mes && anio) {
    filas = filas.filter(f => f.fecha.startsWith(`${anio}-${mes}`));
  } else if (anio && !mes) {
    filas = filas.filter(f => f.fecha.startsWith(anio));
  } else if (mes && !anio) {
    filas = filas.filter(f => f.fecha.slice(5,7) === mes);
  }

  const totalHoras = filas.reduce((s,f) => s + f.horas, 0);
  const totalPago  = totalHoras * TARIFA_POR_HORA;

  // ── Construir vista previa matricial ──
  const auxsActivos = DB.get('auxiliares', []).filter(a => a.activo);
  const usuariosDB  = DB.get('usuarios', []);
  const auxIdsConHoras = [...new Set(filas.map(f => f.asistente_id))];
  const usuIdsConHoras = [...new Set(filas.map(f => f.usuario_id === null ? '__revibo__' : String(f.usuario_id)))];

  const colsAux = auxsActivos.filter(a => auxIdsConHoras.includes(a.id))
                              .sort((a,b) => a.nombre.localeCompare(b.nombre));

  const mapaHoras = {};
  filas.forEach(f => {
    const usuKey = f.usuario_id === null ? '__revibo__' : String(f.usuario_id);
    const k = `${f.asistente_id}||${usuKey}`;
    mapaHoras[k] = (mapaHoras[k] || 0) + f.horas;
  });

  const usuariosConHoras = [];
  usuIdsConHoras.forEach(usuKey => {
    if (usuKey === '__revibo__') return;
    const usu = usuariosDB.find(u => String(u.id) === usuKey);
    usuariosConHoras.push({ key: usuKey, nombre: usu ? usu.nombre : '—' });
  });
  usuariosConHoras.sort((a,b) => a.nombre.localeCompare(b.nombre));
  if (usuIdsConHoras.includes('__revibo__')) {
    usuariosConHoras.push({ key: '__revibo__', nombre: 'Asociación REVIBO' });
  }

  const tbody = $('#informe-tbody');
  if (tbody) {
    if (!colsAux.length) {
      // Sin datos: tabla simple
      const parent = tbody.closest('table');
      if (parent) {
        const thead = parent.querySelector('thead');
        if (thead) thead.innerHTML = '<tr><th>Asistente</th><th>Usuario</th><th>Horas Trabajadas</th></tr>';
      }
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:24px">
        ${(mes||anio) ? 'Sin datos para el período seleccionado' : 'Seleccione un mes y año para ver los datos'}
      </td></tr>`;
    } else {
      // Reconstruir thead con columnas de asistentes
      const parent = tbody.closest('table');
      if (parent) {
        const thead = parent.querySelector('thead');
        if (thead) {
          thead.innerHTML = `<tr>
            <th style="min-width:140px">Usuario</th>
            ${colsAux.map(a => `<th style="text-align:center;min-width:70px">${esc(a.nombre)}</th>`).join('')}
            <th style="text-align:center;min-width:70px">Total</th>
          </tr>`;
        }
      }
      tbody.innerHTML = usuariosConHoras.map(usu => {
        const totalFila = colsAux.reduce((s,a) => s + (mapaHoras[`${a.id}||${usu.key}`] || 0), 0);
        const celdas = colsAux.map(a => {
          const h = mapaHoras[`${a.id}||${usu.key}`] || 0;
          return `<td style="text-align:center">${h > 0 ? h : '—'}</td>`;
        }).join('');
        return `<tr>
          <td style="font-weight:500">${esc(usu.nombre)}</td>
          ${celdas}
          <td style="text-align:center;font-weight:700;color:var(--green-dark)">${totalFila}</td>
        </tr>`;
      }).join('') + `<tr style="border-top:2px solid var(--border)">
        <td style="font-weight:700;color:var(--text-muted);font-size:12px">TOTAL HORAS</td>
        ${colsAux.map(a => {
          const t = filas.filter(f => f.asistente_id === a.id).reduce((s,f) => s+f.horas, 0);
          return `<td style="text-align:center;font-weight:700;color:var(--green-dark)">${t || '—'}</td>`;
        }).join('')}
        <td style="text-align:center;font-weight:700;color:var(--green-dark)">${totalHoras}</td>
      </tr>`;
    }
  }

  const elTotal = $('#informe-total-general');
  if (elTotal) elTotal.textContent = totalHoras;

  const resumen = $('#informe-resumen-eco');
  if (resumen) resumen.style.display = filas.length ? 'block' : 'none';
  const elHorasEco = $('#informe-total-horas-eco');
  if (elHorasEco) elHorasEco.textContent = totalHoras;
  const elPagoEco = $('#informe-total-pago-eco');
  if (elPagoEco) elPagoEco.textContent = totalPago.toLocaleString('es-BO');
}

function exportarInformePDF() {
  const mes  = $('#informe-mes-sel')?.value;
  const anio = $('#informe-anio-sel')?.value;

  if (!mes || !anio) {
    showToast('Seleccione un mes y un año para generar el informe', 'error');
    return;
  }

  let filas = obtenerFilasInforme();
  const prefijo = `${anio}-${mes}`;
  filas = filas.filter(f => f.fecha.startsWith(prefijo));

  const nombreMes = NOMBRES_MES[mes] || mes;

  // ── Construir estructura matricial: filas=usuarios, columnas=asistentes ──
  const auxs = DB.get('auxiliares', []).filter(a => a.activo);
  const usuarios = DB.get('usuarios', []);

  // Determinar qué asistentes y usuarios tienen horas en el período
  const auxIdsConHoras   = [...new Set(filas.map(f => f.asistente_id))];
  const usuIdsConHoras   = [...new Set(filas.map(f => f.usuario_id === null ? '__revibo__' : String(f.usuario_id)))];

  // Columnas = asistentes con horas, ordenados por nombre
  const colsAux = auxs.filter(a => auxIdsConHoras.includes(a.id))
                       .sort((a,b) => a.nombre.localeCompare(b.nombre));

  // Construir mapa de horas: clave "aux_id||usuario_key" → horas
  const mapaHoras = {};
  const totalesPorAux = {};
  colsAux.forEach(a => { totalesPorAux[a.id] = 0; });

  filas.forEach(f => {
    const usuKey = f.usuario_id === null ? '__revibo__' : String(f.usuario_id);
    const auxKey = f.asistente_id;
    const k = `${auxKey}||${usuKey}`;
    mapaHoras[k] = (mapaHoras[k] || 0) + f.horas;
    if (totalesPorAux[auxKey] !== undefined) totalesPorAux[auxKey] += f.horas;
  });

  // Filas de usuarios: primero los usuarios reales con horas, luego REVIBO si aplica
  const usuariosConHoras = [];
  usuIdsConHoras.forEach(usuKey => {
    if (usuKey === '__revibo__') return;
    const usu = usuarios.find(u => String(u.id) === usuKey);
    usuariosConHoras.push({ key: usuKey, nombre: usu ? usu.nombre : '—' });
  });
  usuariosConHoras.sort((a,b) => a.nombre.localeCompare(b.nombre));
  if (usuIdsConHoras.includes('__revibo__')) {
    usuariosConHoras.push({ key: '__revibo__', nombre: 'Asociación REVIBO' });
  }

  // Total general
  const totalGeneral = filas.reduce((s,f) => s + f.horas, 0);
  const totalPago    = totalGeneral * TARIFA_POR_HORA;

  // ── Cabecera de columnas ──
  const thCols = colsAux.map(a =>
    `<th style="background:#C8A200;color:#fff;text-align:center;font-size:9px;padding:5px 4px;min-width:52px">${esc(a.nombre).toUpperCase()}</th>`
  ).join('');

  // ── Filas de la tabla ──
  let filaNum = 1;
  const tbodyRows = usuariosConHoras.map(usu => {
    const totalFila = colsAux.reduce((s,a) => {
      return s + (mapaHoras[`${a.id}||${usu.key}`] || 0);
    }, 0);
    const celdas = colsAux.map(a => {
      const h = mapaHoras[`${a.id}||${usu.key}`] || 0;
      return `<td style="text-align:center;font-size:11px;padding:4px">${h > 0 ? h.toFixed(2) : '0.00'}</td>`;
    }).join('');
    const rowBg = filaNum % 2 === 0 ? 'background:#F7F6F2' : '';
    const row = `<tr style="${rowBg}">
      <td style="text-align:center;font-size:11px;padding:4px 6px;font-weight:600;color:#5F5E5A">${filaNum}</td>
      <td style="font-size:11px;padding:4px 8px;font-weight:500">${esc(usu.nombre)}</td>
      ${celdas}
      <td style="text-align:center;font-size:11px;padding:4px 6px;font-weight:700;background:#E8F5E9;color:#0F6E56">${totalFila > 0 ? totalFila.toFixed(2) : '0.00'}</td>
    </tr>`;
    filaNum++;
    return row;
  }).join('');

  // ── Fila de totales por asistente ──
  const tdTotalesAux = colsAux.map(a => {
    const t = totalesPorAux[a.id] || 0;
    return `<td style="text-align:center;font-size:11px;padding:5px 4px;font-weight:700;background:#FFF3CD;color:#7A5C00">${t > 0 ? t.toFixed(2) : '0.00'}</td>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Económico ${nombreMes} ${anio} — REVIBO</title>
<style>
  @page { size: A4 landscape; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #2C2C2A; font-size: 11px; }

  /* ── Encabezado ── */
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #0F6E56; padding-bottom: 10px; margin-bottom: 14px; }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-box { width: 48px; height: 48px; border-radius: 50%; background: #0F6E56; display: flex; align-items: center; justify-content: center; }
  .logo-box span { color:#fff; font-size:18px; font-weight:900; letter-spacing:-1px; }
  .header-org { font-size: 15px; font-weight: 700; color: #0F6E56; }
  .header-sub { font-size: 10px; color: #5F5E5A; margin-top: 2px; }
  .header-right { text-align: right; }
  .doc-title { font-size: 14px; font-weight: 700; color: #2C2C2A; text-transform: uppercase; }
  .doc-sub   { font-size: 11px; color: #5F5E5A; margin-top: 2px; }
  .doc-period{ font-size: 13px; font-weight: 700; color: #C8A200; margin-top: 4px; text-transform: uppercase; }

  /* ── Tabla matriz ── */
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .th-num  { background:#2E7D32; color:#fff; text-align:center; font-size:9px; padding:5px 4px; width:30px; }
  .th-usu  { background:#2E7D32; color:#fff; text-align:left;   font-size:9px; padding:5px 8px; min-width:120px; }
  .th-total{ background:#E65100; color:#fff; text-align:center; font-size:9px; padding:5px 4px; min-width:52px; }
  td { border: 1px solid #D0D0C8; }
  .tr-footer td { border-top: 2px solid #888; }

  /* ── Totales ── */
  .totals-section { margin-top: 16px; display: flex; gap: 20px; align-items: flex-start; }
  .total-box { flex: 1; border: 1px solid #C8E6DE; border-radius: 5px; background: #EBF7F2; padding: 10px 14px; }
  .eco-box   { flex: 1; border: 1px solid #FFE082; border-radius: 5px; background: #FFFDE7; padding: 10px 14px; }
  .box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #5F5E5A; margin-bottom: 7px; }
  .box-row   { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; border-bottom: 1px dashed #D0D0C0; }
  .box-row:last-child { border-bottom: none; font-weight: 700; font-size: 13px; color: #0F6E56; padding-top: 6px; margin-top: 2px; }

  /* ── Pie ── */
  .footer { margin-top: 14px; border-top: 1px solid #D3D1C7; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #8A8A86; }
</style>
</head>
<body>

<!-- ENCABEZADO -->
<div class="header">
  <div class="header-left">
    <div class="logo-box"><span>R</span></div>
    <div>
      <div class="header-org">REVIBO</div>
      <div class="header-sub">Red de Vida Independiente Bolivia</div>
    </div>
  </div>
  <div class="header-right">
    <div class="doc-title">Informe Económico</div>
    <div class="doc-sub">De la cancelación de asistentes personales</div>
    <div class="doc-period">${nombreMes.toUpperCase()} - ${anio}</div>
  </div>
</div>

<!-- TABLA MATRICIAL: filas=usuarios, columnas=asistentes -->
<table>
  <thead>
    <tr>
      <th class="th-num">#</th>
      <th class="th-usu">Usuarios / Asistentes</th>
      ${thCols}
      <th class="th-total">TOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${tbodyRows || `<tr><td colspan="${colsAux.length + 3}" style="text-align:center;padding:20px;color:#888">Sin registros para este período</td></tr>`}
    <!-- Fila de totales por asistente -->
    <tr class="tr-footer">
      <td colspan="2" style="font-size:11px;padding:5px 8px;font-weight:700;background:#FFF3CD;color:#7A5C00;text-align:center">TOTAL HORAS</td>
      ${tdTotalesAux}
      <td style="text-align:center;font-size:12px;padding:5px;font-weight:700;background:#C8A200;color:#fff">${totalGeneral.toFixed(2)}</td>
    </tr>
    <!-- Fila Bs por hora -->
    <tr>
      <td colspan="2" style="font-size:10px;padding:4px 8px;background:#E8F5E9;color:#2E7D32;font-weight:600;text-align:center">Bs. por hora</td>
      ${colsAux.map(() => `<td style="text-align:center;font-size:11px;padding:4px;background:#E8F5E9;color:#2E7D32;font-weight:600">${TARIFA_POR_HORA}</td>`).join('')}
      <td style="text-align:center;font-size:11px;padding:4px;background:#E8F5E9;color:#2E7D32;font-weight:700">${TARIFA_POR_HORA}</td>
    </tr>
    <!-- Fila total Bs -->
    <tr>
      <td colspan="2" style="font-size:10px;padding:4px 8px;background:#FFF8E1;color:#C8A200;font-weight:700;text-align:center">Total Bs.</td>
      ${colsAux.map(a => {
        const t = totalesPorAux[a.id] || 0;
        return `<td style="text-align:center;font-size:11px;padding:4px;background:#FFF8E1;color:#7A5C00;font-weight:700">${(t * TARIFA_POR_HORA).toFixed(2)}</td>`;
      }).join('')}
      <td style="text-align:center;font-size:12px;padding:4px;background:#C8A200;color:#fff;font-weight:700">${totalPago.toFixed(2)}</td>
    </tr>
  </tbody>
</table>

<!-- TOTALES Y RESUMEN ECONÓMICO -->
<div class="totals-section">
  <div class="total-box">
    <div class="box-title">Resumen de horas</div>
    <div class="box-row"><span>Total de horas trabajadas:</span><span style="font-weight:600">${totalGeneral.toFixed(2)} horas</span></div>
    <div class="box-row"><span>Total de asistentes activos:</span><span style="font-weight:600">${colsAux.length}</span></div>
    <div class="box-row"><span>Total usuarios atendidos:</span><span style="font-weight:600">${usuariosConHoras.length}</span></div>
  </div>
  <div class="eco-box">
    <div class="box-title">Resumen Económico</div>
    <div class="box-row"><span>Valor por hora:</span><span>${TARIFA_POR_HORA} Bs</span></div>
    <div class="box-row"><span>Total de horas:</span><span>${totalGeneral.toFixed(2)} horas</span></div>
    <div class="box-row"><span>TOTAL PAGADO EN EL MES:</span><span>${totalPago.toLocaleString('es-BO')} Bs</span></div>
  </div>
</div>

<!-- PIE DE PÁGINA -->
<div class="footer">
  <span>Sistema MISKI — REVIBO · Red de Vida Independiente Bolivia</span>
  <span>Período: ${nombreMes} ${anio}</span>
  <span>Emisión: ${new Date().toLocaleDateString('es-BO', {day:'2-digit',month:'long',year:'numeric'})}</span>
</div>

</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ── Modal helpers ──────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Toast ──────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons = {
    success: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    error:   '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = (icons[type] || '') + esc(msg);
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Clock ──────────────────────────────────────────
function tickClock() {
  const now = new Date();
  const s = now.toTimeString().slice(0,5);
  $$('.live-clock').forEach(el => el.textContent = s);
  const horaEl = document.getElementById('asis-hora');
  if (horaEl && !horaEl._touched) horaEl.value = s;
}
document.addEventListener('DOMContentLoaded', async () => {
  await AUTH.init();

  const ok = await DB.hydrate();
  if (ok) {
    showToast('Conectado a Supabase', 'success');
  } else if (supabaseClient) {
    showToast('No se pudo conectar a Supabase, usando datos locales', 'error');
  }
  seedData();
  navigate('dashboard');
  tickClock();
  setInterval(tickClock, 10000);
  document.getElementById('asis-hora')?.addEventListener('change', e => e.target._touched = true);
});

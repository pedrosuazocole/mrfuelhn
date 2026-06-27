/**
 * REPORTES DIARIOS — MR. FUEL v2.0
 *
 * Genera y envía por WhatsApp (TextMeBot) 3 reportes consolidados del día:
 *   1. Auditorías realizadas hoy y su resultado
 *   2. Mantenimientos realizados hoy y su resultado
 *   3. Tickets abiertos (pendientes o en proceso) y su estado
 *
 * Cada reporte puede dispararse automáticamente (vía cron) o manualmente
 * (vía ruta de administrador) — ambos casos llaman exactamente a las
 * mismas funciones de este módulo, así que el contenido es siempre idéntico.
 */

const moment = require('moment-timezone');
const { allAsync } = require('../config/database');
const { textoATodos } = require('./textmebot');

const TZ = process.env.TZ || 'America/Tegucigalpa';

function emojiCalificacion(cal) {
  if (cal === null || cal === undefined) return '❔';
  if (cal >= 80) return '✅';
  if (cal >= 60) return '⚠️';
  return '❌';
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTE 1 — AUDITORÍAS DEL DÍA (2:00 PM)
// ════════════════════════════════════════════════════════════════════════════
async function generarReporteAuditorias(fecha) {
  const auditorias = await allAsync(`
    SELECT a.id, a.calificacion_general, a.hora_visita, a.estado,
           e.nombre AS estacion_nombre, u.nombre AS auditor_nombre
    FROM auditorias_v2 a
    INNER JOIN estaciones e ON a.estacion_id = e.id
    INNER JOIN usuarios   u ON a.auditor_id  = u.id
    WHERE a.fecha_visita = ?
    ORDER BY a.hora_visita ASC
  `, [fecha]);

  const fechaTexto = moment(fecha).format('DD/MM/YYYY');

  if (auditorias.length === 0) {
    return `📋 *REPORTE DE AUDITORÍAS — ${fechaTexto}*\n\nNo se registraron auditorías hoy.`;
  }

  let msg = `📋 *REPORTE DE AUDITORÍAS — ${fechaTexto}*\n\n`;
  msg += `Total del día: ${auditorias.length} auditoría(s)\n\n`;

  for (const a of auditorias) {
    const cal = a.calificacion_general !== null ? `${a.calificacion_general}%` : 'pendiente';
    msg += `${emojiCalificacion(a.calificacion_general)} *${a.estacion_nombre}* — ${cal}\n`;
    msg += `   👤 ${a.auditor_nombre}  ⏰ ${a.hora_visita || ''}\n\n`;
  }

  const promedios = auditorias.filter(a => a.calificacion_general !== null);
  if (promedios.length) {
    const promedio = (promedios.reduce((s, a) => s + a.calificacion_general, 0) / promedios.length).toFixed(1);
    msg += `📊 Promedio del día: *${promedio}%*`;
  }

  return msg;
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTE 2 — MANTENIMIENTOS DEL DÍA (5:00 PM)
// ════════════════════════════════════════════════════════════════════════════
async function generarReporteMantenimientos(fecha) {
  const mantenimientos = await allAsync(`
    SELECT m.id, m.calificacion_general, m.hora_visita,
           e.nombre AS estacion_nombre, u.nombre AS tecnico_nombre,
           mc.nombre AS categoria_nombre
    FROM mantenimientos m
    INNER JOIN estaciones e ON m.estacion_id = e.id
    INNER JOIN usuarios   u ON m.tecnico_id  = u.id
    INNER JOIN mantenimiento_categorias mc ON m.categoria_id = mc.id
    WHERE m.fecha_visita = ?
    ORDER BY m.hora_visita ASC
  `, [fecha]);

  const fechaTexto = moment(fecha).format('DD/MM/YYYY');

  if (mantenimientos.length === 0) {
    return `🔧 *REPORTE DE MANTENIMIENTO — ${fechaTexto}*\n\nNo se registraron mantenimientos hoy.`;
  }

  let msg = `🔧 *REPORTE DE MANTENIMIENTO — ${fechaTexto}*\n\n`;
  msg += `Total del día: ${mantenimientos.length} mantenimiento(s)\n\n`;

  for (const m of mantenimientos) {
    const cal = m.calificacion_general !== null ? `${m.calificacion_general}%` : 'pendiente';
    msg += `${emojiCalificacion(m.calificacion_general)} *${m.estacion_nombre}* — ${cal}\n`;
    msg += `   🗂️ ${m.categoria_nombre}\n`;
    msg += `   👤 ${m.tecnico_nombre}  ⏰ ${m.hora_visita || ''}\n\n`;
  }

  const promedios = mantenimientos.filter(m => m.calificacion_general !== null);
  if (promedios.length) {
    const promedio = (promedios.reduce((s, m) => s + m.calificacion_general, 0) / promedios.length).toFixed(1);
    msg += `📊 Promedio del día: *${promedio}%*`;
  }

  return msg;
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTE 3 — TICKETS ABIERTOS (7:00 PM)
// ════════════════════════════════════════════════════════════════════════════
async function generarReporteTickets() {
  const tickets = await allAsync(`
    SELECT t.id, t.titulo, t.prioridad, t.estado, t.fecha_reporte,
           e.nombre AS estacion_nombre, u.nombre AS asignado_nombre
    FROM tickets t
    INNER JOIN estaciones e ON t.estacion_id = e.id
    LEFT JOIN usuarios    u ON t.asignado_a  = u.id
    WHERE t.estado IN ('pendiente', 'en_proceso')
    ORDER BY
      CASE t.prioridad WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
      t.fecha_reporte ASC
  `);

  const fechaTexto = moment().tz(TZ).format('DD/MM/YYYY');

  if (tickets.length === 0) {
    return `🎫 *REPORTE DE TICKETS — ${fechaTexto}*\n\n✅ No hay tickets abiertos. ¡Todo al día!`;
  }

  const prioEmo   = { urgente: '🔴', alta: '🟠', media: '🔵', baja: '⚪' };
  const estadoEmo = { pendiente: '🟡', en_proceso: '🔵' };

  let msg = `🎫 *REPORTE DE TICKETS — ${fechaTexto}*\n\n`;
  msg += `Total abiertos: ${tickets.length}\n\n`;

  for (const t of tickets) {
    const dias = moment().diff(moment(t.fecha_reporte), 'days');
    msg += `${prioEmo[t.prioridad] || '🔵'} *#${t.id}: ${t.titulo}*\n`;
    msg += `   📍 ${t.estacion_nombre}\n`;
    msg += `   ${estadoEmo[t.estado] || '🟡'} ${t.estado.replace('_', ' ')}`;
    if (t.asignado_nombre) msg += `  👤 ${t.asignado_nombre}`;
    msg += `\n   ⏳ ${dias === 0 ? 'reportado hoy' : `hace ${dias} día(s)`}\n\n`;
  }

  return msg;
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE ENVÍO — usadas tanto por el cron como por el envío manual
// ════════════════════════════════════════════════════════════════════════════

async function enviarReporteAuditorias(fecha = null) {
  const fechaUsar = fecha || moment().tz(TZ).format('YYYY-MM-DD');
  const mensaje = await generarReporteAuditorias(fechaUsar);
  console.log('📤 Enviando reporte de auditorías del día...');
  const resultado = await textoATodos(mensaje);
  console.log(`✅ Reporte de auditorías enviado a ${resultado.length} número(s)`);
  return { mensaje, resultado };
}

async function enviarReporteMantenimientos(fecha = null) {
  const fechaUsar = fecha || moment().tz(TZ).format('YYYY-MM-DD');
  const mensaje = await generarReporteMantenimientos(fechaUsar);
  console.log('📤 Enviando reporte de mantenimientos del día...');
  const resultado = await textoATodos(mensaje);
  console.log(`✅ Reporte de mantenimientos enviado a ${resultado.length} número(s)`);
  return { mensaje, resultado };
}

async function enviarReporteTickets() {
  const mensaje = await generarReporteTickets();
  console.log('📤 Enviando reporte de tickets abiertos...');
  const resultado = await textoATodos(mensaje);
  console.log(`✅ Reporte de tickets enviado a ${resultado.length} número(s)`);
  return { mensaje, resultado };
}

module.exports = {
  generarReporteAuditorias,
  generarReporteMantenimientos,
  generarReporteTickets,
  enviarReporteAuditorias,
  enviarReporteMantenimientos,
  enviarReporteTickets,
};

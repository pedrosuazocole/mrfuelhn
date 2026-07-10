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
const { allAsync, getAsync } = require('../config/database');
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
// RECORDATORIO — AUDITORÍAS PENDIENTES DEL DÍA (8:00 AM)
// ════════════════════════════════════════════════════════════════════════════
async function generarRecordatorioAuditorias() {
  const fechaHoy = moment().tz(TZ).format('YYYY-MM-DD');
  const fechaTexto = moment().tz(TZ).format('DD/MM/YYYY');

  // Estaciones activas que todavía NO tienen una auditoría registrada hoy
  const estacionesPendientes = await allAsync(`
    SELECT e.id, e.nombre
    FROM estaciones e
    WHERE e.activo = 1
      AND e.id NOT IN (
        SELECT estacion_id FROM auditorias_v2 WHERE fecha_visita = ?
      )
    ORDER BY e.nombre ASC
  `, [fechaHoy]);

  let msg = `⏰ *RECORDATORIO DE AUDITORÍAS — ${fechaTexto}*\n\n`;

  if (estacionesPendientes.length === 0) {
    msg += `✅ Todas las estaciones activas ya tienen auditoría registrada hoy. ¡Buen trabajo!`;
    return msg;
  }

  msg += `Buen día. Estas estaciones aún no tienen auditoría hoy:\n\n`;
  for (const e of estacionesPendientes) {
    msg += `📍 ${e.nombre}\n`;
  }
  msg += `\nTotal pendientes: ${estacionesPendientes.length}`;

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

async function enviarRecordatorioAuditorias() {
  const mensaje = await generarRecordatorioAuditorias();
  console.log('📤 Enviando recordatorio de auditorías pendientes...');
  const resultado = await textoATodos(mensaje);
  console.log(`✅ Recordatorio de auditorías enviado a ${resultado.length} número(s)`);
  return { mensaje, resultado };
}

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
  generarRecordatorioAuditorias,
  enviarReporteAuditorias,
  enviarReporteMantenimientos,
  enviarReporteTickets,
  enviarRecordatorioAuditorias,
  enviarRecordatoriosPorEstacion,
  enviarRecordatorioMantenimiento,
};

// ── Recordatorios por estación: supervisores + copia a gerentes/admins ────
// Se llama dos veces al día (9:00 AM y 3:00 PM).
// - supervisores de cada estación reciben recordatorio solo de su estación
// - admins/gerentes reciben una copia con el resumen de TODAS las pendientes
async function enviarRecordatoriosPorEstacion(urgente = false) {
  const fechaHoy   = moment().tz(TZ).format('YYYY-MM-DD');
  const fechaTexto = moment().tz(TZ).format('DD/MM/YYYY');
  const horaTexto  = moment().tz(TZ).format('hh:mm A');

  // Estaciones que NO tienen auditoría hoy
  const pendientes = await allAsync(`
    SELECT e.id, e.nombre, e.whatsapp_apikey
    FROM estaciones e
    WHERE e.activo = 1
      AND e.id NOT IN (
        SELECT estacion_id FROM auditorias_v2 WHERE fecha_visita = ?
      )
    ORDER BY e.nombre
  `, [fechaHoy]);

  if (pendientes.length === 0) {
    console.log('✅ [Recordatorio] Todas las estaciones ya tienen auditoría hoy. No se envían recordatorios.');
    return;
  }

  // ── 1. Enviar a supervisores de cada estación pendiente ──────────────
  for (const estacion of pendientes) {
    // Supervisores asignados a esta estación con número WhatsApp
    const supervisores = await allAsync(`
      SELECT nombre, whatsapp_numero
      FROM usuarios
      WHERE activo = 1
        AND estacion_id = ?
        AND rol IN ('supervisor', 'supervisor_pista')
        AND whatsapp_numero IS NOT NULL
        AND TRIM(whatsapp_numero) != ''
    `, [estacion.id]);

    if (supervisores.length === 0) {
      console.log(`⚠️  Sin supervisores con WhatsApp en ${estacion.nombre}`);
      continue;
    }

    // Mensaje para el supervisor de la estación
    let msg;
    if (!urgente) {
      msg = `⏰ *RECORDATORIO DE AUDITORÍA — ${fechaTexto}*\n\n`
          + `Buenos días. Se les recuerda realizar la auditoría de hoy en:\n\n`
          + `📍 *${estacion.nombre}*\n\n`
          + `Por favor registrar la auditoría antes del mediodía.\n`
          + `🕘 ${horaTexto} | Mr. Fuel v2.0`;
    } else {
      msg = `🚨 *AUDITORÍA PENDIENTE — URGENTE — ${fechaTexto}*\n\n`
          + `⚠️ Hasta las ${horaTexto} la estación *${estacion.nombre}* NO tiene auditoría registrada.\n\n`
          + `❗ Se requiere completar la auditoría de inmediato.\n\n`
          + `Por favor ingresar al sistema y registrar la auditoría ahora.\n`
          + `📲 fuelhn.up.railway.app\n`
          + `🕒 ${horaTexto} | Mr. Fuel v2.0`;
    }

    // Obtener apikey remitente de la estación (o fallback global)
    let apikeyRemitente = null;
    if (estacion.whatsapp_apikey) {
      apikeyRemitente = estacion.whatsapp_apikey;
    } else {
      const global = await getAsync(
        `SELECT textmebot_apikey FROM whatsapp_numeros WHERE activo = 1 AND textmebot_apikey IS NOT NULL AND TRIM(textmebot_apikey) != '' ORDER BY id LIMIT 1`
      );
      if (global) apikeyRemitente = global.textmebot_apikey;
    }

    if (!apikeyRemitente) {
      console.log(`⚠️  Sin API Key disponible para ${estacion.nombre}`);
      continue;
    }

    for (const sup of supervisores) {
      try {
        const numero = sup.whatsapp_numero.replace(/[^0-9+]/g, '');
        const recipient = encodeURIComponent(numero);
        const url = `https://api.textmebot.com/send.php?recipient=${recipient}&apikey=${apikeyRemitente}&text=${encodeURIComponent(msg)}`;
        const resp = await fetch(url);
        const texto = await resp.text();
        console.log(`📤 Recordatorio${urgente ? ' URGENTE' : ''} → ${sup.nombre} (${estacion.nombre}): ${texto.substring(0, 50)}`);
        await new Promise(r => setTimeout(r, 9000));
      } catch (e) {
        console.error(`❌ Error enviando a ${sup.nombre}:`, e.message);
      }
    }
  }

  // ── 2. Copia a admins y gerentes: resumen de TODAS las pendientes ─────
  const admins = await allAsync(`
    SELECT nombre, whatsapp_numero
    FROM usuarios
    WHERE activo = 1
      AND rol IN ('admin', 'gerente')
      AND whatsapp_numero IS NOT NULL
      AND TRIM(whatsapp_numero) != ''
  `);

  if (admins.length === 0) {
    console.log('ℹ️  Sin admins/gerentes con WhatsApp para la copia.');
    return;
  }

  // Construir resumen de pendientes para el admin
  let resumen;
  if (!urgente) {
    resumen = `📋 *RESUMEN RECORDATORIOS AUDITORÍAS — ${fechaTexto}*\n\n`
            + `🕘 ${horaTexto} — Estaciones sin auditoría registrada:\n\n`;
  } else {
    resumen = `🚨 *ALERTA AUDITORÍAS PENDIENTES — ${fechaTexto}*\n\n`
            + `🕒 ${horaTexto} — Las siguientes estaciones AÚN no tienen auditoría:\n\n`;
  }
  for (const e of pendientes) {
    resumen += `📍 ${e.nombre}\n`;
  }
  resumen += `\nTotal pendientes: ${pendientes.length} de ${(await allAsync('SELECT id FROM estaciones WHERE activo = 1')).length} estaciones.`;

  // Usar primer apikey global disponible para enviar a admins
  const globalKey = await getAsync(
    `SELECT textmebot_apikey FROM whatsapp_numeros WHERE activo = 1 AND textmebot_apikey IS NOT NULL AND TRIM(textmebot_apikey) != '' ORDER BY id LIMIT 1`
  );
  if (!globalKey) return;

  for (const admin of admins) {
    try {
      const numero = admin.whatsapp_numero.replace(/[^0-9+]/g, '');
      const recipient = encodeURIComponent(numero);
      const url = `https://api.textmebot.com/send.php?recipient=${recipient}&apikey=${globalKey.textmebot_apikey}&text=${encodeURIComponent(resumen)}`;
      const resp = await fetch(url);
      const texto = await resp.text();
      console.log(`📤 Copia admin → ${admin.nombre}: ${texto.substring(0, 50)}`);
      await new Promise(r => setTimeout(r, 9000));
    } catch (e) {
      console.error(`❌ Error enviando copia a ${admin.nombre}:`, e.message);
    }
  }
}

// ── Recordatorio de mantenimiento semanal por estaciones ─────────────────
// estacionNombres: array con los nombres exactos de las estaciones a notificar
// Envía a técnicos/supervisores asignados a cada estación + copia a admins
async function enviarRecordatorioMantenimiento(estacionNombres = []) {
  const fechaTexto = moment().tz(TZ).format('DD/MM/YYYY');
  const horaTexto  = moment().tz(TZ).format('hh:mm A');

  // Buscar estaciones por nombre (comparación flexible, sin importar mayúsculas)
  const estaciones = await allAsync(
    `SELECT id, nombre, whatsapp_apikey
     FROM estaciones
     WHERE activo = 1
       AND (${estacionNombres.map(() => 'LOWER(nombre) LIKE ?').join(' OR ')})`,
    estacionNombres.map(n => `%${n.toLowerCase()}%`)
  );

  if (estaciones.length === 0) {
    console.log('⚠️  [Mantenimiento] No se encontraron estaciones para el recordatorio.');
    return;
  }

  // Apikey global de fallback
  const globalKey = await getAsync(
    `SELECT textmebot_apikey FROM whatsapp_numeros
     WHERE activo = 1 AND textmebot_apikey IS NOT NULL AND TRIM(textmebot_apikey) != ''
     ORDER BY id LIMIT 1`
  );

  // ── 1. Enviar a técnicos/supervisores de cada estación ───────────────
  for (const estacion of estaciones) {
    const destinatarios = await allAsync(
      `SELECT nombre, whatsapp_numero
       FROM usuarios
       WHERE activo = 1
         AND estacion_id = ?
         AND rol IN ('tecnico', 'supervisor', 'supervisor_pista', 'responsable_mantenimiento')
         AND whatsapp_numero IS NOT NULL
         AND TRIM(whatsapp_numero) != ''`,
      [estacion.id]
    );

    if (destinatarios.length === 0) {
      console.log(`⚠️  Sin técnicos/supervisores con WhatsApp en ${estacion.nombre}`);
      continue;
    }

    const msg = `🔧 *RECORDATORIO DE MANTENIMIENTO SEMANAL*\n\n`
              + `📍 Estación: *${estacion.nombre}*\n`
              + `📅 Fecha: ${fechaTexto}\n`
              + `🕒 ${horaTexto}\n\n`
              + `Se les recuerda realizar el *mantenimiento semanal* programado para hoy.\n\n`
              + `Por favor registrar el mantenimiento en el sistema al finalizar.\n`
              + `📲 fuelhn.up.railway.app\n`
              + `🔧 Mr. Fuel v2.0`;

    const apikey = estacion.whatsapp_apikey || globalKey?.textmebot_apikey;
    if (!apikey) {
      console.log(`⚠️  Sin API Key para ${estacion.nombre}`);
      continue;
    }

    for (const dest of destinatarios) {
      try {
        const numero    = dest.whatsapp_numero.replace(/[^0-9+]/g, '');
        const recipient = encodeURIComponent(numero);
        const url = `https://api.textmebot.com/send.php?recipient=${recipient}&apikey=${apikey}&text=${encodeURIComponent(msg)}`;
        const resp  = await fetch(url);
        const texto = await resp.text();
        console.log(`📤 Mant. semanal → ${dest.nombre} (${estacion.nombre}): ${texto.substring(0, 50)}`);
        await new Promise(r => setTimeout(r, 9000));
      } catch (e) {
        console.error(`❌ Error enviando a ${dest.nombre}:`, e.message);
      }
    }
  }

  // ── 2. Copia resumen a admins/gerentes ────────────────────────────────
  const admins = await allAsync(
    `SELECT nombre, whatsapp_numero
     FROM usuarios
     WHERE activo = 1
       AND rol IN ('admin', 'gerente')
       AND whatsapp_numero IS NOT NULL
       AND TRIM(whatsapp_numero) != ''`
  );

  if (!admins.length || !globalKey) return;

  const resumen = `📋 *RECORDATORIO MANTENIMIENTO SEMANAL — ${fechaTexto}*\n\n`
                + `Estaciones programadas para mantenimiento hoy:\n\n`
                + estaciones.map(e => `🔧 ${e.nombre}`).join('\n')
                + `\n\n🕒 ${horaTexto} | Mr. Fuel v2.0`;

  for (const admin of admins) {
    try {
      const numero    = admin.whatsapp_numero.replace(/[^0-9+]/g, '');
      const recipient = encodeURIComponent(numero);
      const url = `https://api.textmebot.com/send.php?recipient=${recipient}&apikey=${globalKey.textmebot_apikey}&text=${encodeURIComponent(resumen)}`;
      const resp  = await fetch(url);
      const texto = await resp.text();
      console.log(`📤 Copia mant. → ${admin.nombre}: ${texto.substring(0, 50)}`);
      await new Promise(r => setTimeout(r, 9000));
    } catch (e) {
      console.error(`❌ Error copia admin ${admin.nombre}:`, e.message);
    }
  }
}

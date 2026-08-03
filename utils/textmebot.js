/**
 * TEXTMEBOT — NOTIFICACIONES AUTOMÁTICAS WhatsApp
 * MR. FUEL v2.0 — Metric Solutions & POS
 *
 * Formato de URL adoptado del módulo de WhatsApp de MetricPOS (probado y funcional):
 *  - recipient usa el signo + codificado: %2B{numero}
 *  - document/file NO se codifican con encodeURIComponent (TextMeBot los necesita en texto plano)
 *  - &json=yes para obtener respuesta estructurada
 *  - delay de 5s entre mensajes (más conservador, evita rate-limit de TextMeBot)
 */

const https  = require('https');
const { allAsync, getAsync } = require('../config/database');

const BASE = 'https://api.textmebot.com/send.php';

const APP_URL = (() => {
  if (process.env.APP_URL)               return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'https://fuelhn.up.railway.app';
})();

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Limpiar número (solo dígitos) ──────────────────────────────────────────
function phone(n) { return String(n).replace(/[^0-9]/g, ''); }

// ── URL pública de foto/archivo ────────────────────────────────────────────
function urlArchivo(ruta) {
  if (!ruta) return null;
  if (ruta.startsWith('http')) return ruta;
  const r = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${APP_URL}${r}`;
}

// ── GET a la API de TextMeBot ───────────────────────────────────────────────
function get(url, etiqueta = '') {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end',  () => {
        console.log(`   → ${etiqueta} HTTP ${res.statusCode}: ${body.slice(0, 300)}`);
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error',   e  => { console.error(`   ❌ ${etiqueta} error de red: ${e.message}`); reject(e); });
    req.on('timeout', () => { req.destroy(); console.error(`   ❌ ${etiqueta} timeout (30s)`); reject(new Error('timeout')); });
  });
}

/**
 * Enviar vía TextMeBot — mismo patrón que MetricPOS.
 * Para texto:    solo `mensaje`
 * Para PDF/foto: `pdfUrl` (NO codificada) + `pdfNombre` + `mensaje` opcional como caption
 */
async function _textmebotEnviar({ numero, apikey, mensaje, pdfUrl, pdfNombre, nombre }, intento = 1) {
  const tel = phone(numero);
  const etiqueta = `[${nombre || tel} → ${tel}]`;
  let url;
  if (pdfUrl) {
    // IMPORTANTE: pdfUrl va en texto plano, sin encodeURIComponent
    url = `${BASE}?recipient=%2B${tel}&apikey=${apikey.trim()}&document=${pdfUrl}&filename=${encodeURIComponent(pdfNombre || 'Reporte.pdf')}&json=yes`;
    if (mensaje) url += `&text=${encodeURIComponent(mensaje)}`;
  } else {
    url = `${BASE}?recipient=%2B${tel}&apikey=${apikey.trim()}&text=${encodeURIComponent(mensaje)}&json=yes`;
  }
  const r = await get(url, etiqueta);
  let parsed;
  try { parsed = JSON.parse(r.body); } catch (e) { parsed = { status: r.body }; }

  // TextMeBot exige mínimo 8s entre mensajes; si llegamos demasiado rápido
  // (variación de latencia, primer envío del proceso, etc.), reintentamos
  // una sola vez tras esperar un poco más, en vez de perder la notificación.
  const esDelayNeeded = parsed && parsed.status === 'error'
    && typeof parsed.comment === 'string' && parsed.comment.toLowerCase().includes('delay needed');

  if (esDelayNeeded && intento < 2) {
    console.warn(`⚠️  ${etiqueta} TextMeBot pidió más espera, reintentando en 9s...`);
    await wait(9000);
    return _textmebotEnviar({ numero, apikey, mensaje, pdfUrl, pdfNombre, nombre }, intento + 1);
  }

  return parsed;
}

// ── Obtener apikey remitente de una estación ──────────────────────────────
// Prioridad: 1) apikey de la estación  2) primer apikey global activo (fallback)
async function apiKeyRemitente(estacionId = null) {
  if (estacionId) {
    const est = await getAsync(
      `SELECT whatsapp_numero, whatsapp_apikey FROM estaciones WHERE id = ? AND whatsapp_apikey IS NOT NULL AND TRIM(whatsapp_apikey) != ''`,
      [estacionId]
    );
    if (est && est.whatsapp_apikey) {
      console.log(`🔑 Usando API Key remitente de estación ${estacionId}: ${est.whatsapp_numero}`);
      return { apikey: est.whatsapp_apikey, numero_remitente: est.whatsapp_numero };
    }
  }
  // Fallback: primer número global con apikey
  const global = await getAsync(
    `SELECT numero, textmebot_apikey FROM whatsapp_numeros WHERE activo = 1 AND textmebot_apikey IS NOT NULL AND TRIM(textmebot_apikey) != '' ORDER BY id LIMIT 1`
  );
  if (global) {
    console.log(`🔑 Usando API Key global de fallback: ${global.numero}`);
    return { apikey: global.textmebot_apikey, numero_remitente: global.numero };
  }
  return null;
}

// ── Obtener destinatarios (números que RECIBEN) filtrados por estación ────
// Si estacionId: recibe esa estación + los globales (NULL)
// Si no: todos los activos con apikey
async function destinatarios(estacionId = null) {
  let rows;
  if (estacionId) {
    rows = await allAsync(
      `SELECT nombre, numero, textmebot_apikey
       FROM whatsapp_numeros
       WHERE activo = 1
         AND (estacion_id = ? OR estacion_id IS NULL)
       GROUP BY numero
       ORDER BY nombre`,
      [estacionId]
    );
  } else {
    rows = await allAsync(
      `SELECT nombre, numero, textmebot_apikey
       FROM whatsapp_numeros
       WHERE activo = 1
       GROUP BY numero
       ORDER BY nombre`
    );
  }
  console.log(`📋 Destinatarios para estación ${estacionId || 'global'}: ${rows.map(r => r.nombre).join(', ') || 'ninguno'}`);
  return rows;
}

// ── A todos: texto ─────────────────────────────────────────────────────────
async function textoATodos(mensaje, estacionId = null) {
  const dests = await destinatarios(estacionId);
  if (!dests.length) { console.log('⚠️  Sin destinatarios configurados'); return []; }

  const remitente = await apiKeyRemitente(estacionId);
  if (!remitente) { console.log('⚠️  Sin API Key remitente disponible'); return []; }

  const res = [];
  for (const d of dests) {
    try {
      console.log(`📤 Texto → ${d.nombre} (${d.numero}) vía ${remitente.numero_remitente}`);
      // Se usa el apikey de la ESTACIÓN como remitente, enviando AL número del destinatario
      const r = await _textmebotEnviar({ numero: d.numero, apikey: remitente.apikey, mensaje, nombre: d.nombre });
      console.log(`   ✅ Resultado ${d.nombre}:`, JSON.stringify(r));
      res.push({ nombre: d.nombre, ok: true, r });
    } catch (e) {
      console.error(`❌ Texto ${d.nombre}: ${e.message}`);
      res.push({ nombre: d.nombre, ok: false, error: e.message });
    }
    await wait(9000);
  }
  return res;
}

// ── A todos: documento ─────────────────────────────────────────────────────
async function documentoATodos(caption, fileUrl, filename, estacionId = null) {
  const dests = await destinatarios(estacionId);
  if (!dests.length) return [];

  const remitente = await apiKeyRemitente(estacionId);
  if (!remitente) { console.log('⚠️  Sin API Key remitente disponible'); return []; }

  const res = [];
  for (const d of dests) {
    try {
      console.log(`📤 Archivo → ${d.nombre} (${d.numero}) vía ${remitente.numero_remitente}: ${fileUrl}`);
      const r = await _textmebotEnviar({
        numero:    d.numero,
        apikey:    remitente.apikey,
        pdfUrl:    fileUrl,
        pdfNombre: filename,
        mensaje:   caption,
        nombre:    d.nombre
      });
      console.log(`   ✅ Resultado ${d.nombre}:`, JSON.stringify(r));
      res.push({ nombre: d.nombre, ok: true, r });
    } catch (e) {
      console.error(`❌ Archivo ${d.nombre}: ${e.message}`);
      res.push({ nombre: d.nombre, ok: false, error: e.message });
    }
    await wait(9000);
  }
  return res;
}

// Alias para mantener compatibilidad con el resto del código existente
async function imagenATodos(caption, rutaOUrl) {
  const url = urlArchivo(rutaOUrl);
  if (!url) { console.warn('⚠️  Imagen sin URL válida, omitida'); return []; }
  return documentoATodos(caption, url, 'Foto.jpg');
}

// ══════════════════════════════════════════════════════════════════════════
// AUDITORÍA
// ══════════════════════════════════════════════════════════════════════════
async function notificarAuditoria(auditoria, estacion, auditor, evaluaciones, fotos) {
  try {
    const fecha  = (auditoria.fecha_visita || '').split('T')[0].split('-').reverse().join('/');
    const cal    = auditoria.calificacion_general || auditoria.calificacion || 0;
    const emo    = cal >= 80 ? '✅' : cal >= 60 ? '⚠️' : '❌';
    const cumple = evaluaciones.filter(e => e.cumple === 1 || e.cumple === true).length;
    const noC    = evaluaciones.length - cumple;

    let msg = `🔍 *AUDITORÍA MR. FUEL*\n\n`
            + `📍 Estación: ${estacion.nombre}\n`
            + `📅 Fecha: ${fecha}  ⏰ ${auditoria.hora_visita || ''}\n`
            + `👤 Auditor: ${auditor.nombre}\n`
            + `📊 Calificación: *${cal}%* ${emo}\n`
            + `✅ Cumplen: ${cumple}   ❌ No cumplen: ${noC}`;

    evaluaciones.filter(e => !(e.cumple===1||e.cumple===true)).slice(0,8)
      .forEach(e => { msg += `\n  • ${e.item_nombre||''}${e.observacion ? ' — '+e.observacion : ''}`; });

    if (auditoria.observaciones_generales) msg += `\n\n📝 ${auditoria.observaciones_generales}`;
    if (auditoria.recomendaciones)         msg += `\n💡 ${auditoria.recomendaciones}`;

    // 1) Texto
    console.log('📱 [Auditoría] Enviando resumen de texto...');
    await textoATodos(msg, estacion.id);
    await wait(9000);

    // 2) PDF — incluye las fotos embebidas dentro del documento
    const pdfUrl  = `${APP_URL}/auditorias-v2/${auditoria.id}/pdf-download`;
    const pdfName = `Auditoria-${auditoria.id}.pdf`;
    console.log(`📱 [Auditoría] Enviando PDF (con fotos incluidas): ${pdfUrl}`);
    await documentoATodos(`📄 Reporte #${auditoria.id} — ${estacion.nombre} — ${fecha}`, pdfUrl, pdfName, estacion.id);

    console.log(`✅ Auditoría #${auditoria.id} notificada`);
  } catch (e) { console.error('❌ notificarAuditoria:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════
// TICKET
// ══════════════════════════════════════════════════════════════════════════
async function notificarTicket(ticket, estacion, asignado, creador, accion = 'creado') {
  try {
    const prioEmo   = { urgente:'🔴', alta:'🟠', media:'🔵', baja:'⚪' };
    const estadoEmo = { pendiente:'🟡', en_proceso:'🔵', resuelto:'🟢' };
    const prio  = ticket.prioridad || 'media';
    const estado= ticket.estado    || 'pendiente';

    let msg = `🎫 *TICKET MR. FUEL — ${accion.toUpperCase()}*\n\n`
            + `📌 #${ticket.id}: ${ticket.titulo}\n`
            + `📍 Estación: ${estacion?.nombre||''}\n`
            + `🏷️ Tipo: ${ticket.tipo||''}\n`
            + `${prioEmo[prio]||'🔵'} Prioridad: ${prio.charAt(0).toUpperCase()+prio.slice(1)}\n`
            + `${estadoEmo[estado]||'🟡'} Estado: ${estado.replace('_',' ')}`;

    if (asignado) msg += `\n👤 Asignado: ${asignado.nombre}`;
    if (creador)  msg += `\n✍️  Reportado por: ${creador.nombre}`;
    if (ticket.descripcion)    msg += `\n\n📝 ${ticket.descripcion}`;
    if (ticket.costo_estimado) msg += `\n💰 Costo: L ${ticket.costo_estimado}`;

    console.log('📱 [Ticket] Enviando texto...');
    await textoATodos(msg, estacion?.id);

    if (ticket.foto_evidencia) {
      await wait(9000);
      const url = urlArchivo(ticket.foto_evidencia);
      if (url) {
        console.log(`📱 [Ticket] Foto: ${url}`);
        await documentoATodos(`📸 Evidencia Ticket #${ticket.id}`, url, `Ticket_${ticket.id}.jpg`, estacion?.id);
      }
    }
    console.log(`✅ Ticket #${ticket.id} notificado`);
  } catch (e) { console.error('❌ notificarTicket:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════
// MANTENIMIENTO
// ══════════════════════════════════════════════════════════════════════════
async function notificarMantenimiento(mant, estacion, tecnico, categoria, evaluaciones, fotos) {
  try {
    const fecha  = (mant.fecha_visita || '').split('T')[0].split('-').reverse().join('/');
    const cal    = mant.calificacion_general || 0;
    const emo    = cal >= 80 ? '✅' : cal >= 60 ? '⚠️' : '❌';
    const cumple = evaluaciones.filter(e => e.cumple===1||e.cumple===true).length;
    const noC    = evaluaciones.length - cumple;

    let msg = `🔧 *MANTENIMIENTO MR. FUEL*\n\n`
            + `📍 Estación: ${estacion?.nombre||''}\n`
            + `🗂️ Categoría: ${categoria?.nombre||''}\n`
            + `📅 Fecha: ${fecha}  ⏰ ${mant.hora_visita||''}\n`
            + `👤 Técnico: ${tecnico?.nombre||''}\n`
            + `📊 Calificación: *${cal}%* ${emo}\n`
            + `✅ Cumplen: ${cumple}   ❌ No cumplen: ${noC}`;

    evaluaciones.filter(e=>!(e.cumple===1||e.cumple===true)).slice(0,8)
      .forEach(e => { msg += `\n  • ${e.item_nombre||''}${e.observacion ? ' — '+e.observacion : ''}`; });

    if (mant.observaciones_generales) msg += `\n\n📝 ${mant.observaciones_generales}`;
    if (mant.recomendaciones)         msg += `\n💡 ${mant.recomendaciones}`;

    console.log('📱 [Mantenimiento] Enviando texto...');
    await textoATodos(msg, estacion?.id);
    await wait(9000);

    // PDF — incluye las fotos embebidas dentro del documento
    const pdfUrl  = `${APP_URL}/mantenimiento/${mant.id}/pdf-download`;
    const pdfName = `Mantenimiento-${mant.id}.pdf`;
    console.log(`📱 [Mantenimiento] Enviando PDF (con fotos incluidas): ${pdfUrl}`);
    await documentoATodos(`📄 Reporte #${mant.id} — ${categoria?.nombre||''} — ${fecha}`, pdfUrl, pdfName, estacion?.id);

    console.log(`✅ Mantenimiento #${mant.id} notificado`);
  } catch (e) { console.error('❌ notificarMantenimiento:', e.message); }
}

// ── Enviar texto a UN número específico (usado por el Agente IA) ────────────
// Busca la apikey del número que escribió; si no está registrado, usa la
// apikey del primer número activo configurado (la cuenta "maestra" del negocio).
async function enviarTexto(numeroDestino, mensaje) {
  let apikey = null;
  const registrado = await getAsync(
    `SELECT textmebot_apikey FROM whatsapp_numeros WHERE numero LIKE ? LIMIT 1`,
    [`%${phone(numeroDestino)}%`]
  );

  if (registrado && registrado.textmebot_apikey) {
    apikey = registrado.textmebot_apikey;
  } else {
    const dests = await destinatarios();
    if (!dests.length) {
      console.warn('⚠️  enviarTexto: no hay ninguna apikey configurada');
      return { status: 'error' };
    }
    apikey = dests[0].textmebot_apikey;
  }

  return _textmebotEnviar({ numero: numeroDestino, apikey, mensaje, nombre: 'Agente IA' });
}

module.exports = {
  notificarAuditoria,
  notificarTicket,
  notificarMantenimiento,
  textoATodos,
  imagenATodos,
  documentoATodos,
  enviarTexto,
};

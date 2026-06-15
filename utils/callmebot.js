/**
 * CALLMEBOT — NOTIFICACIONES AUTOMÁTICAS WhatsApp
 * MR. FUEL v2.0 — Metric Solutions & POS
 *
 * API de CallmeBot: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * FLUJO DE ACTIVACIÓN (una sola vez por número):
 *  1. El usuario guarda en WhatsApp el contacto: +34 644 64 74 27
 *  2. Le envía el mensaje: "I allow callmebot to send me messages"
 *  3. Recibe en respuesta su apikey personal
 *  4. Esa apikey se registra en la sección Admin → Configuración → WhatsApp
 *
 * ENDPOINTS UTILIZADOS:
 *  Texto:    https://api.callmebot.com/whatsapp.php?phone=…&text=…&apikey=…
 *  Imagen:   https://api.callmebot.com/whatsapp.php?phone=…&text=…&apikey=…&media=URL_IMAGEN
 *  Archivo:  igual que imagen, CallmeBot reenvía el archivo adjunto
 */

const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');
const { allAsync } = require('../config/database');

const BASE_URL = 'https://api.callmebot.com/whatsapp.php';
const APP_URL  = process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
               ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
               : 'https://fuelhn.up.railway.app';

// ── Helper: GET request con timeout ──────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 12000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end',  () => resolve({ status: res.statusCode, body }));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('CallmeBot timeout')); });
  });
}

// ── Limpiar número: +504 9450-2710 → 50494502710 ─────────────────────────────
function cleanPhone(num) {
  return num.replace(/[^0-9]/g, '');
}

// ── Enviar mensaje de texto simple ───────────────────────────────────────────
async function enviarTexto(phone, apikey, texto) {
  const url = `${BASE_URL}?phone=${cleanPhone(phone)}&apikey=${apikey}&text=${encodeURIComponent(texto)}`;
  const res = await httpGet(url);
  console.log(`📱 CallmeBot texto → ${phone} [${res.status}]`);
  return res;
}

// ── Enviar mensaje con imagen adjunta ────────────────────────────────────────
async function enviarConImagen(phone, apikey, texto, imageUrl) {
  const url = `${BASE_URL}?phone=${cleanPhone(phone)}&apikey=${apikey}`
            + `&text=${encodeURIComponent(texto)}&media=${encodeURIComponent(imageUrl)}`;
  const res = await httpGet(url);
  console.log(`📱 CallmeBot imagen → ${phone} [${res.status}]`);
  return res;
}

// ── Obtener todos los números activos con apikey configurada ─────────────────
async function getDestinatariosActivos() {
  return allAsync(
    `SELECT nombre, numero, cargo, callmebot_apikey
     FROM whatsapp_numeros
     WHERE activo = 1 AND callmebot_apikey IS NOT NULL AND callmebot_apikey != ''
     ORDER BY nombre`
  );
}

// ── Enviar a TODOS los destinatarios configurados ────────────────────────────
async function enviarATodos(texto, imageUrl = null) {
  const destinatarios = await getDestinatariosActivos();
  if (destinatarios.length === 0) {
    console.log('⚠️  CallmeBot: no hay números con apikey configurada');
    return [];
  }
  const resultados = [];
  for (const dest of destinatarios) {
    try {
      let res;
      if (imageUrl) {
        res = await enviarConImagen(dest.numero, dest.callmebot_apikey, texto, imageUrl);
      } else {
        res = await enviarTexto(dest.numero, dest.callmebot_apikey, texto);
      }
      resultados.push({ nombre: dest.nombre, ok: res.status === 200, status: res.status });
    } catch (err) {
      console.error(`❌ CallmeBot error → ${dest.nombre}: ${err.message}`);
      resultados.push({ nombre: dest.nombre, ok: false, error: err.message });
    }
  }
  return resultados;
}

// ════════════════════════════════════════════════════════════════════════════
//  NOTIFICACIÓN: AUDITORÍA COMPLETADA
// ════════════════════════════════════════════════════════════════════════════
async function notificarAuditoria(auditoria, estacion, auditor, evaluaciones, fotos) {
  try {
    const fecha    = auditoria.fecha_visita
                   ? auditoria.fecha_visita.split('T')[0].split('-').reverse().join('/')
                   : new Date().toLocaleDateString('es-HN');
    const hora     = auditoria.hora_visita || '';
    const cal      = auditoria.calificacion_general || auditoria.calificacion || 0;
    const emoji    = cal >= 80 ? '✅' : cal >= 60 ? '⚠️' : '❌';

    // Resumen de ítems
    const cumple   = evaluaciones.filter(e => e.cumple === 1 || e.cumple === true).length;
    const noCumple = evaluaciones.length - cumple;

    // Armar texto principal
    let msg = `🔍 *AUDITORÍA MR. FUEL*\n\n`
            + `📍 Estación: ${estacion.nombre}\n`
            + `📅 Fecha: ${fecha}  ⏰ ${hora}\n`
            + `👤 Auditor: ${auditor.nombre}\n`
            + `📊 Calificación: *${cal}%* ${emoji}\n`
            + `✅ Cumplen: ${cumple}   ❌ No cumplen: ${noCumple}\n`;

    // Ítems que NO cumplen (máx. 10 para no saturar)
    const noCumplenItems = evaluaciones
      .filter(e => !(e.cumple === 1 || e.cumple === true))
      .slice(0, 10);
    if (noCumplenItems.length > 0) {
      msg += `\n⚠️ *Ítems con incumplimiento:*\n`;
      noCumplenItems.forEach(e => {
        msg += `  • ${e.item_nombre || e.nombre || ''}`;
        if (e.observacion) msg += ` — ${e.observacion}`;
        msg += '\n';
      });
    }

    // Observaciones generales
    if (auditoria.observaciones_generales) {
      msg += `\n📝 Obs: ${auditoria.observaciones_generales}\n`;
    }
    if (auditoria.recomendaciones) {
      msg += `💡 Rec: ${auditoria.recomendaciones}\n`;
    }

    // Link al reporte
    msg += `\n🌐 Ver reporte completo:\n${APP_URL}/auditorias-v2/${auditoria.id}/pdf`;

    // Enviar texto base primero
    const r1 = await enviarATodos(msg);

    // Enviar fotos (máx. 5, solo las primeras)
    if (fotos && fotos.length > 0) {
      const fotosEnviar = fotos.slice(0, 5);
      for (let i = 0; i < fotosEnviar.length; i++) {
        const foto = fotosEnviar[i];
        const ruta = foto.ruta_archivo || foto.ruta || '';
        // Construir URL pública de la foto
        const imageUrl = ruta.startsWith('http') ? ruta : `${APP_URL}${ruta}`;
        const caption  = `📸 Foto ${i+1}/${fotosEnviar.length}: ${foto.item_nombre || foto.categoria_nombre || ''}`;
        await esperar(1500); // pausa entre fotos para no saturar la API
        await enviarATodos(caption, imageUrl);
      }
    }

    console.log(`✅ CallmeBot auditoría #${auditoria.id} notificada (${r1.length} destinos)`);
    return r1;

  } catch (err) {
    console.error('❌ CallmeBot notificarAuditoria:', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  NOTIFICACIÓN: TICKET CREADO / ASIGNADO
// ════════════════════════════════════════════════════════════════════════════
async function notificarTicket(ticket, estacion, asignado, creador, accion = 'creado') {
  try {
    const prioEmoji = { urgente:'🔴', alta:'🟠', media:'🔵', baja:'⚪' };
    const estadoEmoji = { pendiente:'🟡', en_proceso:'🔵', resuelto:'🟢' };
    const prio   = ticket.prioridad  || 'media';
    const estado = ticket.estado     || 'pendiente';

    let msg = `🎫 *TICKET MR. FUEL — ${accion.toUpperCase()}*\n\n`
            + `📌 #${ticket.id}: ${ticket.titulo}\n`
            + `📍 Estación: ${estacion?.nombre || ''}\n`
            + `🏷️ Tipo: ${ticket.tipo || ''}\n`
            + `${prioEmoji[prio] || '🔵'} Prioridad: ${prio.charAt(0).toUpperCase()+prio.slice(1)}\n`
            + `${estadoEmoji[estado] || '🟡'} Estado: ${estado.replace('_',' ')}\n`;

    if (asignado) msg += `👤 Asignado a: ${asignado.nombre}\n`;
    if (creador)  msg += `✍️ Reportado por: ${creador.nombre}\n`;
    if (ticket.descripcion) msg += `\n📝 ${ticket.descripcion}\n`;
    if (ticket.costo_estimado) msg += `💰 Costo estimado: L ${ticket.costo_estimado}\n`;

    msg += `\n🌐 Ver ticket:\n${APP_URL}/tickets/${ticket.id}`;

    // Si hay foto del ticket, enviarla también
    let imageUrl = null;
    if (ticket.foto_evidencia) {
      const ruta = ticket.foto_evidencia;
      imageUrl = ruta.startsWith('http') ? ruta : `${APP_URL}${ruta}`;
    }

    const resultados = await enviarATodos(msg, imageUrl);
    console.log(`✅ CallmeBot ticket #${ticket.id} notificado (${resultados.length} destinos)`);
    return resultados;

  } catch (err) {
    console.error('❌ CallmeBot notificarTicket:', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  NOTIFICACIÓN: MANTENIMIENTO GUARDADO
// ════════════════════════════════════════════════════════════════════════════
async function notificarMantenimiento(mant, estacion, tecnico, categoria, evaluaciones, fotos) {
  try {
    const fecha = mant.fecha_visita
                ? mant.fecha_visita.split('T')[0].split('-').reverse().join('/')
                : new Date().toLocaleDateString('es-HN');
    const cal   = mant.calificacion_general || 0;
    const emoji = cal >= 80 ? '✅' : cal >= 60 ? '⚠️' : '❌';

    const cumple   = evaluaciones.filter(e => e.cumple === 1 || e.cumple === true).length;
    const noCumple = evaluaciones.length - cumple;

    let msg = `🔧 *MANTENIMIENTO MR. FUEL*\n\n`
            + `📍 Estación: ${estacion?.nombre || ''}\n`
            + `🗂️ Categoría: ${categoria?.nombre || ''}\n`
            + `📅 Fecha: ${fecha}  ⏰ ${mant.hora_visita || ''}\n`
            + `👤 Técnico: ${tecnico?.nombre || ''}\n`
            + `📊 Calificación: *${cal}%* ${emoji}\n`
            + `✅ Cumplen: ${cumple}   ❌ No cumplen: ${noCumple}\n`;

    // Ítems que NO cumplen
    const noCumplenItems = evaluaciones
      .filter(e => !(e.cumple === 1 || e.cumple === true))
      .slice(0, 8);
    if (noCumplenItems.length > 0) {
      msg += `\n⚠️ *Ítems con incumplimiento:*\n`;
      noCumplenItems.forEach(e => {
        msg += `  • ${e.item_nombre || ''}`;
        if (e.observacion) msg += ` — ${e.observacion}`;
        msg += '\n';
      });
    }

    if (mant.observaciones_generales) msg += `\n📝 Obs: ${mant.observaciones_generales}\n`;
    if (mant.recomendaciones)         msg += `💡 Rec: ${mant.recomendaciones}\n`;

    msg += `\n🌐 Ver reporte:\n${APP_URL}/mantenimiento/${mant.id}/pdf`;

    const r1 = await enviarATodos(msg);

    // Fotos del mantenimiento (máx. 4)
    if (fotos && fotos.length > 0) {
      const fotosEnviar = fotos.slice(0, 4);
      for (let i = 0; i < fotosEnviar.length; i++) {
        const foto = fotosEnviar[i];
        const ruta = foto.ruta_archivo || foto.ruta || '';
        const imageUrl = ruta.startsWith('http') ? ruta : `${APP_URL}${ruta}`;
        const caption  = `📸 Foto mantenimiento ${i+1}/${fotosEnviar.length}`;
        await esperar(1500);
        await enviarATodos(caption, imageUrl);
      }
    }

    console.log(`✅ CallmeBot mantenimiento #${mant.id} notificado (${r1.length} destinos)`);
    return r1;

  } catch (err) {
    console.error('❌ CallmeBot notificarMantenimiento:', err.message);
  }
}

// ── Esperar N ms ──────────────────────────────────────────────────────────────
function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  enviarTexto,
  enviarConImagen,
  enviarATodos,
  notificarAuditoria,
  notificarTicket,
  notificarMantenimiento,
};

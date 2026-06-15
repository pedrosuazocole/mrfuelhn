/**
 * TEXTMEBOT — NOTIFICACIONES AUTOMÁTICAS WhatsApp
 * MR. FUEL v2.0 — Metric Solutions & POS
 *
 * Documentación oficial: https://textmebot.com
 *
 * ENDPOINTS GET (más simples y confiables):
 *  Texto:     GET ?recipient=PHONE&apikey=KEY&text=MSG
 *  Imagen:    GET ?recipient=PHONE&apikey=KEY&text=MSG&file=URL_IMAGEN
 *  Documento: GET ?recipient=PHONE&apikey=KEY&document=URL_PDF&filename=nombre.pdf&text=caption
 */

const https  = require('https');
const http   = require('http');
const path   = require('path');
const fs     = require('fs');
const { allAsync } = require('../config/database');

const BASE = 'https://api.textmebot.com/send.php';

const APP_URL = (() => {
  if (process.env.APP_URL)               return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'https://fuelhn.up.railway.app';
})();

// ── Leer imagen del disco, convertir a JPEG base64 ────────────────────────
async function imagenAJpegBase64(ruta) {
  try {
    const sharp = require('sharp');
    // Resolver ruta absoluta en el volumen
    const uploadsBase = process.env.UPLOADS_BASE_PATH
                     || (process.env.RAILWAY_VOLUME_MOUNT_PATH
                         ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
                         : path.join(__dirname, '..', 'public', 'uploads'));
    // ruta en BD: /uploads/auditorias/foto.jpg → quitar /uploads/
    const relativa = ruta.replace(/^\/uploads\//, '');
    const rutaAbs  = path.join(uploadsBase, relativa);

    if (!fs.existsSync(rutaAbs)) {
      console.warn(`⚠️  Foto no encontrada: ${rutaAbs}`);
      return null;
    }

    // Convertir a JPEG (resuelve WEBP, PNG, HEIC, etc.)
    const jpegBuf = await sharp(rutaAbs)
      .rotate()                  // corregir orientación EXIF
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return jpegBuf.toString('base64');
  } catch (e) {
    console.error('⚠️  Error convirtiendo imagen:', e.message);
    return null;
  }
}

// ── Enviar imagen como base64 JPEG ────────────────────────────────────────
async function enviarImagenBase64(numero, apikey, caption, base64jpeg) {
  return get(`${BASE}?recipient=${phone(numero)}&apikey=${apikey.trim()}&text=${encodeURIComponent(caption)}&file=${encodeURIComponent('data:image/jpeg;base64,' + base64jpeg)}`);
}
function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 25000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end',  () => {
        console.log(`   → HTTP ${res.statusCode}: ${body.slice(0, 120)}`);
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error',   e  => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Limpiar número ─────────────────────────────────────────────────────────
function phone(n) { return String(n).replace(/[^0-9]/g, ''); }

// ── URL pública de foto ────────────────────────────────────────────────────
function urlFoto(ruta) {
  if (!ruta) return null;
  if (ruta.startsWith('http')) return ruta;
  const r = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${APP_URL}${r}`;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Obtener destinatarios con API Key ──────────────────────────────────────
async function destinatarios() {
  const rows = await allAsync(
    `SELECT nombre, numero, textmebot_apikey
     FROM whatsapp_numeros
     WHERE activo = 1
       AND textmebot_apikey IS NOT NULL
       AND TRIM(textmebot_apikey) != ''
     ORDER BY nombre`
  );
  console.log(`📋 TextMeBot — ${rows.length} número(s): ${rows.map(r => r.nombre).join(', ')}`);
  return rows;
}

// ── Enviar texto ───────────────────────────────────────────────────────────
async function enviarTexto(numero, apikey, texto) {
  const url = `${BASE}?recipient=${phone(numero)}&apikey=${apikey.trim()}&text=${encodeURIComponent(texto)}`;
  return get(url);
}

// ── Enviar imagen (GET con &file=URL) ──────────────────────────────────────
async function enviarImagen(numero, apikey, caption, imgUrl) {
  const url = `${BASE}?recipient=${phone(numero)}&apikey=${apikey.trim()}&text=${encodeURIComponent(caption)}&file=${encodeURIComponent(imgUrl)}`;
  return get(url);
}

// ── Enviar documento PDF (GET con &document=URL) ───────────────────────────
async function enviarDocumento(numero, apikey, caption, docUrl, filename) {
  let url = `${BASE}?recipient=${phone(numero)}&apikey=${apikey.trim()}&document=${encodeURIComponent(docUrl)}`;
  if (caption)  url += `&text=${encodeURIComponent(caption)}`;
  if (filename) url += `&filename=${encodeURIComponent(filename)}`;
  return get(url);
}

// ── A todos: texto ─────────────────────────────────────────────────────────
async function textoATodos(msg) {
  const dests = await destinatarios();
  if (!dests.length) return [];
  const res = [];
  for (const d of dests) {
    try {
      console.log(`📤 Texto → ${d.nombre}`);
      const r = await enviarTexto(d.numero, d.textmebot_apikey, msg);
      res.push({ nombre: d.nombre, ok: r.status === 200 });
    } catch (e) {
      console.error(`❌ Texto ${d.nombre}: ${e.message}`);
      res.push({ nombre: d.nombre, ok: false });
    }
    await wait(2000);
  }
  return res;
}

// ── A todos: imagen (convierte a JPEG primero) ────────────────────────────
async function imagenATodos(caption, rutaOUrl) {
  const dests = await destinatarios();
  const res = [];

  // Convertir a JPEG base64 UNA SOLA VEZ para todos los destinatarios
  let base64 = null;
  if (rutaOUrl && !rutaOUrl.startsWith('http')) {
    // Es ruta local — convertir a JPEG
    base64 = await imagenAJpegBase64(rutaOUrl);
    if (!base64) {
      console.warn('⚠️  Imagen omitida — no se pudo convertir');
      return [];
    }
  }

  for (const d of dests) {
    try {
      console.log(`📤 Imagen → ${d.nombre}`);
      let r;
      if (base64) {
        // Enviar como base64 JPEG — sin problemas de formato
        r = await get(`${BASE}?recipient=${phone(d.numero)}&apikey=${d.textmebot_apikey.trim()}&text=${encodeURIComponent(caption)}&file=${encodeURIComponent('data:image/jpeg;base64,' + base64)}`);
      } else {
        // URL pública (fotos de tickets que ya tienen URL)
        r = await enviarImagen(d.numero, d.textmebot_apikey, caption, rutaOUrl);
      }
      res.push({ nombre: d.nombre, ok: r.status === 200 });
    } catch (e) {
      console.error(`❌ Imagen ${d.nombre}: ${e.message}`);
      res.push({ nombre: d.nombre, ok: false });
    }
    await wait(2000);
  }
  return res;
}

// ── A todos: documento PDF ─────────────────────────────────────────────────
async function documentoATodos(caption, docUrl, filename) {
  const dests = await destinatarios();
  const res = [];
  for (const d of dests) {
    try {
      console.log(`📤 PDF → ${d.nombre}: ${docUrl}`);
      const r = await enviarDocumento(d.numero, d.textmebot_apikey, caption, docUrl, filename);
      res.push({ nombre: d.nombre, ok: r.status === 200 });
    } catch (e) {
      console.error(`❌ PDF ${d.nombre}: ${e.message}`);
      res.push({ nombre: d.nombre, ok: false });
    }
    await wait(2000);
  }
  return res;
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
    await textoATodos(msg);
    await wait(3000);

    // 2) PDF — URL pública que devuelve PDF binario real
    const pdfUrl  = `${APP_URL}/auditorias-v2/${auditoria.id}/pdf-download`;
    const pdfName = `Auditoria-${auditoria.id}.pdf`;
    console.log(`📱 [Auditoría] Enviando PDF: ${pdfUrl}`);
    await documentoATodos(`📄 Reporte #${auditoria.id} — ${estacion.nombre} — ${fecha}`, pdfUrl, pdfName);
    await wait(3000);

    // 3) Fotos de evidencia (máx 5)
    if (fotos && fotos.length) {
      for (let i = 0; i < Math.min(fotos.length, 5); i++) {
        // Pasar la ruta local (/uploads/auditorias/foto.jpg) para convertir a JPEG
        const ruta = fotos[i].ruta_archivo || fotos[i].ruta;
        if (!ruta) continue;
        const cap = `📸 ${i+1}/${Math.min(fotos.length,5)}: ${fotos[i].item_nombre || fotos[i].categoria_nombre || ''}`;
        console.log(`📱 [Auditoría] Foto ${i+1}: ${ruta}`);
        await imagenATodos(cap, ruta);
        await wait(3000);
      }
    }
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
    await textoATodos(msg);

    if (ticket.foto_evidencia) {
      await wait(3000);
      const imgUrl = urlFoto(ticket.foto_evidencia);
      if (imgUrl) {
        console.log(`📱 [Ticket] Foto: ${imgUrl}`);
        await imagenATodos(`📸 Evidencia Ticket #${ticket.id}`, imgUrl);
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
    await textoATodos(msg);
    await wait(3000);

    const pdfUrl  = `${APP_URL}/mantenimiento/${mant.id}/pdf-download`;
    const pdfName = `Mantenimiento-${mant.id}.pdf`;
    console.log(`📱 [Mantenimiento] Enviando PDF: ${pdfUrl}`);
    await documentoATodos(`📄 Reporte #${mant.id} — ${categoria?.nombre||''} — ${fecha}`, pdfUrl, pdfName);
    await wait(3000);

    if (fotos && fotos.length) {
      for (let i = 0; i < Math.min(fotos.length, 4); i++) {
        const ruta = fotos[i].ruta_archivo || fotos[i].ruta;
        if (!ruta) continue;
        console.log(`📱 [Mantenimiento] Foto ${i+1}: ${ruta}`);
        await imagenATodos(`📸 ${i+1}/${Math.min(fotos.length,4)}: ${fotos[i].item_nombre||''}`, ruta);
        await wait(3000);
      }
    }
    console.log(`✅ Mantenimiento #${mant.id} notificado`);
  } catch (e) { console.error('❌ notificarMantenimiento:', e.message); }
}

module.exports = {
  notificarAuditoria,
  notificarTicket,
  notificarMantenimiento,
  textoATodos,
  imagenATodos,
  documentoATodos,
};

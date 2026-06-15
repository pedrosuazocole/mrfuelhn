/**
 * GENERADOR PDF BINARIO — MR. FUEL v2.0
 * Genera un PDF real (binario) para envío directo por TextMeBot.
 * Usa pdfkit — sin dependencias de Chrome ni headless browser.
 */

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');
const https       = require('https');
const http        = require('http');
const { getAsync, allAsync } = require('../config/database');

// ── Descargar imagen remota a Buffer ─────────────────────────────────────────
function descargarImagen(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 8000 }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null))
      .on('timeout', () => resolve(null));
  });
}

// ── Resolver ruta de archivo local ────────────────────────────────────────────
function resolverRutaLocal(ruta) {
  if (!ruta) return null;
  // Si la ruta es relativa tipo /uploads/auditorias/foto.jpg
  const base = process.env.UPLOADS_BASE_PATH
             || (process.env.RAILWAY_VOLUME_MOUNT_PATH
                 ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
                 : path.join(__dirname, '..', 'public', 'uploads'));
  // Quitar el prefijo /uploads/ del path
  const relativa = ruta.replace(/^\/uploads\//, '');
  const rutaAbsoluta = path.join(base, relativa);
  return fs.existsSync(rutaAbsoluta) ? rutaAbsoluta : null;
}

// ── Colores Mr. Fuel ──────────────────────────────────────────────────────────
const ROJO  = '#ED1C24';
const NEGRO = '#0D0D0D';
const GRIS  = '#666666';
const BLANCO= '#FFFFFF';

// ═════════════════════════════════════════════════════════════════════════════
// GENERAR PDF BINARIO DE AUDITORÍA
// ═════════════════════════════════════════════════════════════════════════════
async function generarPDFBinarioAuditoria(auditoriaId) {
  // Obtener datos
  const auditoria = await getAsync(`
    SELECT a.*, e.nombre AS estacion_nombre, e.direccion AS estacion_direccion,
           u.nombre AS auditor_nombre
    FROM auditorias_v2 a
    INNER JOIN estaciones e ON a.estacion_id = e.id
    INNER JOIN usuarios   u ON a.auditor_id  = u.id
    WHERE a.id = ?
  `, [auditoriaId]);

  if (!auditoria) throw new Error('Auditoría no encontrada');

  // Filtro por área
  let filtroArea = '';
  if (auditoria.area_evaluada === 'pista')  filtroArea = "AND c.nombre = 'PISTA'";
  if (auditoria.area_evaluada === 'tienda') filtroArea = "AND c.nombre = 'TIENDA'";

  const evaluaciones = await allAsync(`
    SELECT ev.*, i.nombre AS item_nombre, c.nombre AS categoria_nombre
    FROM evaluaciones_items ev
    INNER JOIN items_auditoria i ON ev.item_id      = i.id
    INNER JOIN categorias      c ON i.categoria_id  = c.id
    WHERE ev.auditoria_id = ? ${filtroArea}
    ORDER BY c.orden, i.orden
  `, [auditoriaId]);

  const fotos = await allAsync(`
    SELECT fi.evaluacion_id, fi.ruta_archivo
    FROM fotos_items fi
    INNER JOIN evaluaciones_items ev ON fi.evaluacion_id = ev.id
    WHERE ev.auditoria_id = ?
    ORDER BY fi.id
  `, [auditoriaId]);

  const fotosPorEval = {};
  fotos.forEach(f => {
    if (!fotosPorEval[f.evaluacion_id]) fotosPorEval[f.evaluacion_id] = [];
    fotosPorEval[f.evaluacion_id].push(f.ruta_archivo);
  });

  const fecha = auditoria.fecha_visita
              ? auditoria.fecha_visita.split('T')[0].split('-').reverse().join('/')
              : '';
  const cal   = auditoria.calificacion_general || auditoria.calificacion || 0;

  // ── Crear PDF ──────────────────────────────────────────────────────────────
  return new Promise(async (resolve, reject) => {
    const doc    = new PDFDocument({ margin: 40, size: 'LETTER' });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Encabezado ────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(ROJO);
    doc.fillColor(BLANCO).fontSize(22).font('Helvetica-Bold')
       .text('MR. FUEL v2.0 — REPORTE DE AUDITORÍA', 40, 20);
    doc.fontSize(11).font('Helvetica')
       .text('Metric Solutions & POS  ·  Honduras', 40, 50);
    doc.fillColor(NEGRO).moveDown(3);

    // ── Info general ──────────────────────────────────────────────────────
    const iy = 100;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(ROJO).text('INFORMACIÓN GENERAL', 40, iy);
    doc.moveTo(40, iy + 18).lineTo(570, iy + 18).strokeColor(ROJO).stroke();

    const info = [
      ['Estación:',    auditoria.estacion_nombre || ''],
      ['Dirección:',   auditoria.estacion_direccion || ''],
      ['Fecha:',       fecha],
      ['Hora:',        auditoria.hora_visita || ''],
      ['Auditor:',     auditoria.auditor_nombre || ''],
      ['Área:',        (auditoria.area_evaluada || '').toUpperCase()],
    ];
    let ry = iy + 26;
    info.forEach(([lbl, val]) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text(lbl, 40, ry, { width: 100 });
      doc.fontSize(10).font('Helvetica').fillColor(GRIS).text(val, 145, ry);
      ry += 18;
    });

    // ── Calificación ──────────────────────────────────────────────────────
    ry += 10;
    const calColor = cal >= 80 ? '#28a745' : cal >= 60 ? '#ffc107' : '#dc3545';
    doc.rect(40, ry, 530, 50).fill(calColor);
    doc.fillColor(BLANCO).fontSize(18).font('Helvetica-Bold')
       .text(`Calificación General: ${cal}%`, 40, ry + 14, { align: 'center', width: 530 });

    // Conteo cumple / no cumple
    const cumple  = evaluaciones.filter(e => e.cumple === 1 || e.cumple === true).length;
    const noC     = evaluaciones.length - cumple;
    ry += 62;
    doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
       .text(`✓ Ítems que cumplen: ${cumple}    ✗ Ítems que no cumplen: ${noC}`, 40, ry);

    // ── Evaluaciones por ítem ─────────────────────────────────────────────
    ry += 24;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(ROJO).text('EVALUACIÓN DETALLADA', 40, ry);
    doc.moveTo(40, ry + 18).lineTo(570, ry + 18).strokeColor(ROJO).stroke();
    ry += 28;

    let catActual = '';
    for (const ev of evaluaciones) {
      // Nueva página si no hay espacio
      if (ry > doc.page.height - 120) {
        doc.addPage();
        ry = 40;
      }

      // Header categoría
      if (ev.categoria_nombre !== catActual) {
        catActual = ev.categoria_nombre;
        doc.rect(40, ry, 530, 22).fill(NEGRO);
        doc.fillColor(BLANCO).fontSize(11).font('Helvetica-Bold')
           .text(catActual, 50, ry + 5);
        ry += 28;
      }

      // Fila ítem
      const color = (ev.cumple === 1 || ev.cumple === true) ? '#d1e7dd' : '#f8d7da';
      const texto = (ev.cumple === 1 || ev.cumple === true) ? '✓ CUMPLE' : '✗ NO CUMPLE';
      const tColor= (ev.cumple === 1 || ev.cumple === true) ? '#0f5132' : '#842029';

      doc.rect(40, ry, 530, 20).fill(color);
      doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
         .text(ev.item_nombre || '', 48, ry + 5, { width: 380 });
      doc.fillColor(tColor).fontSize(10).font('Helvetica-Bold')
         .text(texto, 430, ry + 5, { width: 130, align: 'right' });

      ry += 22;

      // Observación
      if (ev.observacion) {
        doc.fillColor(GRIS).fontSize(9).font('Helvetica-Oblique')
           .text(`   → ${ev.observacion}`, 48, ry, { width: 510 });
        ry += 14;
      }

      // Fotos del ítem (máx. 3, en fila horizontal)
      const fotasItem = fotosPorEval[ev.id] || [];
      if (fotasItem.length > 0) {
        const fotasEnviar = fotasItem.slice(0, 3);
        const fW = 150, fH = 100, gap = 10;
        if (ry + fH + 10 > doc.page.height - 60) { doc.addPage(); ry = 40; }
        let fx = 48;
        for (const ruta of fotasEnviar) {
          try {
            const rutaLocal = resolverRutaLocal(ruta);
            if (rutaLocal) {
              doc.image(rutaLocal, fx, ry, { width: fW, height: fH, fit: [fW, fH] });
            }
          } catch (e) { /* foto no disponible */ }
          fx += fW + gap;
        }
        ry += fH + 12;
      }
      ry += 4;
    }

    // ── Observaciones generales ───────────────────────────────────────────
    if (auditoria.observaciones_generales || auditoria.recomendaciones) {
      if (ry > doc.page.height - 120) { doc.addPage(); ry = 40; }
      ry += 10;
      doc.fontSize(13).font('Helvetica-Bold').fillColor(ROJO)
         .text('OBSERVACIONES Y RECOMENDACIONES', 40, ry);
      doc.moveTo(40, ry + 18).lineTo(570, ry + 18).strokeColor(ROJO).stroke();
      ry += 28;

      if (auditoria.observaciones_generales) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Observaciones:', 40, ry);
        ry += 14;
        doc.fontSize(10).font('Helvetica').fillColor(GRIS)
           .text(auditoria.observaciones_generales, 40, ry, { width: 530 });
        ry += doc.heightOfString(auditoria.observaciones_generales, { width: 530 }) + 10;
      }
      if (auditoria.recomendaciones) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Recomendaciones:', 40, ry);
        ry += 14;
        doc.fontSize(10).font('Helvetica').fillColor(GRIS)
           .text(auditoria.recomendaciones, 40, ry, { width: 530 });
      }
    }

    // ── Pie de página ─────────────────────────────────────────────────────
    const py = doc.page.height - 40;
    doc.rect(0, py - 8, doc.page.width, 48).fill(ROJO);
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica')
       .text('Mr. Fuel v2.0  ·  Metric Solutions & POS  ·  +504 9450 2710  ·  fuelhn.up.railway.app',
             40, py, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// GENERAR PDF BINARIO DE MANTENIMIENTO
// ═════════════════════════════════════════════════════════════════════════════
async function generarPDFBinarioMantenimiento(mantId) {
  const mant = await getAsync(`
    SELECT m.*, e.nombre AS estacion_nombre, u.nombre AS tecnico_nombre,
           mc.nombre AS categoria_nombre
    FROM mantenimientos m
    INNER JOIN estaciones e ON m.estacion_id = e.id
    INNER JOIN usuarios   u ON m.tecnico_id  = u.id
    INNER JOIN mantenimiento_categorias mc ON m.categoria_id = mc.id
    WHERE m.id = ?
  `, [mantId]);

  if (!mant) throw new Error('Mantenimiento no encontrado');

  const evaluaciones = await allAsync(`
    SELECT me.*, mi.nombre AS item_nombre
    FROM mantenimiento_evaluaciones me
    INNER JOIN mantenimiento_items mi ON me.item_id = mi.id
    WHERE me.mantenimiento_id = ? ORDER BY mi.orden
  `, [mantId]);

  const fotos = await allAsync(`
    SELECT mf.*, mi.nombre AS item_nombre
    FROM mantenimiento_fotos mf
    INNER JOIN mantenimiento_evaluaciones me ON mf.evaluacion_id = me.id
    INNER JOIN mantenimiento_items mi ON me.item_id = mi.id
    WHERE me.mantenimiento_id = ? ORDER BY mi.orden, mf.orden
  `, [mantId]);

  const fotosPorEval = {};
  fotos.forEach(f => {
    if (!fotosPorEval[f.evaluacion_id]) fotosPorEval[f.evaluacion_id] = [];
    fotosPorEval[f.evaluacion_id].push(f.ruta_archivo);
  });

  const fecha = mant.fecha_visita
              ? mant.fecha_visita.split('T')[0].split('-').reverse().join('/')
              : '';
  const cal   = mant.calificacion_general || 0;

  return new Promise(async (resolve, reject) => {
    const doc    = new PDFDocument({ margin: 40, size: 'LETTER' });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Encabezado
    doc.rect(0, 0, doc.page.width, 80).fill(ROJO);
    doc.fillColor(BLANCO).fontSize(22).font('Helvetica-Bold')
       .text('MR. FUEL v2.0 — REPORTE DE MANTENIMIENTO', 40, 20);
    doc.fontSize(11).font('Helvetica')
       .text('Metric Solutions & POS  ·  Honduras', 40, 50);
    doc.fillColor(NEGRO).moveDown(3);

    const iy = 100;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(ROJO).text('INFORMACIÓN GENERAL', 40, iy);
    doc.moveTo(40, iy + 18).lineTo(570, iy + 18).strokeColor(ROJO).stroke();

    const info = [
      ['Estación:',  mant.estacion_nombre],
      ['Categoría:', mant.categoria_nombre],
      ['Fecha:',     fecha],
      ['Hora:',      mant.hora_visita || ''],
      ['Técnico:',   mant.tecnico_nombre],
    ];
    let ry = iy + 26;
    info.forEach(([lbl, val]) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text(lbl, 40, ry, { width: 100 });
      doc.fontSize(10).font('Helvetica').fillColor(GRIS).text(val || '', 145, ry);
      ry += 18;
    });

    ry += 10;
    const calColor = cal >= 80 ? '#28a745' : cal >= 60 ? '#ffc107' : '#dc3545';
    doc.rect(40, ry, 530, 50).fill(calColor);
    doc.fillColor(BLANCO).fontSize(18).font('Helvetica-Bold')
       .text(`Calificación: ${cal}%`, 40, ry + 14, { align: 'center', width: 530 });

    const cumple = evaluaciones.filter(e => e.cumple === 1 || e.cumple === true).length;
    ry += 62;
    doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
       .text(`✓ Cumplen: ${cumple}    ✗ No cumplen: ${evaluaciones.length - cumple}`, 40, ry);

    ry += 24;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(ROJO).text('EVALUACIÓN DETALLADA', 40, ry);
    doc.moveTo(40, ry + 18).lineTo(570, ry + 18).strokeColor(ROJO).stroke();
    ry += 28;

    for (const ev of evaluaciones) {
      if (ry > doc.page.height - 120) { doc.addPage(); ry = 40; }

      const color  = (ev.cumple === 1 || ev.cumple === true) ? '#d1e7dd' : '#f8d7da';
      const texto  = (ev.cumple === 1 || ev.cumple === true) ? '✓ CUMPLE' : '✗ NO CUMPLE';
      const tColor = (ev.cumple === 1 || ev.cumple === true) ? '#0f5132' : '#842029';

      doc.rect(40, ry, 530, 20).fill(color);
      doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
         .text(ev.item_nombre || '', 48, ry + 5, { width: 380 });
      doc.fillColor(tColor).fontSize(10).font('Helvetica-Bold')
         .text(texto, 430, ry + 5, { width: 130, align: 'right' });
      ry += 22;

      if (ev.observacion) {
        doc.fillColor(GRIS).fontSize(9).font('Helvetica-Oblique')
           .text(`   → ${ev.observacion}`, 48, ry, { width: 510 });
        ry += 14;
      }

      const fotasItem = fotosPorEval[ev.id] || [];
      if (fotasItem.length > 0) {
        const fotasEnviar = fotasItem.slice(0, 3);
        const fW = 150, fH = 100, gap = 10;
        if (ry + fH + 10 > doc.page.height - 60) { doc.addPage(); ry = 40; }
        let fx = 48;
        for (const ruta of fotasEnviar) {
          try {
            const rutaLocal = resolverRutaLocal(ruta);
            if (rutaLocal) doc.image(rutaLocal, fx, ry, { width: fW, height: fH, fit: [fW, fH] });
          } catch (e) { /* foto no disponible */ }
          fx += fW + gap;
        }
        ry += fH + 12;
      }
      ry += 4;
    }

    if (mant.observaciones_generales || mant.recomendaciones) {
      if (ry > doc.page.height - 120) { doc.addPage(); ry = 40; }
      ry += 10;
      doc.fontSize(13).font('Helvetica-Bold').fillColor(ROJO).text('OBSERVACIONES', 40, ry);
      doc.moveTo(40, ry + 18).lineTo(570, ry + 18).strokeColor(ROJO).stroke();
      ry += 28;
      if (mant.observaciones_generales) {
        doc.fontSize(10).font('Helvetica').fillColor(GRIS)
           .text(mant.observaciones_generales, 40, ry, { width: 530 });
        ry += doc.heightOfString(mant.observaciones_generales, { width: 530 }) + 10;
      }
      if (mant.recomendaciones) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(NEGRO).text('Recomendaciones:', 40, ry);
        ry += 14;
        doc.fontSize(10).font('Helvetica').fillColor(GRIS)
           .text(mant.recomendaciones, 40, ry, { width: 530 });
      }
    }

    const py = doc.page.height - 40;
    doc.rect(0, py - 8, doc.page.width, 48).fill(ROJO);
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica')
       .text('Mr. Fuel v2.0  ·  Metric Solutions & POS  ·  +504 9450 2710',
             40, py, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  });
}

module.exports = { generarPDFBinarioAuditoria, generarPDFBinarioMantenimiento };

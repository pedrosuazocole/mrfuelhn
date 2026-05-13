/**
 * GENERADOR DE PDF PARA AUDITORÍAS
 * Usa PDFKit (ya instalado en package.json)
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { allAsync, getAsync } = require('../config/database');

/**
 * Generar PDF de auditoría
 */
async function generarPDFAuditoria(auditoriaId) {
  try {
    console.log(`📄 Generando PDF para auditoría ${auditoriaId}...`);
    
    // Obtener datos de la auditoría
    const auditoria = await getAsync(`
      SELECT 
        a.*,
        e.nombre as estacion_nombre,
        e.direccion as estacion_direccion,
        u.nombre as auditor_nombre
      FROM auditorias_v2 a
      INNER JOIN estaciones e ON a.estacion_id = e.id
      INNER JOIN usuarios u ON a.auditor_id = u.id
      WHERE a.id = ?
    `, [auditoriaId]);
    
    if (!auditoria) {
      throw new Error('Auditoría no encontrada');
    }
    
    // Obtener evaluaciones
    const evaluaciones = await allAsync(`
      SELECT 
        ev.*,
        i.nombre as item_nombre,
        c.nombre as categoria_nombre
      FROM evaluaciones_items ev
      INNER JOIN items_auditoria i ON ev.item_id = i.id
      INNER JOIN categorias c ON i.categoria_id = c.id
      WHERE ev.auditoria_id = ?
      ORDER BY c.orden, i.orden
    `, [auditoriaId]);
    
    console.log(`📋 Evaluaciones encontradas: ${evaluaciones.length}`);
    
    // Agrupar por categoría
    const porCategoria = {};
    if (evaluaciones && evaluaciones.length > 0) {
      evaluaciones.forEach(ev => {
        if (!porCategoria[ev.categoria_nombre]) {
          porCategoria[ev.categoria_nombre] = [];
        }
        porCategoria[ev.categoria_nombre].push(ev);
      });
    }
    
    // Crear directorio
    const pdfDir = path.join(__dirname, '../public/uploads/pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    const pdfPath = path.join(pdfDir, `auditoria-${auditoriaId}.pdf`);
    
    // Crear PDF
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    // Encabezado
    doc.fontSize(20).fillColor('#ED1C24').text('AUDITORIA TEXACO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#000000').text('Mr. Fuel - Sistema de Auditorias', { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#ED1C24');
    doc.moveDown(1);
    
    // Info general
    doc.fontSize(14).fillColor('#ED1C24').text('INFORMACION GENERAL');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#000000');
    
    const y = doc.y;
    doc.text('Estacion:', 50, y);
    doc.text(auditoria.estacion_nombre, 150, y);
    doc.text('Fecha:', 50, y + 15);
    doc.text(new Date(auditoria.fecha_visita).toLocaleDateString('es-HN'), 150, y + 15);
    doc.text('Hora:', 50, y + 30);
    doc.text(auditoria.hora_visita, 150, y + 30);
    doc.text('Auditor:', 50, y + 45);
    doc.text(auditoria.auditor_nombre, 150, y + 45);
    doc.text('Calificacion:', 50, y + 60);
    doc.fontSize(12).fillColor('#ED1C24').text(`${auditoria.calificacion_general}%`, 150, y + 58);
    
    doc.y = y + 80;
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#CCCCCC');
    doc.moveDown(1);
    
    // Evaluaciones
    doc.fontSize(10).fillColor('#000000');
    
    if (Object.keys(porCategoria).length > 0) {
      for (const cat in porCategoria) {
        if (doc.y > 680) doc.addPage();
        
        doc.fontSize(12).fillColor('#ED1C24').text(cat.toUpperCase());
        doc.moveDown(0.5);
        
        porCategoria[cat].forEach(item => {
          if (doc.y > 700) doc.addPage();
          
          doc.fontSize(10).fillColor('#000000');
          doc.text(`- ${item.item_nombre}`, 60, doc.y);
          
          const estado = item.cumple ? 'Cumple' : 'No Cumple';
          const color = item.cumple ? '#28a745' : '#dc3545';
          doc.fillColor(color).text(estado, 400, doc.y, { width: 150, align: 'right' });
          doc.fillColor('#000000');
          doc.moveDown(0.3);
          
          if (item.observacion && item.observacion.trim()) {
            doc.fontSize(9).fillColor('#666666');
            doc.text(`  ${item.observacion}`, 60, doc.y, { width: 500 });
            doc.fillColor('#000000');
            doc.moveDown(0.5);
          }
          
          doc.moveDown(0.3);
        });
        
        doc.moveDown(0.5);
      }
    }
    
    // Observaciones
    if (auditoria.observaciones_generales && auditoria.observaciones_generales.trim()) {
      if (doc.y > 650) doc.addPage();
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#CCCCCC');
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#ED1C24').text('OBSERVACIONES GENERALES');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000').text(auditoria.observaciones_generales, { width: 500 });
    }
    
    // Recomendaciones
    if (auditoria.recomendaciones && auditoria.recomendaciones.trim()) {
      if (doc.y > 650) doc.addPage();
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#ED1C24').text('RECOMENDACIONES');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000').text(auditoria.recomendaciones, { width: 500 });
    }
    
    // Footer en todas las páginas
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#666666');
      doc.text('2026-2027 Mr. Fuel v2.0 - Sistema de Auditorias Texaco', 50, doc.page.height - 40, { align: 'center', width: 512 });
      doc.text('Metric Solutions & POS - WhatsApp: +504 9450 2710', 50, doc.page.height - 30, { align: 'center', width: 512 });
    }
    
    doc.end();
    
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`✅ PDF generado: ${pdfPath}`);
    return pdfPath;
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    throw error;
  }
}

module.exports = { generarPDFAuditoria };

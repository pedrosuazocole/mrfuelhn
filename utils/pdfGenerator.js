/**
 * GENERADOR DE PDF PARA AUDITORÍAS
 * Usa html-pdf-node para mayor confiabilidad
 */

const html_to_pdf = require('html-pdf-node');
const path = require('path');
const fs = require('fs');
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
        u.nombre as auditor_nombre,
        u.email as auditor_email
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
    const evaluacionesPorCategoria = {};
    if (evaluaciones && evaluaciones.length > 0) {
      evaluaciones.forEach(ev => {
        if (!evaluacionesPorCategoria[ev.categoria_nombre]) {
          evaluacionesPorCategoria[ev.categoria_nombre] = [];
        }
        evaluacionesPorCategoria[ev.categoria_nombre].push(ev);
      });
    }
    
    // Crear HTML
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #ED1C24;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #ED1C24;
          margin: 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-section h2 {
          color: #ED1C24;
          font-size: 18px;
          border-bottom: 2px solid #ED1C24;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        .info-label {
          font-weight: bold;
        }
        .categoria {
          margin-bottom: 30px;
        }
        .categoria h3 {
          background: #ED1C24;
          color: white;
          padding: 10px;
          margin: 0 0 15px 0;
          font-size: 16px;
        }
        .item {
          padding: 10px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .item-nombre {
          flex: 1;
        }
        .item-estado {
          font-weight: bold;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
        }
        .cumple {
          background: #d1e7dd;
          color: #0f5132;
        }
        .no-cumple {
          background: #f8d7da;
          color: #842029;
        }
        .observacion {
          color: #666;
          font-size: 12px;
          margin-top: 5px;
          padding-left: 20px;
          font-style: italic;
        }
        .calificacion {
          text-align: center;
          font-size: 32px;
          color: #ED1C24;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⭐ AUDITORÍA TEXACO</h1>
        <p>Mr. Fuel - Sistema de Auditorías</p>
      </div>
      
      <div class="info-section">
        <h2>INFORMACIÓN GENERAL</h2>
        <div class="info-grid">
          <div class="info-label">Estación:</div>
          <div>${auditoria.estacion_nombre}</div>
          
          <div class="info-label">Dirección:</div>
          <div>${auditoria.estacion_direccion || 'N/A'}</div>
          
          <div class="info-label">Fecha:</div>
          <div>${new Date(auditoria.fecha_visita).toLocaleDateString('es-HN')}</div>
          
          <div class="info-label">Hora:</div>
          <div>${auditoria.hora_visita}</div>
          
          <div class="info-label">Auditor:</div>
          <div>${auditoria.auditor_nombre}</div>
        </div>
        
        <div class="calificacion">
          Calificación: ${auditoria.calificacion_general}%
        </div>
      </div>
    `;
    
    // Agregar evaluaciones por categoría
    if (Object.keys(evaluacionesPorCategoria).length > 0) {
      htmlContent += '<div class="info-section"><h2>EVALUACIÓN DETALLADA</h2>';
      
      for (const categoria in evaluacionesPorCategoria) {
        const items = evaluacionesPorCategoria[categoria];
        
        htmlContent += `<div class="categoria">`;
        htmlContent += `<h3>${categoria}</h3>`;
        
        items.forEach(item => {
          const estadoClass = item.cumple ? 'cumple' : 'no-cumple';
          const estadoTexto = item.cumple ? '✓ Cumple' : '✗ No Cumple';
          
          htmlContent += `
          <div class="item">
            <div class="item-nombre">• ${item.item_nombre}</div>
            <div class="item-estado ${estadoClass}">${estadoTexto}</div>
          </div>
          `;
          
          if (item.observacion && item.observacion.trim() !== '') {
            htmlContent += `<div class="observacion">${item.observacion}</div>`;
          }
        });
        
        htmlContent += `</div>`;
      }
      
      htmlContent += '</div>';
    }
    
    // Observaciones generales
    if (auditoria.observaciones_generales && auditoria.observaciones_generales.trim() !== '') {
      htmlContent += `
      <div class="info-section">
        <h2>OBSERVACIONES GENERALES</h2>
        <p>${auditoria.observaciones_generales}</p>
      </div>
      `;
    }
    
    // Recomendaciones
    if (auditoria.recomendaciones && auditoria.recomendaciones.trim() !== '') {
      htmlContent += `
      <div class="info-section">
        <h2>RECOMENDACIONES</h2>
        <p>${auditoria.recomendaciones}</p>
      </div>
      `;
    }
    
    // Footer
    htmlContent += `
      <div class="footer">
        <p>© 2026-2027 Mr. Fuel v2.0 - Sistema de Auditorías Texaco</p>
        <p>Metric Solutions & POS - WhatsApp: +504 9450 2710</p>
      </div>
    </body>
    </html>
    `;
    
    // Crear directorio para PDFs si no existe
    const pdfDir = path.join(__dirname, '../public/uploads/pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    // Configuración del PDF
    const options = { 
      format: 'Letter',
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }
    };
    
    const file = { content: htmlContent };
    
    // Generar PDF
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);
    
    // Guardar PDF
    const pdfPath = path.join(pdfDir, `auditoria-${auditoriaId}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log(`✅ PDF generado: ${pdfPath}`);
    
    return pdfPath;
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    throw error;
  }
}

module.exports = { generarPDFAuditoria };

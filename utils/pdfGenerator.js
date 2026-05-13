/**
 * GENERADOR DE PDF - SOLUCIÓN SIMPLE
 * Renderiza HTML directamente (sin librerías externas)
 */

const path = require('path');
const { allAsync, getAsync } = require('../config/database');

/**
 * Generar HTML formateado para imprimir como PDF
 */
async function generarPDFAuditoria(auditoriaId) {
  try {
    console.log(`📄 Generando reporte para auditoría ${auditoriaId}...`);
    
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
    
    // Retornar datos para que el controlador los pase a la vista
    return {
      auditoria,
      evaluaciones: porCategoria
    };
    
  } catch (error) {
    console.error('❌ Error al generar reporte:', error);
    throw error;
  }
}

module.exports = { generarPDFAuditoria };

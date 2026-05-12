/**
 * CONTROLADOR DE AUDITORÍAS V2.0 - MR. FUEL
 * Sistema de evaluación por categorías e ítems con fotos individuales
 */

const { getAsync, allAsync, runAsync, db } = require('../config/database');
const { enviarNotificacionAuditoriaV2 } = require('../utils/email');
const fs = require('fs').promises;
const path = require('path');

/**
 * Listar auditorías v2
 */
exports.listarAuditorias = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*,
        e.nombre as estacion_nombre,
        e.codigo as estacion_codigo,
        u.nombre as auditor_nombre
      FROM auditorias_v2 a
      JOIN estaciones e ON a.estacion_id = e.id
      JOIN usuarios u ON a.auditor_id = u.id
      ORDER BY a.fecha_creacion DESC
      LIMIT 50
    `;
    
    const auditorias = await allAsync(query);
    
    res.render('auditorias-v2/lista', {
      user: req.session,
      titulo: 'Auditorías',
      auditorias
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar auditorías');
  }
};

/**
 * Mostrar formulario de nueva auditoría
 */
exports.mostrarFormularioNueva = async (req, res) => {
  try {
    // Obtener estaciones activas
    const estaciones = await allAsync(
      'SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre ASC'
    );
    
    // Obtener categorías con sus ítems
    const categorias = await allAsync(
      'SELECT * FROM categorias WHERE activo = 1 ORDER BY orden ASC'
    );
    
    // Obtener ítems por cada categoría
    for (let categoria of categorias) {
      categoria.items = await allAsync(
        'SELECT * FROM items_auditoria WHERE categoria_id = ? AND activo = 1 ORDER BY orden ASC',
        [categoria.id]
      );
    }
    
    res.render('auditorias-v2/nueva', {
      user: req.session,
      titulo: 'Nueva Auditoría',
      estaciones,
      categorias
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar formulario');
  }
};

/**
 * Crear nueva auditoría v2
 */
exports.crearAuditoria = async (req, res) => {
  console.log('📝 Iniciando creación de auditoría v2...');
  
  try {
    const {
      estacion_id,
      fecha_visita,
      hora_visita,
      observaciones_generales,
      recomendaciones,
      supervisor_nombre,
      supervisor_firma,
      evaluaciones // JSON con las evaluaciones de cada ítem
    } = req.body;
    
    console.log('📊 Datos recibidos:', { estacion_id, fecha_visita, hora_visita });
    
    // Validaciones
    if (!estacion_id || !fecha_visita || !hora_visita) {
      return res.status(400).json({
        success: false,
        mensaje: 'Estación, fecha y hora son obligatorios'
      });
    }
    
    // Parsear evaluaciones
    const evaluacionesData = JSON.parse(evaluaciones || '{}');
    console.log('✅ Evaluaciones parseadas:', Object.keys(evaluacionesData).length, 'items');
    
    // Calcular estadísticas
    let totalItems = Object.keys(evaluacionesData).length;
    let itemsCumplidos = 0;
    
    for (const itemId in evaluacionesData) {
      if (evaluacionesData[itemId].cumple === true || evaluacionesData[itemId].cumple === 1) {
        itemsCumplidos++;
      }
    }
    
    const calificacionGeneral = totalItems > 0 
      ? Math.round((itemsCumplidos / totalItems) * 100) 
      : 0;
    
    console.log('📊 Calificación calculada:', calificacionGeneral, '%');
    
    // Insertar auditoría
    console.log('💾 Insertando auditoría en base de datos...');
    const resultado = await runAsync(`
      INSERT INTO auditorias_v2 (
        estacion_id, auditor_id, fecha_visita, hora_visita,
        calificacion_general, total_items, items_cumplidos,
        observaciones_generales, recomendaciones,
        supervisor_nombre, supervisor_firma,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completada')
    `, [
      estacion_id,
      req.session.userId,
      fecha_visita,
      hora_visita,
      calificacionGeneral,
      totalItems,
      itemsCumplidos,
      observaciones_generales || null,
      recomendaciones || null,
      supervisor_nombre || null,
      supervisor_firma || null
    ]);
    
    const auditoriaId = resultado.lastID;
    console.log('✅ Auditoría insertada con ID:', auditoriaId);
    
    // Procesar evaluaciones y fotos
    console.log('📸 Procesando evaluaciones y fotos...');
    let fotosGuardadas = 0;
    
    for (const itemId in evaluacionesData) {
      const evaluacion = evaluacionesData[itemId];
      
      // Insertar evaluación
      const resultadoEval = await runAsync(`
        INSERT INTO evaluaciones_items (auditoria_id, item_id, cumple, observacion)
        VALUES (?, ?, ?, ?)
      `, [
        auditoriaId,
        parseInt(itemId),
        evaluacion.cumple ? 1 : 0,
        evaluacion.observacion || null
      ]);
      
      const evaluacionId = resultadoEval.lastID;
      
      // Procesar fotos de este ítem
      if (req.files && req.files.length > 0) {
        const fotosItem = req.files.filter(file => 
          file.fieldname === `fotos_item_${itemId}`
        );
        
        for (let i = 0; i < fotosItem.length; i++) {
          const file = fotosItem[i];
          const rutaRelativa = `/uploads/auditorias/${file.filename}`;
          
          await runAsync(`
            INSERT INTO fotos_items (evaluacion_id, ruta_archivo, orden, descripcion)
            VALUES (?, ?, ?, ?)
          `, [
            evaluacionId,
            rutaRelativa,
            i + 1,
            `Foto ${i + 1} de ítem`
          ]);
          
          fotosGuardadas++;
        }
      }
    }
    
    console.log(`✅ ${fotosGuardadas} fotos guardadas`);
    
    // Obtener datos para notificación
    console.log('📧 Preparando notificación...');
    const auditoria = await getAsync('SELECT * FROM auditorias_v2 WHERE id = ?', [auditoriaId]);
    const estacion = await getAsync('SELECT * FROM estaciones WHERE id = ?', [estacion_id]);
    const auditor = await getAsync('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    
    // Obtener evaluaciones completas para el email
    const evaluacionesCompletas = await allAsync(`
      SELECT 
        e.*,
        i.nombre as item_nombre,
        c.nombre as categoria_nombre
      FROM evaluaciones_items e
      JOIN items_auditoria i ON e.item_id = i.id
      JOIN categorias c ON i.categoria_id = c.id
      WHERE e.auditoria_id = ?
      ORDER BY c.orden, i.orden
    `, [auditoriaId]);
    
    // Obtener todas las fotos
    const todasLasFotos = await allAsync(`
      SELECT 
        f.*,
        i.nombre as item_nombre,
        c.nombre as categoria_nombre
      FROM fotos_items f
      JOIN evaluaciones_items e ON f.evaluacion_id = e.id
      JOIN items_auditoria i ON e.item_id = i.id
      JOIN categorias c ON i.categoria_id = c.id
      WHERE e.auditoria_id = ?
      ORDER BY c.orden, i.orden, f.orden
    `, [auditoriaId]);
    
    // Enviar notificación por email (asíncrono)
    if (auditoria && estacion && auditor) {
      console.log('📤 Enviando email...');
      enviarNotificacionAuditoriaV2(auditoria, estacion, auditor, evaluacionesCompletas, todasLasFotos)
        .then(() => console.log('✅ Email enviado'))
        .catch(err => console.error('⚠️  Error al enviar notificación:', err.message));
    }
    
    console.log(`✅ Auditoría v2 creada: ID ${auditoriaId} - ${estacion ? estacion.nombre : 'N/A'} (${calificacionGeneral}%)`);
    
    res.json({
      success: true,
      mensaje: 'Auditoría registrada exitosamente',
      auditoriaId: auditoriaId,
      calificacion: calificacionGeneral
    });
    
  } catch (error) {
    console.error('❌ ERROR AL CREAR AUDITORÍA V2:');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      mensaje: 'Error al registrar la auditoría: ' + error.message
    });
  }
};

/**
 * Ver detalle de auditoría v2
 */
exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener auditoría con datos de estación y auditor
    const auditoria = await getAsync(`
      SELECT 
        a.*,
        e.nombre as estacion_nombre,
        e.codigo as estacion_codigo,
        e.direccion as estacion_direccion,
        e.ciudad as estacion_ciudad,
        u.nombre as auditor_nombre
      FROM auditorias_v2 a
      JOIN estaciones e ON a.estacion_id = e.id
      JOIN usuarios u ON a.auditor_id = u.id
      WHERE a.id = ?
    `, [id]);
    
    if (!auditoria) {
      return res.status(404).send('Auditoría no encontrada');
    }
    
    // Obtener categorías con evaluaciones
    const categorias = await allAsync(`
      SELECT DISTINCT c.*
      FROM categorias c
      JOIN items_auditoria i ON c.id = i.categoria_id
      JOIN evaluaciones_items e ON i.id = e.item_id
      WHERE e.auditoria_id = ?
      ORDER BY c.orden
    `, [id]);
    
    // Para cada categoría, obtener sus evaluaciones
    for (let categoria of categorias) {
      categoria.evaluaciones = await allAsync(`
        SELECT 
          e.*,
          i.nombre as item_nombre,
          i.descripcion as item_descripcion
        FROM evaluaciones_items e
        JOIN items_auditoria i ON e.item_id = i.id
        WHERE e.auditoria_id = ? AND i.categoria_id = ?
        ORDER BY i.orden
      `, [id, categoria.id]);
      
      // Para cada evaluación, obtener sus fotos
      for (let evaluacion of categoria.evaluaciones) {
        evaluacion.fotos = await allAsync(
          'SELECT * FROM fotos_items WHERE evaluacion_id = ? ORDER BY orden',
          [evaluacion.id]
        );
      }
    }
    
    res.render('auditorias-v2/detalle', {
      user: req.session,
      titulo: `Auditoría #${auditoria.id}`,
      auditoria,
      categorias
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar auditoría');
  }
};

/**
 * Eliminar auditoría v2
 */
exports.eliminarAuditoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener todas las fotos para eliminar archivos
    const fotos = await allAsync(`
      SELECT f.ruta_archivo
      FROM fotos_items f
      JOIN evaluaciones_items e ON f.evaluacion_id = e.id
      WHERE e.auditoria_id = ?
    `, [id]);
    
    // Eliminar archivos de fotos
    for (const foto of fotos) {
      try {
        const rutaCompleta = path.join(__dirname, '..', 'public', foto.ruta_archivo);
        await fs.unlink(rutaCompleta);
      } catch (err) {
        console.warn('No se pudo eliminar foto:', foto.ruta_archivo);
      }
    }
    
    // Eliminar auditoría (cascade eliminará evaluaciones y fotos)
    await runAsync('DELETE FROM auditorias_v2 WHERE id = ?', [id]);
    
    res.json({ success: true, mensaje: 'Auditoría eliminada' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

/**
 * Obtener estadísticas de auditorías v2
 */
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const stats = {
      total: 0,
      promedio_calificacion: 0,
      items_mas_incumplidos: [],
      auditorias_recientes: []
    };
    
    // Total de auditorías
    const total = await getAsync('SELECT COUNT(*) as total FROM auditorias_v2');
    stats.total = total.total;
    
    // Promedio de calificación
    const promedio = await getAsync('SELECT AVG(calificacion_general) as promedio FROM auditorias_v2');
    stats.promedio_calificacion = Math.round(promedio.promedio || 0);
    
    // Ítems más incumplidos
    stats.items_mas_incumplidos = await allAsync(`
      SELECT 
        i.nombre,
        c.nombre as categoria,
        COUNT(CASE WHEN e.cumple = 0 THEN 1 END) as total_incumplimientos,
        COUNT(*) as total_evaluaciones,
        ROUND((COUNT(CASE WHEN e.cumple = 0 THEN 1 END) * 100.0 / COUNT(*)), 1) as porcentaje_incumplimiento
      FROM evaluaciones_items e
      JOIN items_auditoria i ON e.item_id = i.id
      JOIN categorias c ON i.categoria_id = c.id
      GROUP BY i.id
      HAVING total_incumplimientos > 0
      ORDER BY total_incumplimientos DESC
      LIMIT 10
    `);
    
    // Auditorías recientes
    stats.auditorias_recientes = await allAsync(`
      SELECT 
        a.id,
        a.fecha_visita,
        a.calificacion_general,
        e.nombre as estacion_nombre,
        u.nombre as auditor_nombre
      FROM auditorias_v2 a
      JOIN estaciones e ON a.estacion_id = e.id
      JOIN usuarios u ON a.auditor_id = u.id
      ORDER BY a.fecha_creacion DESC
      LIMIT 5
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = exports;

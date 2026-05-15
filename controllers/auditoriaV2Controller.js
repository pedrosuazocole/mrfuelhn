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
    
    // Obtener todas las categorías con sus ítems
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
    
    // Crear grupos independientes: PISTA y TIENDA (con sus subcategorías)
    const grupos = [];
    
    // GRUPO 1: PISTA (solo PISTA)
    const pista = categorias.find(c => c.nombre === 'PISTA');
    if (pista) {
      grupos.push({
        id: 'pista',
        nombre: 'PISTA',
        categorias: [pista]
      });
    }
    
    // GRUPO 2: TIENDA (incluye TIENDA, BODEGA, COCINA)
    const tienda = categorias.find(c => c.nombre === 'TIENDA');
    const bodega = categorias.find(c => c.nombre === 'BODEGA');
    const cocina = categorias.find(c => c.nombre === 'COCINA');
    
    const categoriaTienda = [];
    if (tienda) categoriaTienda.push(tienda);
    if (bodega) categoriaTienda.push(bodega);
    if (cocina) categoriaTienda.push(cocina);
    
    if (categoriaTienda.length > 0) {
      grupos.push({
        id: 'tienda',
        nombre: 'TIENDA',
        categorias: categoriaTienda
      });
    }
    
    res.render('auditorias-v2/nueva', {
      user: req.session,
      titulo: 'Nueva Auditoría',
      estaciones,
      grupos
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
      area_evaluada, // NUEVO: área seleccionada (pista o tienda)
      observaciones_generales,
      recomendaciones,
      supervisor_nombre,
      supervisor_firma,
      evaluaciones // JSON con las evaluaciones de cada ítem
    } = req.body;
    
    console.log('📊 Datos recibidos:', { estacion_id, fecha_visita, hora_visita, area_evaluada });
    
    // Validaciones
    if (!estacion_id || !fecha_visita || !hora_visita || !area_evaluada) {
      return res.status(400).json({
        success: false,
        mensaje: 'Estación, fecha, hora y área son obligatorios'
      });
    }
    
    // Parsear evaluaciones
    const evaluacionesData = JSON.parse(evaluaciones || '{}');
    console.log('✅ Evaluaciones parseadas:', Object.keys(evaluacionesData).length, 'items');
    
    // OBTENER ÍTEMS DEL ÁREA SELECCIONADA ÚNICAMENTE
    let itemsDelArea = [];
    
    if (area_evaluada === 'pista') {
      // Solo ítems de PISTA
      const categoriaPista = await getAsync("SELECT id FROM categorias WHERE nombre = 'PISTA'");
      if (categoriaPista) {
        itemsDelArea = await allAsync(
          'SELECT id FROM items_auditoria WHERE categoria_id = ? AND activo = 1',
          [categoriaPista.id]
        );
      }
    } else if (area_evaluada === 'tienda') {
      // Ítems de TIENDA + BODEGA + COCINA
      const categoriasTienda = await allAsync(
        "SELECT id FROM categorias WHERE nombre IN ('TIENDA', 'BODEGA', 'COCINA')"
      );
      const categoriaIds = categoriasTienda.map(c => c.id);
      itemsDelArea = await allAsync(
        `SELECT id FROM items_auditoria WHERE categoria_id IN (${categoriaIds.join(',')}) AND activo = 1`
      );
    }
    
    console.log(`📋 Total ítems en área ${area_evaluada}:`, itemsDelArea.length);
    
    // Calcular estadísticas SOLO con ítems del área seleccionada
    const idsDelArea = itemsDelArea.map(item => item.id.toString());
    let totalItems = 0;
    let itemsCumplidos = 0;
    
    for (const itemId in evaluacionesData) {
      // SOLO contar si el ítem pertenece al área seleccionada
      if (idsDelArea.includes(itemId)) {
        totalItems++;
        if (evaluacionesData[itemId].cumple === true || evaluacionesData[itemId].cumple === 1) {
          itemsCumplidos++;
        }
      }
    }
    
    const calificacionGeneral = totalItems > 0 
      ? Math.round((itemsCumplidos / totalItems) * 100) 
      : 0;
    
    console.log(`📊 Calificación ${area_evaluada}:`, calificacionGeneral, '%', `(${itemsCumplidos}/${totalItems})`);
    
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

/**
 * Generar reporte PDF (HTML imprimible)
 */
exports.generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { generarPDFAuditoria } = require('../utils/pdfGenerator');
    
    // Obtener datos
    const { auditoria, evaluaciones } = await generarPDFAuditoria(id);
    
    // Renderizar HTML imprimible
    res.render('auditorias-v2/pdf', {
      auditoria,
      evaluaciones
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al generar PDF');
  }
};

/**
 * Obtener números de WhatsApp activos para envío
 */
exports.obtenerNumerosWhatsApp = async (req, res) => {
  try {
    const numeros = await allAsync(
      'SELECT id, nombre, numero, cargo FROM whatsapp_numeros WHERE activo = 1 ORDER BY nombre ASC'
    );
    
    res.json({
      success: true,
      numeros
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener números de WhatsApp'
    });
  }
};

module.exports = exports;

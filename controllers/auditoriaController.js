/**
 * CONTROLADOR DE AUDITORÍAS - MR. FUEL
 */

const { getAsync, allAsync, runAsync, db } = require('../config/database');
const { enviarNotificacionAuditoria } = require('../utils/email');
const fs = require('fs').promises;
const path = require('path');

/**
 * Listar todas las auditorías
 */
exports.listarAuditorias = async (req, res) => {
  try {
    const { estacion, fecha_desde, fecha_hasta, auditor } = req.query;
    
    let query = `
      SELECT 
        a.*,
        e.nombre as estacion_nombre,
        e.codigo as estacion_codigo,
        u.nombre as auditor_nombre
      FROM auditorias a
      INNER JOIN estaciones e ON a.estacion_id = e.id
      INNER JOIN usuarios u ON a.auditor_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (estacion) {
      query += ' AND a.estacion_id = ?';
      params.push(estacion);
    }
    
    if (fecha_desde) {
      query += ' AND a.fecha_visita >= ?';
      params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
      query += ' AND a.fecha_visita <= ?';
      params.push(fecha_hasta);
    }
    
    if (auditor) {
      query += ' AND a.auditor_id = ?';
      params.push(auditor);
    }
    
    query += ' ORDER BY a.fecha_visita DESC, a.hora_visita DESC';
    
    const auditorias = await allAsync(query, params);
    
    // Obtener estaciones y auditores para filtros
    const estaciones = await allAsync('SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre');
    const auditores = await allAsync('SELECT id, nombre FROM usuarios WHERE rol IN ("auditor", "supervisor", "admin") AND activo = 1 ORDER BY nombre');
    
    res.render('auditorias/lista', {
      user: req.session,
      titulo: 'Auditorías',
      auditorias,
      estaciones,
      auditores,
      filtros: { estacion, fecha_desde, fecha_hasta, auditor }
    });
    
  } catch (error) {
    console.error('Error al listar auditorías:', error);
    res.status(500).render('error', {
      user: req.session,
      titulo: 'Error',
      mensaje: 'Error al cargar las auditorías',
      codigo: 500
    });
  }
};

/**
 * Mostrar formulario de nueva auditoría
 */
exports.mostrarFormularioNueva = async (req, res) => {
  try {
    const estaciones = await allAsync('SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre');
    
    res.render('auditorias/nueva', {
      user: req.session,
      titulo: 'Nueva Auditoría',
      estaciones
    });
    
  } catch (error) {
    console.error('Error al cargar formulario:', error);
    res.status(500).send('Error al cargar el formulario');
  }
};

/**
 * Crear nueva auditoría
 */
exports.crearAuditoria = async (req, res) => {
  console.log('📝 Iniciando creación de auditoría...');
  
  try {
    const {
      estacion_id,
      fecha_visita,
      hora_visita,
      limpieza_bombas,
      limpieza_bombas_nota,
      aceites_organizados,
      aceites_organizados_nota,
      uniforme_completo,
      uniforme_tiene_gorra,
      uniforme_nota,
      saludo_protocolo,
      saludo_nota,
      trato_compra,
      trato_compra_nota,
      despedida_protocolo,
      despedida_nota,
      observaciones_generales,
      recomendaciones
    } = req.body;
    
    console.log('📊 Datos recibidos:', { estacion_id, fecha_visita, hora_visita });
    
    // Validaciones
    if (!estacion_id || !fecha_visita || !hora_visita) {
      console.log('❌ Validación fallida');
      return res.status(400).json({
        success: false,
        mensaje: 'Estación, fecha y hora son obligatorios'
      });
    }
    
    console.log('✅ Validaciones pasadas');
    
    // Calcular calificación general (promedio de todos los criterios)
    const criterios = [
      parseInt(limpieza_bombas) || 0,
      parseInt(aceites_organizados) || 0,
      parseInt(uniforme_completo) || 0,
      parseInt(saludo_protocolo) || 0,
      parseInt(trato_compra) || 0,
      parseInt(despedida_protocolo) || 0
    ];
    
    const calificacion_general = Math.round(
      criterios.reduce((a, b) => a + b, 0) / criterios.length
    );
    
    console.log('📊 Calificación calculada:', calificacion_general);
    
    // Insertar auditoría
    console.log('💾 Insertando en base de datos...');
    const resultado = await runAsync(`
      INSERT INTO auditorias (
        estacion_id, auditor_id, fecha_visita, hora_visita,
        limpieza_bombas, limpieza_bombas_nota,
        aceites_organizados, aceites_organizados_nota,
        uniforme_completo, uniforme_tiene_gorra, uniforme_nota,
        saludo_protocolo, saludo_nota,
        trato_compra, trato_compra_nota,
        despedida_protocolo, despedida_nota,
        calificacion_general, observaciones_generales, recomendaciones,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completada')
    `, [
      estacion_id, req.session.userId, fecha_visita, hora_visita,
      limpieza_bombas, limpieza_bombas_nota || null,
      aceites_organizados, aceites_organizados_nota || null,
      uniforme_completo, uniforme_tiene_gorra === 'on' ? 1 : 0, uniforme_nota || null,
      saludo_protocolo, saludo_nota || null,
      trato_compra, trato_compra_nota || null,
      despedida_protocolo, despedida_nota || null,
      calificacion_general, observaciones_generales || null, recomendaciones || null
    ]);
    
    const auditoriaId = resultado.lastID;
    console.log('✅ Auditoría insertada con ID:', auditoriaId);
    
    // Procesar fotos subidas
    if (req.files && req.files.length > 0) {
      console.log(`📸 Procesando ${req.files.length} fotos...`);
      for (const file of req.files) {
        const categoria = file.fieldname.replace('foto_', '');
        const rutaRelativa = `/uploads/auditorias/${file.filename}`;
        
        await runAsync(`
          INSERT INTO auditoria_fotos (auditoria_id, categoria, ruta_archivo, descripcion)
          VALUES (?, ?, ?, ?)
        `, [auditoriaId, categoria, rutaRelativa, `Foto de ${categoria}`]);
      }
      console.log('✅ Fotos guardadas');
    }
    
    // Obtener datos para notificación
    console.log('📧 Preparando notificación...');
    const auditoria = await getAsync('SELECT * FROM auditorias WHERE id = ?', [auditoriaId]);
    const estacion = await getAsync('SELECT * FROM estaciones WHERE id = ?', [estacion_id]);
    const auditor = await getAsync('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    
    // Enviar notificación por email (asíncrono, no bloquea respuesta)
    if (auditoria && estacion && auditor) {
      console.log('📤 Enviando email...');
      enviarNotificacionAuditoria(auditoria, estacion, auditor)
        .then(() => console.log('✅ Email enviado'))
        .catch(err => console.error('⚠️  Error al enviar notificación:', err.message));
    }
    
    console.log(`✅ Auditoría creada: ID ${auditoriaId} - ${estacion ? estacion.nombre : 'N/A'} (${calificacion_general}%)`);
    
    res.json({
      success: true,
      mensaje: 'Auditoría registrada exitosamente',
      auditoriaId: auditoriaId,
      calificacion: calificacion_general
    });
    
  } catch (error) {
    console.error('❌ ERROR AL CREAR AUDITORÍA:');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    console.error('Código:', error.code);
    res.status(500).json({
      success: false,
      mensaje: 'Error al registrar la auditoría: ' + error.message
    });
  }
};

/**
 * Ver detalle de auditoría
 */
exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auditoria = await getAsync(`
      SELECT 
        a.*,
        e.nombre as estacion_nombre,
        e.codigo as estacion_codigo,
        e.direccion as estacion_direccion,
        e.ciudad as estacion_ciudad,
        u.nombre as auditor_nombre,
        u.email as auditor_email
      FROM auditorias a
      INNER JOIN estaciones e ON a.estacion_id = e.id
      INNER JOIN usuarios u ON a.auditor_id = u.id
      WHERE a.id = ?
    `, [id]);
    
    if (!auditoria) {
      return res.status(404).render('error', {
        user: req.session,
        titulo: 'No Encontrado',
        mensaje: 'Auditoría no encontrada',
        codigo: 404
      });
    }
    
    // Obtener fotos asociadas
    const fotos = await allAsync(
      'SELECT * FROM auditoria_fotos WHERE auditoria_id = ? ORDER BY categoria',
      [id]
    );
    
    res.render('auditorias/detalle', {
      user: req.session,
      titulo: `Auditoría #${id}`,
      auditoria,
      fotos
    });
    
  } catch (error) {
    console.error('Error al ver auditoría:', error);
    res.status(500).send('Error al cargar la auditoría');
  }
};

/**
 * Eliminar auditoría
 */
exports.eliminarAuditoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permisos (solo admin)
    if (req.session.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        mensaje: 'No tenés permisos para eliminar auditorías'
      });
    }
    
    // Obtener fotos para eliminarlas del sistema de archivos
    const fotos = await allAsync('SELECT ruta_archivo FROM auditoria_fotos WHERE auditoria_id = ?', [id]);
    
    // Eliminar auditoría (las fotos se eliminan en cascada por FK)
    await runAsync('DELETE FROM auditorias WHERE id = ?', [id]);
    
    // Eliminar archivos físicos
    for (const foto of fotos) {
      try {
        const rutaCompleta = path.join(__dirname, '..', 'public', foto.ruta_archivo);
        await fs.unlink(rutaCompleta);
      } catch (err) {
        console.error('Error al eliminar archivo:', err.message);
      }
    }
    
    console.log(`🗑️  Auditoría eliminada: ID ${id}`);
    
    res.json({
      success: true,
      mensaje: 'Auditoría eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar auditoría:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar la auditoría'
    });
  }
};

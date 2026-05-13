/**
 * CONTROLADOR DE TICKETS - MR. FUEL V2.0
 * Gestión de reportes de fallas y mantenimiento
 */

const { getAsync, allAsync, runAsync } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subir fotos de evidencia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/tickets';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ticket-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes'));
  }
}).single('foto_evidencia');

/**
 * Listar todos los tickets
 */
exports.listarTickets = async (req, res) => {
  try {
    const { estado, prioridad, estacion_id } = req.query;
    
    let query = `
      SELECT 
        t.*,
        e.nombre as estacion_nombre,
        u1.nombre as reportado_nombre,
        u2.nombre as asignado_nombre
      FROM tickets t
      INNER JOIN estaciones e ON t.estacion_id = e.id
      INNER JOIN usuarios u1 ON t.reportado_por = u1.id
      LEFT JOIN usuarios u2 ON t.asignado_a = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (estado) {
      query += ' AND t.estado = ?';
      params.push(estado);
    }
    
    if (prioridad) {
      query += ' AND t.prioridad = ?';
      params.push(prioridad);
    }
    
    if (estacion_id) {
      query += ' AND t.estacion_id = ?';
      params.push(estacion_id);
    }
    
    query += ' ORDER BY t.fecha_reporte DESC';
    
    const tickets = await allAsync(query, params);
    
    // Obtener estadísticas
    const stats = {
      total: await getAsync('SELECT COUNT(*) as count FROM tickets'),
      pendientes: await getAsync("SELECT COUNT(*) as count FROM tickets WHERE estado = 'pendiente'"),
      enProceso: await getAsync("SELECT COUNT(*) as count FROM tickets WHERE estado = 'en_proceso'"),
      resueltos: await getAsync("SELECT COUNT(*) as count FROM tickets WHERE estado = 'resuelto'")
    };
    
    // Obtener estaciones para filtros
    const estaciones = await allAsync('SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre');
    
    res.render('tickets/lista', {
      user: req.session,
      titulo: 'Tickets de Mantenimiento',
      tickets,
      stats,
      estaciones,
      filtros: { estado, prioridad, estacion_id }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar tickets');
  }
};

/**
 * Mostrar formulario de nuevo ticket
 */
exports.mostrarFormularioNuevo = async (req, res) => {
  try {
    const estaciones = await allAsync('SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre');
    const usuarios = await allAsync("SELECT * FROM usuarios WHERE rol IN ('admin', 'supervisor') ORDER BY nombre");
    
    res.render('tickets/nuevo', {
      user: req.session,
      titulo: 'Nuevo Ticket',
      estaciones,
      usuarios
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar formulario');
  }
};

/**
 * Crear nuevo ticket
 */
exports.crearTicket = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, mensaje: err.message });
    }
    
    try {
      const {
        estacion_id,
        tipo,
        prioridad,
        titulo,
        descripcion,
        area,
        asignado_a,
        costo_estimado
      } = req.body;
      
      const foto_evidencia = req.file ? `/uploads/tickets/${req.file.filename}` : null;
      
      const resultado = await runAsync(`
        INSERT INTO tickets (
          estacion_id, reportado_por, tipo, prioridad, titulo,
          descripcion, area, asignado_a, costo_estimado, foto_evidencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        estacion_id,
        req.session.userId,
        tipo,
        prioridad,
        titulo,
        descripcion,
        area || null,
        asignado_a || null,
        costo_estimado || null,
        foto_evidencia
      ]);
      
      res.json({
        success: true,
        ticketId: resultado.lastID,
        mensaje: 'Ticket creado exitosamente'
      });
      
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, mensaje: 'Error al crear ticket' });
    }
  });
};

/**
 * Ver detalle de ticket
 */
exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await getAsync(`
      SELECT 
        t.*,
        e.nombre as estacion_nombre,
        e.direccion as estacion_direccion,
        u1.nombre as reportado_nombre,
        u2.nombre as asignado_nombre
      FROM tickets t
      INNER JOIN estaciones e ON t.estacion_id = e.id
      INNER JOIN usuarios u1 ON t.reportado_por = u1.id
      LEFT JOIN usuarios u2 ON t.asignado_a = u2.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).send('Ticket no encontrado');
    }
    
    // Obtener usuarios para reasignar
    const usuarios = await allAsync("SELECT * FROM usuarios WHERE rol IN ('admin', 'supervisor') ORDER BY nombre");
    
    res.render('tickets/detalle', {
      user: req.session,
      titulo: `Ticket #${id}`,
      ticket,
      usuarios
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar ticket');
  }
};

/**
 * Actualizar estado de ticket
 */
exports.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, solucion, costo_real } = req.body;
    
    let query = 'UPDATE tickets SET estado = ?';
    const params = [estado];
    
    if (estado === 'resuelto') {
      query += ', fecha_resuelto = CURRENT_TIMESTAMP';
      
      if (solucion) {
        query += ', solucion = ?';
        params.push(solucion);
      }
      
      if (costo_real) {
        query += ', costo_real = ?';
        params.push(parseFloat(costo_real));
      }
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await runAsync(query, params);
    
    res.json({ success: true, mensaje: 'Estado actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al actualizar estado' });
  }
};

/**
 * Reasignar ticket
 */
exports.reasignarTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { asignado_a } = req.body;
    
    await runAsync('UPDATE tickets SET asignado_a = ? WHERE id = ?', [asignado_a, id]);
    
    res.json({ success: true, mensaje: 'Ticket reasignado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al reasignar' });
  }
};

/**
 * Eliminar ticket (solo admin)
 */
exports.eliminarTicket = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener foto para eliminarla
    const ticket = await getAsync('SELECT foto_evidencia FROM tickets WHERE id = ?', [id]);
    
    if (ticket && ticket.foto_evidencia) {
      const fotoPath = path.join(__dirname, '../public', ticket.foto_evidencia);
      if (fs.existsSync(fotoPath)) {
        fs.unlinkSync(fotoPath);
      }
    }
    
    await runAsync('DELETE FROM tickets WHERE id = ?', [id]);
    
    res.json({ success: true, mensaje: 'Ticket eliminado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

module.exports = exports;

/**
 * CONTROLADOR DE MANTENIMIENTO - MR. FUEL V2.0
 */

const { getAsync, allAsync, runAsync } = require('../config/database');
const { notificarMantenimiento } = require('../utils/textmebot');
const path = require('path');
const fs = require('fs');

// ─── LISTAR MANTENIMIENTOS ───────────────────────────────────────────────────
exports.listarMantenimientos = async (req, res) => {
  try {
    const { categoria_id, estacion_id } = req.query;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    let query = `
      SELECT m.*,
             e.nombre  AS estacion_nombre,
             u.nombre  AS tecnico_nombre,
             mc.nombre AS categoria_nombre
      FROM mantenimientos m
      INNER JOIN estaciones          e  ON m.estacion_id  = e.id
      INNER JOIN usuarios            u  ON m.tecnico_id   = u.id
      INNER JOIN mantenimiento_categorias mc ON m.categoria_id = mc.id
      WHERE 1=1
    `;
    const params = [];

    // Técnicos solo ven los suyos
    if (userRole === 'tecnico') {
      query += ' AND m.tecnico_id = ?';
      params.push(userId);
    }
    if (categoria_id) { query += ' AND m.categoria_id = ?'; params.push(categoria_id); }
    if (estacion_id)  { query += ' AND m.estacion_id = ?';  params.push(estacion_id); }

    query += ' ORDER BY m.fecha_creacion DESC';

    const mantenimientos = await allAsync(query, params);
    const categorias     = await allAsync('SELECT * FROM mantenimiento_categorias WHERE activo = 1 ORDER BY orden');
    const estaciones     = await allAsync('SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre');

    res.render('mantenimiento/lista', {
      user: req.session,
      titulo: 'Mantenimientos',
      mantenimientos,
      categorias,
      estaciones,
      filtros: { categoria_id, estacion_id }
    });
  } catch (error) {
    console.error('Error listarMantenimientos:', error);
    res.status(500).send('Error al cargar mantenimientos');
  }
};

// ─── FORMULARIO NUEVO ────────────────────────────────────────────────────────
exports.mostrarFormularioNuevo = async (req, res) => {
  try {
    const estaciones = await allAsync('SELECT * FROM estaciones WHERE activo = 1 ORDER BY nombre');
    const categorias = await allAsync('SELECT * FROM mantenimiento_categorias WHERE activo = 1 ORDER BY orden');

    for (const cat of categorias) {
      cat.items = await allAsync(
        'SELECT * FROM mantenimiento_items WHERE categoria_id = ? AND activo = 1 ORDER BY orden',
        [cat.id]
      );
    }

    res.render('mantenimiento/nuevo', {
      user: req.session,
      titulo: 'Nuevo Mantenimiento',
      estaciones,
      categorias
    });
  } catch (error) {
    console.error('Error mostrarFormularioNuevo:', error);
    res.status(500).send('Error al cargar formulario');
  }
};

// ─── CREAR MANTENIMIENTO ─────────────────────────────────────────────────────
exports.crearMantenimiento = async (req, res) => {
  try {
    const { estacion_id, categoria_id, fecha_visita, hora_visita,
            evaluaciones: evalJSON, observaciones_generales, recomendaciones } = req.body;

    if (!estacion_id || !categoria_id || !fecha_visita || !hora_visita) {
      return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios' });
    }

    const evaluaciones = JSON.parse(evalJSON || '[]');
    const tecnico_id   = req.session.userId;

    // Calcular calificación
    const totalItems   = evaluaciones.length;
    const itemsCumple  = evaluaciones.filter(e => e.cumple).length;
    const calificacion = totalItems > 0 ? Math.round((itemsCumple / totalItems) * 100) : 0;

    // Insertar mantenimiento
    const resultado = await runAsync(`
      INSERT INTO mantenimientos
        (estacion_id, tecnico_id, categoria_id, fecha_visita, hora_visita,
         calificacion_general, observaciones_generales, recomendaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [estacion_id, tecnico_id, categoria_id, fecha_visita, hora_visita,
        calificacion, observaciones_generales || null, recomendaciones || null]);

    const mantenimientoId = resultado.lastID;

    // Insertar evaluaciones y fotos
    const archivos = req.files || [];
    let fotosGuardadas = 0;

    for (const ev of evaluaciones) {
      const evResult = await runAsync(
        'INSERT INTO mantenimiento_evaluaciones (mantenimiento_id, item_id, cumple, observacion) VALUES (?, ?, ?, ?)',
        [mantenimientoId, ev.item_id, ev.cumple ? 1 : 0, ev.observacion || null]
      );
      const evaluacionId = evResult.lastID;

      // Fotos del ítem
      const fotosItem = archivos.filter(f => f.fieldname === `fotos_item_${ev.item_id}`);
      for (let i = 0; i < fotosItem.length; i++) {
        const ruta = `/uploads/mantenimiento/${fotosItem[i].filename}`;
        await runAsync(
          'INSERT INTO mantenimiento_fotos (evaluacion_id, ruta_archivo, orden) VALUES (?, ?, ?)',
          [evaluacionId, ruta, i + 1]
        );
        fotosGuardadas++;
      }
    }

    console.log(`✅ Mantenimiento creado ID: ${mantenimientoId} | Cal: ${calificacion}% | Fotos: ${fotosGuardadas}`);

    // Notificación WhatsApp a los números configurados
    let whatsappUrls = [];
    try {
      const numeros = await allAsync(
        'SELECT nombre, numero FROM whatsapp_numeros WHERE activo = 1 ORDER BY nombre'
      );
      const estacion = await getAsync('SELECT nombre FROM estaciones WHERE id = ?', [estacion_id]);
      const categoria = await getAsync('SELECT nombre FROM mantenimiento_categorias WHERE id = ?', [categoria_id]);
      const tecnico = await getAsync('SELECT nombre FROM usuarios WHERE id = ?', [tecnico_id]);

      if (numeros.length > 0 && estacion && categoria) {
        const mensaje = encodeURIComponent(
          `🔧 MANTENIMIENTO MR. FUEL\n\n` +
          `📍 Estación: ${estacion.nombre}\n` +
          `🗂️ Categoría: ${categoria.nombre}\n` +
          `📅 Fecha: ${fecha_visita}\n` +
          `⏰ Hora: ${hora_visita}\n` +
          `📊 Calificación: ${calificacion}%\n` +
          `👤 Técnico: ${tecnico ? tecnico.nombre : 'N/A'}\n\n` +
          `Ver detalle en la plataforma.`
        );
        whatsappUrls = numeros.map(n => {
          const num = n.numero.replace(/[^0-9]/g, '');
          return { nombre: n.nombre, url: `https://wa.me/${num}?text=${mensaje}` };
        });
        console.log(`📱 WhatsApp preparado para ${numeros.length} número(s)`);
      }
    } catch (waErr) {
      console.error('Error preparando WhatsApp:', waErr.message);
    }

    res.json({ success: true, mantenimientoId, mensaje: 'Mantenimiento creado exitosamente', whatsappUrls });

    // ── CallmeBot: notificación automática (después de responder al cliente) ──
    try {
      const mantCompleto  = await getAsync('SELECT * FROM mantenimientos WHERE id = ?', [mantenimientoId]);
      const estacionObj   = await getAsync('SELECT * FROM estaciones WHERE id = ?', [estacion_id]);
      const tecnicoObj    = await getAsync('SELECT * FROM usuarios WHERE id = ?', [tecnico_id]);
      const categoriaObj  = await getAsync('SELECT * FROM mantenimiento_categorias WHERE id = ?', [categoria_id]);
      const evalCompletas = await allAsync(`
        SELECT me.*, mi.nombre AS item_nombre
        FROM mantenimiento_evaluaciones me
        INNER JOIN mantenimiento_items mi ON me.item_id = mi.id
        WHERE me.mantenimiento_id = ? ORDER BY mi.orden
      `, [mantenimientoId]);
      const fotosCompletas = await allAsync(`
        SELECT mf.*, mi.nombre AS item_nombre
        FROM mantenimiento_fotos mf
        INNER JOIN mantenimiento_evaluaciones me ON mf.evaluacion_id = me.id
        INNER JOIN mantenimiento_items mi ON me.item_id = mi.id
        WHERE me.mantenimiento_id = ? ORDER BY mi.orden, mf.orden
      `, [mantenimientoId]);

      notificarMantenimiento(mantCompleto, estacionObj, tecnicoObj, categoriaObj, evalCompletas, fotosCompletas)
        .catch(err => console.error('⚠️  TextMeBot mantenimiento:', err.message));
    } catch (cbErr) {
      console.error('⚠️  TextMeBot prep mantenimiento:', cbErr.message);
    }

  } catch (error) {
    console.error('Error crearMantenimiento:', error);
    res.status(500).json({ success: false, mensaje: 'Error al crear mantenimiento' });
  }
};

// ─── VER DETALLE ─────────────────────────────────────────────────────────────
exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const mant = await getAsync(`
      SELECT m.*,
             e.nombre  AS estacion_nombre,
             e.direccion AS estacion_direccion,
             u.nombre  AS tecnico_nombre,
             mc.nombre AS categoria_nombre
      FROM mantenimientos m
      INNER JOIN estaciones e ON m.estacion_id = e.id
      INNER JOIN usuarios u   ON m.tecnico_id  = u.id
      INNER JOIN mantenimiento_categorias mc ON m.categoria_id = mc.id
      WHERE m.id = ?
    `, [id]);

    if (!mant) return res.status(404).send('Mantenimiento no encontrado');

    // Evaluaciones con fotos
    const evaluaciones = await allAsync(`
      SELECT me.*, mi.nombre AS item_nombre
      FROM mantenimiento_evaluaciones me
      INNER JOIN mantenimiento_items mi ON me.item_id = mi.id
      WHERE me.mantenimiento_id = ?
      ORDER BY mi.orden
    `, [id]);

    for (const ev of evaluaciones) {
      ev.fotos = await allAsync(
        'SELECT * FROM mantenimiento_fotos WHERE evaluacion_id = ? ORDER BY orden',
        [ev.id]
      );
    }

    res.render('mantenimiento/detalle', {
      user: req.session,
      titulo: `Mantenimiento #${id}`,
      mant,
      evaluaciones
    });
  } catch (error) {
    console.error('Error verDetalle:', error);
    res.status(500).send('Error al cargar mantenimiento');
  }
};

// ─── GENERAR PDF (HTML imprimible) ───────────────────────────────────────────
exports.generarPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const mant = await getAsync(`
      SELECT m.*,
             e.nombre  AS estacion_nombre,
             u.nombre  AS tecnico_nombre,
             mc.nombre AS categoria_nombre
      FROM mantenimientos m
      INNER JOIN estaciones e ON m.estacion_id = e.id
      INNER JOIN usuarios u   ON m.tecnico_id  = u.id
      INNER JOIN mantenimiento_categorias mc ON m.categoria_id = mc.id
      WHERE m.id = ?
    `, [id]);

    if (!mant) return res.status(404).send('Mantenimiento no encontrado');

    const evaluaciones = await allAsync(`
      SELECT me.*, mi.nombre AS item_nombre
      FROM mantenimiento_evaluaciones me
      INNER JOIN mantenimiento_items mi ON me.item_id = mi.id
      WHERE me.mantenimiento_id = ?
      ORDER BY mi.orden
    `, [id]);

    for (const ev of evaluaciones) {
      ev.fotos = await allAsync(
        'SELECT * FROM mantenimiento_fotos WHERE evaluacion_id = ? ORDER BY orden',
        [ev.id]
      );
    }

    res.render('mantenimiento/pdf', { mant, evaluaciones });
  } catch (error) {
    console.error('Error generarPDF mantenimiento:', error);
    res.status(500).send('Error al generar PDF');
  }
};

// ─── DESCARGA PDF BINARIO REAL (para TextMeBot) ──────────────────────────────
exports.descargarPDFBinario = async (req, res) => {
  try {
    const { id } = req.params;
    const { generarPDFBinarioMantenimiento } = require('../utils/pdfBinario');
    const buffer = await generarPDFBinarioMantenimiento(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="mantenimiento-${id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (error) {
    console.error('Error PDF binario mantenimiento:', error);
    res.status(500).send('Error al generar PDF');
  }
};

// ─── ELIMINAR ────────────────────────────────────────────────────────────────
exports.eliminarMantenimiento = async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM mantenimientos WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Mantenimiento eliminado' });
  } catch (error) {
    console.error('Error eliminarMantenimiento:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

// ─── ADMIN: LISTAR CATEGORÍAS ────────────────────────────────────────────────
exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await allAsync(`
      SELECT mc.*, COUNT(mi.id) AS total_items
      FROM mantenimiento_categorias mc
      LEFT JOIN mantenimiento_items mi ON mc.id = mi.categoria_id
      GROUP BY mc.id
      ORDER BY mc.orden
    `);
    res.render('mantenimiento/categorias', {
      user: req.session,
      titulo: 'Categorías de Mantenimiento',
      categorias
    });
  } catch (error) {
    console.error('Error listarCategorias:', error);
    res.status(500).send('Error al cargar categorías');
  }
};

// ─── ADMIN: CREAR CATEGORÍA ──────────────────────────────────────────────────
exports.crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const maxOrden = await getAsync('SELECT COALESCE(MAX(orden), 0) AS max FROM mantenimiento_categorias');
    await runAsync(
      'INSERT INTO mantenimiento_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
      [nombre, descripcion || null, maxOrden.max + 1]
    );
    res.redirect('/mantenimiento/admin/categorias');
  } catch (error) {
    console.error('Error crearCategoria:', error);
    res.status(500).send('Error al crear categoría');
  }
};

// ─── ADMIN: LISTAR ITEMS DE CATEGORÍA ───────────────────────────────────────
exports.listarItems = async (req, res) => {
  try {
    const { categoria_id } = req.params;
    const categoria = await getAsync('SELECT * FROM mantenimiento_categorias WHERE id = ?', [categoria_id]);
    if (!categoria) return res.status(404).send('Categoría no encontrada');

    const items = await allAsync(
      'SELECT * FROM mantenimiento_items WHERE categoria_id = ? ORDER BY orden',
      [categoria_id]
    );
    res.render('mantenimiento/items', {
      user: req.session,
      titulo: `Ítems: ${categoria.nombre}`,
      categoria,
      items
    });
  } catch (error) {
    console.error('Error listarItems:', error);
    res.status(500).send('Error al cargar ítems');
  }
};

// ─── ADMIN: CREAR ÍTEM ───────────────────────────────────────────────────────
exports.crearItem = async (req, res) => {
  try {
    const { categoria_id } = req.params;
    const { nombre, descripcion } = req.body;
    const maxOrden = await getAsync(
      'SELECT COALESCE(MAX(orden), 0) AS max FROM mantenimiento_items WHERE categoria_id = ?',
      [categoria_id]
    );
    await runAsync(
      'INSERT INTO mantenimiento_items (categoria_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
      [categoria_id, nombre, descripcion || null, maxOrden.max + 1]
    );
    res.redirect(`/mantenimiento/admin/categorias/${categoria_id}/items`);
  } catch (error) {
    console.error('Error crearItem:', error);
    res.status(500).send('Error al crear ítem');
  }
};

// ─── ADMIN: TOGGLE ACTIVO ÍTEM ───────────────────────────────────────────────
exports.toggleItem = async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(
      'UPDATE mantenimiento_items SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

/**
 * CONTROLADOR DE ADMINISTRACIÓN - MR. FUEL V2.0
 * Gestión de categorías e ítems del checklist
 */

const { getAsync, allAsync, runAsync } = require('../config/database');

/**
 * Listar todas las categorías con sus ítems
 */
exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await allAsync(`
      SELECT c.*, 
             COUNT(i.id) as total_items,
             COUNT(CASE WHEN i.activo = 1 THEN 1 END) as items_activos
      FROM categorias c
      LEFT JOIN items_auditoria i ON c.id = i.categoria_id
      GROUP BY c.id
      ORDER BY c.orden ASC
    `);

    res.render('admin/categorias', {
      user: req.session,
      titulo: 'Gestión de Checklist',
      categorias
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar categorías');
  }
};

/**
 * Ver ítems de una categoría
 */
exports.verItems = async (req, res) => {
  try {
    const { id } = req.params;
    
    const categoria = await getAsync('SELECT * FROM categorias WHERE id = ?', [id]);
    if (!categoria) {
      return res.status(404).send('Categoría no encontrada');
    }

    const items = await allAsync(`
      SELECT * FROM items_auditoria 
      WHERE categoria_id = ? 
      ORDER BY orden ASC
    `, [id]);

    res.render('admin/items', {
      user: req.session,
      titulo: `Ítems de ${categoria.nombre}`,
      categoria,
      items
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar ítems');
  }
};

/**
 * Agregar nueva categoría
 */
exports.agregarCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, orden } = req.body;
    
    await runAsync(
      'INSERT INTO categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
      [nombre, descripcion || null, parseInt(orden) || 0]
    );
    
    res.redirect('/admin/categorias');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al crear categoría');
  }
};

/**
 * Agregar nuevo ítem
 */
exports.agregarItem = async (req, res) => {
  try {
    const { categoria_id, nombre, descripcion, tipo_evaluacion, max_fotos, orden } = req.body;
    
    await runAsync(`
      INSERT INTO items_auditoria 
      (categoria_id, nombre, descripcion, tipo_evaluacion, max_fotos, orden) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      categoria_id,
      nombre,
      descripcion || null,
      tipo_evaluacion || 'cumple_no_cumple',
      parseInt(max_fotos) || 3,
      parseInt(orden) || 0
    ]);
    
    res.redirect(`/admin/categorias/${categoria_id}/items`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al crear ítem');
  }
};

/**
 * Editar categoría
 */
exports.editarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, orden, activo } = req.body;
    
    await runAsync(`
      UPDATE categorias 
      SET nombre = ?, descripcion = ?, orden = ?, activo = ?
      WHERE id = ?
    `, [nombre, descripcion, parseInt(orden), activo === 'on' ? 1 : 0, id]);
    
    res.redirect('/admin/categorias');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al actualizar categoría');
  }
};

/**
 * Editar ítem
 */
exports.editarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, tipo_evaluacion, max_fotos, orden, activo } = req.body;
    
    const item = await getAsync('SELECT categoria_id FROM items_auditoria WHERE id = ?', [id]);
    
    await runAsync(`
      UPDATE items_auditoria 
      SET nombre = ?, descripcion = ?, tipo_evaluacion = ?, max_fotos = ?, orden = ?, activo = ?
      WHERE id = ?
    `, [
      nombre,
      descripcion,
      tipo_evaluacion,
      parseInt(max_fotos),
      parseInt(orden),
      activo === 'on' ? 1 : 0,
      id
    ]);
    
    res.redirect(`/admin/categorias/${item.categoria_id}/items`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al actualizar ítem');
  }
};

/**
 * Eliminar categoría
 */
exports.eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

/**
 * Eliminar ítem
 */
exports.eliminarItem = async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM items_auditoria WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Ítem eliminado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

/**
 * Reordenar categorías
 */
exports.reordenarCategorias = async (req, res) => {
  try {
    const { orden } = req.body; // Array de IDs en el nuevo orden
    
    for (let i = 0; i < orden.length; i++) {
      await runAsync('UPDATE categorias SET orden = ? WHERE id = ?', [i + 1, orden[i]]);
    }
    
    res.json({ success: true, mensaje: 'Orden actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al reordenar' });
  }
};

/**
 * Reordenar ítems
 */
exports.reordenarItems = async (req, res) => {
  try {
    const { orden } = req.body; // Array de IDs en el nuevo orden
    
    for (let i = 0; i < orden.length; i++) {
      await runAsync('UPDATE items_auditoria SET orden = ? WHERE id = ?', [i + 1, orden[i]]);
    }
    
    res.json({ success: true, mensaje: 'Orden actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al reordenar' });
  }
};

module.exports = exports;

/**
 * CONTROLADOR DE WHATSAPP - MR. FUEL V2.0
 * Gestión de números para notificaciones por WhatsApp
 */

const { getAsync, allAsync, runAsync } = require('../config/database');

/**
 * Listar números de WhatsApp
 */
exports.listarNumeros = async (req, res) => {
  try {
    const numeros = await allAsync(`
      SELECT * FROM whatsapp_numeros 
      ORDER BY activo DESC, nombre ASC
    `);

    res.render('admin/whatsapp', {
      user: req.session,
      titulo: 'Gestión de WhatsApp',
      numeros
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar números');
  }
};

/**
 * Agregar número de WhatsApp
 */
exports.agregarNumero = async (req, res) => {
  try {
    const { nombre, numero, cargo } = req.body;
    
    // Limpiar número (quitar espacios, guiones, etc)
    const numeroLimpio = numero.replace(/[^0-9+]/g, '');
    
    await runAsync(
      'INSERT INTO whatsapp_numeros (nombre, numero, cargo) VALUES (?, ?, ?)',
      [nombre, numeroLimpio, cargo || null]
    );
    
    res.redirect('/admin/whatsapp');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al agregar número');
  }
};

/**
 * Editar número de WhatsApp
 */
exports.editarNumero = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, numero, cargo } = req.body;
    
    const numeroLimpio = numero.replace(/[^0-9+]/g, '');
    
    await runAsync(
      'UPDATE whatsapp_numeros SET nombre = ?, numero = ?, cargo = ? WHERE id = ?',
      [nombre, numeroLimpio, cargo || null, id]
    );
    
    res.redirect('/admin/whatsapp');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al editar número');
  }
};

/**
 * Eliminar número de WhatsApp
 */
exports.eliminarNumero = async (req, res) => {
  try {
    const { id } = req.params;
    
    await runAsync('DELETE FROM whatsapp_numeros WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

/**
 * Toggle activo/inactivo
 */
exports.toggleActivo = async (req, res) => {
  try {
    const { id } = req.params;
    
    await runAsync(
      'UPDATE whatsapp_numeros SET activo = NOT activo WHERE id = ?',
      [id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: error.message });
  }
};

/**
 * Obtener números activos para envío
 */
exports.obtenerNumerosActivos = async () => {
  try {
    return await allAsync(
      'SELECT * FROM whatsapp_numeros WHERE activo = 1 ORDER BY nombre ASC'
    );
  } catch (error) {
    console.error('Error al obtener números activos:', error);
    return [];
  }
};

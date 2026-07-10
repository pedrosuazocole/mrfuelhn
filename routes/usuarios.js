const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { allAsync, getAsync, runAsync } = require('../config/database');

router.use(isAuthenticated);
router.use(isAdmin);

router.get('/', async (req, res) => {
  const usuarios = await allAsync('SELECT id, nombre, email, rol, telefono, activo, fecha_creacion FROM usuarios ORDER BY nombre');
  res.render('usuarios/lista', { user: req.session, titulo: 'Usuarios', usuarios });
});

router.post('/nuevo', async (req, res) => {
  try {
    const { nombre, email, password, rol, telefono } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await runAsync(
      'INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, hash, rol, telefono]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

router.get('/editar/:id', async (req, res) => {
  try {
    const usuario = await getAsync(
      'SELECT id, nombre, email, rol, telefono, activo, estacion_id, whatsapp_numero FROM usuarios WHERE id = ?',
      [req.params.id]
    );
    if (!usuario) return res.status(404).send('Usuario no encontrado');
    const estaciones = await allAsync('SELECT id, nombre FROM estaciones WHERE activo = 1 ORDER BY nombre');
    res.render('usuarios/editar', { user: req.session, titulo: 'Editar Usuario', usuario, estaciones });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar usuario');
  }
});

router.post('/editar/:id', async (req, res) => {
  try {
    const { nombre, email, rol, telefono, activo, password, estacion_id, whatsapp_numero } = req.body;

    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      await runAsync(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, telefono = ?, activo = ?, password = ?, estacion_id = ?, whatsapp_numero = ? WHERE id = ?',
        [nombre, email, rol, telefono || null, activo === 'on' ? 1 : 0, hash, estacion_id || null, whatsapp_numero?.trim() || null, req.params.id]
      );
    } else {
      await runAsync(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, telefono = ?, activo = ?, estacion_id = ?, whatsapp_numero = ? WHERE id = ?',
        [nombre, email, rol, telefono || null, activo === 'on' ? 1 : 0, estacion_id || null, whatsapp_numero?.trim() || null, req.params.id]
      );
    }

    res.redirect('/usuarios');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al actualizar usuario');
  }
});

router.delete('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ success: false, mensaje: 'No podés eliminar tu propio usuario' });
    }
    
    await runAsync('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ success: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar usuario' });
  }
});

module.exports = router;

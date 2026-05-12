const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { allAsync, getAsync, runAsync } = require('../config/database');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
  const estaciones = await allAsync('SELECT * FROM estaciones ORDER BY nombre');
  res.render('estaciones/lista', { user: req.session, titulo: 'Estaciones', estaciones });
});

router.get('/nueva', isAdmin, (req, res) => {
  res.render('estaciones/nueva', { user: req.session, titulo: 'Nueva Estación' });
});

router.post('/nueva', isAdmin, async (req, res) => {
  try {
    const { nombre, codigo, direccion, ciudad, departamento, telefono, encargado, latitud, longitud } = req.body;
    await runAsync(
      'INSERT INTO estaciones (nombre, codigo, direccion, ciudad, departamento, telefono, encargado, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, codigo, direccion, ciudad, departamento, telefono, encargado, latitud || null, longitud || null]
    );
    res.redirect('/estaciones');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al crear estación');
  }
});

router.get('/editar/:id', isAdmin, async (req, res) => {
  try {
    const estacion = await getAsync('SELECT * FROM estaciones WHERE id = ?', [req.params.id]);
    if (!estacion) {
      return res.status(404).send('Estación no encontrada');
    }
    res.render('estaciones/editar', { user: req.session, titulo: 'Editar Estación', estacion });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar estación');
  }
});

router.post('/editar/:id', isAdmin, async (req, res) => {
  try {
    const { nombre, codigo, direccion, ciudad, departamento, telefono, encargado, latitud, longitud, activo } = req.body;
    await runAsync(
      'UPDATE estaciones SET nombre = ?, codigo = ?, direccion = ?, ciudad = ?, departamento = ?, telefono = ?, encargado = ?, latitud = ?, longitud = ?, activo = ? WHERE id = ?',
      [nombre, codigo, direccion, ciudad, departamento, telefono, encargado, latitud || null, longitud || null, activo === 'on' ? 1 : 0, req.params.id]
    );
    res.redirect('/estaciones');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al actualizar estación');
  }
});

router.delete('/eliminar/:id', isAdmin, async (req, res) => {
  try {
    await runAsync('DELETE FROM estaciones WHERE id = ?', [req.params.id]);
    res.json({ success: true, mensaje: 'Estación eliminada correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar estación' });
  }
});

module.exports = router;

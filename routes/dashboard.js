const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { allAsync, getAsync } = require('../config/database');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
  try {
    // Usar auditorías v2 en lugar de v1
    const totalAuditorias = await getAsync('SELECT COUNT(*) as total FROM auditorias_v2');
    const totalEstaciones = await getAsync('SELECT COUNT(*) as total FROM estaciones WHERE activo = 1');
    const promedioGeneral = await getAsync('SELECT AVG(calificacion_general) as promedio FROM auditorias_v2');
    
    const ultimasAuditorias = await allAsync(`
      SELECT a.*, e.nombre as estacion_nombre, u.nombre as auditor_nombre
      FROM auditorias_v2 a
      INNER JOIN estaciones e ON a.estacion_id = e.id
      INNER JOIN usuarios u ON a.auditor_id = u.id
      ORDER BY a.fecha_visita DESC, a.hora_visita DESC
      LIMIT 5
    `);
    
    const estadisticasPorEstacion = await allAsync(`
      SELECT 
        e.nombre as estacion,
        COUNT(a.id) as total_auditorias,
        AVG(a.calificacion_general) as promedio
      FROM estaciones e
      LEFT JOIN auditorias_v2 a ON e.id = a.estacion_id
      WHERE e.activo = 1
      GROUP BY e.id
      ORDER BY promedio DESC
    `);
    
    res.render('dashboard/index', {
      user: req.session,
      titulo: 'Dashboard',
      stats: {
        totalAuditorias: totalAuditorias.total,
        totalEstaciones: totalEstaciones.total,
        promedioGeneral: Math.round(promedioGeneral.promedio || 0)
      },
      ultimasAuditorias,
      estadisticasPorEstacion
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).send('Error al cargar dashboard');
  }
});

module.exports = router;

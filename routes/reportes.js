/**
 * RUTAS DE REPORTES DE FRECUENCIA — MR. FUEL v2.0
 */

const express = require('express');
const router  = express.Router();
const reporteFrecuenciaController = require('../controllers/reporteFrecuenciaController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

// Reporte de frecuencia de mantenimientos
router.get('/frecuencia-mantenimientos', reporteFrecuenciaController.reporteMantenimientos);

// Reporte de frecuencia de auditorías
router.get('/frecuencia-auditorias', reporteFrecuenciaController.reporteAuditorias);

module.exports = router;

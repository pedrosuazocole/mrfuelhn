/**
 * RUTAS DE AUDITORÍAS V2.0 - MR. FUEL
 */

const express = require('express');
const router = express.Router();
const auditoriaV2Controller = require('../controllers/auditoriaV2Controller');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const upload = require('../config/multer');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Listar auditorías v2
router.get('/', auditoriaV2Controller.listarAuditorias);

// Nueva auditoría v2
router.get('/nueva', auditoriaV2Controller.mostrarFormularioNueva);

// Crear auditoría v2 (acepta múltiples archivos con nombres dinámicos)
router.post('/nueva', upload.any(), auditoriaV2Controller.crearAuditoria);

// Ver detalle
router.get('/:id', auditoriaV2Controller.verDetalle);

// Eliminar (solo admin)
router.delete('/:id', isAdmin, auditoriaV2Controller.eliminarAuditoria);

// Estadísticas
router.get('/api/estadisticas', auditoriaV2Controller.obtenerEstadisticas);

module.exports = router;

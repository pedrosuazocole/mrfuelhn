/**
 * RUTAS DE AUDITORÍAS - MR. FUEL
 */

const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../config/multer');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Listar auditorías
router.get('/', auditoriaController.listarAuditorias);

// Nueva auditoría
router.get('/nueva', auditoriaController.mostrarFormularioNueva);
router.post('/nueva', upload.array('fotos', 10), auditoriaController.crearAuditoria);

// Ver detalle
router.get('/:id', auditoriaController.verDetalle);

// Eliminar (solo admin)
router.delete('/:id', auditoriaController.eliminarAuditoria);

module.exports = router;

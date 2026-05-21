/**
 * RUTAS DE AUDITORÍAS V2.0 - MR. FUEL
 */

const express = require('express');
const router = express.Router();
const auditoriaV2Controller = require('../controllers/auditoriaV2Controller');
const { isAuthenticated, isAdmin, hasRole } = require('../middleware/auth');
const upload = require('../config/multer');

// Todas las rutas requieren autenticación y rol no-técnico
router.use(isAuthenticated);
router.use(hasRole('admin', 'supervisor', 'auditor'));

// Listar auditorías v2
router.get('/', auditoriaV2Controller.listarAuditorias);

// Nueva auditoría v2
router.get('/nueva', auditoriaV2Controller.mostrarFormularioNueva);

// Crear auditoría v2 (acepta múltiples archivos con nombres dinámicos)
// Crear auditoría con manejo explícito de errores de multer
router.post('/nueva', (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('❌ Error de multer al subir archivos:', err.message);
      // Continuar sin archivos en lugar de fallar
      req.files = [];
    }
    console.log(`📁 Archivos recibidos: ${req.files ? req.files.length : 0}`);
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => console.log(`  - ${f.fieldname}: ${f.originalname} (${f.size} bytes) → ${f.path}`));
    }
    next();
  });
}, auditoriaV2Controller.crearAuditoria);

// Ver detalle
router.get('/:id', auditoriaV2Controller.verDetalle);

// Generar PDF
router.get('/:id/pdf', auditoriaV2Controller.generarPDF);

// Obtener números WhatsApp activos para una auditoría
router.get('/:id/whatsapp-numeros', auditoriaV2Controller.obtenerNumerosWhatsApp);

// Eliminar (solo admin)
router.delete('/:id', isAdmin, auditoriaV2Controller.eliminarAuditoria);

// Estadísticas
router.get('/api/estadisticas', auditoriaV2Controller.obtenerEstadisticas);

module.exports = router;

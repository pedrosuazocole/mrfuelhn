/**
 * RUTAS DE ADMINISTRACIÓN - MR. FUEL V2.0
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol admin
router.use(isAuthenticated);
router.use(isAdmin);

// Gestión de categorías
router.get('/categorias', adminController.listarCategorias);
router.post('/categorias/nueva', adminController.agregarCategoria);
router.post('/categorias/:id/editar', adminController.editarCategoria);
router.delete('/categorias/:id', adminController.eliminarCategoria);
router.post('/categorias/reordenar', adminController.reordenarCategorias);

// Mantenimiento del volumen — borra fotos huérfanas y comprime las viejas
router.get('/limpiar-volumen', adminController.limpiarVolumen);

// Diagnóstico de espacio en disco del volumen (solo lectura)
router.get('/espacio-volumen', adminController.espacioVolumen);

// Envío manual de reportes diarios por WhatsApp (mismos reportes del cron)
router.get('/reporte/recordatorio-auditorias', adminController.enviarRecordatorioAuditoriasManual);
router.get('/reporte/auditorias',     adminController.enviarReporteAuditoriasManual);
router.get('/reporte/mantenimientos', adminController.enviarReporteMantenimientosManual);
router.get('/reporte/tickets',        adminController.enviarReporteTicketsManual);

// Gestión de ítems
router.get('/categorias/:id/items', adminController.verItems);
router.post('/items/nuevo', adminController.agregarItem);
router.post('/items/:id/editar', adminController.editarItem);
router.delete('/items/:id', adminController.eliminarItem);
router.post('/items/reordenar', adminController.reordenarItems);

module.exports = router;

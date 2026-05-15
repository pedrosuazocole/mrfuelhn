/**
 * RUTAS DE TICKETS - MR. FUEL V2.0
 */

const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Listar tickets
router.get('/', ticketsController.listarTickets);

// Nuevo ticket
router.get('/nuevo', ticketsController.mostrarFormularioNuevo);
router.post('/nuevo', ticketsController.crearTicket);

// Ver detalle
router.get('/:id', ticketsController.verDetalle);

// Actualizar estado
router.post('/:id/estado', ticketsController.actualizarEstado);

// Reasignar ticket
router.post('/:id/reasignar', ticketsController.reasignarTicket);

// Eliminar (solo admin)
router.delete('/:id', isAdmin, ticketsController.eliminarTicket);

module.exports = router;

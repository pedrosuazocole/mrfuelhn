/**
 * RUTAS DE WHATSAPP - MR. FUEL V2.0
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol admin
router.use(isAuthenticated);
router.use(isAdmin);

// Gestión de números
router.get('/', whatsappController.listarNumeros);
router.post('/nuevo', whatsappController.agregarNumero);
router.post('/:id/editar', whatsappController.editarNumero);
router.delete('/:id', whatsappController.eliminarNumero);
router.post('/:id/toggle', whatsappController.toggleActivo);

module.exports = router;

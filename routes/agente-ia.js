/**
 * RUTAS DEL AGENTE IA — MR. FUEL v2.0
 */

const express = require('express');
const router = express.Router();
const agenteIAController = require('../controllers/agenteIAController');
const { isAuthenticated } = require('../middleware/auth');

// Webhook público (TextMeBot necesita poder llamarlo sin sesión de usuario)
router.post('/whatsapp-webhook', agenteIAController.recibirMensajeWhatsApp);

// Chat embebido en el dashboard — requiere usuario autenticado
router.post('/preguntar', isAuthenticated, agenteIAController.preguntarDesdeApp);

module.exports = router;

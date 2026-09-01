/**
 * RUTAS DE AUTENTICACIÓN - MR. FUEL
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated, isAuthenticated } = require('../middleware/auth');
const { limitadorLogin } = require('../middleware/rateLimit');

// Login
router.get('/login', redirectIfAuthenticated, authController.mostrarLogin);
router.post('/login', limitadorLogin, redirectIfAuthenticated, authController.procesarLogin);

// Logout
router.get('/logout', authController.logout);

// Cambiar contraseña
router.post('/cambiar-password', isAuthenticated, authController.cambiarPassword);

module.exports = router;

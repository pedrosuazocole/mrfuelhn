/**
 * RATE LIMITING - MR. FUEL
 * Limita intentos de login para evitar ataques de fuerza bruta o que un
 * script automatizado sature el formulario de inicio de sesión.
 */

const rateLimit = require('express-rate-limit');

// 10 intentos de login por IP cada 15 minutos.
// Suficiente para que un usuario real que se equivoca de contraseña varias
// veces no quede bloqueado, pero corta un ataque automatizado.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    mensaje: 'Demasiados intentos de inicio de sesión. Por favor esperá unos minutos antes de volver a intentar.'
  }
});

module.exports = { limitadorLogin };

/**
 * CONTROLADOR DE AUTENTICACIÓN - MR. FUEL
 */

const bcrypt = require('bcryptjs');
const { getAsync, runAsync } = require('../config/database');

/**
 * Mostrar formulario de login
 */
exports.mostrarLogin = (req, res) => {
  res.render('login', {
    titulo: 'Iniciar Sesión',
    error: null
  });
};

/**
 * Procesar login
 */
exports.procesarLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validaciones básicas
    if (!email || !password) {
      return res.render('login', {
        titulo: 'Iniciar Sesión',
        error: 'Por favor ingresá tu email y contraseña'
      });
    }
    
    // Buscar usuario
    const usuario = await getAsync(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [email]
    );
    
    if (!usuario) {
      return res.render('login', {
        titulo: 'Iniciar Sesión',
        error: 'Credenciales incorrectas'
      });
    }
    
    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password);
    
    if (!passwordValido) {
      return res.render('login', {
        titulo: 'Iniciar Sesión',
        error: 'Credenciales incorrectas'
      });
    }
    
    // Actualizar último acceso
    await runAsync(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?',
      [usuario.id]
    );
    
    // Crear sesión
    req.session.userId = usuario.id;
    req.session.userName = usuario.nombre;
    req.session.userEmail = usuario.email;
    req.session.userRole = usuario.rol;
    
    console.log(`✅ Login exitoso: ${usuario.nombre} (${usuario.rol})`);
    
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Error en login:', error);
    res.render('login', {
      titulo: 'Iniciar Sesión',
      error: 'Error al procesar el login. Intentá nuevamente.'
    });
  }
};

/**
 * Cerrar sesión
 */
exports.logout = (req, res) => {
  const userName = req.session.userName;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
    } else {
      console.log(`👋 Logout: ${userName}`);
    }
    res.redirect('/login');
  });
};

/**
 * Cambiar contraseña
 */
exports.cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva, password_confirmar } = req.body;
    
    // Validaciones
    if (!password_actual || !password_nueva || !password_confirmar) {
      return res.status(400).json({
        success: false,
        mensaje: 'Todos los campos son requeridos'
      });
    }
    
    if (password_nueva !== password_confirmar) {
      return res.status(400).json({
        success: false,
        mensaje: 'Las contraseñas nuevas no coinciden'
      });
    }
    
    if (password_nueva.length < 6) {
      return res.status(400).json({
        success: false,
        mensaje: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Obtener usuario actual
    const usuario = await getAsync(
      'SELECT * FROM usuarios WHERE id = ?',
      [req.session.userId]
    );
    
    // Verificar contraseña actual
    const passwordValido = await bcrypt.compare(password_actual, usuario.password);
    
    if (!passwordValido) {
      return res.status(400).json({
        success: false,
        mensaje: 'La contraseña actual es incorrecta'
      });
    }
    
    // Hash de nueva contraseña
    const hashNuevo = await bcrypt.hash(password_nueva, 10);
    
    // Actualizar en BD
    await runAsync(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashNuevo, req.session.userId]
    );
    
    console.log(`🔐 Contraseña cambiada: ${usuario.nombre}`);
    
    res.json({
      success: true,
      mensaje: 'Contraseña actualizada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al cambiar la contraseña'
    });
  }
};

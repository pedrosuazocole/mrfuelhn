/**
 * MIDDLEWARE DE AUTENTICACIÓN - MR. FUEL
 */

/**
 * Verificar si el usuario está autenticado
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  // Si es petición AJAX/fetch → JSON 401 (un redirect rompe el fetch y genera
  // "Failed to fetch", obligando al usuario a salir y volver a entrar)
  const esAjax = req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    req.headers['x-requested-with'] === 'XMLHttpRequest';
  if (esAjax) {
    return res.status(401).json({ success: false, mensaje: 'Sesión expirada. Por favor recargá la página e iniciá sesión nuevamente.' });
  }
  res.redirect('/login');
};

/**
 * Verificar roles específicos
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }
    
    if (roles.includes(req.session.userRole)) {
      return next();
    }
    
    res.status(403).render('error', {
      user: req.session,
      titulo: 'Acceso Denegado',
      mensaje: 'No tenés permisos para acceder a esta sección',
      codigo: 403
    });
  };
};

/**
 * Solo administradores
 */
const isAdmin = hasRole('admin');

/**
 * Administradores y supervisores
 */
const isSupervisorOrAdmin = hasRole('admin', 'supervisor');

/**
 * Redireccionar si ya está autenticado
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    if (req.session.userRole === 'tecnico' ||
        req.session.userRole === 'supervisor_pista' ||
        req.session.userRole === 'responsable_mantenimiento') {
      return res.redirect('/mantenimiento');
    }
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  isAuthenticated,
  hasRole,
  isAdmin,
  isSupervisorOrAdmin,
  redirectIfAuthenticated
};

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

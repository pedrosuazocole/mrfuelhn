/**
 * RUTAS DE MANTENIMIENTO - MR. FUEL V2.0
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/mantenimientoController');
const { isAuthenticated, isAdmin, hasRole } = require('../middleware/auth');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

// Multer para mantenimiento (mismo patrón que auditorías)
function getMantenimientoUploadDir() {
  const base = process.env.UPLOADS_BASE_PATH
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(__dirname, '..', 'public', 'uploads'));
  return path.join(base, 'mantenimiento');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getMantenimientoUploadDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${safeName}_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Todos los autenticados pueden ver y crear mantenimientos
router.use(isAuthenticated);

// ── Operaciones principales ──────────────────────────────────────────────────
router.get('/',       ctrl.listarMantenimientos);
router.get('/nuevo',  ctrl.mostrarFormularioNuevo);

router.post('/nuevo', (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) { console.error('Multer error:', err.message); req.files = []; }
    console.log(`📁 Fotos mantenimiento recibidas: ${req.files ? req.files.length : 0}`);
    next();
  });
}, ctrl.crearMantenimiento);

router.get('/:id/pdf',      ctrl.generarPDF);
router.get('/:id',          ctrl.verDetalle);
router.delete('/:id',       isAdmin, ctrl.eliminarMantenimiento);

// ── Admin: gestión de categorías e ítems ─────────────────────────────────────
router.get('/admin/categorias',                          isAdmin, ctrl.listarCategorias);
router.post('/admin/categorias',                         isAdmin, ctrl.crearCategoria);
router.get('/admin/categorias/:categoria_id/items',      isAdmin, ctrl.listarItems);
router.post('/admin/categorias/:categoria_id/items',     isAdmin, ctrl.crearItem);
router.post('/admin/items/:id/toggle',                   isAdmin, ctrl.toggleItem);

module.exports = router;

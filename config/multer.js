/**
 * CONFIGURACIÓN DE MULTER - MR. FUEL
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Calcula el directorio en tiempo de ejecución (cuando llega la petición)
function getUploadDir() {
  const base = process.env.UPLOADS_BASE_PATH
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(__dirname, '..', 'public', 'uploads'));
  return path.join(base, 'auditorias');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadDir();
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`✅ Directorio uploads creado: ${uploadDir}`);
      }
    } catch (err) {
      console.error(`❌ Error creando directorio uploads: ${err.message}`);
      return cb(err);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${safeName}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se aceptan imágenes JPG, PNG o WEBP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  // 20MB por archivo — las cámaras de celulares modernos producen fotos de 6-15MB.
  // Un límite bajo hace que Multer aborte TODO el lote de fotos (y los campos
  // de texto que vengan después, como "evaluaciones") cuando UNA sola foto lo supera.
  // La compresión real ocurre DESPUÉS en comprimirFotos.js (reduce a 150-400KB).
  limits: { fileSize: 20 * 1024 * 1024 }
});

module.exports = upload;

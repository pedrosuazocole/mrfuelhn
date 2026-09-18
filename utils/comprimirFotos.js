/**
 * SUBIDA A CLOUDINARY — MR. FUEL v2.0
 *
 * Middleware que se ejecuta DESPUÉS de multer.
 * Toma cada foto temporal en disco, la sube a Cloudinary,
 * guarda la URL pública en file.cloudinaryUrl, y borra el temporal.
 *
 * Si Cloudinary no está configurado (CLOUDINARY_CLOUD_NAME ausente),
 * cae al comportamiento anterior: comprime la foto en disco local.
 * Esto permite que la app siga funcionando en desarrollo local.
 *
 * Los controladores de auditorías y mantenimiento leen file.cloudinaryUrl
 * si existe, o file.filename si no, para guardar la referencia en la BD.
 */

const fs   = require('fs');
const path = require('path');

// Modo Cloudinary: activo si las variables de entorno están configuradas
function cloudinaryActivo() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY    &&
            process.env.CLOUDINARY_API_SECRET);
}

// Determina la carpeta de Cloudinary según la ruta donde multer guardó el archivo
function detectarCarpeta(filePath) {
  if (filePath.includes('mantenimiento')) return 'mantenimiento';
  return 'auditorias';
}

async function subirOComprimir(file) {
  if (cloudinaryActivo()) {
    // ── Modo Cloudinary ────────────────────────────────────────────────────
    const { subirFoto } = require('./cloudinaryUpload');
    const carpeta = detectarCarpeta(file.path || file.destination || '');
    try {
      const url = await subirFoto(file.path, carpeta);
      file.cloudinaryUrl = url;  // el controlador lo leerá de aquí
      console.log(`☁️  Cloudinary: foto subida → ${url.slice(0, 80)}...`);
      // Borrar el temporal de disco — ya no lo necesitamos
      try { fs.unlinkSync(file.path); } catch (_) {}
    } catch (err) {
      console.error(`❌ Cloudinary upload falló para ${file.originalname}: ${err.message}`);
      // Si falla la subida, dejamos el archivo en disco como respaldo
    }
  } else {
    // ── Modo local (fallback): comprimir en disco ─────────────────────────
    const sharp = require('sharp');
    const ext = path.extname(file.path).toLowerCase();
    const esImagen = ['.jpg','.jpeg','.png','.webp','.heic','.heif'].includes(ext);
    if (!esImagen) return;
    try {
      const buf = fs.readFileSync(file.path);
      const comprimido = await sharp(buf)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer();
      fs.writeFileSync(file.path, comprimido);
      console.log(`📸 Local: ${file.originalname} comprimida`);
    } catch (err) {
      console.warn(`⚠️  Compresión local falló: ${err.message}`);
    }
  }
}

async function comprimirFotosMiddleware(req, res, next) {
  if (!req.files || req.files.length === 0) return next();
  for (const file of req.files) {
    await subirOComprimir(file);
  }
  next();
}

module.exports = { comprimirFotosMiddleware };

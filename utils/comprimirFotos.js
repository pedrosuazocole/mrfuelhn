/**
 * COMPRESIÓN DE FOTOS — MR. FUEL v2.0
 *
 * Middleware que se ejecuta DESPUÉS de multer (cuando req.files ya existe).
 * Toma cada foto recién guardada en disco y la recomprime en el mismo lugar:
 *   - Redimensiona a máximo 1600px en el lado más largo (suficiente para
 *     ver detalle en el PDF y en WhatsApp, sin guardar resoluciones de
 *     cámara completas que nadie necesita).
 *   - Reconvierte a JPEG con calidad 75% (WEBP/PNG/HEIC quedan unificados
 *     a JPEG, más liviano y compatible con todo).
 *
 * Resultado tipico: una foto de celular de 3-5MB queda en 150-400KB,
 * sin pérdida visible de legibilidad para checklist/auditoría.
 *
 * Uso: insertar después de upload.any() en cualquier ruta, antes del
 * controlador final. No cambia req.files[].path ni los nombres —
 * solo sobreescribe el contenido del archivo ya guardado.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ANCHO_MAXIMO = 1600;
const CALIDAD_JPEG = 75;

async function comprimirArchivo(filePath) {
  // Solo procesar imágenes — si por algún motivo llega un PDF u otro tipo, lo dejamos intacto
  const ext = path.extname(filePath).toLowerCase();
  const esImagen = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);
  if (!esImagen) return;

  try {
    const buffer = fs.readFileSync(filePath);
    const comprimido = await sharp(buffer)
      .rotate() // corrige orientación según metadatos EXIF antes de redimensionar
      .resize({ width: ANCHO_MAXIMO, height: ANCHO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filePath, comprimido);

    const antesKB = (buffer.length / 1024).toFixed(0);
    const despuesKB = (comprimido.length / 1024).toFixed(0);
    console.log(`📸 Comprimida: ${path.basename(filePath)} — ${antesKB}KB → ${despuesKB}KB`);
  } catch (err) {
    // Si la compresión falla por cualquier motivo, dejamos el archivo original
    // intacto — preferimos una foto grande a perder la evidencia.
    console.warn(`⚠️  No se pudo comprimir ${path.basename(filePath)}: ${err.message}`);
  }
}

/**
 * Middleware Express: comprime todos los archivos en req.files (array,
 * formato que deja upload.any()) de forma secuencial.
 */
async function comprimirFotosMiddleware(req, res, next) {
  if (!req.files || req.files.length === 0) return next();

  for (const file of req.files) {
    await comprimirArchivo(file.path);
  }
  next();
}

module.exports = { comprimirFotosMiddleware, comprimirArchivo, ANCHO_MAXIMO, CALIDAD_JPEG };

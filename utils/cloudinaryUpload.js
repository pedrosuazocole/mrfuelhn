/**
 * CLOUDINARY — MR. FUEL v2.0
 *
 * Centraliza toda la interacción con Cloudinary:
 *   - subirFoto(rutaLocalOBuffer, carpeta) → URL pública
 *   - borrarFoto(urlPublica) → void (borra por public_id)
 *
 * Las variables de entorno requeridas (configurar en Railway):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Carpetas en Cloudinary:
 *   mrfuel/auditorias/    → fotos de auditorías
 *   mrfuel/mantenimiento/ → fotos de mantenimiento
 *
 * Lo que se guarda en la BD:
 *   Antes: /uploads/auditorias/foto_123.jpg  (ruta local)
 *   Ahora: https://res.cloudinary.com/xxx/image/upload/mrfuel/auditorias/foto_123.jpg (URL pública)
 *
 * pdfBinario.js detecta si la ruta empieza con http(s) y la usa como URL
 * en vez de intentar leerla como archivo local.
 */

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube una foto a Cloudinary.
 * @param {string} rutaLocal - Ruta absoluta del archivo en disco (dejada por multer)
 * @param {string} carpeta   - 'auditorias' | 'mantenimiento'
 * @returns {Promise<string>} URL pública segura (https://res.cloudinary.com/...)
 */
async function subirFoto(rutaLocal, carpeta = 'auditorias') {
  const resultado = await cloudinary.uploader.upload(rutaLocal, {
    folder:         `mrfuel/${carpeta}`,
    resource_type:  'image',
    transformation: [
      // Compresión automática en Cloudinary — máx 1600px, calidad auto
      { width: 1600, height: 1600, crop: 'limit' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  });
  return resultado.secure_url;
}

/**
 * Borra una foto de Cloudinary usando su URL pública.
 * Si la URL no es de Cloudinary, simplemente no hace nada.
 * @param {string} urlPublica - URL guardada en la BD
 */
async function borrarFoto(urlPublica) {
  if (!urlPublica || !urlPublica.includes('cloudinary.com')) return;

  try {
    // Extraer el public_id desde la URL
    // Ejemplo URL: https://res.cloudinary.com/mi-cloud/image/upload/v123/mrfuel/auditorias/abc.jpg
    // public_id = mrfuel/auditorias/abc  (sin extensión)
    const match = urlPublica.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (!match) return;
    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Cloudinary: foto eliminada (${publicId})`);
  } catch (err) {
    console.warn(`⚠️  Cloudinary: no se pudo eliminar ${urlPublica}: ${err.message}`);
  }
}

module.exports = { subirFoto, borrarFoto };

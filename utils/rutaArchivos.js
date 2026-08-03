/**
 * RESOLUCIÓN DE RUTAS DE ARCHIVOS — MR. FUEL v2.0
 *
 * Las fotos se guardan en el volumen persistente de Railway
 * (RAILWAY_VOLUME_MOUNT_PATH + '/uploads'), NO en public/uploads —
 * esa carpeta solo existe como fallback en desarrollo local.
 *
 * Esta función es la única fuente de verdad para construir la ruta
 * absoluta real de una foto a partir de su ruta guardada en BD
 * (ej: "/uploads/auditorias/foto_123.jpg").
 */

const fs = require('fs');
const path = require('path');

function resolverRutaArchivo(rutaRelativa) {
  if (!rutaRelativa) return null;

  const base = process.env.UPLOADS_BASE_PATH
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(__dirname, '..', 'public', 'uploads'));

  // La ruta en BD viene como "/uploads/auditorias/archivo.jpg" — quitamos el prefijo
  const relativa = rutaRelativa.replace(/^\/uploads\//, '');
  return path.join(base, relativa);
}

/**
 * Borra un archivo de foto de forma segura. No lanza error si no existe
 * o si ya fue borrado — solo lo registra en consola.
 */
async function borrarArchivoSeguro(rutaRelativa) {
  const rutaAbsoluta = resolverRutaArchivo(rutaRelativa);
  if (!rutaAbsoluta) return false;

  try {
    if (fs.existsSync(rutaAbsoluta)) {
      fs.unlinkSync(rutaAbsoluta);
      console.log(`🗑️  Foto eliminada: ${rutaAbsoluta}`);
      return true;
    } else {
      console.warn(`⚠️  Foto ya no existe (omitida): ${rutaAbsoluta}`);
      return false;
    }
  } catch (err) {
    console.warn(`⚠️  No se pudo eliminar foto ${rutaAbsoluta}: ${err.message}`);
    return false;
  }
}

module.exports = { resolverRutaArchivo, borrarArchivoSeguro };

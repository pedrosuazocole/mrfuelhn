/**
 * BACKUP AUTOMÁTICO DE LA BASE DE DATOS - MR. FUEL (Fase 1)
 *
 * Comprime la base de datos SQLite actual y la envía por correo como
 * adjunto. No requiere ninguna cuenta ni servicio nuevo — reutiliza el
 * servicio de email que ya está configurado (Resend o SMTP).
 *
 * Se ejecuta automáticamente todos los días vía cron (ver utils/cron.js).
 * También se puede ejecutar manualmente: node utils/backup.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const moment = require('moment-timezone');
const { enviarEmailConAdjunto } = require('./email');

const TZ = process.env.TZ || 'America/Tegucigalpa';

// Misma lógica de resolución de ruta que config/database.js
function obtenerRutaDB() {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'mrfuel.db');
  } else if (process.env.NODE_ENV === 'production') {
    return '/tmp/mrfuel.db';
  }
  return process.env.DB_PATH || path.join(__dirname, '..', 'database', 'mrfuel.db');
}

// Límite razonable para adjuntar por email (Resend/SMTP suelen aceptar
// hasta 25-40MB; dejamos margen). Si algún día el backup supera esto,
// es señal de que ya es momento de pasar a un backup en la nube (Fase 2).
const LIMITE_ADJUNTO_MB = 20;

/**
 * Comprime la base de datos actual a un archivo .gz temporal
 */
function comprimirDB(rutaDestino) {
  return new Promise((resolve, reject) => {
    const rutaDB = obtenerRutaDB();
    if (!fs.existsSync(rutaDB)) {
      return reject(new Error(`No se encontró la base de datos en ${rutaDB}`));
    }
    const origen = fs.createReadStream(rutaDB);
    const destino = fs.createWriteStream(rutaDestino);
    const gzip = zlib.createGzip({ level: 9 });

    origen.pipe(gzip).pipe(destino);
    destino.on('finish', () => resolve(rutaDestino));
    destino.on('error', reject);
    origen.on('error', reject);
  });
}

/**
 * Ejecuta el backup completo: comprimir + enviar por correo + limpiar
 */
async function ejecutarBackup() {
  const fecha = moment().tz(TZ).format('YYYY-MM-DD_HHmm');
  const nombreArchivo = `mrfuel-backup-${fecha}.db.gz`;
  const rutaTemp = path.join(require('os').tmpdir(), nombreArchivo);

  console.log(`\n💾 [Backup] Iniciando backup de la base de datos (${fecha})...`);

  try {
    await comprimirDB(rutaTemp);

    const stats = fs.statSync(rutaTemp);
    const tamanoMB = stats.size / (1024 * 1024);
    console.log(`💾 [Backup] Base de datos comprimida: ${tamanoMB.toFixed(2)} MB`);

    if (tamanoMB > LIMITE_ADJUNTO_MB) {
      console.log(`⚠️  [Backup] El backup (${tamanoMB.toFixed(1)}MB) supera el límite de ${LIMITE_ADJUNTO_MB}MB para enviar por correo.`);
      console.log('⚠️  [Backup] Es momento de migrar los backups a almacenamiento en la nube (Fase 2 del plan de mejoras).');
      fs.unlinkSync(rutaTemp);
      return { success: false, mensaje: 'Backup demasiado grande para enviar por correo' };
    }

    const destinatario = process.env.BACKUP_EMAIL || process.env.EMAIL_FROM;
    if (!destinatario) {
      console.log('⚠️  [Backup] No hay BACKUP_EMAIL ni EMAIL_FROM configurado — no se puede enviar el backup.');
      fs.unlinkSync(rutaTemp);
      return { success: false, mensaje: 'Sin destinatario configurado' };
    }

    await enviarEmailConAdjunto(
      destinatario,
      `📦 Backup Mr. Fuel — ${fecha}`,
      `<p>Backup automático diario de la base de datos de Mr. Fuel.</p>
       <p><strong>Fecha:</strong> ${fecha}</p>
       <p><strong>Tamaño:</strong> ${tamanoMB.toFixed(2)} MB</p>
       <p>Guardá este archivo en un lugar seguro. Para restaurarlo, descomprimilo (.gz) y reemplazá el archivo <code>mrfuel.db</code> en el volumen de Railway.</p>`,
      rutaTemp,
      nombreArchivo
    );

    fs.unlinkSync(rutaTemp);
    console.log(`✅ [Backup] Backup enviado exitosamente a ${destinatario}`);
    return { success: true, tamanoMB };

  } catch (error) {
    console.error('❌ [Backup] Error durante el backup:', error.message);
    try { if (fs.existsSync(rutaTemp)) fs.unlinkSync(rutaTemp); } catch (e) {}
    return { success: false, mensaje: error.message };
  }
}

module.exports = { ejecutarBackup };

// Permite ejecutar manualmente: node utils/backup.js
if (require.main === module) {
  ejecutarBackup().then(r => {
    console.log(r);
    process.exit(r.success ? 0 : 1);
  });
}

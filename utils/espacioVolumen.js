/**
 * VERIFICACIÓN DE ESPACIO EN VOLUMEN — MR. FUEL v2.0
 *
 * Reporta el uso real de disco del volumen persistente de Railway,
 * usando los comandos estándar de Linux `df` (espacio total/usado/libre
 * del punto de montaje) y `du` (desglose por carpeta dentro de uploads).
 *
 * Pensado para llamarse desde una ruta protegida de administrador,
 * igual que utils/limpiezaVolumen.js.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getUploadsBase() {
  return process.env.UPLOADS_BASE_PATH
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(__dirname, '..', 'public', 'uploads'));
}

function ejecutarComando(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    return `(no se pudo ejecutar: ${err.message})`;
  }
}

/**
 * Devuelve un resumen del espacio del volumen: total, usado, disponible,
 * porcentaje de uso, y el tamaño de las carpetas principales dentro de
 * uploads (auditorias, mantenimiento) para ver qué está pesando más.
 */
async function verificarEspacio() {
  const log = [];
  const registrar = (msg) => { log.push(msg); console.log(msg); };

  const volumen = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data';
  const uploadsBase = getUploadsBase();

  registrar(`📦 Punto de montaje del volumen: ${volumen}`);
  registrar('');

  // ── df: espacio total/usado/disponible del volumen ──────────────────────
  registrar('💽 ESPACIO EN DISCO (df -h):');
  const dfOutput = ejecutarComando(`df -h "${volumen}"`);
  registrar(dfOutput);
  registrar('');

  // Parsear la salida de df para devolver también un objeto estructurado
  let resumenDf = null;
  try {
    const lineas = dfOutput.split('\n');
    const datos = lineas[1].trim().split(/\s+/);
    resumenDf = {
      filesystem: datos[0],
      tamanoTotal: datos[1],
      usado: datos[2],
      disponible: datos[3],
      porcentajeUso: datos[4],
      montadoEn: datos[5],
    };
  } catch (err) {
    registrar(`⚠️  No se pudo parsear la salida de df: ${err.message}`);
  }

  // ── du: desglose de tamaño por carpeta dentro de uploads ─────────────────
  registrar('📁 DESGLOSE POR CARPETA (du -sh):');
  if (fs.existsSync(uploadsBase)) {
    const duUploads = ejecutarComando(`du -sh "${uploadsBase}" 2>/dev/null`);
    registrar(`   Total uploads: ${duUploads}`);

    for (const sub of ['auditorias', 'mantenimiento']) {
      const rutaSub = path.join(uploadsBase, sub);
      if (fs.existsSync(rutaSub)) {
        const duSub = ejecutarComando(`du -sh "${rutaSub}" 2>/dev/null`);
        registrar(`   - ${sub}: ${duSub}`);
      }
    }
  } else {
    registrar(`   ⚠️  ${uploadsBase} no existe en este momento.`);
  }
  registrar('');

  // ── Conteo simple de archivos por carpeta, como referencia rápida ───────
  registrar('🔢 CANTIDAD DE ARCHIVOS:');
  for (const sub of ['auditorias', 'mantenimiento']) {
    const rutaSub = path.join(uploadsBase, sub);
    if (fs.existsSync(rutaSub)) {
      const cantidad = ejecutarComando(`find "${rutaSub}" -type f | wc -l`);
      registrar(`   - ${sub}: ${cantidad} archivos`);
    }
  }

  return { resumenDf, log };
}

module.exports = { verificarEspacio };

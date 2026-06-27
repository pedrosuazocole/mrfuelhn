/**
 * LIMPIEZA DEL VOLUMEN — MR. FUEL v2.0
 *
 * Lógica reutilizable, pensada para llamarse:
 *   (a) desde una ruta temporal del servidor (controllers/adminController.js
 *       expone GET /admin/limpiar-volumen) — la forma recomendada en Railway,
 *       ya que la interfaz web no ofrece "ejecutar comando puntual" sin
 *       reemplazar el comando de arranque del servicio.
 *   (b) desde scripts/limpiarVolumen-cli.js si se prefiere correrlo por
 *       consola local con `railway run node scripts/limpiarVolumen-cli.js`.
 *
 * Esta función NUNCA llama a process.exit() — el proceso que la invoque
 * decide qué hacer con el resultado.
 *
 * Qué hace, en este orden:
 *   1. Recorre las carpetas de fotos del volumen (auditorias, mantenimiento)
 *   2. Para cada archivo físico, verifica si tiene un registro vivo en BD
 *      (fotos_items o mantenimiento_fotos) — si NO tiene registro, es huérfano
 *      y se borra (libera espacio de auditorías/mantenimientos ya eliminados
 *      antes de que existiera el fix de borrado correcto).
 *   3. Para cada archivo que SÍ tiene registro y sigue sin comprimir,
 *      lo recomprime in-place con el mismo estándar que usan las fotos nuevas.
 *
 * Es seguro ejecutarla varias veces — es idempotente.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { allAsync } = require('../config/database');

const ANCHO_MAXIMO = 1600;
const CALIDAD_JPEG = 75;
const UMBRAL_YA_COMPRIMIDO_KB = 450;

function getUploadsBase() {
  return process.env.UPLOADS_BASE_PATH
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
        : path.join(__dirname, '..', 'public', 'uploads'));
}

function listarArchivosRecursivo(dir) {
  if (!fs.existsSync(dir)) return [];
  const resultado = [];
  for (const nombre of fs.readdirSync(dir)) {
    const rutaCompleta = path.join(dir, nombre);
    if (fs.statSync(rutaCompleta).isDirectory()) {
      resultado.push(...listarArchivosRecursivo(rutaCompleta));
    } else {
      resultado.push(rutaCompleta);
    }
  }
  return resultado;
}

async function obtenerRutasRegistradasEnBD() {
  const fotosAuditorias = await allAsync('SELECT ruta_archivo FROM fotos_items');
  const fotosMant       = await allAsync('SELECT ruta_archivo FROM mantenimiento_fotos');
  const todas = [...fotosAuditorias, ...fotosMant].map(f => f.ruta_archivo);
  return new Set(todas.map(r => path.basename(r)));
}

async function comprimirSiHaceFalta(rutaAbsoluta) {
  const ext = path.extname(rutaAbsoluta).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return { comprimido: false };

  const statsAntes = fs.statSync(rutaAbsoluta);
  const pesoKB = statsAntes.size / 1024;
  if (pesoKB <= UMBRAL_YA_COMPRIMIDO_KB) return { comprimido: false, yaOptimo: true };

  try {
    const buffer = fs.readFileSync(rutaAbsoluta);
    const comprimido = await sharp(buffer)
      .rotate()
      .resize({ width: ANCHO_MAXIMO, height: ANCHO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(rutaAbsoluta, comprimido);
    return {
      comprimido: true,
      antesKB: pesoKB.toFixed(0),
      despuesKB: (comprimido.length / 1024).toFixed(0)
    };
  } catch (err) {
    return { comprimido: false, error: err.message };
  }
}

/**
 * Ejecuta la limpieza completa y devuelve un objeto con el resumen
 * y el log línea por línea (para poder mostrarlo en una página web
 * tal cual se vería en la consola).
 */
async function ejecutarLimpieza() {
  const log = [];
  const registrar = (msg) => { log.push(msg); console.log(msg); };

  registrar('🧹 Iniciando limpieza del volumen de Mr. Fuel...');

  const base = getUploadsBase();
  registrar(`📂 Directorio base configurado: ${base}`);
  registrar(`   RAILWAY_VOLUME_MOUNT_PATH = ${process.env.RAILWAY_VOLUME_MOUNT_PATH || '(no definida)'}`);

  const dirPadre = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.dirname(base);
  if (fs.existsSync(dirPadre)) {
    registrar(`📋 Contenido real de ${dirPadre}:`);
    for (const nombre of fs.readdirSync(dirPadre)) {
      const completa = path.join(dirPadre, nombre);
      const esDir = fs.statSync(completa).isDirectory();
      registrar(`   ${esDir ? '📁' : '📄'} ${nombre}`);
    }
  } else {
    registrar(`⚠️  El directorio ${dirPadre} no existe en este momento.`);
  }

  const carpetas = ['auditorias', 'mantenimiento'].map(c => path.join(base, c));
  let archivos = [];
  for (const carpeta of carpetas) {
    archivos.push(...listarArchivosRecursivo(carpeta));
  }
  registrar(`📸 Archivos físicos encontrados: ${archivos.length}`);

  const rutasRegistradas = await obtenerRutasRegistradasEnBD();
  registrar(`🗄️  Registros vivos en base de datos: ${rutasRegistradas.size}`);

  let espacioLiberadoHuerfanos = 0;
  let huerfanosEliminados = 0;
  let espacioAhorradoCompresion = 0;
  let archivosComprimidos = 0;
  let errores = 0;

  for (const rutaAbsoluta of archivos) {
    const nombreArchivo = path.basename(rutaAbsoluta);
    const estaRegistrado = rutasRegistradas.has(nombreArchivo);

    if (!estaRegistrado) {
      try {
        const tamano = fs.statSync(rutaAbsoluta).size;
        fs.unlinkSync(rutaAbsoluta);
        espacioLiberadoHuerfanos += tamano;
        huerfanosEliminados++;
        registrar(`🗑️  Huérfano eliminado: ${nombreArchivo} (${(tamano/1024).toFixed(0)}KB)`);
      } catch (err) {
        registrar(`⚠️  No se pudo eliminar huérfano ${nombreArchivo}: ${err.message}`);
        errores++;
      }
      continue;
    }

    const resultado = await comprimirSiHaceFalta(rutaAbsoluta);
    if (resultado.comprimido) {
      archivosComprimidos++;
      const ahorro = (resultado.antesKB - resultado.despuesKB) * 1024;
      espacioAhorradoCompresion += ahorro;
      registrar(`📸 Comprimido: ${nombreArchivo} — ${resultado.antesKB}KB → ${resultado.despuesKB}KB`);
    } else if (resultado.error) {
      registrar(`⚠️  Error comprimiendo ${nombreArchivo}: ${resultado.error}`);
      errores++;
    }
  }

  const resumen = {
    archivosEncontrados: archivos.length,
    huerfanosEliminados,
    espacioLiberadoHuerfanosMB: +(espacioLiberadoHuerfanos / 1024 / 1024).toFixed(2),
    archivosComprimidos,
    espacioAhorradoCompresionMB: +(espacioAhorradoCompresion / 1024 / 1024).toFixed(2),
    espacioTotalRecuperadoMB: +((espacioLiberadoHuerfanos + espacioAhorradoCompresion) / 1024 / 1024).toFixed(2),
    errores,
  };

  registrar('='.repeat(60));
  registrar('✅ LIMPIEZA COMPLETADA');
  registrar(`Archivos huérfanos eliminados:  ${resumen.huerfanosEliminados}`);
  registrar(`Espacio liberado (huérfanos):   ${resumen.espacioLiberadoHuerfanosMB} MB`);
  registrar(`Archivos comprimidos:           ${resumen.archivosComprimidos}`);
  registrar(`Espacio ahorrado (compresión):  ${resumen.espacioAhorradoCompresionMB} MB`);
  registrar(`Errores:                        ${resumen.errores}`);
  registrar(`ESPACIO TOTAL RECUPERADO:       ${resumen.espacioTotalRecuperadoMB} MB`);

  return { resumen, log };
}

module.exports = { ejecutarLimpieza };

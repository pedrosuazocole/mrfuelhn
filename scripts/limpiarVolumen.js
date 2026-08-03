/**
 * SCRIPT DE LIMPIEZA DEL VOLUMEN — MR. FUEL v2.0
 *
 * Ejecutar UNA SOLA VEZ manualmente (no se llama desde ninguna ruta):
 *   node scripts/limpiarVolumen.js
 *
 * En Railway: pestaña del servicio → "..." → "Run command" → pegar el comando
 * de arriba, o conectarse por SSH/Shell si está disponible.
 *
 * Qué hace, en este orden:
 *   1. Recorre las carpetas de fotos del volumen (auditorias, mantenimiento)
 *   2. Para cada archivo físico, verifica si tiene un registro vivo en BD
 *      (fotos_items o mantenimiento_fotos) — si NO tiene registro, es huérfano
 *      y se borra (libera espacio de auditorías/mantenimientos ya eliminados).
 *   3. Para cada archivo que SÍ tiene registro y sigue sin comprimir
 *      (más grande de lo que dejaría nuestra compresión estándar),
 *      lo recomprime in-place con el mismo estándar que usan las fotos nuevas.
 *
 * Es seguro ejecutarlo varias veces — es idempotente: una foto ya comprimida
 * y un archivo que ya no existe simplemente se omiten sin error.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');
const { allAsync } = require('../config/database');

const ANCHO_MAXIMO = 1600;
const CALIDAD_JPEG = 75;
// Si un archivo ya pesa menos que esto, asumimos que ya fue comprimido — no perder tiempo reprocesando
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
  const fotosAuditorias   = await allAsync('SELECT ruta_archivo FROM fotos_items');
  const fotosMant         = await allAsync('SELECT ruta_archivo FROM mantenimiento_fotos');
  const todas = [...fotosAuditorias, ...fotosMant].map(f => f.ruta_archivo);

  // Normalizar a solo el nombre de archivo para comparar contra disco sin
  // depender de cómo esté escrito el prefijo (/uploads/... vs distinto formato)
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

(async () => {
  console.log('🧹 Iniciando limpieza del volumen de Mr. Fuel...\n');

  // ── Paso 0: asegurar que las tablas existen (mismo orden que el arranque
  // normal del servidor en railway.json: migrateToV2.js corre antes de server.js).
  // Necesario porque al ejecutar este script como comando aislado, las
  // migraciones no corren automáticamente.
  console.log('🔧 Verificando/aplicando migraciones de base de datos...');
  try {
    execSync('node utils/migrateToV2.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  } catch (err) {
    console.error('❌ No se pudieron aplicar las migraciones. Abortando limpieza.');
    process.exit(1);
  }
  console.log('✅ Migraciones verificadas.\n');

  const base = getUploadsBase();
  console.log(`📂 Directorio base configurado: ${base}`);
  console.log(`   RAILWAY_VOLUME_MOUNT_PATH = ${process.env.RAILWAY_VOLUME_MOUNT_PATH || '(no definida)'}`);
  console.log(`   UPLOADS_BASE_PATH         = ${process.env.UPLOADS_BASE_PATH || '(no definida)'}`);

  // Diagnóstico: mostrar qué hay realmente dentro del volumen montado,
  // para confirmar la estructura real antes de buscar fotos específicas.
  const dirPadre = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.dirname(base);
  if (fs.existsSync(dirPadre)) {
    console.log(`\n📋 Contenido real de ${dirPadre}:`);
    for (const nombre of fs.readdirSync(dirPadre)) {
      const completa = path.join(dirPadre, nombre);
      const esDir = fs.statSync(completa).isDirectory();
      console.log(`   ${esDir ? '📁' : '📄'} ${nombre}`);
    }
  } else {
    console.log(`\n⚠️  El directorio ${dirPadre} no existe en este momento.`);
  }
  console.log('');

  const carpetas = ['auditorias', 'mantenimiento'].map(c => path.join(base, c));
  let archivos = [];
  for (const carpeta of carpetas) {
    archivos.push(...listarArchivosRecursivo(carpeta));
  }
  console.log(`📸 Archivos físicos encontrados: ${archivos.length}\n`);

  const rutasRegistradas = await obtenerRutasRegistradasEnBD();
  console.log(`🗄️  Registros vivos en base de datos: ${rutasRegistradas.size}\n`);

  let espacioLiberadoHuerfanos = 0;
  let huerfanosEliminados = 0;
  let espacioAhorradoCompresion = 0;
  let archivosComprimidos = 0;
  let errores = 0;

  for (const rutaAbsoluta of archivos) {
    const nombreArchivo = path.basename(rutaAbsoluta);
    const estaRegistrado = rutasRegistradas.has(nombreArchivo);

    if (!estaRegistrado) {
      // Archivo huérfano — ya no pertenece a ninguna auditoría/mantenimiento vivo
      try {
        const tamano = fs.statSync(rutaAbsoluta).size;
        fs.unlinkSync(rutaAbsoluta);
        espacioLiberadoHuerfanos += tamano;
        huerfanosEliminados++;
        console.log(`🗑️  Huérfano eliminado: ${nombreArchivo} (${(tamano/1024).toFixed(0)}KB)`);
      } catch (err) {
        console.warn(`⚠️  No se pudo eliminar huérfano ${nombreArchivo}: ${err.message}`);
        errores++;
      }
      continue;
    }

    // Archivo en uso — comprimir si todavía no está optimizado
    const resultado = await comprimirSiHaceFalta(rutaAbsoluta);
    if (resultado.comprimido) {
      archivosComprimidos++;
      const ahorro = (resultado.antesKB - resultado.despuesKB) * 1024;
      espacioAhorradoCompresion += ahorro;
      console.log(`📸 Comprimido: ${nombreArchivo} — ${resultado.antesKB}KB → ${resultado.despuesKB}KB`);
    } else if (resultado.error) {
      console.warn(`⚠️  Error comprimiendo ${nombreArchivo}: ${resultado.error}`);
      errores++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ LIMPIEZA COMPLETADA');
  console.log('='.repeat(60));
  console.log(`Archivos huérfanos eliminados:  ${huerfanosEliminados}`);
  console.log(`Espacio liberado (huérfanos):   ${(espacioLiberadoHuerfanos/1024/1024).toFixed(2)} MB`);
  console.log(`Archivos comprimidos:           ${archivosComprimidos}`);
  console.log(`Espacio ahorrado (compresión):  ${(espacioAhorradoCompresion/1024/1024).toFixed(2)} MB`);
  console.log(`Errores:                        ${errores}`);
  console.log(`ESPACIO TOTAL RECUPERADO:        ${((espacioLiberadoHuerfanos+espacioAhorradoCompresion)/1024/1024).toFixed(2)} MB`);
  console.log('='.repeat(60));

  process.exit(0);
})().catch(err => {
  console.error('❌ Error fatal en limpieza:', err);
  process.exit(1);
});

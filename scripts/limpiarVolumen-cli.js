/**
 * WRAPPER DE CONSOLA — LIMPIEZA DEL VOLUMEN
 *
 * Uso (requiere el CLI de Railway instalado y vinculado al proyecto):
 *   railway run node scripts/limpiarVolumen-cli.js
 *
 * Esto SÍ ejecuta el comando una sola vez, sin afectar el comando de
 * arranque del servicio — a diferencia de la opción "Custom Start Command"
 * en la interfaz web, que reemplaza el arranque normal del servidor.
 *
 * Si no tienes el CLI de Railway instalado, usa en su lugar la ruta
 * protegida del navegador: GET /admin/limpiar-volumen (como administrador).
 */

const { ejecutarLimpieza } = require('../utils/limpiezaVolumen');

ejecutarLimpieza()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error fatal en limpieza:', err);
    process.exit(1);
  });

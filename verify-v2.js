#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICACIÓN - MR. FUEL V2.0
 * Verifica que todos los archivos necesarios existan
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando instalación de Mr. Fuel v2.0...\n');

const archivosRequeridos = [
  // Controladores
  { ruta: 'controllers/auditoriaV2Controller.js', tipo: 'Controlador v2' },
  { ruta: 'controllers/adminController.js', tipo: 'Controlador admin' },
  
  // Rutas
  { ruta: 'routes/auditorias-v2.js', tipo: 'Rutas v2' },
  { ruta: 'routes/admin.js', tipo: 'Rutas admin' },
  
  // Vistas Auditorías v2
  { ruta: 'views/auditorias-v2/nueva.ejs', tipo: 'Vista nueva auditoría' },
  { ruta: 'views/auditorias-v2/lista.ejs', tipo: 'Vista lista auditorías' },
  { ruta: 'views/auditorias-v2/detalle.ejs', tipo: 'Vista detalle' },
  
  // Vistas Admin
  { ruta: 'views/admin/categorias.ejs', tipo: 'Vista categorías' },
  { ruta: 'views/admin/items.ejs', tipo: 'Vista ítems' },
  
  // JavaScript
  { ruta: 'public/js/auditoria-v2.js', tipo: 'JavaScript v2' },
  
  // Utilidades
  { ruta: 'utils/migrateToV2.js', tipo: 'Script migración' },
  
  // Configuración
  { ruta: 'utils/email.js', tipo: 'Utilidad email' }
];

let errores = 0;
let advertencias = 0;

// Verificar archivos
console.log('📂 Verificando archivos...\n');
archivosRequeridos.forEach(({ ruta, tipo }) => {
  const rutaCompleta = path.join(process.cwd(), ruta);
  
  if (fs.existsSync(rutaCompleta)) {
    console.log(`✅ ${tipo.padEnd(25)} → ${ruta}`);
  } else {
    console.log(`❌ ${tipo.padEnd(25)} → ${ruta} [FALTA]`);
    errores++;
  }
});

// Verificar que las rutas estén en server.js
console.log('\n📋 Verificando server.js...\n');
const serverPath = path.join(process.cwd(), 'server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  
  const verificaciones = [
    { linea: "require('./routes/auditorias-v2')", nombre: 'Require auditorias-v2' },
    { linea: "require('./routes/admin')", nombre: 'Require admin' },
    { linea: "app.use('/auditorias-v2'", nombre: 'Ruta auditorias-v2' },
    { linea: "app.use('/admin'", nombre: 'Ruta admin' }
  ];
  
  verificaciones.forEach(({ linea, nombre }) => {
    if (serverContent.includes(linea)) {
      console.log(`✅ ${nombre.padEnd(25)} → OK`);
    } else {
      console.log(`❌ ${nombre.padEnd(25)} → FALTA`);
      errores++;
    }
  });
} else {
  console.log('❌ server.js no encontrado');
  errores++;
}

// Verificar directorios
console.log('\n📁 Verificando directorios...\n');
const directorios = [
  'views/auditorias-v2',
  'views/admin',
  'database',
  'public/uploads/auditorias'
];

directorios.forEach(dir => {
  const rutaCompleta = path.join(process.cwd(), dir);
  if (fs.existsSync(rutaCompleta)) {
    console.log(`✅ ${dir.padEnd(30)} → Existe`);
  } else {
    console.log(`⚠️  ${dir.padEnd(30)} → No existe (se creará automáticamente)`);
    advertencias++;
  }
});

// Verificar variables de entorno
console.log('\n🔐 Verificando variables de entorno...\n');
const variablesRequeridas = [
  'NODE_ENV',
  'SESSION_SECRET',
  'EMAIL_FROM'
];

const variablesOpcionales = [
  'RESEND_API_KEY',
  'EMAIL_HOST',
  'RAILWAY_VOLUME_MOUNT_PATH'
];

variablesRequeridas.forEach(variable => {
  if (process.env[variable]) {
    console.log(`✅ ${variable.padEnd(30)} → Configurada`);
  } else {
    console.log(`❌ ${variable.padEnd(30)} → FALTA`);
    errores++;
  }
});

variablesOpcionales.forEach(variable => {
  if (process.env[variable]) {
    console.log(`✅ ${variable.padEnd(30)} → Configurada`);
  } else {
    console.log(`⚠️  ${variable.padEnd(30)} → No configurada (opcional)`);
  }
});

// Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN\n');

if (errores === 0 && advertencias === 0) {
  console.log('✅ TODO PERFECTO - Mr. Fuel v2.0 listo para funcionar\n');
  process.exit(0);
} else if (errores === 0) {
  console.log(`⚠️  ${advertencias} advertencia(s) - El sistema debería funcionar\n`);
  process.exit(0);
} else {
  console.log(`❌ ${errores} error(es) crítico(s) encontrado(s)\n`);
  console.log('🔧 Acciones requeridas:\n');
  console.log('1. Verifica que todos los archivos v2.0 estén subidos a GitHub');
  console.log('2. Haz git pull en tu servidor o Railway');
  console.log('3. Ejecuta: npm run migrate-v2');
  console.log('4. Reinicia el servidor\n');
  process.exit(1);
}

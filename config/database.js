/**
 * CONFIGURACIÓN DE BASE DE DATOS - MR. FUEL
 * SQLite con soporte para operaciones asíncronas
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ruta de la base de datos
let dbPath;

// Railway monta volúmenes en rutas específicas
// Verificar si existe variable RAILWAY_VOLUME_MOUNT_PATH
if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  // Railway con volumen persistente
  dbPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'mrfuel.db');
  console.log('📦 Usando volumen de Railway para persistencia');
} else if (process.env.NODE_ENV === 'production') {
  // Producción sin volumen (datos no persistentes)
  dbPath = '/tmp/mrfuel.db';
  console.log('⚠️  Usando /tmp (datos NO persistentes)');
} else {
  // Desarrollo local
  dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'mrfuel.db');
}

console.log(`📂 Ruta de base de datos: ${dbPath}`);

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`✅ Directorio creado: ${dbDir}`);
}


// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a la base de datos SQLite');
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

/**
 * Ejecutar query con promesas
 */
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

/**
 * Obtener un solo registro
 */
const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Obtener múltiples registros
 */
const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  db,
  runAsync,
  getAsync,
  allAsync
};

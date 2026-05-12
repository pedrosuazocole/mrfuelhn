/**
 * INICIALIZACIÓN DE BASE DE DATOS - MR. FUEL
 * Crea todas las tablas necesarias y datos iniciales
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const path = require('path');

// Mostrar ruta de la base de datos
let dbPath;
if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  dbPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'mrfuel.db');
} else if (process.env.NODE_ENV === 'production') {
  dbPath = '/tmp/mrfuel.db';
} else {
  dbPath = path.join(__dirname, '..', 'database', 'mrfuel.db');
}

console.log(`📂 Inicializando base de datos en: ${dbPath}`);
console.log('🚀 Iniciando creación de base de datos...\n');

// ESQUEMA DE BASE DE DATOS
const schema = `
-- ===================================
-- TABLA: USUARIOS
-- ===================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('admin', 'supervisor', 'auditor')),
  telefono TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso DATETIME
);

-- ===================================
-- TABLA: ESTACIONES
-- ===================================
CREATE TABLE IF NOT EXISTS estaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  departamento TEXT NOT NULL,
  telefono TEXT,
  encargado TEXT,
  activo INTEGER DEFAULT 1,
  latitud REAL,
  longitud REAL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- TABLA: AUDITORÍAS
-- ===================================
CREATE TABLE IF NOT EXISTS auditorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estacion_id INTEGER NOT NULL,
  auditor_id INTEGER NOT NULL,
  fecha_visita DATETIME NOT NULL,
  hora_visita TEXT NOT NULL,
  
  -- LIMPIEZA DE BOMBAS (0-100)
  limpieza_bombas INTEGER DEFAULT 0,
  limpieza_bombas_nota TEXT,
  
  -- ORGANIZACIÓN DE ACEITES (0-100)
  aceites_organizados INTEGER DEFAULT 0,
  aceites_organizados_nota TEXT,
  
  -- UNIFORME COMPLETO (0-100)
  uniforme_completo INTEGER DEFAULT 0,
  uniforme_tiene_gorra INTEGER DEFAULT 0,
  uniforme_nota TEXT,
  
  -- PROTOCOLO DE SALUDO (0-100)
  saludo_protocolo INTEGER DEFAULT 0,
  saludo_nota TEXT,
  
  -- TRATO DURANTE COMPRA (0-100)
  trato_compra INTEGER DEFAULT 0,
  trato_compra_nota TEXT,
  
  -- DESPEDIDA (0-100)
  despedida_protocolo INTEGER DEFAULT 0,
  despedida_nota TEXT,
  
  -- CALIFICACIÓN GENERAL
  calificacion_general REAL DEFAULT 0,
  
  -- OBSERVACIONES
  observaciones_generales TEXT,
  recomendaciones TEXT,
  
  -- METADATA
  estado TEXT DEFAULT 'completada' CHECK(estado IN ('borrador', 'completada', 'revisada')),
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (estacion_id) REFERENCES estaciones(id),
  FOREIGN KEY (auditor_id) REFERENCES usuarios(id)
);

-- ===================================
-- TABLA: FOTOS DE AUDITORÍA
-- ===================================
CREATE TABLE IF NOT EXISTS auditoria_fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auditoria_id INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  descripcion TEXT,
  fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (auditoria_id) REFERENCES auditorias(id) ON DELETE CASCADE
);

-- ===================================
-- TABLA: RECORDATORIOS
-- ===================================
CREATE TABLE IF NOT EXISTS recordatorios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supervisor_id INTEGER NOT NULL,
  estacion_id INTEGER,
  fecha_programada DATE NOT NULL,
  hora_programada TIME NOT NULL,
  mensaje TEXT NOT NULL,
  enviado INTEGER DEFAULT 0,
  fecha_envio DATETIME,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (supervisor_id) REFERENCES usuarios(id),
  FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
);

-- ===================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ===================================
CREATE INDEX IF NOT EXISTS idx_auditorias_fecha ON auditorias(fecha_visita);
CREATE INDEX IF NOT EXISTS idx_auditorias_estacion ON auditorias(estacion_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha_programada);
`;

// Ejecutar creación de tablas
db.exec(schema, async (err) => {
  if (err) {
    console.error('❌ Error al crear tablas:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Tablas creadas exitosamente\n');
  
  // INSERTAR DATOS INICIALES
  try {
    // Usuario Admin por defecto
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    db.run(
      `INSERT OR IGNORE INTO usuarios (nombre, email, password, rol, telefono) 
       VALUES (?, ?, ?, ?, ?)`,
      ['Administrador Principal', 'admin@texaco.com', passwordHash, 'admin', '9999-9999'],
      (err) => {
        if (err && !err.message.includes('UNIQUE')) {
          console.error('❌ Error al crear usuario admin:', err.message);
        } else {
          console.log('✅ Usuario admin creado (email: admin@texaco.com, password: admin123)');
        }
      }
    );
    
    // Estaciones de ejemplo
    const estacionesEjemplo = [
      ['Texaco Tegucigalpa Centro', 'TEG-001', 'Boulevard Morazán', 'Tegucigalpa', 'Francisco Morazán', '2222-3333', 'Juan Pérez', 14.0723, -87.1921],
      ['Texaco San Pedro Sula', 'SPS-001', 'Boulevard del Norte', 'San Pedro Sula', 'Cortés', '2555-6666', 'María López', 15.5047, -88.0251],
      ['Texaco La Ceiba', 'LCB-001', 'Avenida San Isidro', 'La Ceiba', 'Atlántida', '2440-7777', 'Carlos Mejía', 15.7830, -86.7823]
    ];
    
    estacionesEjemplo.forEach((est) => {
      db.run(
        `INSERT OR IGNORE INTO estaciones (nombre, codigo, direccion, ciudad, departamento, telefono, encargado, latitud, longitud)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        est,
        (err) => {
          if (err && !err.message.includes('UNIQUE')) {
            console.error('❌ Error al crear estación:', err.message);
          }
        }
      );
    });
    
    console.log('✅ Estaciones de ejemplo creadas\n');
    
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 BASE DE DATOS INICIALIZADA CORRECTAMENTE');
    console.log('═══════════════════════════════════════════════');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📌 CREDENCIALES DE ACCESO:');
      console.log('   Email: admin@texaco.com');
      console.log('   Password: admin123');
      console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login\n');
    }
    
    // Cerrar conexión
    db.close((err) => {
      if (err) console.error('Error al cerrar DB:', err.message);
      // No hacer exit en producción para que Railway pueda continuar
      if (process.env.NODE_ENV !== 'production') {
        process.exit(0);
      }
    });
    
  } catch (error) {
    console.error('❌ Error en datos iniciales:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
});

/**
 * MIGRACIÓN A MR. FUEL V2.0
 * Actualiza la estructura de base de datos de v1 a v2
 */

require('dotenv').config();
const { db, runAsync, getAsync, allAsync } = require('../config/database');

async function migrarAV2() {
  console.log('🚀 Iniciando migración a Mr. Fuel v2.0...\n');

  try {
    // ===================================
    // CREAR TABLAS BASE (si no existen)
    // ===================================
    console.log('📊 Verificando tablas base del sistema...\n');

    // 0. Tabla de usuarios
    console.log('👥 Creando tabla de usuarios...');
    await runAsync(`
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
      )
    `);
    console.log('✅ Tabla usuarios verificada');

    // 0.1 Tabla de estaciones
    console.log('⛽ Creando tabla de estaciones...');
    await runAsync(`
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
      )
    `);
    console.log('✅ Tabla estaciones verificada');

    // 0.2 Tabla de auditorías v1 (legacy - necesaria para compatibilidad)
    console.log('📋 Creando tabla de auditorías v1 (legacy)...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS auditorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estacion_id INTEGER NOT NULL,
        auditor_id INTEGER NOT NULL,
        fecha_visita DATETIME NOT NULL,
        hora_visita TEXT NOT NULL,
        limpieza_bombas INTEGER DEFAULT 0,
        limpieza_bombas_nota TEXT,
        aceites_organizados INTEGER DEFAULT 0,
        aceites_organizados_nota TEXT,
        uniforme_completo INTEGER DEFAULT 0,
        uniforme_tiene_gorra INTEGER DEFAULT 0,
        uniforme_nota TEXT,
        saludo_protocolo INTEGER DEFAULT 0,
        saludo_nota TEXT,
        trato_compra INTEGER DEFAULT 0,
        trato_compra_nota TEXT,
        despedida_protocolo INTEGER DEFAULT 0,
        despedida_nota TEXT,
        calificacion_general REAL DEFAULT 0,
        observaciones_generales TEXT,
        recomendaciones TEXT,
        estado TEXT DEFAULT 'completada' CHECK(estado IN ('borrador', 'completada', 'revisada')),
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id),
        FOREIGN KEY (auditor_id) REFERENCES usuarios(id)
      )
    `);
    console.log('✅ Tabla auditorias v1 verificada');

    // 0.3 Tabla de fotos de auditoría v1
    console.log('📸 Creando tabla de fotos v1...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS auditoria_fotos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auditoria_id INTEGER NOT NULL,
        categoria TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        descripcion TEXT,
        fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (auditoria_id) REFERENCES auditorias(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla auditoria_fotos verificada');

    // 0.4 Tabla de recordatorios
    console.log('⏰ Creando tabla de recordatorios...');
    await runAsync(`
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
      )
    `);
    console.log('✅ Tabla recordatorios verificada');

    // 0.5 Índices para optimización
    console.log('🔍 Creando índices...');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_auditorias_fecha ON auditorias(fecha_visita)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_auditorias_estacion ON auditorias(estacion_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha_programada)');
    console.log('✅ Índices creados');

    console.log('\n✅ Todas las tablas base verificadas\n');

    // ===================================
    // CREAR TABLAS V2.0 (nuevas)
    // ===================================
    console.log('🆕 Creando tablas v2.0...\n');

    // 1. Crear tabla de categorías (PISTA, TIENDA, BODEGA, COCINA)
    console.log('📁 Creando tabla de categorías...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        orden INTEGER NOT NULL DEFAULT 0,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Crear tabla de ítems de auditoría (checklist dinámico)
    console.log('📝 Creando tabla de ítems...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS items_auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo_evaluacion TEXT DEFAULT 'cumple_no_cumple',
        orden INTEGER NOT NULL DEFAULT 0,
        activo INTEGER DEFAULT 1,
        max_fotos INTEGER DEFAULT 3,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
      )
    `);

    // 3. Nueva tabla de auditorías v2
    console.log('🔍 Creando tabla de auditorías v2...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS auditorias_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estacion_id INTEGER NOT NULL,
        auditor_id INTEGER NOT NULL,
        fecha_visita DATE NOT NULL,
        hora_visita TIME NOT NULL,
        calificacion_general REAL,
        total_items INTEGER DEFAULT 0,
        items_cumplidos INTEGER DEFAULT 0,
        observaciones_generales TEXT,
        recomendaciones TEXT,
        supervisor_nombre TEXT,
        supervisor_firma TEXT,
        estado TEXT DEFAULT 'completada',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id) ON DELETE CASCADE,
        FOREIGN KEY (auditor_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    // 4. Tabla de evaluaciones de items (respuestas del checklist)
    console.log('✅ Creando tabla de evaluaciones...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS evaluaciones_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auditoria_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        cumple INTEGER NOT NULL,
        observacion TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (auditoria_id) REFERENCES auditorias_v2(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items_auditoria(id) ON DELETE CASCADE
      )
    `);

    // 5. Tabla de fotos por item (hasta 3 por item)
    console.log('📸 Creando tabla de fotos por item...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS fotos_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluacion_id INTEGER NOT NULL,
        ruta_archivo TEXT NOT NULL,
        orden INTEGER DEFAULT 1,
        descripcion TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_items(id) ON DELETE CASCADE
      )
    `);

    // 6. Agregar versión del sistema
    console.log('🏷️  Creando tabla de configuración...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        descripcion TEXT,
        fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runAsync(`
      INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
      VALUES ('version', '2.0', 'Versión del sistema Mr. Fuel')
    `);

    await runAsync(`
      INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
      VALUES ('pie_pagina', 'Asesores Lab - WhatsApp: +504 9697 8435', 'Pie de página para reportes')
    `);

    // 6.1 Crear tabla de números de WhatsApp para notificaciones
    console.log('\n📱 Creando tabla de números WhatsApp...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS whatsapp_numeros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        numero TEXT NOT NULL,
        cargo TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla whatsapp_numeros creada');

    // Insertar números por defecto
    await runAsync(`
      INSERT OR IGNORE INTO whatsapp_numeros (nombre, numero, cargo, activo)
      VALUES ('Supervisor Principal', '+50496978435', 'Supervisor', 1)
    `);
    console.log('✅ Número WhatsApp por defecto agregado');

    // 6.2 Crear tabla de tickets de mantenimiento/fallas
    console.log('\n🎫 Creando tabla de tickets...');
    await runAsync(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estacion_id INTEGER NOT NULL,
        reportado_por INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        prioridad TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        area TEXT,
        estado TEXT DEFAULT 'pendiente',
        asignado_a INTEGER,
        fecha_reporte DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_resuelto DATETIME,
        solucion TEXT,
        costo_estimado REAL,
        costo_real REAL,
        foto_evidencia TEXT,
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id),
        FOREIGN KEY (reportado_por) REFERENCES usuarios(id),
        FOREIGN KEY (asignado_a) REFERENCES usuarios(id)
      )
    `);
    console.log('✅ Tabla tickets creada');

    // 7. Crear usuario admin por defecto si no existe
    console.log('\n👤 Verificando usuario administrador...');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    try {
      await runAsync(
        `INSERT OR IGNORE INTO usuarios (nombre, email, password, rol, telefono) 
         VALUES (?, ?, ?, ?, ?)`,
        ['Administrador Principal', 'admin@texaco.com', passwordHash, 'admin', '+504 9697 8435']
      );
      console.log('✅ Usuario admin verificado (email: admin@texaco.com, password: admin123)');
    } catch (err) {
      if (!err.message.includes('UNIQUE')) {
        console.log('⚠️  Usuario admin ya existe');
      }
    }

    // 8. Insertar categorías iniciales
    console.log('\n📋 Insertando categorías iniciales...');
    
    const categorias = [
      { nombre: 'PISTA', descripcion: 'Evaluación del área de pista', orden: 1 },
      { nombre: 'TIENDA', descripcion: 'Evaluación del área de tienda', orden: 2 },
      { nombre: 'BODEGA', descripcion: 'Evaluación del área de bodega', orden: 3 },
      { nombre: 'COCINA', descripcion: 'Evaluación del área de cocina', orden: 4 }
    ];

    for (const cat of categorias) {
      await runAsync(
        'INSERT OR IGNORE INTO categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
        [cat.nombre, cat.descripcion, cat.orden]
      );
      console.log(`  ✓ ${cat.nombre}`);
    }

    // 9. Insertar ítems de PISTA
    console.log('\n🛣️  Insertando ítems de PISTA...');
    const pistaCatId = (await getAsync('SELECT id FROM categorias WHERE nombre = ?', ['PISTA'])).id;
    
    const itemsPista = [
      'Uniformes',
      'Carnets',
      'Pista limpia',
      'Música',
      'Punto de ventas limpio',
      'Área verde limpia',
      'Área verde regada',
      'Arena limpia',
      'Basureros limpios'
    ];

    for (let i = 0; i < itemsPista.length; i++) {
      await runAsync(
        'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
        [pistaCatId, itemsPista[i], i + 1]
      );
      console.log(`  ✓ ${itemsPista[i]}`);
    }

    // 10. Insertar ítems de TIENDA
    console.log('\n🏪 Insertando ítems de TIENDA...');
    const tiendaCatId = (await getAsync('SELECT id FROM categorias WHERE nombre = ?', ['TIENDA'])).id;
    
    const itemsTienda = [
      'Uniformes',
      'Carnets',
      'Baños limpios',
      'Papel baño',
      'Jabón baño',
      'Música',
      'Multideck surtida',
      'Multideck limpia',
      'Cooler surtido',
      'Piso tienda limpio',
      'Pantallas',
      'Vidrios limpios',
      'Mesas limpias',
      'Barra limpia',
      'Basureros limpios',
      'Fechas de vencimiento',
      'Nescafé surtida',
      'Máquina de hot dog surtida',
      'Área de caja ordenada y limpia',
      'Dinero regado',
      'Panadería surtida',
      'Atienden celular',
      'Precios cooler',
      'Precios tienda',
      'Lista de pedidos'
    ];

    for (let i = 0; i < itemsTienda.length; i++) {
      await runAsync(
        'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
        [tiendaCatId, itemsTienda[i], i + 1]
      );
      console.log(`  ✓ ${itemsTienda[i]}`);
    }

    // 11. Insertar ítems de BODEGA
    console.log('\n📦 Insertando ítems de BODEGA...');
    const bodegaCatId = (await getAsync('SELECT id FROM categorias WHERE nombre = ?', ['BODEGA'])).id;
    
    const itemsBodega = [
      'Ordenado',
      'Limpio',
      'Cuarto eléctrico despejado'
    ];

    for (let i = 0; i < itemsBodega.length; i++) {
      await runAsync(
        'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
        [bodegaCatId, itemsBodega[i], i + 1]
      );
      console.log(`  ✓ ${itemsBodega[i]}`);
    }

    // 12. Insertar ítems de COCINA
    console.log('\n👨‍🍳 Insertando ítems de COCINA...');
    const cocinaCatId = (await getAsync('SELECT id FROM categorias WHERE nombre = ?', ['COCINA'])).id;
    
    const itemsCocina = [
      'Surtido',
      'Maya en pelo',
      'Uso de guantes',
      'Basureros limpios',
      'Lista de pedidos',
      'Ordenado',
      'Limpio'
    ];

    for (let i = 0; i < itemsCocina.length; i++) {
      await runAsync(
        'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
        [cocinaCatId, itemsCocina[i], i + 1]
      );
      console.log(`  ✓ ${itemsCocina[i]}`);
    }

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`  - 4 categorías creadas`);
    console.log(`  - ${itemsPista.length + itemsTienda.length + itemsBodega.length + itemsCocina.length} ítems creados`);
    console.log(`  - Tablas v2 creadas y listas`);
    console.log(`  - Sistema actualizado a versión 2.0\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrarAV2();

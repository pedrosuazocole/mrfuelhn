/**
 * MIGRACIÓN A MR. FUEL V2.0
 * Actualiza la estructura de base de datos de v1 a v2
 */

require('dotenv').config();
const { db, runAsync, getAsync, allAsync } = require('../config/database');

async function migrarAV2() {
  console.log('🚀 Iniciando migración a Mr. Fuel v2.0...\n');

  try {
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

    // 7. Insertar categorías iniciales
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

    // 8. Insertar ítems de PISTA
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

    // 9. Insertar ítems de TIENDA
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

    // 10. Insertar ítems de BODEGA
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

    // 11. Insertar ítems de COCINA
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

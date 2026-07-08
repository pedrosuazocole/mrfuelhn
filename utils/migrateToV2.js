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
        rol TEXT NOT NULL CHECK(rol IN ('admin', 'supervisor', 'auditor', 'tecnico', 'supervisor_pista', 'responsable_mantenimiento')),
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
        area_evaluada TEXT NOT NULL DEFAULT 'pista',
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
        textmebot_apikey TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla whatsapp_numeros creada');

    // Migrar columna callmebot_apikey si no existe (bases de datos existentes)
    try {
      await runAsync(`ALTER TABLE whatsapp_numeros ADD COLUMN textmebot_apikey TEXT`);
      // Migrar datos de callmebot_apikey a textmebot_apikey si existe
      try {
        await runAsync(`UPDATE whatsapp_numeros SET textmebot_apikey = callmebot_apikey WHERE callmebot_apikey IS NOT NULL`);
        console.log('✅ Datos migrados de callmebot_apikey a textmebot_apikey');
      } catch(e) { /* callmebot_apikey puede no existir */ }
      console.log('✅ Columna textmebot_apikey agregada a whatsapp_numeros');
    } catch (e) {
      // Columna ya existe — normal en deploys posteriores
      console.log('  ℹ️  textmebot_apikey ya existe en whatsapp_numeros');
    }

    // ── MIGRACIÓN CRÍTICA: agregar area_evaluada a auditorias_v2 ──────────
    // Esta columna faltaba en el esquema original y causaba el error
    // "upstream error is not valid JSON" al intentar guardar una auditoría
    try {
      await runAsync(`ALTER TABLE auditorias_v2 ADD COLUMN area_evaluada TEXT NOT NULL DEFAULT 'pista'`);
      console.log('✅ Columna area_evaluada agregada a auditorias_v2');
    } catch (e) {
      console.log('  ℹ️  area_evaluada ya existe en auditorias_v2');
    }

    // ── MIGRACIÓN: agregar estacion_id a whatsapp_numeros ─────────────────
    // Permite asignar cada número/API Key a una estación específica.
    // NULL = recibe notificaciones de TODAS las estaciones (comportamiento anterior)
    try {
      await runAsync(`ALTER TABLE whatsapp_numeros ADD COLUMN estacion_id INTEGER REFERENCES estaciones(id) ON DELETE SET NULL`);
      console.log('✅ Columna estacion_id agregada a whatsapp_numeros');
    } catch (e) {
      console.log('  ℹ️  estacion_id ya existe en whatsapp_numeros');
    }


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

    // 8. Limpiar ítems duplicados preservando auditorías existentes
    console.log('\n🧹 Limpiando ítems duplicados y reparando auditorías...');

    // Paso 1: Reasignar evaluaciones que apuntan a ítems duplicados
    // hacia el ítem canónico (MIN id) de su misma categoría y nombre
    await runAsync(`
      UPDATE evaluaciones_items
      SET item_id = (
        SELECT MIN(i2.id)
        FROM items_auditoria i2
        INNER JOIN items_auditoria i1 ON i1.id = evaluaciones_items.item_id
        WHERE i2.categoria_id = i1.categoria_id
          AND i2.nombre = i1.nombre
      )
      WHERE item_id NOT IN (
        SELECT MIN(id)
        FROM items_auditoria
        GROUP BY categoria_id, nombre
      )
    `);
    console.log('  ✓ Evaluaciones reasignadas al ítem canónico');

    // Paso 2: Eliminar evaluaciones duplicadas dentro de la misma auditoría
    // (puede haber quedado más de una evaluación del mismo ítem en la misma auditoría)
    await runAsync(`
      DELETE FROM evaluaciones_items
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM evaluaciones_items
        GROUP BY auditoria_id, item_id
      )
    `);
    console.log('  ✓ Evaluaciones duplicadas por auditoría eliminadas');

    // Paso 3: Ahora sí eliminar los ítems duplicados (las evaluaciones ya apuntan al correcto)
    await runAsync(`
      DELETE FROM items_auditoria
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM items_auditoria
        GROUP BY categoria_id, nombre
      )
    `);
    console.log('  ✓ Ítems duplicados eliminados');

    // Paso 4: Reordenar los ítems por categoría según su orden original
    const todasCategorias = await allAsync('SELECT id FROM categorias');
    for (const cat of todasCategorias) {
      const items = await allAsync(
        'SELECT id FROM items_auditoria WHERE categoria_id = ? ORDER BY orden, id',
        [cat.id]
      );
      for (let i = 0; i < items.length; i++) {
        await runAsync(
          'UPDATE items_auditoria SET orden = ? WHERE id = ?',
          [i + 1, items[i].id]
        );
      }
    }
    console.log('  ✓ Orden de ítems corregido');

    // 8b. Insertar categorías iniciales
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

    // 9. Insertar ítems de PISTA (solo si no existen)
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

    const pistaExistentes = await getAsync('SELECT COUNT(*) as total FROM items_auditoria WHERE categoria_id = ?', [pistaCatId]);
    if (pistaExistentes.total === 0) {
      for (let i = 0; i < itemsPista.length; i++) {
        await runAsync(
          'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
          [pistaCatId, itemsPista[i], i + 1]
        );
        console.log(`  ✓ ${itemsPista[i]}`);
      }
    } else {
      console.log(`  ℹ️  PISTA ya tiene ${pistaExistentes.total} ítems, omitiendo inserción`);
    }

    // 10. Insertar ítems de TIENDA (solo si no existen)
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

    const tiendaExistentes = await getAsync('SELECT COUNT(*) as total FROM items_auditoria WHERE categoria_id = ?', [tiendaCatId]);
    if (tiendaExistentes.total === 0) {
      for (let i = 0; i < itemsTienda.length; i++) {
        await runAsync(
          'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
          [tiendaCatId, itemsTienda[i], i + 1]
        );
        console.log(`  ✓ ${itemsTienda[i]}`);
      }
    } else {
      console.log(`  ℹ️  TIENDA ya tiene ${tiendaExistentes.total} ítems, omitiendo inserción`);
    }

    // 11. Insertar ítems de BODEGA (solo si no existen)
    console.log('\n📦 Insertando ítems de BODEGA...');
    const bodegaCatId = (await getAsync('SELECT id FROM categorias WHERE nombre = ?', ['BODEGA'])).id;
    
    const itemsBodega = [
      'Ordenado',
      'Limpio',
      'Cuarto eléctrico despejado'
    ];

    const bodegaExistentes = await getAsync('SELECT COUNT(*) as total FROM items_auditoria WHERE categoria_id = ?', [bodegaCatId]);
    if (bodegaExistentes.total === 0) {
      for (let i = 0; i < itemsBodega.length; i++) {
        await runAsync(
          'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
          [bodegaCatId, itemsBodega[i], i + 1]
        );
        console.log(`  ✓ ${itemsBodega[i]}`);
      }
    } else {
      console.log(`  ℹ️  BODEGA ya tiene ${bodegaExistentes.total} ítems, omitiendo inserción`);
    }

    // 12. Insertar ítems de COCINA (solo si no existen)
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

    const cocinaExistentes = await getAsync('SELECT COUNT(*) as total FROM items_auditoria WHERE categoria_id = ?', [cocinaCatId]);
    if (cocinaExistentes.total === 0) {
      for (let i = 0; i < itemsCocina.length; i++) {
        await runAsync(
          'INSERT INTO items_auditoria (categoria_id, nombre, orden) VALUES (?, ?, ?)',
          [cocinaCatId, itemsCocina[i], i + 1]
        );
        console.log(`  ✓ ${itemsCocina[i]}`);
      }
    } else {
      console.log(`  ℹ️  COCINA ya tiene ${cocinaExistentes.total} ítems, omitiendo inserción`);
    }

    // ===================================
    // TABLAS DE MANTENIMIENTO
    // ===================================

    // Tabla de categorías de mantenimiento
    await runAsync(`
      CREATE TABLE IF NOT EXISTS mantenimiento_categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        orden INTEGER NOT NULL DEFAULT 0,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla mantenimiento_categorias creada');

    // Tabla de ítems de mantenimiento
    await runAsync(`
      CREATE TABLE IF NOT EXISTS mantenimiento_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        orden INTEGER NOT NULL DEFAULT 0,
        activo INTEGER DEFAULT 1,
        max_fotos INTEGER DEFAULT 3,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES mantenimiento_categorias(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla mantenimiento_items creada');

    // Tabla de mantenimientos (checklist ejecutado)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS mantenimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estacion_id INTEGER NOT NULL,
        tecnico_id INTEGER NOT NULL,
        categoria_id INTEGER NOT NULL,
        fecha_visita DATE NOT NULL,
        hora_visita TIME NOT NULL,
        calificacion_general REAL DEFAULT 0,
        observaciones_generales TEXT,
        recomendaciones TEXT,
        estado TEXT DEFAULT 'completado',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id),
        FOREIGN KEY (tecnico_id) REFERENCES usuarios(id),
        FOREIGN KEY (categoria_id) REFERENCES mantenimiento_categorias(id)
      )
    `);
    console.log('✅ Tabla mantenimientos creada');

    // Tabla de evaluaciones de mantenimiento
    await runAsync(`
      CREATE TABLE IF NOT EXISTS mantenimiento_evaluaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mantenimiento_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        cumple INTEGER DEFAULT 0,
        observacion TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES mantenimiento_items(id)
      )
    `);
    console.log('✅ Tabla mantenimiento_evaluaciones creada');

    // Tabla de fotos de mantenimiento
    await runAsync(`
      CREATE TABLE IF NOT EXISTS mantenimiento_fotos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluacion_id INTEGER NOT NULL,
        ruta_archivo TEXT NOT NULL,
        orden INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evaluacion_id) REFERENCES mantenimiento_evaluaciones(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla mantenimiento_fotos creada');

    // Insertar categoría Aire Acondicionado (solo si no existe)
    const acExistente = await getAsync(
      "SELECT id FROM mantenimiento_categorias WHERE nombre = 'Aire Acondicionado'"
    );
    if (!acExistente) {
      await runAsync(
        'INSERT INTO mantenimiento_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
        ['Aire Acondicionado', 'Mantenimiento de equipos de aire acondicionado', 1]
      );
      const acId = (await getAsync("SELECT id FROM mantenimiento_categorias WHERE nombre = 'Aire Acondicionado'")).id;

      const itemsAC = [
        'Limpieza de filtros',
        'Revisión de compresor',
        'Carga de refrigerante',
        'Limpieza de evaporador',
        'Limpieza de condensador',
        'Revisión de termostato',
        'Revisión de drenaje',
        'Revisión eléctrica',
        'Prueba de funcionamiento',
        'Revisión de correas y fajas'
      ];

      const acItemsExistentes = await getAsync(
        'SELECT COUNT(*) as total FROM mantenimiento_items WHERE categoria_id = ?', [acId]
      );
      if (acItemsExistentes.total === 0) {
        for (let i = 0; i < itemsAC.length; i++) {
          await runAsync(
            'INSERT INTO mantenimiento_items (categoria_id, nombre, orden) VALUES (?, ?, ?)',
            [acId, itemsAC[i], i + 1]
          );
        }
        console.log(`✅ ${itemsAC.length} ítems de Aire Acondicionado creados`);
      }
    } else {
      console.log('  ℹ️  Categoría Aire Acondicionado ya existe, omitiendo');
    }

    // ── Nueva categoría: Generador-Compresor de Aire Semanal ──────────────
    const gcNombre = 'Mantenimiento Generador-Compresor de Aire Semanal';
    const gcExist  = await getAsync(
      "SELECT id FROM mantenimiento_categorias WHERE nombre = ?", [gcNombre]
    );
    if (!gcExist) {
      await runAsync(
        'INSERT INTO mantenimiento_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
        [gcNombre, 'Mantenimiento semanal de generador y compresor de aire', 2]
      );
      const gcId = (await getAsync("SELECT id FROM mantenimiento_categorias WHERE nombre = ?", [gcNombre])).id;

      const itemsGC = [
        // Generador
        { nombre: 'Prueba de Operación — Generador bajo carga (mín. 20 min)',  descripcion: 'Enciende el generador bajo carga y verifica que funcione correctamente durante al menos 20 minutos', max_fotos: 5 },
        { nombre: 'Prueba de Operación — Ruidos y vibraciones anormales',       descripcion: 'Escucha ruidos inusuales y observa posibles vibraciones anormales',                                    max_fotos: 5 },
        { nombre: 'Filtro de Aire — Inspección y limpieza',                     descripcion: 'Inspecciona el filtro de aire y límpialo si está sucio',                                                max_fotos: 5 },
        { nombre: 'Mangueras y Conexiones — Refrigerante y combustible',        descripcion: 'Inspecciona mangueras y conexiones de refrigerante y combustible para detectar fugas o desgaste',      max_fotos: 5 },
        // Compresor de Aire
        { nombre: 'Drenaje del Tanque de Aire',                                 descripcion: 'Drena el agua acumulada en el tanque para evitar corrosión interna. Hacerlo con el compresor apagado y despresurizado', max_fotos: 5 },
        { nombre: 'Revisión de Mangueras y Conexiones — Compresor',            descripcion: 'Inspecciona mangueras y conexiones en busca de desgaste, grietas o fugas. Reemplaza componentes si es necesario', max_fotos: 5 },
        { nombre: 'Pruebas de Seguridad — Válvulas y manómetro',               descripcion: 'Verifica que las válvulas de seguridad y el manómetro estén funcionando correctamente',              max_fotos: 5 },
      ];

      for (let i = 0; i < itemsGC.length; i++) {
        await runAsync(
          'INSERT INTO mantenimiento_items (categoria_id, nombre, descripcion, orden, max_fotos) VALUES (?, ?, ?, ?, ?)',
          [gcId, itemsGC[i].nombre, itemsGC[i].descripcion, i + 1, itemsGC[i].max_fotos]
        );
      }
      console.log(`✅ Categoría "${gcNombre}" creada con ${itemsGC.length} ítems`);
    } else {
      console.log(`  ℹ️  Categoría "${gcNombre}" ya existe, omitiendo`);
    }

    // ── Nueva categoría: Extintores-Tanque de Agua Bimestral ──────────────
    const etNombre = 'Mantenimiento Extintores-Tanque de Agua Bimestral';
    const etExist  = await getAsync(
      'SELECT id FROM mantenimiento_categorias WHERE nombre = ?', [etNombre]
    );
    if (!etExist) {
      await runAsync(
        'INSERT INTO mantenimiento_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
        [etNombre, 'Mantenimiento bimestral de extintores y tanque de presión de agua', 3]
      );
      const etId = (await getAsync('SELECT id FROM mantenimiento_categorias WHERE nombre = ?', [etNombre])).id;

      const itemsET = [
        // ── Extintores ────────────────────────────────────────────────────
        { nombre: 'Extintor Bomba 1 — Estado (Bueno/Malo)',                     desc: 'Verificar estado del extintor Bomba 1' },
        { nombre: 'Extintor Bomba 2 — Estado (Bueno/Malo)',                     desc: 'Verificar estado del extintor Bomba 2' },
        { nombre: 'Extintor Bomba 3 — Estado (Bueno/Malo)',                     desc: 'Verificar estado del extintor Bomba 3' },
        { nombre: 'Extintor Bomba 4 — Estado (Bueno/Malo)',                     desc: 'Verificar estado del extintor Bomba 4' },
        { nombre: 'Extintor Bomba 5 — Estado (Bueno/Malo)',                     desc: 'Verificar estado del extintor Bomba 5' },
        { nombre: 'Extintor Bomba 6 — Estado (Bueno/Malo)',                     desc: 'Verificar estado del extintor Bomba 6' },
        { nombre: 'Extintor Cuarto de Máquinas — Estado (Bueno/Malo)',          desc: 'Verificar estado del extintor del Cuarto de Máquinas' },
        { nombre: 'Extintor Pasillo Oficina — Estado (Bueno/Malo)',             desc: 'Verificar estado del extintor del Pasillo Oficina' },
        { nombre: 'Extintor Cocina — Estado (Bueno/Malo)',                      desc: 'Verificar estado del extintor de Cocina' },
        { nombre: 'Extintor Oficina Contabilidad — Estado (Bueno/Malo)',        desc: 'Verificar estado del extintor de Oficina Contabilidad' },
        { nombre: 'Extintor Bodega de Vencidos — Estado (Bueno/Malo)',          desc: 'Verificar estado del extintor de Bodega de Vencidos' },
        { nombre: 'Fecha de Vencimiento de Extintores',                         desc: 'Registrar fechas de vencimiento de todos los extintores (Bombas 1-6, Cuarto de Máquinas, Pasillo Oficina, Cocina, Oficina Contabilidad, Bodega de Vencidos)' },
        // ── Tanque de Presión de Agua ─────────────────────────────────────
        { nombre: 'Verificación de Presión Interna — Medición con manómetro',  desc: 'Usa un manómetro para medir la presión del aire dentro del tanque' },
        { nombre: 'Verificación de Presión Interna — Ajuste de presión',       desc: 'Ajusta la presión si es necesario (generalmente 2-4 PSI por debajo del ajuste del interruptor de la bomba)' },
        { nombre: 'Inspección de Válvulas — Entrada y salida',                 desc: 'Verifica que las válvulas de entrada y salida funcionen correctamente' },
        { nombre: 'Inspección de Conexiones — Sin obstrucciones ni desgaste',  desc: 'Asegúrate de que las conexiones no estén obstruidas ni desgastadas' },
        { nombre: 'Limpieza Externa del Tanque y área circundante',            desc: 'Limpia el tanque y el área circundante para evitar acumulación de polvo, suciedad o residuos' },
        { nombre: 'Calibración del Sistema — Bomba e interruptor de presión',  desc: 'Asegúrate de que la bomba y el interruptor de presión estén ajustados según las necesidades del sistema' },
        // ── Generador Bimestral ───────────────────────────────────────────
        { nombre: 'Generador — Inspección General (alternador, correas, ventiladores)', desc: 'Revisa el estado del alternador, correas, ventiladores y el sistema de enfriamiento' },
        { nombre: 'Generador — Prueba de Batería (voltaje y carga)',           desc: 'Mide el voltaje y carga de la batería. Sustituye si los niveles están fuera de rango' },
        { nombre: 'Generador — Revisión del Sistema de Combustible',           desc: 'Comprueba el tanque de combustible, líneas y filtros en busca de obstrucciones o contaminantes' },
        { nombre: 'Generador — Drenaje del Agua del Tanque de Combustible',   desc: 'Elimina cualquier acumulación de agua o sedimentos en el tanque de combustible' },
      ];

      for (let i = 0; i < itemsET.length; i++) {
        await runAsync(
          'INSERT INTO mantenimiento_items (categoria_id, nombre, descripcion, orden, max_fotos) VALUES (?, ?, ?, ?, ?)',
          [etId, itemsET[i].nombre, itemsET[i].desc, i + 1, 5]
        );
      }
      console.log(`✅ Categoría "${etNombre}" creada con ${itemsET.length} ítems`);
    } else {
      console.log(`  ℹ️  Categoría "${etNombre}" ya existe, omitiendo`);
    }

    // ── Nueva categoría: Mangueras-Dispensador-Trampa Trimestral ─────────
    const mdtNombre = 'Mantenimiento Mangueras-Dispensador-Trampa Trimestral';
    const mdtExist  = await getAsync(
      'SELECT id FROM mantenimiento_categorias WHERE nombre = ?', [mdtNombre]
    );
    if (!mdtExist) {
      await runAsync(
        'INSERT INTO mantenimiento_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
        [mdtNombre, 'Mantenimiento trimestral de mangueras, dispensadores, generador y trampa de grasa', 4]
      );
      const mdtId = (await getAsync('SELECT id FROM mantenimiento_categorias WHERE nombre = ?', [mdtNombre])).id;

      const itemsMDT = [
        // ── Mangueras ─────────────────────────────────────────────────────
        { nombre: 'Manguera Bomba 1 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 1' },
        { nombre: 'Manguera Bomba 2 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 2' },
        { nombre: 'Manguera Bomba 3 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 3' },
        { nombre: 'Manguera Bomba 4 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 4' },
        { nombre: 'Manguera Bomba 5 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 5' },
        { nombre: 'Manguera Bomba 6 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 6' },
        { nombre: 'Manguera Bomba 7 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la manguera del Dispensador Bomba 7' },
        // ── Boquillas ─────────────────────────────────────────────────────
        { nombre: 'Boquilla Bomba 1 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 1' },
        { nombre: 'Boquilla Bomba 2 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 2' },
        { nombre: 'Boquilla Bomba 3 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 3' },
        { nombre: 'Boquilla Bomba 4 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 4' },
        { nombre: 'Boquilla Bomba 5 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 5' },
        { nombre: 'Boquilla Bomba 6 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 6' },
        { nombre: 'Boquilla Bomba 7 — Estado (Bueno/Malo)',           desc: 'Verificar estado de la boquilla del Dispensador Bomba 7' },
        // ── Calibración del Dispensador ───────────────────────────────────
        { nombre: 'Calibración Dispensador — Resultado Bomba 1',      desc: 'Resultado de calibración del dispensador Bomba 1 (cada 3 meses)' },
        { nombre: 'Calibración Dispensador — Resultado Bomba 2',      desc: 'Resultado de calibración del dispensador Bomba 2' },
        { nombre: 'Calibración Dispensador — Resultado Bomba 3',      desc: 'Resultado de calibración del dispensador Bomba 3' },
        { nombre: 'Calibración Dispensador — Resultado Bomba 4',      desc: 'Resultado de calibración del dispensador Bomba 4' },
        { nombre: 'Calibración Dispensador — Resultado Bomba 5',      desc: 'Resultado de calibración del dispensador Bomba 5' },
        { nombre: 'Calibración Dispensador — Resultado Bomba 6',      desc: 'Resultado de calibración del dispensador Bomba 6' },
        { nombre: 'Calibración Dispensador — Resultado Bomba 7',      desc: 'Resultado de calibración del dispensador Bomba 7' },
        // ── Generador Trimestral ──────────────────────────────────────────
        { nombre: 'Generador — Sistema de Refrigeración',             desc: 'Revisa y limpia el radiador, verifica el nivel y la calidad del refrigerante' },
        { nombre: 'Generador — Sistema Eléctrico',                    desc: 'Inspecciona cables, conexiones y terminales en busca de desgaste o corrosión' },
        { nombre: 'Generador — Prueba de Carga Completa',             desc: 'Opera el generador a su capacidad máxima para asegurarte de que puede soportar la carga' },
        // ── Trampa de Grasa ───────────────────────────────────────────────
        { nombre: 'Trampa de Grasa — Retiro de grasas y residuos sólidos',          desc: 'Retirar grasas y residuos sólidos acumulados en la trampa' },
        { nombre: 'Trampa de Grasa — Limpieza interna (paredes y fondo)',            desc: 'Limpiar paredes y fondo internos de la trampa de grasa' },
        { nombre: 'Trampa de Grasa — Revisión de tuberías de entrada y salida',     desc: 'Revisar el estado de las tuberías de entrada y salida' },
        { nombre: 'Trampa de Grasa — Inspección de filtros y rejillas',             desc: 'Inspeccionar el estado de filtros y rejillas de la trampa' },
        { nombre: 'Trampa de Grasa — Tratamiento enzimático (si aplica)',           desc: 'Aplicar tratamiento enzimático si es necesario según condiciones' },
      ];

      for (let i = 0; i < itemsMDT.length; i++) {
        await runAsync(
          'INSERT INTO mantenimiento_items (categoria_id, nombre, descripcion, orden, max_fotos) VALUES (?, ?, ?, ?, ?)',
          [mdtId, itemsMDT[i].nombre, itemsMDT[i].desc, i + 1, 5]
        );
      }
      console.log(`✅ Categoría "${mdtNombre}" creada con ${itemsMDT.length} ítems`);
    } else {
      console.log(`  ℹ️  Categoría "${mdtNombre}" ya existe, omitiendo`);
    }

    // ── Nueva categoría: Filtros de Combustible Semestral ─────────────────
    const fcsNombre = 'Mantenimiento Filtros de Combustible Semestral';
    const fcsExist  = await getAsync(
      'SELECT id FROM mantenimiento_categorias WHERE nombre = ?', [fcsNombre]
    );
    if (!fcsExist) {
      await runAsync(
        'INSERT INTO mantenimiento_categorias (nombre, descripcion, orden) VALUES (?, ?, ?)',
        [fcsNombre, 'Mantenimiento semestral de filtros, sensores, pantallas y cisterna', 5]
      );
      const fcsId = (await getAsync('SELECT id FROM mantenimiento_categorias WHERE nombre = ?', [fcsNombre])).id;

      const itemsFCS = [
        // ── Filtros de Combustible ─────────────────────────────────────────
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 1',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 1 (cada 6 meses)' },
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 2',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 2' },
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 3',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 3' },
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 4',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 4' },
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 5',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 5' },
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 6',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 6' },
        { nombre: 'Filtro de Combustible — Tipo y estado Bomba 7',    desc: 'Inspección y registro del tipo de filtro de combustible del Dispensador Bomba 7' },
        // ── Sensores ──────────────────────────────────────────────────────
        { nombre: 'Sensor Dispensador Bomba 1 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 1 (cada 6 meses)' },
        { nombre: 'Sensor Dispensador Bomba 2 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 2' },
        { nombre: 'Sensor Dispensador Bomba 3 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 3' },
        { nombre: 'Sensor Dispensador Bomba 4 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 4' },
        { nombre: 'Sensor Dispensador Bomba 5 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 5' },
        { nombre: 'Sensor Dispensador Bomba 6 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 6' },
        { nombre: 'Sensor Dispensador Bomba 7 — Estado (Bueno/Malo)', desc: 'Verificar estado del sensor del Dispensador Bomba 7' },
        // ── Pantallas ─────────────────────────────────────────────────────
        { nombre: 'Pantalla Dispensador Bomba 1 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 1 (cada 6 meses)' },
        { nombre: 'Pantalla Dispensador Bomba 2 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 2' },
        { nombre: 'Pantalla Dispensador Bomba 3 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 3' },
        { nombre: 'Pantalla Dispensador Bomba 4 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 4' },
        { nombre: 'Pantalla Dispensador Bomba 5 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 5' },
        { nombre: 'Pantalla Dispensador Bomba 6 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 6' },
        { nombre: 'Pantalla Dispensador Bomba 7 — Estado (Bueno/Malo)', desc: 'Verificar estado de la pantalla del Dispensador Bomba 7' },
        // ── Limpieza de Cisterna de Agua ──────────────────────────────────
        { nombre: 'Cisterna — Se cerró la válvula de entrada de agua',          desc: 'Verificar que se cerró correctamente la válvula de entrada antes de iniciar la limpieza' },
        { nombre: 'Cisterna — Se vació completamente la cisterna',              desc: 'Confirmar que la cisterna fue vaciada completamente' },
        { nombre: 'Cisterna — Se retiraron residuos sólidos',                  desc: 'Retirar todos los residuos sólidos acumulados en la cisterna' },
        { nombre: 'Cisterna — Se limpiaron paredes y fondo',                   desc: 'Limpieza completa de paredes internas y fondo de la cisterna' },
        { nombre: 'Cisterna — Se aplicó desinfectante (cloro, etc.)',          desc: 'Aplicar desinfectante (cloro u otro) en toda la superficie interna' },
        { nombre: 'Cisterna — Se realizó enjuague con agua limpia',            desc: 'Enjuagar completamente la cisterna con agua potable limpia' },
        { nombre: 'Cisterna — Se inspeccionó estado de la cisterna',           desc: 'Inspeccionar el estado general de la cisterna (grietas, desgaste, etc.)' },
        { nombre: 'Cisterna — Se revisaron válvulas y tuberías',               desc: 'Revisar el estado y funcionamiento de válvulas y tuberías conectadas a la cisterna' },
        { nombre: 'Cisterna — Se llenó la cisterna con agua potable',          desc: 'Llenar la cisterna con agua potable tras completar la limpieza' },
        { nombre: 'Cisterna — Se verificó el correcto funcionamiento',         desc: 'Verificar el correcto funcionamiento del sistema tras el llenado' },
      ];

      for (let i = 0; i < itemsFCS.length; i++) {
        await runAsync(
          'INSERT INTO mantenimiento_items (categoria_id, nombre, descripcion, orden, max_fotos) VALUES (?, ?, ?, ?, ?)',
          [fcsId, itemsFCS[i].nombre, itemsFCS[i].desc, i + 1, 5]
        );
      }
      console.log(`✅ Categoría "${fcsNombre}" creada con ${itemsFCS.length} ítems`);
    } else {
      console.log(`  ℹ️  Categoría "${fcsNombre}" ya existe, omitiendo`);
    }

    // ── Migrar tabla mantenimientos: agregar columnas de firma si no existen ──
    for (const col of [
      "ADD COLUMN responsable_nombre TEXT",
      "ADD COLUMN responsable_firma  TEXT",
      "ADD COLUMN supervisor_nombre  TEXT",
      "ADD COLUMN supervisor_firma   TEXT",
    ]) {
      try { await runAsync(`ALTER TABLE mantenimientos ${col}`); }
      catch(e) { /* columna ya existe */ }
    }
    console.log('✅ Columnas de firma en mantenimientos verificadas');

    // ── Migrar roles: agregar supervisor_pista y responsable_mantenimiento ──
    try {
      await runAsync(`INSERT INTO usuarios (nombre, email, password, rol) VALUES ('__test_sp__','__sp__@t.com','x','supervisor_pista')`);
      await runAsync(`DELETE FROM usuarios WHERE email = '__sp__@t.com'`);
      console.log('✅ Roles nuevos ya soportados');
    } catch(e) {
      if (e.message && e.message.includes('CHECK constraint failed')) {
        console.log('⚠️  Constraint sin nuevos roles — migrando tabla usuarios...');
        await runAsync('PRAGMA foreign_keys = OFF');
        await runAsync('DROP TABLE IF EXISTS usuarios_new');
        await runAsync(`
          CREATE TABLE usuarios_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('admin','supervisor','auditor','tecnico','supervisor_pista','responsable_mantenimiento')),
            telefono TEXT,
            activo INTEGER DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            ultimo_acceso DATETIME
          )
        `);
        await runAsync(`INSERT INTO usuarios_new SELECT * FROM usuarios`);
        await runAsync(`DROP TABLE usuarios`);
        await runAsync(`ALTER TABLE usuarios_new RENAME TO usuarios`);
        await runAsync('PRAGMA foreign_keys = ON');
        console.log('✅ Tabla usuarios migrada con roles supervisor_pista y responsable_mantenimiento');
      }
    }

    // ===================================
    // MIGRACIÓN: Agregar rol 'tecnico'
    // ===================================
    console.log('\n🔧 Verificando rol tecnico en tabla usuarios...');
    try {
      await runAsync(`INSERT INTO usuarios (nombre, email, password, rol) VALUES ('__test__', '__test__@test.com', 'x', 'tecnico')`);
      await runAsync(`DELETE FROM usuarios WHERE email = '__test__@test.com'`);
      console.log('  ✅ Rol tecnico ya soportado, no se necesita migración');
    } catch (e) {
      if (e.message && e.message.includes('CHECK constraint failed')) {
        console.log('  ⚠️  Constraint antiguo detectado, migrando tabla usuarios...');

        // Desactivar FOREIGN KEYS para poder recrear la tabla
        await runAsync(`PRAGMA foreign_keys = OFF`);

        // Eliminar tabla temporal si quedó de un intento anterior
        await runAsync(`DROP TABLE IF EXISTS usuarios_new`);

        // 1. Crear tabla nueva con constraint correcto
        await runAsync(`
          CREATE TABLE usuarios_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('admin', 'supervisor', 'auditor', 'tecnico', 'supervisor_pista', 'responsable_mantenimiento')),
            telefono TEXT,
            activo INTEGER DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            ultimo_acceso DATETIME
          )
        `);

        // 2. Copiar todos los datos existentes
        await runAsync(`INSERT INTO usuarios_new SELECT * FROM usuarios`);

        // 3. Eliminar tabla vieja y renombrar la nueva
        await runAsync(`DROP TABLE usuarios`);
        await runAsync(`ALTER TABLE usuarios_new RENAME TO usuarios`);

        // Reactivar FOREIGN KEYS
        await runAsync(`PRAGMA foreign_keys = ON`);

        console.log('  ✅ Tabla usuarios migrada con rol tecnico');
      } else {
        console.log('  ⚠️  Error inesperado en verificación de rol:', e.message);
      }
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

# 🚀 MR. FUEL V2.0 - GUÍA DE ACTUALIZACIÓN

## 📋 Novedades de la Versión 2.0

### ✨ Nuevas Funcionalidades

1. **Sistema de Checklist Escalable**
   - 4 categorías predefinidas: PISTA, TIENDA, BODEGA, COCINA
   - 44 ítems de evaluación configurados
   - Los administradores pueden agregar más categorías e ítems

2. **Evidencia Fotográfica por Ítem**
   - Hasta 3 fotos por cada ítem evaluado
   - Captura directa desde cámara o galería
   - Previsualizaciones antes de guardar

3. **Firma Digital del Supervisor**
   - Canvas HTML5 para firma manuscrita
   - Compatible con mouse y touch
   - Se guarda como imagen base64

4. **Reportes Mejorados**
   - Email con galería de todas las fotos
   - Organización por categorías
   - Estadísticas detalladas de cumplimiento

5. **Panel de Administración**
   - CRUD completo de categorías
   - CRUD completo de ítems
   - Reordenamiento drag & drop

---

## 🏗️ Arquitectura de Base de Datos

### Nuevas Tablas

```sql
categorias
├── id (PK)
├── nombre
├── descripcion
├── orden
├── activo
└── fecha_creacion

items_auditoria
├── id (PK)
├── categoria_id (FK)
├── nombre
├── descripcion
├── tipo_evaluacion
├── orden
├── activo
├── max_fotos
└── fecha_creacion

auditorias_v2
├── id (PK)
├── estacion_id (FK)
├── auditor_id (FK)
├── fecha_visita
├── hora_visita
├── calificacion_general
├── total_items
├── items_cumplidos
├── observaciones_generales
├── recomendaciones
├── supervisor_nombre
├── supervisor_firma
├── estado
└── fecha_creacion

evaluaciones_items
├── id (PK)
├── auditoria_id (FK)
├── item_id (FK)
├── cumple
├── observacion
└── fecha_creacion

fotos_items
├── id (PK)
├── evaluacion_id (FK)
├── ruta_archivo
├── orden
├── descripcion
└── fecha_creacion

configuracion
├── clave (PK)
├── valor
├── descripcion
└── fecha_actualizacion
```

---

## 📦 Instalación

### Opción 1: Proyecto Nuevo

```bash
# 1. Extraer archivos
unzip mr-fuel-v2.zip
cd mr-fuel-v2

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar migración
node utils/migrateToV2.js

# 5. Iniciar aplicación
npm start
```

### Opción 2: Actualizar desde v1.0

**⚠️ IMPORTANTE: Hacer backup de la base de datos antes de actualizar**

```bash
# 1. Backup
cp database/mrfuel.db database/mrfuel-v1-backup.db

# 2. Actualizar código
# Extraer el ZIP sobre el proyecto existente

# 3. Instalar nuevas dependencias
npm install

# 4. Ejecutar migración
node utils/migrateToV2.js

# 5. Iniciar
npm start
```

---

## 🎯 Checklist Predefinido

### PISTA (9 ítems)
1. Uniformes
2. Carnets
3. Pista limpia
4. Música
5. Punto de ventas limpio
6. Área verde limpia
7. Área verde regada
8. Arena limpia
9. Basureros limpios

### TIENDA (25 ítems)
1. Uniformes
2. Carnets
3. Baños limpios
4. Papel baño
5. Jabón baño
6. Música
7. Multideck surtida
8. Multideck limpia
9. Cooler surtido
10. Piso tienda limpio
11. Pantallas
12. Vidrios limpios
13. Mesas limpias
14. Barra limpia
15. Basureros limpios
16. Fechas de vencimiento
17. Nescafé surtida
18. Máquina de hot dog surtida
19. Área de caja ordenada y limpia
20. Dinero regado
21. Panadería surtida
22. Atienden celular
23. Precios cooler
24. Precios tienda
25. Lista de pedidos

### BODEGA (3 ítems)
1. Ordenado
2. Limpio
3. Cuarto eléctrico despejado

### COCINA (7 ítems)
1. Surtido
2. Maya en pelo
3. Uso de guantes
4. Basureros limpios
5. Lista de pedidos
6. Ordenado
7. Limpio

**Total: 44 ítems**

---

## 🛠️ Uso del Sistema

### Para Auditores

1. **Crear Auditoría:**
   - Click en "Nueva Auditoría v2.0"
   - Seleccionar estación, fecha y hora
   - Evaluar cada ítem (switch verde/rojo)
   - Agregar observaciones opcionales
   - Subir hasta 3 fotos por ítem
   - Completar observaciones generales
   - Firmar digitalmente (opcional)
   - Guardar

2. **Ver Auditorías:**
   - Lista completa de auditorías
   - Ver detalle con todas las fotos
   - Calificación y estadísticas

### Para Administradores

1. **Gestionar Checklist:**
   - Click en "Checklist" en el menú
   - Ver categorías existentes
   - Agregar nueva categoría
   - Ver ítems de una categoría
   - Agregar/editar/eliminar ítems
   - Reordenar con drag & drop

2. **Configurar Sistema:**
   - Editar pie de página
   - Activar/desactivar categorías
   - Ajustar número máximo de fotos por ítem

---

## 📧 Notificaciones por Email

### Formato del Reporte v2.0

El email incluye:
- Información de la estación y auditor
- Calificación general (grande y colorida)
- Evaluación detallada por categorías
- Lista de todos los ítems (✅/❌)
- Observaciones de cada ítem
- Galería con TODAS las fotos
- Observaciones generales
- Recomendaciones
- Firma digital del supervisor
- Nuevo pie de página: "Asesores Lab - WhatsApp: +504 9697 8435"

### Destinatarios

Los emails se envían a:
- Todos los emails en `ADMIN_EMAILS`
- Todos los emails en `SUPERVISOR_EMAILS`

---

## 🎨 Características del Formulario

### 1. Switches Cumple/No Cumple
- Verde = Cumple ✅
- Rojo = No Cumple ❌
- Fácil de cambiar con un tap

### 2. Botones de Acción por Ítem
- 💬 **Comentario:** Agregar observación específica
- 📷 **Cámara:** Subir hasta 3 fotos

### 3. Captura de Fotos
- Desde cámara o galería
- Previsualizaciones inmediatas
- Borrar foto antes de enviar
- Contador de fotos por ítem

### 4. Firma Digital
- Canvas responsive
- Compatible con mouse y touch
- Botón para limpiar y volver a firmar
- Se guarda como imagen

### 5. Barra de Progreso
- Muestra avance al guardar
- Indicador visual mientras sube fotos

---

## 🔧 Panel de Administración

### Gestión de Categorías

**Ver Categorías:**
- Lista de todas las categorías
- Número de ítems por categoría
- Estado (activa/inactiva)

**Agregar Categoría:**
- Nombre (obligatorio)
- Descripción (opcional)
- Orden (número)

**Editar Categoría:**
- Cambiar nombre
- Actualizar descripción
- Cambiar orden
- Activar/desactivar

**Eliminar Categoría:**
- Confirma antes de borrar
- Borra en cascada sus ítems

### Gestión de Ítems

**Ver Ítems:**
- Lista de ítems de una categoría
- Ordenados por número de orden

**Agregar Ítem:**
- Nombre (obligatorio)
- Descripción (opcional)
- Tipo de evaluación (cumple/no cumple)
- Máximo de fotos (default: 3)
- Orden (número)

**Editar Ítem:**
- Modificar cualquier campo
- Activar/desactivar

**Reordenar:**
- Drag & drop para cambiar orden
- Se guarda automáticamente

---

## 📊 Estadísticas

### Dashboard de Estadísticas

La API `/auditorias-v2/api/estadisticas` proporciona:

```json
{
  "total": 15,
  "promedio_calificacion": 78,
  "items_mas_incumplidos": [
    {
      "nombre": "Baños limpios",
      "categoria": "TIENDA",
      "total_incumplimientos": 8,
      "porcentaje_incumplimiento": 53.3
    }
  ],
  "auditorias_recientes": [...]
}
```

Esto permite crear gráficos y reportes personalizados.

---

## 🚀 Despliegue en Railway

### Variables de Entorno

Asegurate de tener todas estas en Railway:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=clave-secreta-larga

# Email
EMAIL_SERVICE=resend
RESEND_API_KEY=re_tu_key
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com

# Sistema
TZ=America/Tegucigalpa
RAILWAY_VOLUME_MOUNT_PATH=/data

# Otros
REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00
```

### Proceso de Deploy

1. **Subir código a GitHub**
2. **Railway detecta cambios**
3. **Ejecuta la migración automáticamente** (si está en el Procfile)
4. **Inicia la aplicación**

Actualizar el `Procfile`:

```
web: node utils/migrateToV2.js && node server.js
```

**⚠️ Nota:** La migración es idempotente, puede ejecutarse múltiples veces sin problema.

---

## 🔄 Diferencias entre v1.0 y v2.0

| Aspecto | v1.0 | v2.0 |
|---------|------|------|
| Criterios | 6 fijos con sliders | 44 ítems dinámicos |
| Fotos | 10 generales | 3 por ítem (hasta 132 fotos) |
| Checklist | Hardcoded | Escalable por admin |
| Firma | No | Sí, digital |
| Categorías | No | 4 predefinidas + escalable |
| Email | Básico | Con galería completa |
| Pie de página | Instituto | Asesores Lab |

---

## 💡 Casos de Uso

### Caso 1: Auditor en Campo

1. Llega a la estación
2. Abre app en el móvil
3. Crea nueva auditoría
4. Recorre cada sección (PISTA → TIENDA → BODEGA → COCINA)
5. Marca cumple/no cumple con un tap
6. Agrega fotos donde hay incumplimiento
7. Escribe observaciones si es necesario
8. Firma al final
9. Guarda → Email automático enviado

### Caso 2: Supervisor Revisa Resultados

1. Recibe email con reporte completo
2. Ve galería de fotos organizadas
3. Identifica áreas problemáticas
4. Toma decisiones basadas en evidencia

### Caso 3: Admin Agrega Nuevo Ítem

1. Entra a "Checklist" (menú)
2. Selecciona categoría "TIENDA"
3. Click "Agregar Ítem"
4. Nombre: "Área de freidor limpia"
5. Max fotos: 3
6. Orden: 26
7. Guardar
8. → Ahora todos los auditores lo verán

---

## 🆘 Solución de Problemas

### Las fotos no se suben

**Posible causa:** Límite de tamaño de archivo

**Solución:**
```env
MAX_FILE_SIZE=10485760  # 10MB en bytes
```

### No se ven las categorías

**Causa:** Migración no ejecutada

**Solución:**
```bash
node utils/migrateToV2.js
```

### Error al guardar firma

**Causa:** Canvas no soportado

**Solución:** Usar navegador moderno (Chrome, Firefox, Safari)

---

## 📞 Soporte

**Asesores Lab**  
WhatsApp: +504 9697 8435

---

## ✅ Checklist de Implementación

- [ ] Backup de base de datos v1.0
- [ ] Extraer archivos de v2.0
- [ ] Ejecutar `npm install`
- [ ] Configurar variables de entorno
- [ ] Ejecutar migración `node utils/migrateToV2.js`
- [ ] Probar crear auditoría en local
- [ ] Verificar que fotos se suben correctamente
- [ ] Probar firma digital
- [ ] Verificar email con galería de fotos
- [ ] Subir a Railway
- [ ] Configurar variables en Railway
- [ ] Verificar volumen persistente (`RAILWAY_VOLUME_MOUNT_PATH`)
- [ ] Probar en producción
- [ ] Capacitar a usuarios

---

**🎉 Mr. Fuel v2.0 - Sistema de Auditorías de Última Generación**

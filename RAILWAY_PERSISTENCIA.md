# 💾 CONFIGURAR PERSISTENCIA DE DATOS EN RAILWAY

## 🎯 Problema

Por defecto, Railway corre la app en modo `development`, lo cual hace que la base de datos SQLite se guarde en una ubicación **no persistente**. Esto significa que:

❌ Los datos se pierden al reiniciar  
❌ Los datos se pierden al hacer redeploy  
❌ Las auditorías no se conservan  

## ✅ Solución: Usar Railway Volumes

Railway ofrece **Volumes** (volúmenes) que son **directorios persistentes** que sobreviven a reinicios y redeploys.

---

## 📋 Paso a Paso: Configurar Volumen en Railway

### 1. Crear el Volumen

1. Ir a tu proyecto en Railway
2. Click en tu servicio (`mrfuel`)
3. Ir a la pestaña **"Settings"**
4. Scroll hasta **"Volumes"**
5. Click en **"New Volume"**

**Configuración del volumen:**
- **Mount Path:** `/data`
- Click en **"Add"**

### 2. Agregar Variable de Entorno

Aún en **Settings**, ir a **"Variables"**:

Click en **"New Variable"** y agregar:

```
Nombre: RAILWAY_VOLUME_MOUNT_PATH
Valor: /data
```

Click en **"Add"**

### 3. Cambiar a Modo Producción (Opcional pero Recomendado)

En **Variables**, buscar `NODE_ENV` y cambiar/agregar:

```
Nombre: NODE_ENV
Valor: production
```

**Nota:** Si no existe, agrégala.

### 4. Redeploy

Railway hará redeploy automáticamente después de agregar las variables.

**O puedes forzarlo:**
- Settings → Deployments → Click en el último deployment → **"Redeploy"**

---

## 🔍 Verificar que Funciona

Después del redeploy, ve a **"Deployments"** → **"View Logs"**

Deberías ver:
```
📦 Usando volumen de Railway para persistencia
📂 Ruta de base de datos: /data/mrfuel.db
✅ Directorio creado: /data
✅ Base de datos encontrada en: /data/mrfuel.db
```

**Si ves esto, ✅ la persistencia está funcionando.**

---

## ✅ Variables de Entorno Finales

Tu configuración en Railway debe tener al menos:

```env
# REQUERIDAS
NODE_ENV=production
PORT=3000
SESSION_SECRET=tu-clave-secreta-larga
RAILWAY_VOLUME_MOUNT_PATH=/data

# EMAIL (opcional pero recomendado)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-aplicacion
EMAIL_FROM=Mr. Fuel <tu-email@gmail.com>

# DESTINATARIOS
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com

# RECORDATORIOS
REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00

# TIMEZONE
TZ=America/Tegucigalpa
```

---

## 🧪 Probar Persistencia

### Antes de Configurar Volumen:
1. Crear una auditoría
2. Hacer redeploy
3. ❌ La auditoría desaparece

### Después de Configurar Volumen:
1. Crear una auditoría
2. Hacer redeploy
3. ✅ La auditoría sigue ahí

---

## 🎯 Configuraciones Según Escenario

### Escenario 1: Demo/Pruebas (Datos No Importan)

**No configurar volumen**
```env
NODE_ENV=development
# Sin RAILWAY_VOLUME_MOUNT_PATH
```

**Resultado:** 
- ✅ Funciona
- ❌ Datos se pierden en cada redeploy
- ✅ Perfecto para testear

---

### Escenario 2: Producción (Datos Críticos)

**Configurar volumen + modo producción**
```env
NODE_ENV=production
RAILWAY_VOLUME_MOUNT_PATH=/data
```

**Resultado:**
- ✅ Funciona
- ✅ Datos persisten entre redeploys
- ✅ Listo para usar con usuarios reales

---

### Escenario 3: Producción Seria (Base de Datos Real)

**Migrar a PostgreSQL**

En lugar de SQLite + volumen, usar la base de datos PostgreSQL de Railway:

1. En Railway → **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway provee:
   - ✅ Persistencia garantizada
   - ✅ Backups automáticos
   - ✅ Mejor rendimiento
   - ✅ Escalabilidad

**Nota:** Esto requiere cambios en el código (usar `pg` en lugar de `sqlite3`).

---

## 🔍 Diagnóstico

### ¿Cómo saber si mis datos son persistentes?

**Ver los logs al iniciar:**

```
✅ PERSISTENTE:
📦 Usando volumen de Railway para persistencia
📂 Ruta de base de datos: /data/mrfuel.db
```

```
⚠️ NO PERSISTENTE:
📂 Ruta de base de datos: ./database/mrfuel.db
🔐 Modo: development
```

```
⚠️ NO PERSISTENTE (producción sin volumen):
⚠️  Usando /tmp (datos NO persistentes)
📂 Ruta de base de datos: /tmp/mrfuel.db
```

---

## 📊 Comparación de Opciones

| Configuración | Persistencia | Uso Recomendado |
|---------------|--------------|-----------------|
| `NODE_ENV=development` sin volumen | ❌ No | Demo, pruebas rápidas |
| `NODE_ENV=production` sin volumen (`/tmp`) | ❌ No | Testing en producción |
| Con `RAILWAY_VOLUME_MOUNT_PATH=/data` | ✅ Sí | Producción con SQLite |
| PostgreSQL de Railway | ✅✅ Sí (mejor) | Producción seria |

---

## 💡 Consejos

### 1. Backup Manual (Con Volumen)

Aunque tengas volumen, es buena práctica hacer backups:

**Opción A:** Exportar datos regularmente a CSV/Excel desde la app

**Opción B:** Conectarse al contenedor y copiar la BD:
```bash
# Esto requiere Railway CLI
railway run bash
cp /data/mrfuel.db /tmp/backup-$(date +%Y%m%d).db
```

### 2. Migración de Datos

Si ya tenés datos en modo no-persistente y querés mantenerlos:

1. Exporta las auditorías antes de configurar el volumen
2. Configura el volumen
3. Vuelve a crear las auditorías manualmente
4. O usa scripts SQL para importar

### 3. Monitoreo

Verifica periódicamente que los datos persisten:
- Crear auditoría de prueba
- Hacer redeploy
- Verificar que sigue ahí

---

## 🆘 Problemas Comunes

### Problema: "Los datos se siguen perdiendo"

**Solución:**
1. Verificar que `RAILWAY_VOLUME_MOUNT_PATH=/data` está en Variables
2. Verificar en logs que dice "Usando volumen de Railway"
3. Verificar que la ruta es `/data/mrfuel.db` no `./database/`

### Problema: "Error: SQLITE_CANTOPEN"

**Solución:**
- El volumen no tiene permisos de escritura
- Intentar cambiar mount path a `/mnt/data` en lugar de `/data`

### Problema: "No veo la opción de Volumes"

**Solución:**
- Volumes pueden estar en Beta en algunos planes
- Verificar plan de Railway
- Contactar soporte de Railway

---

## ✅ Checklist Final

Antes de usar en producción:

- [ ] Volumen creado en Railway
- [ ] Variable `RAILWAY_VOLUME_MOUNT_PATH=/data` agregada
- [ ] Variable `NODE_ENV=production` configurada
- [ ] Logs muestran "Usando volumen de Railway"
- [ ] Ruta de BD es `/data/mrfuel.db`
- [ ] Probado: datos persisten después de redeploy
- [ ] Configuración de emails completa
- [ ] Usuarios creados en el sistema

---

**💾 Con esta configuración, tu base de datos será 100% persistente en Railway!**

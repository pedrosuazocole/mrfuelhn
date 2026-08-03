# 🚂 GUÍA DE DESPLIEGUE EN RAILWAY

## ⚠️ IMPORTANTE: PERSISTENCIA DE DATOS

**SQLite en Railway NO es persistente por defecto.**

La base de datos se guarda en `/tmp/mrfuel.db` que es **efímero**:
- ✅ Funciona perfecto para pruebas
- ❌ Los datos se pierden al reiniciar el servidor
- ❌ No recomendado para producción real

### Soluciones para Producción:

**Opción 1: PostgreSQL en Railway (Recomendado)**
- Railway ofrece PostgreSQL con persistencia
- Backups automáticos
- Más escalable

**Opción 2: Railway Volumes (Beta)**
- Montaje persistente de archivos
- Mantiene SQLite entre reinicios

**Opción 3: Solo para Desarrollo/Demo**
- Usar tal cual está
- Aceptar pérdida de datos en reinicios

---

## 📋 Requisitos Previos

1. Cuenta en Railway: https://railway.app
2. Proyecto en GitHub (recomendado) o despliegue directo

---

## 🚀 OPCIÓN 1: Despliegue desde GitHub (Recomendado)

### Paso 1: Subir código a GitHub

```bash
# En tu computadora
cd mr-fuel
git init
git add .
git commit -m "Initial commit - Mr. Fuel"
git remote add origin https://github.com/tu-usuario/mr-fuel.git
git push -u origin main
```

### Paso 2: Conectar con Railway

1. Ir a https://railway.app
2. Click en **"New Project"**
3. Seleccionar **"Deploy from GitHub repo"**
4. Autorizar Railway a acceder a GitHub
5. Seleccionar el repositorio `mr-fuel`
6. Railway detectará automáticamente que es Node.js

### Paso 3: Configurar Variables de Entorno

En Railway, ir a **Variables** y agregar:

```env
# REQUERIDAS
NODE_ENV=production
PORT=3000
SESSION_SECRET=genera-una-clave-secreta-aleatoria-muy-larga

# EMAIL (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion-gmail
EMAIL_FROM=Mr. Fuel <tu-email@gmail.com>

# DESTINATARIOS
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com

# RECORDATORIOS (Lunes, Miércoles, Viernes a las 8:00 AM)
REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00

# TIMEZONE
TZ=America/Tegucigalpa

# UPLOADS
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/webp

# TEXACO BRAND
BRAND_NAME=Texaco
BRAND_COLOR=#ED1C24
BRAND_SECONDARY=#000000

# URL DE LA APP (cambiar por tu dominio de Railway)
APP_URL=https://tu-app.up.railway.app
```

### Paso 4: Deploy Automático

Railway detectará:
- ✅ `package.json` → Instalará dependencias automáticamente
- ✅ `Procfile` → Ejecutará `node utils/initDB.js && node server.js`
- ✅ Base de datos se creará automáticamente en el primer despliegue

### Paso 5: Obtener URL

1. Después del deploy, ir a **Settings**
2. En **Domains**, hacer click en **Generate Domain**
3. Railway asignará una URL como: `https://mr-fuel-production.up.railway.app`

---

## 🚀 OPCIÓN 2: Despliegue Directo (Sin GitHub)

### Paso 1: Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### Paso 2: Login

```bash
railway login
```

### Paso 3: Inicializar Proyecto

```bash
cd mr-fuel
railway init
```

### Paso 4: Deploy

```bash
railway up
```

---

## ⚙️ CONFIGURACIÓN POST-DESPLIEGUE

### 1. Generar SESSION_SECRET Seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el resultado y agregarlo a las variables de entorno en Railway.

### 2. Configurar Gmail

Ver **INICIO_RAPIDO.md** para instrucciones de cómo generar contraseña de aplicación.

### 3. Actualizar APP_URL

En variables de entorno, cambiar:
```env
APP_URL=https://tu-dominio-real.up.railway.app
```

---

## 🔍 VERIFICAR QUE TODO FUNCIONA

### 1. Ver Logs

En Railway:
- Click en **Deployments**
- Click en el último deployment
- Ver **Logs** en tiempo real

Deberías ver:
```
✅ Directorio de base de datos creado
✅ Directorio de uploads creado
✅ Base de datos encontrada (o inicializando...)
🎉 BASE DE DATOS INICIALIZADA CORRECTAMENTE
═══════════════════════════════════════════════
🛢️  MR. FUEL - CLIENTE MISTERIOSO TEXACO
═══════════════════════════════════════════════
🚀 Servidor corriendo en http://localhost:3000
```

### 2. Probar la Aplicación

1. Abrir la URL de Railway
2. Deberías ver la página de login
3. Intentar login con:
   - Email: `admin@texaco.com`
   - Password: `admin123`

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Application failed to respond"

**Causa:** La app no está escuchando en el puerto correcto.

**Solución:**
```env
# En variables de Railway, asegurar que:
PORT=3000
```

### Error: "npm install failed"

**Causa:** Problema con dependencias.

**Solución:**
1. Verificar que `package.json` tiene `engines`:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### Error: "Database locked"

**Causa:** SQLite no funciona bien con múltiples instancias.

**Solución:** Railway debería tener solo 1 instancia. Verificar en **Settings** → **Replicas** = 1.

### Error: "Cannot send emails"

**Causa:** Credenciales de Gmail incorrectas.

**Solución:**
1. Verificar que `EMAIL_USER` y `EMAIL_PASS` están correctos
2. Usar contraseña de aplicación de Gmail, NO tu contraseña normal
3. Ver logs para ver el error específico

### La app se crashea después de deploy

**Pasos de diagnóstico:**

1. **Ver logs en Railway:**
   - Click en el deployment → Logs
   - Buscar líneas con ❌

2. **Errores comunes:**
   - `Cannot find module 'XXX'` → Falta dependencia, agregar a `package.json`
   - `ENOENT: no such file or directory` → Problema de rutas, verificar paths
   - `SQLITE_CANTOPEN` → Problema con permisos de base de datos

3. **Reiniciar deployment:**
   - En Railway, click en **Redeploy**

---

## 📊 MONITOREO

### Ver Métricas

En Railway:
- **Metrics** → Ver uso de CPU, RAM, Network
- **Logs** → Ver logs en tiempo real
- **Deployments** → Ver historial de deployments

### Configurar Alertas

Railway permite configurar webhooks para notificaciones.

---

## 🔐 SEGURIDAD EN PRODUCCIÓN

### 1. Cambiar Contraseña de Admin

Después del primer login:
1. Login como admin
2. Cambiar contraseña desde el perfil

### 2. Deshabilitar Usuarios de Prueba

Si creaste usuarios de prueba, desactivarlos.

### 3. Configurar HTTPS

Railway proporciona HTTPS automáticamente en todos los dominios.

### 4. Variables de Entorno Seguras

- ✅ Nunca hacer commit de `.env`
- ✅ Usar variables de Railway
- ✅ Generar SESSION_SECRET único

---

## 🔄 ACTUALIZACIONES

### Actualizar la App

Si usaste GitHub:
```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Railway re-desplegará automáticamente.

Si usaste Railway CLI:
```bash
railway up
```

---

## 💾 BACKUP DE BASE DE DATOS

Railway no incluye backups automáticos de archivos. Para SQLite:

### Opción 1: Migrar a PostgreSQL (Recomendado para Producción)

Railway ofrece PostgreSQL con backups automáticos.

### Opción 2: Backup Manual

1. Conectar por SSH (si Railway lo permite)
2. Descargar `database/mrfuel.db`
3. Guardar en lugar seguro

---

## 🌐 DOMINIO PERSONALIZADO

### Agregar Dominio Propio

1. En Railway → **Settings** → **Domains**
2. Click en **Add Custom Domain**
3. Ingresar tu dominio (ej: `mrfuel.texaco.com`)
4. Configurar DNS según instrucciones de Railway

---

## 📞 SOPORTE

**Railway Docs:** https://docs.railway.app
**Railway Discord:** https://discord.gg/railway
**GitHub Issues:** (Tu repositorio)

---

## ✅ CHECKLIST DE DESPLIEGUE

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Railway
- [ ] Variables de entorno configuradas
- [ ] SESSION_SECRET generado y agregado
- [ ] Credenciales de Gmail configuradas
- [ ] Emails de destinatarios configurados
- [ ] Deploy exitoso (ver logs)
- [ ] Página de login accesible
- [ ] Login con admin@texaco.com funciona
- [ ] Contraseña de admin cambiada
- [ ] Dominio personalizado configurado (opcional)
- [ ] Backup plan definido

---

**¡Tu aplicación Mr. Fuel está lista en producción con Railway! 🚂🛢️**

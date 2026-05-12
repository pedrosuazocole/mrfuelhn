# 🚀 DESPLIEGUE RÁPIDO EN RAILWAY - MR. FUEL V2.0

## ⚡ PASOS RÁPIDOS (5 minutos)

### 1️⃣ Subir Código a GitHub

```bash
# En tu repositorio local:
git add .
git commit -m "Actualizar a Mr. Fuel v2.0 completo"
git push origin main
```

### 2️⃣ Configurar Variables en Railway

Ve a **Railway → Settings → Variables → RAW Editor** y pega esto:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=mr_fuel_texaco_secret_2024_change_this

# RESEND (Email)
EMAIL_SERVICE=resend
RESEND_API_KEY=TU_KEY_AQUI
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>

# Destinatarios
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com

# Sistema
TZ=America/Tegucigalpa
RAILWAY_VOLUME_MOUNT_PATH=/data

# Recordatorios
REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00

# Otros
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/webp
MAX_FILE_SIZE=5242880
BRAND_NAME=Texaco
```

**⚠️ IMPORTANTE:** Cambia `TU_KEY_AQUI` por tu API Key de Resend

### 3️⃣ Verificar Procfile

El archivo `Procfile` ya está incluido con:
```
web: node verify-v2.js && node utils/migrateToV2.js && node server.js
```

✅ No necesitas hacer nada más

### 4️⃣ Crear Volumen Persistente (Opcional pero Recomendado)

1. Railway → Settings → Volumes
2. Click "New Volume"
3. Mount Path: `/data`
4. Click "Create"

### 5️⃣ Deploy

Railway detectará los cambios automáticamente y desplegará.

---

## ✅ Verificar que Funcionó

Después del deploy, en los **Logs** deberías ver:

```
🔍 Verificando instalación de Mr. Fuel v2.0...

📂 Verificando archivos...
✅ Controlador v2          → controllers/auditoriaV2Controller.js
✅ Controlador admin       → controllers/adminController.js
✅ Rutas v2               → routes/auditorias-v2.js
...
✅ TODO PERFECTO - Mr. Fuel v2.0 listo para funcionar

🚀 Iniciando migración a Mr. Fuel v2.0...
📁 Creando tabla de categorías...
📝 Creando tabla de ítems...
...
✅ Migración completada exitosamente!

🚀 Servidor iniciado en puerto 3000
✅ Servicio de email: Resend
```

---

## 🌐 Probar la Aplicación

Abre tu URL de Railway:
```
https://tu-app.up.railway.app
```

### Rutas a Probar:

1. ✅ **Login:** `/`
2. ✅ **Dashboard:** `/dashboard`
3. ✅ **Nueva Auditoría v2.0:** `/auditorias-v2/nueva`
4. ✅ **Lista Auditorías:** `/auditorias-v2`
5. ✅ **Gestión Checklist (Admin):** `/admin/categorias`

---

## 🔧 Si Algo Falla

### Error: "Cannot find module"

**Causa:** Archivos no subidos a GitHub

**Solución:**
```bash
git status  # Ver qué falta
git add .
git commit -m "Agregar archivos faltantes"
git push origin main
```

### Error: "no such table: categorias"

**Causa:** Migración no ejecutada

**Solución:**
- Verificar logs - debe decir "Migración completada"
- Si no lo dice, el Procfile no se está usando
- Railway → Settings → Start Command:
  ```
  node verify-v2.js && node utils/migrateToV2.js && node server.js
  ```

### Error: Variables de entorno

**Causa:** Falta configurar RESEND_API_KEY

**Solución:**
1. Railway → Settings → Variables
2. Agregar: `RESEND_API_KEY` con tu key real
3. Redeploy

---

## 📧 Obtener API Key de Resend

1. Ir a: https://resend.com/api-keys
2. Click "Create API Key"
3. Name: `Mr Fuel Production`
4. Permission: `Sending access`
5. Click "Add"
6. Copiar la key (empieza con `re_`)
7. Pegarla en Railway variables

---

## ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] Variables configuradas en Railway
- [ ] RESEND_API_KEY con valor real
- [ ] Procfile verificado
- [ ] Deploy completado sin errores
- [ ] Logs muestran "TODO PERFECTO"
- [ ] Logs muestran "Migración completada"
- [ ] Logs muestran "Servicio de email: Resend"
- [ ] Aplicación abre en el navegador
- [ ] Login funciona
- [ ] Nueva Auditoría v2.0 abre
- [ ] Checklist (admin) abre

---

**¡Listo en 5 minutos!** 🎉

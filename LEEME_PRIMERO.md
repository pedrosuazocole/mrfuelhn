# 🚀 INSTRUCCIONES FINALES - SUBIR A RAILWAY

## 📦 Archivo ZIP Recibido: `mrfuel-v2-railway-COMPLETO.zip`

Este ZIP contiene **TODO** lo necesario para Mr. Fuel v2.0 listo para Railway.

---

## ⚡ PASO A PASO (3 MINUTOS)

### 1️⃣ Extraer y Subir a GitHub

```bash
# Extraer el ZIP en tu proyecto local
unzip mrfuel-v2-railway-COMPLETO.zip

# Entrar a la carpeta
cd mr-fuel

# Subir TODO a GitHub
git add .
git commit -m "Mr. Fuel v2.0 - Deploy Railway con Resend"
git push origin main
```

### 2️⃣ Configurar Variables en Railway

**Railway → Tu Proyecto → Settings → Variables**

Click en **"RAW Editor"** y pega esto:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=mr_fuel_texaco_2024_CAMBIAR_POR_CLAVE_SEGURA

EMAIL_SERVICE=resend
RESEND_API_KEY=re_PONER_TU_KEY_AQUI
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>

ADMIN_EMAILS=psuazoc@gmail.com
SUPERVISOR_EMAILS=psuazoc@gmail.com,edic_10@hotmail.com

TZ=America/Tegucigalpa
RAILWAY_VOLUME_MOUNT_PATH=/data

REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00

ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/webp
MAX_FILE_SIZE=5242880
BRAND_NAME=Texaco
```

**⚠️ CAMBIAR:**
- `SESSION_SECRET` por una clave segura diferente
- `RESEND_API_KEY` por tu API Key real de Resend
- `ADMIN_EMAILS` y `SUPERVISOR_EMAILS` con tus emails

### 3️⃣ ¡Listo!

Railway desplegará automáticamente cuando detecte el push a GitHub.

**⚠️ NOTA IMPORTANTE:** Este ZIP incluye `railway.json` actualizado. Si ya tenías uno viejo, será reemplazado automáticamente.

---

## ✅ Verificar que Funcionó

### En los Logs de Railway deberías ver:

```
🔍 Verificando instalación de Mr. Fuel v2.0...

📂 Verificando archivos...
✅ Controlador v2          → controllers/auditoriaV2Controller.js
✅ Controlador admin       → controllers/adminController.js
✅ Rutas v2               → routes/auditorias-v2.js
✅ Rutas admin            → routes/admin.js
✅ Vista nueva auditoría  → views/auditorias-v2/nueva.ejs
✅ Vista lista auditorías → views/auditorias-v2/lista.ejs
✅ Vista detalle          → views/auditorias-v2/detalle.ejs
✅ Vista categorías       → views/admin/categorias.ejs
✅ Vista ítems            → views/admin/items.ejs
✅ JavaScript v2          → public/js/auditoria-v2.js
✅ Script migración       → utils/migrateToV2.js
✅ Utilidad email         → utils/email.js

📋 Verificando server.js...
✅ Require auditorias-v2  → OK
✅ Require admin          → OK
✅ Ruta auditorias-v2     → OK
✅ Ruta admin             → OK

🔐 Verificando variables de entorno...
✅ NODE_ENV               → Configurada
✅ SESSION_SECRET         → Configurada
✅ EMAIL_FROM             → Configurada

✅ TODO PERFECTO - Mr. Fuel v2.0 listo para funcionar

🚀 Iniciando migración a Mr. Fuel v2.0...
📁 Creando tabla de categorías...
  ✓ PISTA
  ✓ TIENDA
  ✓ BODEGA
  ✓ COCINA

🛣️  Insertando ítems de PISTA...
  ✓ Uniformes
  ✓ Carnets
  ... (total 9 ítems)

🏪 Insertando ítems de TIENDA...
  ✓ Uniformes
  ✓ Carnets
  ... (total 25 ítems)

📦 Insertando ítems de BODEGA...
  ✓ Ordenado
  ✓ Limpio
  ✓ Cuarto eléctrico despejado

👨‍🍳 Insertando ítems de COCINA...
  ✓ Surtido
  ✓ Maya en pelo
  ... (total 7 ítems)

✅ Migración completada exitosamente!

📊 Resumen:
  - 4 categorías creadas
  - 44 ítems creados
  - Tablas v2 creadas y listas
  - Sistema actualizado a versión 2.0

🚀 Servidor iniciado en puerto 3000
✅ Servicio de email: Resend
```

### Abrir tu Aplicación

```
https://mrfuel-texaco-production.up.railway.app
```

O la URL que Railway te asignó.

---

## 🧪 Probar Funcionalidades

### 1. Login
- Email: `admin@mrfuel.com`
- Password: `admin123`

### 2. Nueva Auditoría v2.0
- Click en **"Auditorías v2.0"** en el menú
- Click en **"Nueva Auditoría"**
- Deberías ver las 4 secciones: PISTA, TIENDA, BODEGA, COCINA

### 3. Gestión de Checklist (Admin)
- Click en **"Checklist"** en el menú
- Deberías ver la tabla con 4 categorías
- Click en el icono de lista (☰) para ver los ítems

---

## 🎯 ¿Qué Incluye Este ZIP?

### ✅ Código Completo v2.0
- 19 archivos nuevos
- 7 archivos modificados
- ~3,500 líneas de código

### ✅ Características:
- Checklist de 44 ítems en 4 categorías
- 3 fotos por ítem (hasta 132 fotos por auditoría)
- Firma digital con canvas HTML5
- Panel de administración escalable
- Email con Resend (galería completa de fotos)
- Sistema de verificación automática

### ✅ Documentación:
- `DEPLOY_RAILWAY.md` - Guía de despliegue
- `UPGRADE_V2.md` - Guía completa de v2.0
- `RESEND_CONFIG.md` - Configuración email
- `RAILWAY_DEBUG.md` - Solución de problemas
- `ARCHIVOS_V2.md` - Lista de archivos
- `.env.railway.example` - Variables completas

### ✅ Configuración Lista:
- `Procfile` actualizado para v2.0
- `verify-v2.js` para diagnóstico automático
- `migrateToV2.js` para crear tablas
- Sin necesidad de tocar la BD manualmente

---

## 🆘 Si Algo No Funciona

### Problema: "Error al cargar auditorías" o "Error al cargar categorías"

**Solución:**

1. Verificar que TODOS los archivos se subieron:
   ```bash
   git status
   ```
   Si hay archivos sin subir:
   ```bash
   git add .
   git commit -m "Agregar archivos faltantes"
   git push origin main
   ```

2. Ver logs de Railway:
   - Railway → Deployments → Click en el más reciente
   - Buscar línea que dice "❌" o "Error"
   - Compartir el error completo

### Problema: "no such table: categorias"

**Causa:** La migración no se ejecutó

**Solución:**

Verificar que el `Procfile` tenga:
```
web: node verify-v2.js && node utils/migrateToV2.js && node server.js
```

Si no existe el archivo `Procfile` en la raíz, Railway usará el Start Command de Settings.

### Problema: Variables no configuradas

**Causa:** Falta `RESEND_API_KEY` o tiene valor incorrecto

**Solución:**

1. Railway → Settings → Variables
2. Verificar que `RESEND_API_KEY` tenga valor que empieza con `re_`
3. Si no existe, agregarla
4. Hacer redeploy manual

---

## 📞 Contacto

Si después de seguir estos pasos aún tienes problemas:

1. Compartir los **logs completos** de Railway
2. Compartir captura de las **variables configuradas** (sin mostrar los valores secretos)
3. Indicar el **error específico** que aparece

---

## ✅ Checklist Final

Antes de reportar problemas, verificar:

- [ ] ZIP extraído correctamente
- [ ] Todos los archivos subidos a GitHub (`git status` limpio)
- [ ] Push exitoso a GitHub (`git push`)
- [ ] Variables configuradas en Railway
- [ ] `RESEND_API_KEY` con valor real (empieza con `re_`)
- [ ] `ADMIN_EMAILS` y `SUPERVISOR_EMAILS` con emails correctos
- [ ] Railway terminó de desplegar (sin errores)
- [ ] Logs muestran "TODO PERFECTO"
- [ ] Logs muestran "Migración completada"
- [ ] Aplicación abre en el navegador

---

**🎉 ¡Todo listo para producción!**

Este ZIP es la versión DEFINITIVA de Mr. Fuel v2.0 lista para Railway con Resend.

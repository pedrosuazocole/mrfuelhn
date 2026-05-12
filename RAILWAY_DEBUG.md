# 🔧 DIAGNÓSTICO DE ERRORES EN RAILWAY - MR. FUEL V2.0

## 📋 Errores Reportados

1. **Error al cargar auditorías** → `/auditorias-v2`
2. **Error al cargar categorías** → `/admin/categorias`

---

## 🔍 PASO 1: Ver Logs Completos en Railway

### Cómo acceder a los logs:

1. Ir a Railway Dashboard
2. Click en tu proyecto "mrfuel-texaco-production"
3. Click en "Deployments"
4. Click en el deployment más reciente
5. Scroll down para ver los logs completos

### Buscar estos errores específicos:

```
❌ Error: Cannot find module './views/auditorias-v2/lista'
❌ Error: ENOENT: no such file or directory
❌ Error en controlador: [mensaje específico]
❌ TypeError: Cannot read property...
```

**⚠️ IMPORTANTE: Necesito que me compartas los logs exactos para darte la solución correcta**

---

## 🔍 PASO 2: Verificar Archivos Subidos

### Railway debe tener estos archivos:

```
✅ views/auditorias-v2/nueva.ejs
✅ views/auditorias-v2/lista.ejs
✅ views/auditorias-v2/detalle.ejs
✅ views/admin/categorias.ejs
✅ views/admin/items.ejs
✅ controllers/auditoriaV2Controller.js
✅ controllers/adminController.js
✅ routes/auditorias-v2.js
✅ routes/admin.js
✅ public/js/auditoria-v2.js
```

### Verificar en GitHub:

1. Ir a tu repositorio en GitHub
2. Navegar a `views/auditorias-v2/`
3. Verificar que existan los 3 archivos .ejs
4. Navegar a `views/admin/`
5. Verificar que existan los 2 archivos .ejs

---

## 🔍 PASO 3: Verificar Variables de Entorno en Railway

### Variables CRÍTICAS que deben estar configuradas:

```env
NODE_ENV=production
SESSION_SECRET=tu-clave-secreta
EMAIL_SERVICE=resend
RESEND_API_KEY=re_tu_key
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com
TZ=America/Tegucigalpa
```

### Verificar en Railway:

1. Settings → Variables
2. Confirmar que todas estén presentes
3. **CRÍTICO:** No debe haber espacios extra al inicio/final

---

## 🔍 PASO 4: Verificar que la Migración se Ejecutó

### Railway debe mostrar en los logs:

```
🚀 Iniciando migración a Mr. Fuel v2.0...
📁 Creando tabla de categorías...
📝 Creando tabla de ítems...
🔍 Creando tabla de auditorías v2...
✅ Migración completada exitosamente!
```

### Si NO ves esto:

**Causa:** El Procfile no está ejecutando la migración

**Solución:**

1. Verificar que existe el archivo `Procfile` en la raíz
2. Debe contener:
   ```
   web: node utils/migrateToV2.js && node server.js
   ```
3. Si no existe, créalo con ese contenido
4. Hacer commit y push a GitHub
5. Railway re-desplegará automáticamente

---

## 🚨 SOLUCIONES COMUNES

### Solución A: Archivos No Subidos a GitHub

**Síntoma:** Railway muestra "Error: Cannot find module"

**Causa:** Los archivos nuevos no se subieron al repositorio

**Solución:**

```bash
# En tu computadora local:
cd mr-fuel

# Agregar TODOS los archivos nuevos
git add views/auditorias-v2/
git add views/admin/
git add controllers/auditoriaV2Controller.js
git add controllers/adminController.js
git add routes/auditorias-v2.js
git add routes/admin.js
git add public/js/auditoria-v2.js
git add utils/migrateToV2.js

# Commit
git commit -m "Agregar archivos v2.0 completos"

# Push
git push origin main
```

Railway detectará el cambio y re-desplegará.

---

### Solución B: Base de Datos Sin Migrar

**Síntoma:** Errores como "no such table: categorias"

**Causa:** La migración no se ejecutó en Railway

**Solución:**

1. En Railway → Settings → Add Variable
2. Agregar: `RUN_MIGRATION=true`
3. Redeploy manual desde Railway
4. Ver logs para confirmar que ejecuta `migrateToV2.js`

---

### Solución C: Rutas No Registradas en server.js

**Síntoma:** Página en blanco o "Cannot GET /auditorias-v2"

**Causa:** Las rutas v2.0 no están en server.js

**Solución:**

Verificar que `server.js` tenga estas líneas:

```javascript
const auditoriasV2Routes = require('./routes/auditorias-v2');
const adminRoutes = require('./routes/admin');

app.use('/auditorias-v2', auditoriasV2Routes);
app.use('/admin', adminRoutes);
```

Si no están, agregar y hacer push.

---

### Solución D: Error de Permisos en Views

**Síntoma:** "Error rendering view"

**Causa:** Railway no puede leer los archivos .ejs

**Solución:**

En Railway, ejecutar Build Command personalizado:

```bash
npm install && chmod -R 755 views/
```

---

## 📝 INFORMACIÓN QUE NECESITO DE TI

Para darte la solución exacta, por favor compárteme:

### 1️⃣ **Logs Completos de Railway**

Copia y pega TODO el contenido de los logs del deployment más reciente.

### 2️⃣ **Estructura de Archivos en GitHub**

Ir a tu repositorio y confirmar si existen:
- ✅ o ❌ `views/auditorias-v2/lista.ejs`
- ✅ o ❌ `views/auditorias-v2/nueva.ejs`
- ✅ o ❌ `views/auditorias-v2/detalle.ejs`
- ✅ o ❌ `views/admin/categorias.ejs`
- ✅ o ❌ `views/admin/items.ejs`

### 3️⃣ **Variables de Entorno en Railway**

Lista de TODAS las variables que tenés configuradas (sin los valores secretos).

### 4️⃣ **Contenido del Procfile**

Si existe el archivo `Procfile` en la raíz, compartir su contenido.

---

## 🎯 SOLUCIÓN RÁPIDA TEMPORAL

Mientras diagnosticamos, podés hacer que funcione temporalmente:

### En Railway → Settings → Deploy:

**Start Command:**
```bash
node utils/migrateToV2.js && node server.js
```

Esto forzará la migración en cada deploy.

---

## ✅ CHECKLIST DE VERIFICACIÓN

Marca lo que ya revisaste:

- [ ] Logs de Railway revisados
- [ ] Archivos existen en GitHub
- [ ] Variables de entorno configuradas
- [ ] Migración ejecutada correctamente
- [ ] Procfile existe y está correcto
- [ ] server.js tiene las rutas v2.0
- [ ] Local funciona perfecto

---

**Una vez que me compartas los logs y la info solicitada, te daré la solución exacta.** 🚀

# 🔧 SOLUCIÓN RÁPIDA - Error "Crashed" en Railway

## ❌ Síntoma

Railway muestra: **"Crashed 10 seconds ago"**

---

## ✅ SOLUCIONES

### 1. Variables de Entorno Faltantes

**MÍNIMO REQUERIDO en Railway:**

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=clave-aleatoria-minimo-32-caracteres
```

**Cómo agregar:**
1. En Railway → Tu proyecto
2. Click en **Variables**
3. Agregar una por una

---

### 2. Base de Datos No Inicializada

**El proyecto ahora se inicializa automáticamente**, pero si falla:

**Verificar en logs de Railway:**
```
✅ Directorio de base de datos creado
✅ Base de datos inicializada
```

Si no aparece, el problema está en el Procfile.

---

### 3. Procfile Incorrecto

**Archivo:** `Procfile` (en la raíz del proyecto)

**Contenido correcto:**
```
web: node utils/initDB.js && node server.js
```

**Verificar:**
1. Que el archivo se llame exactamente `Procfile` (sin extensión)
2. Que esté en la raíz del proyecto
3. Que el contenido sea exacto (copiar y pegar)

---

### 4. Reinstalar Dependencias

En Railway:
1. **Settings** → **General**
2. Hacer scroll hasta **Danger Zone**
3. Click en **Redeploy**

Esto fuerza reinstalación de `node_modules`.

---

### 5. Ver Logs Detallados

**Cómo ver logs en Railway:**
1. Click en tu proyecto
2. Click en **Deployments**
3. Click en el deployment más reciente
4. Ver **View Logs**

**Buscar líneas con:**
- ❌ (errores)
- `Error:`
- `Cannot find module`
- `ENOENT`

---

### 6. Puerto Incorrecto

Railway asigna el puerto automáticamente vía variable `PORT`.

**Verificar en `server.js`:**
```javascript
const PORT = process.env.PORT || 3000;
```

**En Railway Variables:**
```env
PORT=3000
```

---

### 7. Timeout de Inicio

Si la app tarda mucho en iniciar:

**En `railway.json`:**
```json
{
  "deploy": {
    "startCommand": "node utils/initDB.js && node server.js",
    "healthcheckPath": "/login",
    "healthcheckTimeout": 100
  }
}
```

---

## 🔍 DIAGNÓSTICO PASO A PASO

### Paso 1: Ver el Error Exacto

```bash
# En los logs de Railway, buscar:
Error: Cannot find module 'XXX'
  → Falta instalar dependencia

Error: EADDRINUSE
  → Puerto ocupado (raro en Railway)

Error: connect ECONNREFUSED
  → Problema de red/email

Error: SQLITE_CANTOPEN
  → Problema con base de datos
```

### Paso 2: Verificar Variables

**CRÍTICAS:**
- `NODE_ENV=production`
- `SESSION_SECRET=algo-largo`
- `PORT=3000` (aunque Railway lo asigna automáticamente)

**OPCIONALES (pero recomendadas):**
- Todas las de EMAIL si querés notificaciones

### Paso 3: Revisar `package.json`

**Debe tener:**
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "start": "node server.js"
  }
}
```

---

## 🚑 SOLUCIÓN RÁPIDA (Copiar y Pegar)

### Si nada funciona:

1. **Borrar el proyecto en Railway**
2. **Crear uno nuevo**
3. **Conectar GitHub de nuevo**
4. **Agregar SOLO estas variables:**

```env
NODE_ENV=production
SESSION_SECRET=mr_fuel_railway_2024_super_secret_key_change_this
PORT=3000
```

5. **Esperar deploy**
6. **Abrir la URL generada**
7. **Debería funcionar**

---

## 📧 Configurar Email Después

Una vez que la app funcione:

1. Generar contraseña de aplicación de Gmail
2. Agregar variables:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-aplicacion
ADMIN_EMAILS=admin@texaco.com
```
3. Redeploy

---

## ✅ CHECKLIST FINAL

- [ ] Variables de entorno agregadas en Railway
- [ ] `Procfile` existe en la raíz
- [ ] Logs muestran "Servidor corriendo"
- [ ] URL de Railway abre página de login
- [ ] Login con admin@texaco.com funciona

---

## 📞 ÚLTIMO RECURSO

Si después de todo esto sigue sin funcionar:

1. **Descargar el ZIP de nuevo** (puede que haya habido error al subir)
2. **Verificar que todos los archivos están** (especialmente Procfile)
3. **Subir a un nuevo repositorio de GitHub**
4. **Crear nuevo proyecto en Railway**
5. **Seguir RAILWAY.md paso a paso**

---

**La app FUNCIONA en Railway** - Estos pasos solucionan el 99% de los casos. 🚂✅

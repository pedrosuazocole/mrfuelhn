# 🚀 GUÍA DE INICIO RÁPIDO - MR. FUEL

## ⚡ Instalación en 5 Minutos

### 1️⃣ Descomprimir el proyecto

```bash
tar -xzf mr-fuel-completo.tar.gz
cd mr-fuel
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Configurar variables de entorno

```bash
cp .env.example .env
nano .env  # O usar tu editor favorito
```

**Mínimo a configurar:**
```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-de-aplicación-gmail
```

### 4️⃣ Inicializar base de datos

```bash
npm run init-db
```

### 5️⃣ Iniciar servidor

```bash
npm start
```

**¡Listo!** Abrir: http://localhost:3000

---

## 🔐 Credenciales Iniciales

- **Email:** admin@texaco.com
- **Contraseña:** admin123

**⚠️ IMPORTANTE:** Cambiar contraseña después del primer login

---

## 📧 Configurar Gmail para Notificaciones

### Paso a Paso:

1. **Activar verificación en 2 pasos:**
   - https://myaccount.google.com/security
   - Activar "Verificación en 2 pasos"

2. **Generar contraseña de aplicación:**
   - https://myaccount.google.com/apppasswords
   - Seleccionar "Correo"
   - Generar
   - Copiar la contraseña (16 caracteres)

3. **Actualizar .env:**
   ```env
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```

4. **Reiniciar servidor:**
   ```bash
   npm start
   ```

---

## 🎯 Primeros Pasos

### 1. Crear Estaciones

1. Login → **Estaciones** → **Nueva Estación**
2. Agregar al menos 3 estaciones
3. Incluir: nombre, código, dirección, ciudad

### 2. Crear Usuarios Auditores

1. **Usuarios** → **Nuevo Usuario**
2. Rol: **Auditor**
3. Enviar credenciales al usuario

### 3. Realizar Primera Auditoría

1. Login como Auditor
2. **Dashboard** → **Nueva Auditoría**
3. Completar checklist
4. Subir 2-3 fotos
5. Guardar

### 4. Verificar Notificaciones

- Revisar bandeja de entrada del admin
- Debe llegar email con detalle de auditoría

---

## 🔧 Comandos Útiles

```bash
# Iniciar en desarrollo (con auto-reload)
npm run dev

# Iniciar en producción
npm start

# Reinicializar base de datos (⚠️ BORRA TODO)
npm run init-db

# Ver logs en tiempo real (si usas PM2)
pm2 logs mrfuel
```

---

## 🌐 Despliegue en Railway (Gratis)

1. Crear cuenta: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Conectar tu repositorio
4. Agregar variables de entorno:
   - `NODE_ENV=production`
   - `SESSION_SECRET=clave-aleatoria-larga`
   - `EMAIL_USER=tu-email`
   - `EMAIL_PASS=contraseña-app`
   - `ADMIN_EMAILS=admin@texaco.com`

5. Deploy automático ✅

---

## 📱 Acceso desde Móvil

**iPhone/iPad (Safari):**
1. Abrir http://tu-servidor:3000
2. Botón Compartir
3. "Agregar a pantalla de inicio"

**Android (Chrome):**
1. Abrir http://tu-servidor:3000
2. Menú (⋮)
3. "Agregar a pantalla de inicio"

---

## 🆘 Problemas Comunes

### ❌ Error: "Cannot find module..."

```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ Puerto 3000 ocupado

Cambiar en `.env`:
```env
PORT=3001
```

### ❌ No llegan emails

1. Verificar credenciales Gmail
2. Usar "contraseña de aplicación", no contraseña normal
3. Revisar carpeta SPAM
4. Ver logs del servidor

### ❌ Error al subir fotos

```bash
chmod -R 755 public/uploads
mkdir -p public/uploads/auditorias
```

---

## 📞 Soporte

**Desarrollado por:**
Pedro - Instituto Tecnológico Santo Tomás

**Stack Tecnológico:**
- Node.js + Express
- SQLite
- EJS
- Nodemailer
- Multer
- Node-cron

---

## 📚 Documentación Completa

- **README.md** - Instalación y configuración detallada
- **MANUAL_USUARIO.md** - Guía completa para usuarios finales

---

**¡Disfrutá de Mr. Fuel! 🛢️⭐**

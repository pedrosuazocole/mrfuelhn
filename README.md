# 🛢️ MR. FUEL - Sistema de Cliente Misterioso Texaco

Sistema completo de auditorías para gasolineras desarrollado con **Node.js**, **Express**, **SQLite** y **EJS**. Identidad visual de **Texaco** (rojo #ED1C24).

---

## 📋 Características Principales

✅ **Sistema de Auditorías Completo**
- Checklist de 6 criterios: Limpieza de bombas, aceites organizados, uniforme completo, saludo, trato y despedida
- Evaluación 0-100 con sliders interactivos
- Captura de fotos desde cámara del dispositivo
- Cálculo automático de calificación general
- Notas y observaciones por criterio

✅ **Notificaciones Automáticas**
- Envío de emails al completar auditorías
- Notificaciones a administradores y supervisores
- Templates HTML responsivos con identidad Texaco

✅ **Recordatorios Programados**
- Cron jobs 3 veces por semana (configurable)
- Emails automáticos a supervisores
- Reenvío automático de recordatorios fallidos

✅ **Gestión de Estaciones**
- CRUD completo de estaciones de servicio
- Geolocalización (latitud/longitud)
- Información de encargados y contacto

✅ **Sistema de Usuarios**
- 3 roles: Admin, Supervisor, Auditor
- Autenticación segura con bcrypt
- Control de acceso por permisos

✅ **Dashboard y Reportes**
- Estadísticas en tiempo real
- Gráficos de rendimiento por estación
- Historial completo de auditorías

✅ **Identidad Visual Texaco**
- Colores corporativos (rojo #ED1C24, negro, blanco)
- Logo estrella de Texaco
- Diseño responsive para móvil, tablet y desktop

---

## 🚀 Instalación Rápida

### Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git** (opcional)

### Paso 1: Descargar el Proyecto

```bash
# Si tenés Git instalado
git clone <url-del-repositorio>
cd mr-fuel

# O descomprimir el archivo ZIP
unzip mr-fuel.zip
cd mr-fuel
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar el archivo .env con tus credenciales
# IMPORTANTE: Configurar los datos de EMAIL para notificaciones
```

**Configuración de Email (Gmail):**

1. Ir a https://myaccount.google.com/security
2. Activar "Verificación en 2 pasos"
3. Ir a https://myaccount.google.com/apppasswords
4. Generar contraseña de aplicación para "Correo"
5. Copiar la contraseña generada (16 caracteres)
6. Actualizar en `.env`:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

### Paso 4: Inicializar Base de Datos

```bash
npm run init-db
```

Esto creará:
- Base de datos SQLite en `database/mrfuel.db`
- Tablas: usuarios, estaciones, auditorias, auditoria_fotos, recordatorios
- Usuario admin por defecto
- 3 estaciones de ejemplo

**Credenciales de acceso:**
- Email: `admin@texaco.com`
- Contraseña: `admin123`

### Paso 5: Iniciar el Servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: **http://localhost:3000**

---

## 📖 Uso del Sistema

### 1. Iniciar Sesión

1. Ir a http://localhost:3000
2. Ingresar credenciales:
   - Email: `admin@texaco.com`
   - Contraseña: `admin123`
3. Cambiar contraseña después del primer login

### 2. Crear Nueva Auditoría

1. **Dashboard** → **Auditorías** → **Nueva Auditoría**
2. Seleccionar estación
3. Configurar fecha y hora de visita
4. Evaluar cada criterio con los sliders (0-100):
   - 🧹 Limpieza de Bombas
   - 🛢️ Organización de Aceites
   - 👔 Uniforme Completo (marcar si tiene gorra)
   - 👋 Protocolo de Saludo
   - 💬 Trato Durante la Compra
   - 👋 Protocolo de Despedida
5. Agregar notas opcionales por cada criterio
6. Subir fotos (máximo 10, desde cámara o galería)
7. Agregar observaciones generales y recomendaciones
8. **Guardar Auditoría**

Al guardar:
- Se calcula automáticamente la calificación general (promedio)
- Se envía email a administradores y supervisores
- Se redirige al detalle de la auditoría

### 3. Ver Auditorías

**Lista de Auditorías:**
- Filtrar por estación, fechas, auditor
- Ver calificación con código de colores:
  - 🟢 Verde: ≥ 80%
  - 🟡 Amarillo: 60-79%
  - 🔴 Rojo: < 60%

**Detalle de Auditoría:**
- Información completa de la visita
- Todas las fotos subidas
- Observaciones y recomendaciones
- Opciones: Imprimir, Exportar PDF (admin)

### 4. Gestionar Estaciones

**Crear Nueva Estación:**
1. **Estaciones** → **Nueva Estación**
2. Completar datos:
   - Nombre
   - Código único
   - Dirección completa
   - Ciudad y departamento
   - Teléfono
   - Nombre del encargado
   - Coordenadas GPS (opcional)

**Editar/Desactivar:**
- Solo usuarios Admin
- Desactivar no elimina auditorías previas

### 5. Administrar Usuarios (Solo Admin)

**Crear Nuevo Usuario:**
1. **Usuarios** → **Nuevo Usuario**
2. Seleccionar rol:
   - **Admin**: Acceso completo
   - **Supervisor**: Auditorías + estaciones
   - **Auditor**: Solo crear auditorías

**Gestionar:**
- Activar/Desactivar usuarios
- Resetear contraseñas
- Ver historial de actividad

---

## ⚙️ Configuración Avanzada

### Recordatorios Automáticos

En `.env` configurar:

```env
# Días de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
REMINDER_DAYS=1,3,5

# Hora del recordatorio (formato 24h)
REMINDER_HOUR=08
REMINDER_MINUTE=00
```

Por defecto: **Lunes, Miércoles y Viernes a las 8:00 AM**

### Timezone (Honduras)

```env
TZ=America/Tegucigalpa
```

### Límites de Archivos

```env
# Tamaño máximo por imagen (bytes)
MAX_FILE_SIZE=5242880

# Tipos permitidos (separados por comas)
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/webp
```

---

## 📧 Configuración de Emails

### Opción 1: Gmail (Recomendado)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-de-aplicación
EMAIL_FROM=Mr. Fuel <tu-email@gmail.com>
```

### Opción 2: Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=tu-contraseña
EMAIL_FROM=Mr. Fuel <tu-email@outlook.com>
```

### Opción 3: Servidor SMTP Personalizado

```env
EMAIL_HOST=mail.tudominio.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@tudominio.com
EMAIL_PASS=contraseña-segura
EMAIL_FROM=Mr. Fuel <noreply@tudominio.com>
```

### Configurar Destinatarios

```env
# Administradores (separados por comas)
ADMIN_EMAILS=admin1@texaco.com,admin2@texaco.com

# Supervisores (separados por comas)
SUPERVISOR_EMAILS=supervisor1@texaco.com,supervisor2@texaco.com
```

---

## 🚀 Despliegue en Producción

### Opción 1: Railway (Recomendado)

1. Crear cuenta en https://railway.app
2. Crear nuevo proyecto
3. Conectar repositorio de GitHub
4. Configurar variables de entorno en Railway
5. Deploy automático

**Variables de entorno Railway:**
```
NODE_ENV=production
PORT=3000
SESSION_SECRET=tu-clave-secreta-segura
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-app
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com
```

### Opción 2: VPS (DigitalOcean, AWS, etc.)

```bash
# Conectar por SSH
ssh usuario@tu-servidor

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar proyecto
git clone <url>
cd mr-fuel

# Instalar dependencias
npm install --production

# Configurar .env
nano .env

# Inicializar BD
npm run init-db

# Instalar PM2 para mantener el servidor activo
sudo npm install -g pm2

# Iniciar con PM2
pm2 start server.js --name mrfuel

# Configurar inicio automático
pm2 startup
pm2 save

# Ver logs
pm2 logs mrfuel
```

### Opción 3: Hosting Compartido con Node.js

1. Subir archivos por FTP/SFTP
2. Conectar por SSH o usar File Manager
3. Ejecutar `npm install`
4. Configurar `.env`
5. Ejecutar `npm run init-db`
6. Iniciar con `npm start` o configurar en panel de control

---

## 🔐 Seguridad

### Cambiar Contraseña por Defecto

**Después del primer login:**
1. Ir a perfil de usuario
2. Cambiar contraseña
3. Usar contraseña segura (mínimo 8 caracteres)

### Variables de Entorno

**NUNCA subir el archivo `.env` a repositorios públicos**

```bash
# Agregar a .gitignore
echo ".env" >> .gitignore
```

### Session Secret

Cambiar `SESSION_SECRET` en producción:

```env
SESSION_SECRET=clave-aleatoria-muy-larga-y-segura-2024
```

Generar clave segura:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📱 Uso desde Móviles

### Características Móviles

✅ Diseño 100% responsive
✅ Captura de fotos directamente desde cámara
✅ Interfaz touch-friendly
✅ Funciona en iOS y Android
✅ Modo offline básico (próximamente)

### Agregar a Pantalla de Inicio (PWA-like)

**iOS (Safari):**
1. Abrir http://tu-servidor:3000
2. Tocar botón "Compartir"
3. "Agregar a pantalla de inicio"

**Android (Chrome):**
1. Abrir http://tu-servidor:3000
2. Menú → "Agregar a pantalla de inicio"

---

## 🛠️ Solución de Problemas

### Error: "Cannot find module..."

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "EADDRINUSE" (Puerto en uso)

```bash
# Cambiar puerto en .env
PORT=3001
```

O matar proceso en puerto 3000:

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error al enviar emails

1. Verificar credenciales en `.env`
2. Para Gmail: Usar "contraseña de aplicación"
3. Revisar logs del servidor
4. Verificar firewall no bloquea puerto 587

### Base de datos bloqueada

```bash
# Detener servidor
# Eliminar archivo de bloqueo
rm database/mrfuel.db-journal
# Reiniciar
npm start
```

### Fotos no se suben

1. Verificar permisos de carpeta `public/uploads`
2. Verificar tamaño de archivo (máximo 5MB)
3. Verificar formato (JPG, PNG, WEBP)

```bash
chmod -R 755 public/uploads
```

---

## 📚 Estructura del Proyecto

```
mr-fuel/
├── config/
│   ├── database.js          # Conexión SQLite
│   └── multer.js            # Configuración uploads
├── controllers/
│   ├── authController.js    # Autenticación
│   └── auditoriaController.js  # Lógica auditorías
├── middleware/
│   └── auth.js              # Verificación permisos
├── models/                  # (Futuro: Modelos Sequelize)
├── routes/
│   ├── auth.js             # Rutas login/logout
│   ├── dashboard.js        # Rutas dashboard
│   ├── auditorias.js       # Rutas auditorías
│   ├── estaciones.js       # Rutas estaciones
│   └── usuarios.js         # Rutas usuarios
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── auditorias/
│   │   ├── lista.ejs
│   │   ├── nueva.ejs
│   │   └── detalle.ejs
│   ├── dashboard/
│   │   └── index.ejs
│   ├── estaciones/
│   ├── usuarios/
│   └── login.ejs
├── public/
│   ├── css/
│   │   └── style.css       # Estilos Texaco
│   ├── js/
│   │   └── main.js
│   └── uploads/
│       └── auditorias/     # Fotos subidas
├── utils/
│   ├── initDB.js           # Inicializar BD
│   ├── email.js            # Envío emails
│   └── cron.js             # Recordatorios
├── database/
│   └── mrfuel.db           # SQLite
├── .env.example
├── .gitignore
├── package.json
├── server.js               # Servidor principal
└── README.md
```

---

## 🆘 Soporte

### Desarrollador

**Pedro**
- Docente de Informática y Diseño Gráfico
- Consultor IT/IA y Marketing Digital
- Instituto Tecnológico Santo Tomás

### Contacto

- Email: [tu-email]
- GitHub: [tu-github]

---

## 📄 Licencia

MIT License - Uso libre para proyectos educativos y comerciales.

---

## 🎯 Próximas Funcionalidades

- [ ] Exportación de reportes a Excel/PDF
- [ ] Gráficos avanzados con Chart.js
- [ ] Modo offline con sincronización
- [ ] App móvil nativa (React Native)
- [ ] Geolocalización automática de visitas
- [ ] Integración con WhatsApp Business API
- [ ] Dashboard en tiempo real con WebSockets
- [ ] Análisis de tendencias con IA

---

**🛢️ Mr. Fuel - Auditorías Texaco de Clase Mundial**

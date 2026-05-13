# 🛢️ MR. FUEL V2.0 - SISTEMA DE AUDITORÍAS TEXACO

Sistema completo de auditorías para estaciones Texaco con checklist escalable, evidencia fotográfica por ítem y firma digital.

---

## 🚀 DESPLIEGUE RÁPIDO EN RAILWAY

### 1. Subir a GitHub

```bash
git add .
git commit -m "Deploy Mr. Fuel v2.0"
git push origin main
```

### 2. Configurar Variables en Railway

Copiar el contenido de `.env.railway.example` a:

**Railway → Settings → Variables → RAW Editor**

⚠️ **IMPORTANTE:** Cambiar `RESEND_API_KEY` por tu key real

### 3. Deploy Automático

Railway detectará los cambios y desplegará automáticamente.

✅ Ver guía completa en: [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md)

---

## ✨ Funcionalidades v2.0

### 📋 Checklist Escalable
- 4 categorías predefinidas: PISTA, TIENDA, BODEGA, COCINA
- 44 ítems de evaluación configurados
- Admin puede agregar más categorías e ítems

### 📸 Evidencia Fotográfica
- Hasta 3 fotos por cada ítem evaluado
- Captura directa desde cámara móvil
- Previsualizaciones antes de guardar

### ✍️ Firma Digital
- Canvas HTML5 para firma manuscrita
- Compatible con mouse y pantalla táctil
- Se guarda como imagen en el reporte

### 📧 Reportes por Email (Resend)
- Galería completa de todas las fotos
- Organizado por categorías
- Estadísticas de cumplimiento
- Firma digital incluida

### ⚙️ Panel de Administración
- CRUD completo de categorías
- CRUD completo de ítems
- Reordenamiento drag & drop
- Activar/desactivar elementos

---

## 📊 Checklist Predefinido

| Categoría | Ítems | Ejemplos |
|-----------|-------|----------|
| **PISTA** | 9 | Uniformes, Carnets, Pista limpia, Música... |
| **TIENDA** | 25 | Baños, Cooler, Multideck, Fechas vencimiento... |
| **BODEGA** | 3 | Ordenado, Limpio, Cuarto eléctrico despejado |
| **COCINA** | 7 | Surtido, Maya pelo, Guantes, Lista pedidos... |

**Total: 44 ítems**

---

## 🏗️ Arquitectura

### Stack Tecnológico
- **Backend:** Node.js + Express
- **Base de Datos:** SQLite
- **Views:** EJS
- **Email:** Resend API
- **Deploy:** Railway

### Nuevas Tablas v2.0
- `categorias` - Categorías del checklist
- `items_auditoria` - Ítems de cada categoría
- `auditorias_v2` - Auditorías completas
- `evaluaciones_items` - Respuestas por ítem
- `fotos_items` - Hasta 3 fotos por ítem
- `configuracion` - Configuración del sistema

---

## 📁 Estructura del Proyecto

```
mr-fuel/
├── controllers/
│   ├── auditoriaV2Controller.js    ← NUEVO v2.0
│   ├── adminController.js          ← NUEVO v2.0
│   ├── auditoriaController.js      (v1 - legacy)
│   ├── estacionController.js
│   └── usuarioController.js
├── routes/
│   ├── auditorias-v2.js            ← NUEVO v2.0
│   ├── admin.js                    ← NUEVO v2.0
│   ├── auditorias.js               (v1 - legacy)
│   ├── estaciones.js
│   └── usuarios.js
├── views/
│   ├── auditorias-v2/              ← NUEVO v2.0
│   │   ├── nueva.ejs
│   │   ├── lista.ejs
│   │   └── detalle.ejs
│   ├── admin/                      ← NUEVO v2.0
│   │   ├── categorias.ejs
│   │   └── items.ejs
│   └── ... (otras vistas)
├── public/js/
│   └── auditoria-v2.js             ← NUEVO v2.0
├── utils/
│   ├── migrateToV2.js              ← NUEVO v2.0
│   └── email.js                    (actualizado para v2.0)
├── verify-v2.js                    ← NUEVO v2.0
├── Procfile                        (actualizado para v2.0)
├── DEPLOY_RAILWAY.md               ← Guía despliegue
├── UPGRADE_V2.md                   ← Guía actualización
└── .env.railway.example            ← Variables Railway
```

---

## 🔧 Desarrollo Local

### Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/mrfuel.git
cd mrfuel

# 2. Instalar dependencias
npm install

# 3. Configurar variables
cp .env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar migración
npm run migrate-v2

# 5. Iniciar servidor
npm start
```

La aplicación estará en: http://localhost:3000

### Usuario por Defecto
- **Email:** admin@mrfuel.com
- **Password:** admin123

---

## 📧 Configuración de Resend

### Obtener API Key

1. Ir a: https://resend.com/api-keys
2. Click "Create API Key"
3. Name: `Mr Fuel Production`
4. Permission: `Sending access`
5. Click "Add"
6. Copiar la key (empieza con `re_`)

### Variables de Entorno

```env
EMAIL_SERVICE=resend
RESEND_API_KEY=re_tu_key_aqui
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>
```

✅ Ver guía completa: [`RESEND_CONFIG.md`](./RESEND_CONFIG.md)

---

## 🌐 Endpoints Principales

### Públicos
- `GET /` - Login

### Auditorías v2.0
- `GET /auditorias-v2` - Lista de auditorías
- `GET /auditorias-v2/nueva` - Formulario nueva auditoría
- `POST /auditorias-v2/nueva` - Crear auditoría
- `GET /auditorias-v2/:id` - Ver detalle

### Administración (Solo Admin)
- `GET /admin/categorias` - Gestión de categorías
- `GET /admin/categorias/:id/items` - Gestión de ítems

### Otros
- `GET /dashboard` - Panel principal
- `GET /estaciones` - Gestión de estaciones
- `GET /usuarios` - Gestión de usuarios (admin)

---

## 🔒 Roles de Usuario

### Auditor
- ✅ Crear auditorías v2.0
- ✅ Ver sus auditorías
- ✅ Gestionar estaciones
- ❌ No puede acceder a admin

### Administrador
- ✅ Todo lo del auditor
- ✅ Ver todas las auditorías
- ✅ Gestionar usuarios
- ✅ Gestionar checklist (categorías e ítems)
- ✅ Eliminar auditorías

---

## 📱 Compatibilidad

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android tablets)
- ✅ Móvil (iOS, Android)
- ✅ Captura de fotos desde cámara móvil
- ✅ Firma táctil en pantallas touch

---

## 🆘 Solución de Problemas

### Error: "Cannot find module"
Ver: [`RAILWAY_DEBUG.md`](./RAILWAY_DEBUG.md)

### Error: "no such table: categorias"
Ejecutar: `npm run migrate-v2`

### Emails no llegan
Verificar: [`RESEND_CONFIG.md`](./RESEND_CONFIG.md)

### Datos no persisten en Railway
Ver: [`RAILWAY_PERSISTENCIA.md`](./RAILWAY_PERSISTENCIA.md)

---

## 📚 Documentación Completa

- [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md) - Guía de despliegue en Railway
- [`UPGRADE_V2.md`](./UPGRADE_V2.md) - Actualización desde v1.0
- [`RESEND_CONFIG.md`](./RESEND_CONFIG.md) - Configuración de email
- [`RAILWAY_DEBUG.md`](./RAILWAY_DEBUG.md) - Diagnóstico de errores
- [`ARCHIVOS_V2.md`](./ARCHIVOS_V2.md) - Lista de archivos nuevos

---

## 📞 Soporte

**Asesores Lab**  
WhatsApp: +504 9697 8435

---

## 📄 Licencia

© 2024-2026 Mr. Fuel v2.0 - Sistema de Auditorías Texaco

---

**🎉 Mr. Fuel v2.0 - Sistema de Auditorías de Última Generación**

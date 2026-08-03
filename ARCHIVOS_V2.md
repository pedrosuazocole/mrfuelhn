# 📂 LISTA COMPLETA DE ARCHIVOS - MR. FUEL V2.0

## ✅ Archivos Nuevos en v2.0

### Controladores
- `controllers/auditoriaV2Controller.js` - Controlador completo de auditorías v2
- `controllers/adminController.js` - Gestión de categorías e ítems

### Rutas
- `routes/auditorias-v2.js` - Endpoints de auditorías v2
- `routes/admin.js` - Endpoints de administración

### Vistas - Auditorías v2
- `views/auditorias-v2/nueva.ejs` - Formulario de nueva auditoría
- `views/auditorias-v2/lista.ejs` - Lista de auditorías
- `views/auditorias-v2/detalle.ejs` - Vista detallada de auditoría

### Vistas - Administración
- `views/admin/categorias.ejs` - Gestión de categorías
- `views/admin/items.ejs` - Gestión de ítems por categoría

### JavaScript Frontend
- `public/js/auditoria-v2.js` - Lógica del formulario v2 (con firma digital)

### Utilidades
- `utils/migrateToV2.js` - Script de migración de BD
- `verify-v2.js` - Script de verificación de archivos

### Documentación
- `UPGRADE_V2.md` - Guía completa de actualización
- `DEPLOY_RAILWAY.md` - Guía rápida de despliegue
- `RAILWAY_DEBUG.md` - Diagnóstico de errores
- `RESEND_CONFIG.md` - Configuración de Resend
- `.env.railway.example` - Variables para Railway

## ✅ Archivos Modificados en v2.0

- `server.js` - Agregadas rutas v2 (sin duplicados)
- `views/partials/header.ejs` - Menú con "Auditorías v2.0" y "Checklist"
- `views/partials/footer.ejs` - Actualizado: "Asesores Lab - WhatsApp: +504 9697 8435"
- `utils/email.js` - Agregada función para v2 con galería de fotos
- `package.json` - Scripts de v2.0 agregados
- `.env.example` - Variables completas documentadas
- `Procfile` - Actualizado para v2.0

## ✅ Archivos que Ya Existían (Sin cambios)

- `config/database.js`
- `config/multer.js`
- `middleware/auth.js`
- `routes/auth.js`
- `routes/dashboard.js`
- `routes/estaciones.js`
- `routes/usuarios.js`
- `routes/auditorias.js` (v1 - aún funcional)
- `controllers/auditoriaController.js` (v1)
- `controllers/estacionController.js`
- `controllers/usuarioController.js`
- `views/login.ejs`
- `views/dashboard/index.ejs`
- Todos los archivos de estaciones, usuarios, etc.

## 📊 Resumen

**Archivos Nuevos:** 19  
**Archivos Modificados:** 7  
**Total Archivos v2.0:** 26  

**Líneas de Código Nuevas:** ~3,500+

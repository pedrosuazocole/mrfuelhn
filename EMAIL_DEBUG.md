# 📧 DIAGNÓSTICO: Emails No Llegan

## ✅ Checklist de Configuración

Revisá cada punto para encontrar el problema:

---

## 1. Variables de Entorno Configuradas en Railway

Ve a **Railway** → Tu proyecto → **Settings** → **Variables**

Debe tener TODAS estas variables:

```env
# SMTP (Gmail como ejemplo)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion
EMAIL_FROM=Mr. Fuel <tu-email@gmail.com>

# Destinatarios de notificaciones
ADMIN_EMAILS=admin@texaco.com,director@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com
```

### ⚠️ IMPORTANTE: Contraseña de Aplicación de Gmail

Si usás Gmail, **NO es tu contraseña normal**.

**Cómo obtener contraseña de aplicación:**

1. Ir a https://myaccount.google.com/security
2. Activar **Verificación en 2 pasos** (si no está activa)
3. Ir a **Contraseñas de aplicaciones**
4. Seleccionar "Correo" y "Otro (nombre personalizado)"
5. Escribir "Mr Fuel Railway"
6. Gmail te dará una contraseña de 16 caracteres
7. Copiar esa contraseña a `EMAIL_PASS`

---

## 2. Verificar en los Logs

Después de crear una auditoría, ve a **Railway** → **Deployments** → **View Logs**

### ✅ Si el email se envió correctamente:

```
📝 Iniciando creación de auditoría...
✅ Auditoría insertada con ID: 1
📧 Preparando notificación...
📤 Enviando email...
✅ Email enviado
✅ Auditoría creada: ID 1 - Texaco La Ceiba (85%)
```

### ❌ Si hay error de configuración:

```
⚠️  No hay destinatarios configurados para notificaciones
```

**Solución:** Agregar `ADMIN_EMAILS` y/o `SUPERVISOR_EMAILS`

### ❌ Si hay error de SMTP:

```
❌ Error al enviar email: Invalid login
```

**Solución:** Verificar `EMAIL_USER` y `EMAIL_PASS`

```
❌ Error al enviar email: Connection timeout
```

**Solución:** Verificar `EMAIL_HOST` y `EMAIL_PORT`

---

## 3. Verificar Destinatarios

Los emails se envían a:

**Todos los emails en:**
- `ADMIN_EMAILS` (separados por comas, sin espacios)
- `SUPERVISOR_EMAILS` (separados por comas, sin espacios)

### ✅ Correcto:
```env
ADMIN_EMAILS=admin@texaco.com,director@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com
```

### ❌ Incorrecto:
```env
ADMIN_EMAILS=admin@texaco.com, director@texaco.com  ← Espacios
SUPERVISOR_EMAILS=                                    ← Vacío
```

---

## 4. Probar Configuración Manualmente

Podés probar la configuración de email con este script de Node.js:

**Crear archivo `test-email.js`:**

```javascript
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function test() {
  try {
    console.log('📧 Probando configuración de email...');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('User:', process.env.EMAIL_USER);
    console.log('From:', process.env.EMAIL_FROM);
    
    const destinatarios = [
      ...(process.env.ADMIN_EMAILS || '').split(','),
      ...(process.env.SUPERVISOR_EMAILS || '').split(',')
    ].filter(email => email.trim());
    
    console.log('Destinatarios:', destinatarios);
    
    if (destinatarios.length === 0) {
      console.log('❌ No hay destinatarios configurados');
      return;
    }
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: destinatarios.join(','),
      subject: '🧪 Prueba de Email - Mr. Fuel',
      text: 'Si recibís este email, la configuración funciona correctamente.',
      html: '<h1>✅ Configuración de Email Correcta</h1><p>El sistema de notificaciones está funcionando.</p>'
    });
    
    console.log('✅ Email enviado:', info.messageId);
    console.log('✅ La configuración funciona correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Solución: Verificar EMAIL_USER y EMAIL_PASS');
      console.log('Si usás Gmail, necesitás una "Contraseña de aplicación"');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Solución: Verificar EMAIL_HOST y EMAIL_PORT');
    }
  }
}

test();
```

**Ejecutar:**
```bash
node test-email.js
```

---

## 5. Proveedores de Email Comunes

### Gmail (Recomendado)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-de-16-caracteres-de-aplicacion
```

### Outlook / Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@outlook.com
EMAIL_PASS=tu-contraseña
```

### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@yahoo.com
EMAIL_PASS=contraseña-de-aplicacion
```

### Office 365
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@empresa.com
EMAIL_PASS=tu-contraseña
```

---

## 6. Revisar Carpeta de SPAM

Los emails automáticos a veces van a SPAM:

1. Revisar carpeta **SPAM/Correo no deseado**
2. Marcar como "No es spam"
3. Agregar remitente a contactos

---

## 7. Errores Comunes

### Error: "No hay destinatarios configurados"

**Causa:** Falta `ADMIN_EMAILS` o `SUPERVISOR_EMAILS`

**Solución:**
```env
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor@texaco.com
```

### Error: "Invalid login"

**Causa:** Contraseña incorrecta o no es contraseña de aplicación

**Solución:**
- Verificar `EMAIL_USER` y `EMAIL_PASS`
- Si es Gmail, generar contraseña de aplicación

### Error: "Connection timeout"

**Causa:** Puerto o host incorrecto, o firewall bloqueando

**Solución:**
- Verificar `EMAIL_HOST` y `EMAIL_PORT`
- Gmail: `smtp.gmail.com` puerto `587`

### Error: "self signed certificate"

**Causa:** Problema con certificado SSL

**Solución:**
```env
EMAIL_SECURE=false
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## 8. Configuración Mínima para Probar

Si querés probar rápido, solo necesitás:

```env
# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-aplicacion-16-caracteres
EMAIL_FROM=Mr. Fuel <tu-email@gmail.com>

# Destinatario (tu propio email para probar)
ADMIN_EMAILS=tu-email@gmail.com
```

Crear auditoría → Revisar tu email (y SPAM)

---

## ✅ Verificación Final

Después de configurar todo:

1. ✅ Variables de email configuradas en Railway
2. ✅ `ADMIN_EMAILS` o `SUPERVISOR_EMAILS` con al menos un email
3. ✅ Contraseña de aplicación (si usás Gmail)
4. ✅ Redeploy de Railway
5. ✅ Crear una auditoría
6. ✅ Revisar logs: debe decir "✅ Email enviado"
7. ✅ Revisar email (y carpeta SPAM)

---

## 🆘 Si Aún No Funciona

1. **Copiar los logs completos** desde que guardás la auditoría
2. **Verificar que las variables estén en Railway** (no solo en .env local)
3. **Revisar si Railway muestra errores** en el deployment
4. **Probar con otro email** (por ejemplo, tu Gmail personal)

---

## 📞 Información para Debug

Si necesitás ayuda, proporcioná:

1. Los logs de Railway al crear la auditoría
2. Las variables de email que tenés (sin mostrar la contraseña)
3. El proveedor de email (Gmail, Outlook, etc.)

---

**📧 Una vez configurado correctamente, todos los emails llegarán automáticamente!**

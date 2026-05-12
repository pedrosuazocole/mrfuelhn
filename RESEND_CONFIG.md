# 📧 CONFIGURACIÓN DE RESEND PARA MR. FUEL

## 🎯 Por Qué Resend

Resend es **mejor que Gmail/SMTP** para apps en Railway porque:
- ✅ **100% confiable** - No hay problemas de firewall
- ✅ **100 emails/día gratis** - Suficiente para empezar
- ✅ **Configuración en 2 minutos**
- ✅ **API moderna** - Más rápido que SMTP
- ✅ **No requiere contraseñas de aplicación**

---

## 📋 PASO 1: Crear Cuenta en Resend

1. **Ir a:** https://resend.com/signup
2. **Registrarse** con tu email
3. **Verificar** el email de confirmación
4. **Entrar** al dashboard

---

## 🔑 PASO 2: Obtener API Key

1. En el dashboard de Resend
2. Click en **"API Keys"** (menú izquierdo)
3. Click en **"Create API Key"**
4. **Name:** `Mr Fuel Production`
5. **Permission:** `Sending access`
6. Click **"Add"**
7. **Copiar la API Key** (empieza con `re_...`)

**⚠️ IMPORTANTE:** Guarda esta key, no la podrás ver de nuevo.

---

## 📧 PASO 3: Configurar Email de Envío

Resend te da 2 opciones:

### Opción A: Usar Email de Prueba (Más Rápido)

Resend te da un email para pruebas:
```
onboarding@resend.dev
```

✅ **Ventaja:** Funciona inmediatamente, sin configurar dominio  
⚠️ **Limitación:** Solo para testing (los emails pueden ir a SPAM)

### Opción B: Verificar Tu Dominio (Profesional)

Si tenés un dominio (ej: `texaco-honduras.com`):

1. En Resend → **"Domains"** → **"Add Domain"**
2. Agregar tu dominio: `texaco-honduras.com`
3. Copiar los **registros DNS** que Resend te da
4. Ir a tu proveedor de dominio (GoDaddy, Namecheap, etc.)
5. Agregar los registros DNS
6. Esperar 5-10 minutos
7. En Resend → **"Verify"**

Una vez verificado, podés usar:
```
noreply@texaco-honduras.com
mrfuel@texaco-honduras.com
```

---

## ⚙️ PASO 4: Variables de Entorno en Railway

Ve a **Railway** → **Settings** → **Variables** → **RAW Editor**

### Si Usás Email de Prueba:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=mr_fuel_texaco_secret_key_2024

# RESEND (Email Service)
EMAIL_SERVICE=resend
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>

# Destinatarios
ADMIN_EMAILS=psuazoc@gmail.com
SUPERVISOR_EMAILS=psuazoc@gmail.com,edic_10@hotmail.com

# Recordatorios
REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00

# Sistema
TZ=America/Tegucigalpa
RAILWAY_VOLUME_MOUNT_PATH=/data

# Otros
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/webp
MAX_FILE_SIZE=5242880
BRAND_NAME=Texaco
```

### Si Usás Dominio Propio:

```env
EMAIL_SERVICE=resend
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM=Mr. Fuel <noreply@texaco-honduras.com>
```

---

## 🚀 PASO 5: Instalar Resend

Railway instalará automáticamente las dependencias.

Si trabajás en local, ejecutá:

```bash
npm install resend
```

---

## 🧪 PASO 6: Probar

1. **Railway hace redeploy automático** después de agregar variables
2. **Crear una auditoría** en la app
3. **Ver los logs:**

```
✅ Servicio de email: Resend
📧 Preparando notificación...
📤 Enviando email...
✅ Email enviado vía Resend: 550e8400-e29b-41d4-a716-446655440000
```

4. **Revisar tu email** (y carpeta SPAM la primera vez)

---

## 🔄 Si Querés Volver a SMTP

Cambiar en Railway Variables:

```env
# Borrar o comentar estas líneas
# EMAIL_SERVICE=resend
# RESEND_API_KEY=re_...

# Agregar estas
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=aade1f001@smtp-brevo.com
EMAIL_PASS=tu-smtp-key
EMAIL_FROM=Mr. Fuel <aade1f001@smtp-brevo.com>
```

El código auto-detecta cuál usar.

---

## 📊 Comparación: Resend vs SMTP

| Aspecto | Resend | SMTP (Brevo/Gmail) |
|---------|--------|-------------------|
| Configuración | 2 minutos | 5-10 minutos |
| Firewall | ✅ Sin problemas | ⚠️ Puede bloquearse |
| API Key | ✅ Simple | ⚠️ Contraseña compleja |
| Confiabilidad | ✅✅ Excelente | ✅ Buena |
| Gratis | 100/día | 300/día (Brevo) |
| Profesional | ✅✅ Muy profesional | ✅ Profesional |

---

## 🎯 RECOMENDACIÓN FINAL

### Para Testing/Demo:
```env
EMAIL_SERVICE=resend
RESEND_API_KEY=tu_key
EMAIL_FROM=Mr. Fuel <onboarding@resend.dev>
```

### Para Producción:
1. **Obtener dominio** (ej: `mrfuel.app`)
2. **Verificarlo en Resend**
3. **Usar email profesional:**
```env
EMAIL_FROM=Mr. Fuel <noreply@mrfuel.app>
```

---

## 💡 Consejos Pro

### 1. Monitorear Emails en Resend

Dashboard → Emails → Ver todos los envíos en tiempo real

### 2. Webhooks (Avanzado)

Resend puede notificarte cuando un email:
- Se entrega
- Se abre
- Hace click en un link
- Rebota

### 3. Límites Gratis

- **100 emails/día** en plan gratis
- **3,000 emails/mes**
- Si necesitás más → $20/mes por 50,000 emails

---

## 🆘 Problemas Comunes

### Error: "Resend no instalado"

**Solución:** Railway debería instalar automáticamente. Si no:

1. Asegurar que `package.json` tenga:
```json
"optionalDependencies": {
  "resend": "^3.0.0"
}
```

2. Railway hará redeploy y lo instalará

### Error: "Invalid API key"

**Solución:** Verificar que:
- La key empiece con `re_`
- No tenga espacios al principio/final
- Esté bien copiada en Railway

### Emails van a SPAM

**Solución:**
- Usar dominio verificado en lugar de `onboarding@resend.dev`
- Configurar SPF, DKIM, DMARC (Resend lo hace automáticamente)

---

## ✅ Checklist Final

- [ ] Cuenta creada en Resend
- [ ] API Key obtenida (empieza con `re_`)
- [ ] Variables agregadas en Railway
- [ ] `EMAIL_SERVICE=resend` configurado
- [ ] `RESEND_API_KEY` con tu key
- [ ] `EMAIL_FROM` con email válido
- [ ] `ADMIN_EMAILS` con destinatarios
- [ ] Redeploy de Railway completado
- [ ] Auditoría de prueba creada
- [ ] Logs muestran "✅ Email enviado vía Resend"
- [ ] Email recibido (revisar SPAM)

---

**¡Con Resend configurado, los emails llegarán 100% confiable!** 📧✅

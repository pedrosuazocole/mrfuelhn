# 📧 SISTEMA DE NOTIFICACIONES - MR. FUEL

## 🎯 Resumen Ejecutivo

El sistema envía **2 tipos de notificaciones por email**:

1. **Notificaciones de Auditoría Completada** → Cuando se completa una nueva auditoría
2. **Recordatorios Programados** → 3 veces por semana para hacer auditorías

---

## 📨 TIPO 1: Notificaciones de Auditoría Completada

### ¿Cuándo se envía?
Cada vez que **cualquier usuario** (Auditor, Supervisor o Admin) completa y guarda una auditoría.

### ¿A quién le llega?
✅ **Administradores** - Todos los emails en `ADMIN_EMAILS`  
✅ **Supervisores** - Todos los emails en `SUPERVISOR_EMAILS`  
❌ **Auditores** - NO reciben notificaciones

### ¿Cómo se configura?

En el archivo `.env` o en las **Variables de Entorno de Railway**:

```env
# Administradores (separados por comas, sin espacios)
ADMIN_EMAILS=admin1@texaco.com,admin2@texaco.com,director@texaco.com

# Supervisores (separados por comas, sin espacios)
SUPERVISOR_EMAILS=supervisor1@texaco.com,supervisor2@texaco.com,jefe@texaco.com
```

### ¿Qué contiene el email?

**Asunto:**
```
🔍 Nueva Auditoría - Texaco La Ceiba (85%)
```

**Contenido:**
- Estación auditada (nombre y código)
- Fecha y hora de la visita
- Nombre del auditor
- **Calificación general en grande** con color:
  - 🟢 Verde si ≥ 80%
  - 🟡 Amarillo si 60-79%
  - 🔴 Rojo si < 60%
- Detalle de cada criterio evaluado:
  - Limpieza de Bombas
  - Organización de Aceites
  - Uniforme Completo (indica si tiene gorra)
  - Protocolo de Saludo
  - Trato Durante la Compra
  - Protocolo de Despedida
- Observaciones generales (si hay)
- Link para ver la auditoría completa

### Ejemplo de destinatarios:

```env
ADMIN_EMAILS=director@texaco.com,gerente@texaco.com
SUPERVISOR_EMAILS=supervisor.norte@texaco.com,supervisor.sur@texaco.com
```

**Resultado:** 4 personas reciben el email cuando se completa cualquier auditoría.

---

## ⏰ TIPO 2: Recordatorios Programados

### ¿Cuándo se envía?
**3 veces por semana** (por defecto: Lunes, Miércoles, Viernes a las 8:00 AM)

### ¿A quién le llega?
✅ **Administradores** - Todos los usuarios con rol `admin` que estén activos  
✅ **Supervisores** - Todos los usuarios con rol `supervisor` que estén activos  
❌ **Auditores** - NO reciben recordatorios

**IMPORTANTE:** Los recordatorios se envían a los **usuarios del sistema** (no a los emails de `.env`).

### ¿Cómo se configura?

**Días y hora:**
```env
# Días de la semana (0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado)
REMINDER_DAYS=1,3,5

# Hora del recordatorio (formato 24h)
REMINDER_HOUR=08
REMINDER_MINUTE=00
```

**¿A quién se envía?**  
Se obtienen automáticamente desde la **base de datos**:

```sql
SELECT * FROM usuarios 
WHERE rol IN ('supervisor', 'admin') 
  AND activo = 1
```

Es decir, **todos los Supervisores y Administradores activos en el sistema**.

### ¿Qué contiene el email?

**Asunto:**
```
📅 Recordatorio: Auditoría Programada - Estaciones Asignadas
```

**Contenido:**
- Saludo personalizado con el nombre del usuario
- Fecha programada
- Lista del checklist a completar:
  - ✅ Limpieza de bombas
  - ✅ Organización de aceites
  - ✅ Uniforme completo (con gorra)
  - ✅ Protocolo de saludo
  - ✅ Trato durante la compra
  - ✅ Despedida profesional
- Link directo para **Iniciar Auditoría**

### Ejemplo:

Si tenés en la base de datos:
- 2 usuarios con rol `admin` activos
- 3 usuarios con rol `supervisor` activos

**Resultado:** 5 personas reciben el recordatorio cada Lunes, Miércoles y Viernes a las 8:00 AM.

---

## 📊 TABLA RESUMEN

| Tipo de Notificación | Quién Recibe | Configuración | Frecuencia |
|---------------------|--------------|---------------|------------|
| **Auditoría Completada** | Emails en `ADMIN_EMAILS` + `SUPERVISOR_EMAILS` | Variables `.env` | Cada vez que se guarda una auditoría |
| **Recordatorios** | Usuarios con rol `admin` o `supervisor` activos | Base de datos | 3 veces por semana (configurable) |

---

## ⚙️ CONFIGURACIÓN RECOMENDADA

### Para Producción:

**En `.env` (o Variables de Railway):**

```env
# ===================================
# EMAILS DE NOTIFICACIÓN
# ===================================

# Administradores que reciben notificaciones de auditorías
ADMIN_EMAILS=director@texaco.com,gerente.general@texaco.com

# Supervisores que reciben notificaciones de auditorías
SUPERVISOR_EMAILS=supervisor.region1@texaco.com,supervisor.region2@texaco.com

# ===================================
# RECORDATORIOS AUTOMÁTICOS
# ===================================

# Lunes (1), Miércoles (3), Viernes (5)
REMINDER_DAYS=1,3,5

# 8:00 AM hora de Honduras
REMINDER_HOUR=08
REMINDER_MINUTE=00

# Zona horaria
TZ=America/Tegucigalpa
```

### En la Base de Datos:

Crear usuarios con roles apropiados:

```sql
-- Administradores (reciben recordatorios automáticos)
INSERT INTO usuarios (nombre, email, rol, activo) 
VALUES ('Director General', 'director@texaco.com', 'admin', 1);

-- Supervisores (reciben recordatorios automáticos)
INSERT INTO usuarios (nombre, email, rol, activo) 
VALUES ('Supervisor Región Norte', 'supervisor.norte@texaco.com', 'supervisor', 1);

-- Auditores (NO reciben recordatorios)
INSERT INTO usuarios (nombre, email, rol, activo) 
VALUES ('Auditor Juan', 'auditor1@texaco.com', 'auditor', 1);
```

---

## 🔔 ¿QUIÉN RECIBE QUÉ?

### Rol: **Administrador**
- ✅ Notificaciones de auditorías completadas (si su email está en `ADMIN_EMAILS`)
- ✅ Recordatorios automáticos (si está activo en la BD)

### Rol: **Supervisor**
- ✅ Notificaciones de auditorías completadas (si su email está en `SUPERVISOR_EMAILS`)
- ✅ Recordatorios automáticos (si está activo en la BD)

### Rol: **Auditor**
- ❌ NO recibe notificaciones de auditorías
- ❌ NO recibe recordatorios automáticos

---

## 💡 CASOS DE USO

### Caso 1: Equipo Pequeño
```
1 Director (admin)
2 Supervisores
3 Auditores
```

**Configuración:**
```env
ADMIN_EMAILS=director@texaco.com
SUPERVISOR_EMAILS=supervisor1@texaco.com,supervisor2@texaco.com
```

**Resultado:**
- Cuando se completa una auditoría → 3 personas reciben email
- Recordatorios 3x semana → 3 personas reciben email

---

### Caso 2: Equipo Grande
```
1 Director (admin)
1 Gerente (admin)
5 Supervisores regionales
10 Auditores
```

**Configuración:**
```env
ADMIN_EMAILS=director@texaco.com,gerente@texaco.com
SUPERVISOR_EMAILS=super1@texaco.com,super2@texaco.com,super3@texaco.com,super4@texaco.com,super5@texaco.com
```

**Resultado:**
- Cuando se completa una auditoría → 7 personas reciben email
- Recordatorios 3x semana → 7 personas reciben email

---

### Caso 3: Solo Notificaciones de Auditoría (Sin Recordatorios)

**Opción A:** Desactivar cron jobs (comentar en server.js)  
**Opción B:** No crear usuarios supervisor/admin en la BD (solo auditores)  
**Opción C:** Dejar `REMINDER_DAYS` vacío

---

## 🧪 CÓMO PROBAR

### Probar Notificación de Auditoría:

1. Configurar emails en `.env`:
   ```env
   ADMIN_EMAILS=tu-email@gmail.com
   ```

2. Completar y guardar una auditoría

3. Revisar tu email (y carpeta SPAM)

### Probar Recordatorios:

**Opción 1 (cambiar hora):**
```env
# Configurar para que se envíe en 5 minutos
REMINDER_HOUR=14
REMINDER_MINUTE=35
```

**Opción 2 (forzar manualmente):**
Ejecutar el script de cron directamente (requiere acceso al servidor)

---

## ❓ PREGUNTAS FRECUENTES

### ¿Los auditores reciben emails?
❌ No. Solo Admin y Supervisor.

### ¿Puedo poner el mismo email en ADMIN_EMAILS y SUPERVISOR_EMAILS?
✅ Sí, pero recibirá 2 copias del email.

### ¿Qué pasa si no configuro EMAIL_USER y EMAIL_PASS?
⚠️ El sistema funciona, pero NO se envían emails. Las auditorías se guardan normalmente.

### ¿Los recordatorios se envían aunque no haya auditorías pendientes?
✅ Sí. Son recordatorios generales para hacer auditorías.

### ¿Puedo desactivar las notificaciones?
✅ Sí:
- Dejar `ADMIN_EMAILS` y `SUPERVISOR_EMAILS` vacíos
- No configurar EMAIL_USER/EMAIL_PASS

---

## 🎯 RESUMEN FINAL

**Notificaciones de Auditoría:**
- Destinatarios: Emails en `ADMIN_EMAILS` + `SUPERVISOR_EMAILS`
- Cuándo: Al completar cada auditoría
- Configurable en: `.env` o Variables de Railway

**Recordatorios Programados:**
- Destinatarios: Usuarios con rol `admin` o `supervisor` (activos en BD)
- Cuándo: 3 veces por semana (por defecto: Lun/Mié/Vie 8:00 AM)
- Configurable en: `.env` (días/hora) + Base de datos (usuarios)

---

**📧 Mr. Fuel - Sistema de Notificaciones Inteligente**

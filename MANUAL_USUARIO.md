# 📖 MANUAL DE USUARIO - MR. FUEL

## Sistema de Cliente Misterioso para Gasolineras Texaco

---

## 📌 Índice

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Panel Principal (Dashboard)](#panel-principal)
4. [Crear Nueva Auditoría](#crear-nueva-auditoría)
5. [Gestionar Auditorías](#gestionar-auditorías)
6. [Administrar Estaciones](#administrar-estaciones)
7. [Gestión de Usuarios](#gestión-de-usuarios)
8. [Notificaciones y Recordatorios](#notificaciones-y-recordatorios)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 1. Introducción

**Mr. Fuel** es un sistema de auditoría para gasolineras Texaco que permite:
- Realizar evaluaciones de servicio tipo "cliente misterioso"
- Subir fotografías de evidencia
- Generar reportes automáticos
- Recibir notificaciones por correo
- Programar recordatorios de visitas

### Roles de Usuario

#### 👤 **Auditor**
- Crear auditorías
- Ver sus propias auditorías
- Subir fotos

#### 👥 **Supervisor**
- Todo lo del Auditor
- Ver todas las auditorías
- Gestionar estaciones
- Recibir recordatorios programados

#### 🔐 **Administrador**
- Acceso completo al sistema
- Gestionar usuarios
- Eliminar auditorías
- Configurar notificaciones

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abrir el navegador web
2. Ir a la dirección del sistema (ej: http://localhost:3000)
3. Ingresar credenciales:
   - **Email:** tu-email@texaco.com
   - **Contraseña:** tu contraseña

4. Click en **"Iniciar Sesión"**

**Primera vez:**
- Email: `admin@texaco.com`
- Contraseña: `admin123`
- ⚠️ Cambiar contraseña después del primer acceso

### 2.2 Cambiar Contraseña

1. Click en tu nombre (esquina superior derecha)
2. Seleccionar **"Cambiar Contraseña"**
3. Ingresar:
   - Contraseña actual
   - Nueva contraseña (mínimo 6 caracteres)
   - Confirmar nueva contraseña
4. Click en **"Actualizar"**

### 2.3 Cerrar Sesión

- Click en el botón rojo de salida (🚪) en la barra superior

---

## 3. Panel Principal (Dashboard)

Al iniciar sesión, verás el **Dashboard** con:

### 3.1 Tarjetas de Estadísticas

- **📋 Auditorías Totales:** Número de auditorías realizadas
- **⛽ Estaciones Activas:** Gasolineras en el sistema
- **📊 Promedio General:** Calificación promedio de todas las auditorías

**Código de colores:**
- 🟢 **Verde:** 80-100% (Excelente)
- 🟡 **Amarillo:** 60-79% (Bueno)
- 🔴 **Rojo:** 0-59% (Necesita mejorar)

### 3.2 Últimas Auditorías

Tabla con las 5 auditorías más recientes:
- Fecha de visita
- Estación auditada
- Nombre del auditor
- Calificación obtenida
- Botón **"Ver"** para ver detalle

### 3.3 Rendimiento por Estación

Lista de estaciones con:
- Total de auditorías realizadas
- Promedio de calificación

---

## 4. Crear Nueva Auditoría

### 4.1 Iniciar Auditoría

1. Click en **"Auditorías"** en el menú
2. Click en **"Nueva Auditoría"**

O directamente desde Dashboard: **"+ Nueva Auditoría"**

### 4.2 Completar Formulario

#### **A. Información Básica**

1. **Estación:** Seleccionar de la lista desplegable
2. **Fecha de Visita:** Se establece automáticamente (hoy)
3. **Hora de Visita:** Se establece automáticamente (hora actual)
   - Puedes cambiar ambos si la visita fue en otro momento

#### **B. Criterios de Evaluación**

Para cada criterio, usar el **slider** (deslizador) para dar una puntuación de 0 a 100:

##### 1. 🧹 **Limpieza de Bombas**
- Evaluar: Limpieza de surtidores, pantallas, mangueras
- **Notas:** Agregar observaciones específicas (opcional)

##### 2. 🛢️ **Organización de Aceites**
- Evaluar: Orden en exhibidores, etiquetado, stock visible
- **Notas:** Comentarios sobre el área de aceites

##### 3. 👔 **Uniforme Completo**
- Evaluar: Presentación del personal
- ☑️ **Marcar checkbox** si el empleado lleva gorra
- **Notas:** Detalles sobre uniforme

##### 4. 👋 **Protocolo de Saludo**
- Evaluar: Saludo inicial, actitud amigable
- **Notas:** Descripción del saludo recibido

##### 5. 💬 **Trato Durante la Compra**
- Evaluar: Atención, cortesía, profesionalismo
- **Notas:** Detalles de la interacción

##### 6. 👋 **Protocolo de Despedida**
- Evaluar: Despedida, agradecimiento, invitación a regresar
- **Notas:** Comentarios finales

**💡 Consejo:** Ser honesto y objetivo. Las calificaciones bajas ayudan a identificar áreas de mejora.

#### **C. Fotografías**

1. Click en **"Subir Fotos"**
2. Opciones:
   - **En móvil:** Click en "Tomar foto" o "Elegir archivo"
   - **En computadora:** Seleccionar archivos de carpeta

**Límites:**
- Máximo 10 fotos por auditoría
- Formatos: JPG, PNG, WEBP
- Tamaño máximo: 5MB por imagen

**Qué fotografiar:**
- Bombas de gasolina
- Área de aceites
- Personal (con su consentimiento)
- Instalaciones generales

#### **D. Observaciones Generales**

- **Observaciones:** Comentarios adicionales sobre la visita
- **Recomendaciones:** Sugerencias de mejora

### 4.3 Guardar Auditoría

1. Revisar que todos los campos obligatorios estén completos
2. Click en **"Guardar Auditoría"**
3. Esperar mensaje de confirmación

**¿Qué sucede al guardar?**
- ✅ Se calcula la calificación general (promedio de los 6 criterios)
- ✅ Se envía email automático a supervisores y administradores
- ✅ Se guarda en la base de datos
- ✅ Se redirige al detalle de la auditoría

---

## 5. Gestionar Auditorías

### 5.1 Ver Lista de Auditorías

1. Click en **"Auditorías"** en el menú
2. Se muestra tabla con todas las auditorías

#### Filtros Disponibles:

- **Por Estación:** Seleccionar una estación específica
- **Fecha Desde:** Auditorías a partir de esta fecha
- **Fecha Hasta:** Auditorías hasta esta fecha
- **Por Auditor:** Ver auditorías de un usuario específico

**Aplicar filtros:**
1. Seleccionar criterios
2. Click en **"Filtrar"**

### 5.2 Ver Detalle de Auditoría

1. En la lista, click en **"Ver"** en la fila de la auditoría
2. Se muestra:
   - Información completa de la estación
   - Datos del auditor
   - Todas las calificaciones
   - Notas y observaciones
   - Fotografías (click para ampliar)
   - Fecha y hora de creación

### 5.3 Eliminar Auditoría (Solo Admin)

1. En detalle de auditoría
2. Click en **"Eliminar"**
3. Confirmar eliminación
4. ⚠️ **Esta acción no se puede deshacer**

---

## 6. Administrar Estaciones

### 6.1 Ver Lista de Estaciones

1. Click en **"Estaciones"** en el menú
2. Ver lista completa con:
   - Nombre
   - Código
   - Ciudad
   - Encargado
   - Estado (Activa/Inactiva)

### 6.2 Crear Nueva Estación (Admin/Supervisor)

1. Click en **"Nueva Estación"**
2. Completar formulario:

**Campos obligatorios:**
- **Nombre:** Nombre completo (ej: "Texaco Tegucigalpa Centro")
- **Código:** Identificador único (ej: "TEG-001")
- **Dirección:** Dirección completa
- **Ciudad:** Ciudad donde se ubica
- **Departamento:** Departamento de Honduras

**Campos opcionales:**
- **Teléfono:** Número de contacto
- **Encargado:** Nombre del encargado
- **Latitud/Longitud:** Coordenadas GPS

3. Click en **"Guardar"**

### 6.3 Editar Estación (Admin)

1. En lista de estaciones, click en **"Editar"**
2. Modificar campos necesarios
3. **"Guardar Cambios"**

### 6.4 Desactivar Estación (Admin)

1. En edición de estación
2. Desmarcar **"Activo"**
3. **"Guardar"**

**Nota:** Las auditorías previas no se eliminan.

---

## 7. Gestión de Usuarios (Solo Administradores)

### 7.1 Ver Lista de Usuarios

1. Click en **"Usuarios"** en el menú
2. Ver tabla con:
   - Nombre
   - Email
   - Rol
   - Estado
   - Fecha de creación

### 7.2 Crear Nuevo Usuario

1. Click en **"Nuevo Usuario"**
2. Completar:
   - **Nombre completo**
   - **Email** (único en el sistema)
   - **Contraseña** (mínimo 6 caracteres)
   - **Rol:**
     - Auditor: Solo auditorías
     - Supervisor: Auditorías + estaciones
     - Admin: Acceso total
   - **Teléfono** (opcional)

3. **"Crear Usuario"**

**Primera contraseña:**
- El usuario debe cambiarla en su primer acceso
- Enviar credenciales de forma segura

### 7.3 Desactivar Usuario

1. En lista, click en **"Desactivar"**
2. Confirmar acción

**Efecto:**
- El usuario no puede iniciar sesión
- Sus auditorías permanecen en el sistema
- Se puede reactivar después

### 7.4 Cambiar Rol de Usuario

1. Click en **"Editar"**
2. Seleccionar nuevo rol
3. **"Guardar"**

---

## 8. Notificaciones y Recordatorios

### 8.1 Notificaciones por Email

**Se envían automáticamente cuando:**

#### Al completar una auditoría:
- **Destinatarios:** Admins y Supervisores configurados
- **Contenido:**
  - Estación auditada
  - Fecha y hora de visita
  - Calificación general
  - Desglose de cada criterio
  - Link para ver detalle completo

### 8.2 Recordatorios Programados

**Frecuencia:** 3 veces por semana (configurable)
**Días predeterminados:** Lunes, Miércoles, Viernes
**Hora:** 8:00 AM (configurable)

**Destinatarios:** Supervisores y Administradores

**Contenido del recordatorio:**
- Mensaje de recordatorio de visita
- Lista de estaciones asignadas
- Link directo para crear auditoría

### 8.3 Configurar Notificaciones

**Administradores pueden configurar:**
- Días de envío de recordatorios
- Hora de envío
- Lista de emails destinatarios
- Habilitar/deshabilitar notificaciones

**Archivo de configuración:** `.env`

```env
REMINDER_DAYS=1,3,5
REMINDER_HOUR=08
REMINDER_MINUTE=00
ADMIN_EMAILS=admin@texaco.com
SUPERVISOR_EMAILS=supervisor1@texaco.com,supervisor2@texaco.com
```

---

## 9. Preguntas Frecuentes

### ❓ ¿Puedo editar una auditoría después de guardarla?

**No.** Por integridad de datos, las auditorías no se pueden editar una vez guardadas. Si cometiste un error, contacta al administrador para que elimine la auditoría y puedas crear una nueva.

### ❓ ¿Qué hago si olvidé mi contraseña?

Contacta al administrador del sistema para que restablezca tu contraseña.

### ❓ ¿Por qué no recibo emails de notificación?

**Verifica:**
1. Tu email está en la lista de destinatarios (Admin lo configura)
2. Revisa la carpeta de SPAM
3. Verifica que el servidor de email esté configurado correctamente

### ❓ ¿Puedo usar el sistema desde mi celular?

**Sí.** El sistema es 100% responsive:
- Funciona en iOS y Android
- Se adapta a pantallas pequeñas
- Puedes tomar fotos directamente desde la cámara
- Agrega la página a pantalla de inicio para acceso rápido

### ❓ ¿Cuántas fotos puedo subir por auditoría?

**Máximo 10 fotos** por auditoría, cada una hasta **5MB**.

### ❓ ¿Qué formatos de imagen se aceptan?

**JPG, PNG y WEBP**

### ❓ ¿Puedo hacer auditorías sin conexión a internet?

Actualmente **requiere conexión** para guardar. Modo offline en desarrollo futuro.

### ❓ ¿Cómo se calcula la calificación general?

Es el **promedio aritmético** de los 6 criterios evaluados:
- Limpieza de Bombas
- Organización de Aceites
- Uniforme Completo
- Protocolo de Saludo
- Trato Durante Compra
- Protocolo de Despedida

**Ejemplo:**
- Limpieza: 80%
- Aceites: 90%
- Uniforme: 70%
- Saludo: 85%
- Trato: 95%
- Despedida: 90%

**Calificación General:** (80+90+70+85+95+90) / 6 = **85%**

### ❓ ¿Los supervisores pueden eliminar auditorías?

**No.** Solo los administradores pueden eliminar auditorías.

### ❓ ¿Cómo exporto reportes a Excel?

**Próximamente.** Función en desarrollo.

---

## 📞 Soporte Técnico

**Para asistencia:**
- Contactar al administrador del sistema
- Email: [email-soporte]
- Teléfono: [teléfono-soporte]

**Reporte de bugs:**
- Describir el problema
- Incluir capturas de pantalla si es posible
- Indicar navegador y dispositivo usado

---

## 📚 Recursos Adicionales

- **Manual Técnico:** Para administradores e instaladores
- **README:** Guía de instalación y configuración
- **Video Tutoriales:** Próximamente

---

**🛢️ Mr. Fuel - Excelencia en Servicio Texaco**

*Instituto Tecnológico Santo Tomás*
*Versión 1.0 - 2024*

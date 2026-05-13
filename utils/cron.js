/**
 * SISTEMA DE RECORDATORIOS AUTOMÁTICOS - MR. FUEL
 * Cron jobs para enviar notificaciones programadas
 */

const cron = require('node-cron');
const moment = require('moment-timezone');
const { allAsync, runAsync } = require('../config/database');
const { enviarRecordatorio } = require('./email');

// Configurar timezone
moment.tz.setDefault(process.env.TZ || 'America/Tegucigalpa');

/**
 * Programar recordatorios semanales
 * Se ejecuta 3 veces por semana según configuración
 */
const programarRecordatoriosSemanales = () => {
  // Obtener configuración de días
  const diasSemana = (process.env.REMINDER_DAYS || '1,3,5').split(',').map(d => parseInt(d.trim()));
  const hora = parseInt(process.env.REMINDER_HOUR || 8);
  const minuto = parseInt(process.env.REMINDER_MINUTE || 0);
  
  console.log(`📅 Recordatorios programados para: ${diasSemana.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')} a las ${hora}:${minuto.toString().padStart(2, '0')}`);
  
  // Crear expresión cron: minuto hora * * día_semana
  const cronExpression = `${minuto} ${hora} * * ${diasSemana.join(',')}`;
  
  cron.schedule(cronExpression, async () => {
    console.log('\n⏰ Ejecutando envío de recordatorios programados...');
    
    try {
      // Obtener todos los supervisores activos
      const supervisores = await allAsync(
        'SELECT * FROM usuarios WHERE rol IN ("supervisor", "admin") AND activo = 1'
      );
      
      if (supervisores.length === 0) {
        console.log('ℹ️  No hay supervisores activos para enviar recordatorios');
        return;
      }
      
      // Obtener estaciones activas
      const estaciones = await allAsync(
        'SELECT * FROM estaciones WHERE activo = 1'
      );
      
      const fechaHoy = moment().format('YYYY-MM-DD');
      const horaActual = moment().format('HH:mm');
      
      // Enviar recordatorios
      for (const supervisor of supervisores) {
        try {
          // Crear recordatorio en BD
          const resultado = await runAsync(
            `INSERT INTO recordatorios (supervisor_id, fecha_programada, hora_programada, mensaje, enviado, fecha_envio)
             VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
            [
              supervisor.id,
              fechaHoy,
              horaActual,
              `Recordatorio automático: Realizar auditorías programadas del ${fechaHoy}`
            ]
          );
          
          // Enviar email (sin estación específica, mensaje general)
          await enviarRecordatorio(supervisor, null, fechaHoy);
          
          console.log(`✅ Recordatorio enviado a ${supervisor.nombre} (${supervisor.email})`);
          
        } catch (emailError) {
          console.error(`❌ Error al enviar recordatorio a ${supervisor.email}:`, emailError.message);
          
          // Marcar como no enviado si falla
          await runAsync(
            'UPDATE recordatorios SET enviado = 0 WHERE id = ?',
            [resultado.lastID]
          );
        }
      }
      
      console.log(`\n✅ Proceso de recordatorios completado: ${supervisores.length} notificaciones procesadas\n`);
      
    } catch (error) {
      console.error('❌ Error en el proceso de recordatorios:', error.message);
    }
  }, {
    timezone: process.env.TZ || 'America/Tegucigalpa'
  });
};

/**
 * Reenviar recordatorios fallidos
 * Se ejecuta cada hora
 */
const reenviarRecordatoriosFallidos = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      // Buscar recordatorios no enviados de las últimas 24 horas
      const recordatoriosFallidos = await allAsync(`
        SELECT r.*, u.nombre, u.email, e.nombre as estacion_nombre
        FROM recordatorios r
        INNER JOIN usuarios u ON r.supervisor_id = u.id
        LEFT JOIN estaciones e ON r.estacion_id = e.id
        WHERE r.enviado = 0 
          AND r.fecha_programada >= date('now', '-1 day')
        ORDER BY r.fecha_creacion DESC
        LIMIT 10
      `);
      
      if (recordatoriosFallidos.length === 0) return;
      
      console.log(`\n🔄 Reintentando ${recordatoriosFallidos.length} recordatorios fallidos...`);
      
      for (const recordatorio of recordatoriosFallidos) {
        try {
          const supervisor = {
            nombre: recordatorio.nombre,
            email: recordatorio.email
          };
          
          const estacion = recordatorio.estacion_id ? {
            nombre: recordatorio.estacion_nombre
          } : null;
          
          await enviarRecordatorio(supervisor, estacion, recordatorio.fecha_programada);
          
          // Marcar como enviado
          await runAsync(
            'UPDATE recordatorios SET enviado = 1, fecha_envio = CURRENT_TIMESTAMP WHERE id = ?',
            [recordatorio.id]
          );
          
          console.log(`✅ Recordatorio reenviado a ${supervisor.email}`);
          
        } catch (error) {
          console.error(`❌ Fallo al reenviar a ${recordatorio.email}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al reenviar recordatorios:', error.message);
    }
  });
};

/**
 * Iniciar todos los cron jobs
 */
const iniciarCronJobs = () => {
  console.log('\n🚀 Iniciando sistema de recordatorios automáticos...\n');
  programarRecordatoriosSemanales();
  reenviarRecordatoriosFallidos();
  console.log('✅ Cron jobs activados\n');
};

module.exports = {
  iniciarCronJobs
};

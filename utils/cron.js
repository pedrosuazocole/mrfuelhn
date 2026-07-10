/**
 * SISTEMA DE RECORDATORIOS AUTOMÁTICOS - MR. FUEL
 * Cron jobs para enviar notificaciones programadas
 */

const cron = require('node-cron');
const moment = require('moment-timezone');
const { allAsync, runAsync } = require('../config/database');
const { enviarRecordatorio } = require('./email');
const {
  enviarReporteAuditorias,
  enviarReporteMantenimientos,
  enviarReporteTickets,
  enviarRecordatorioAuditorias,
  enviarRecordatoriosPorEstacion,
} = require('./reportesDiarios');

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
 * Recordatorio matutino (9:00 AM) — por estación, supervisores + copia a admins
 */
const programarRecordatorioAuditorias = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('\n⏰ [Cron] Recordatorio matutino de auditorías (9:00 AM)...');
    try {
      await enviarRecordatoriosPorEstacion(false); // urgente = false
    } catch (error) {
      console.error('❌ Error en recordatorio matutino:', error.message);
    }
  }, { timezone: process.env.TZ || 'America/Tegucigalpa' });
};

/**
 * Recordatorio urgente (3:00 PM) — solo estaciones que siguen pendientes
 */
const programarRecordatorioUrgenteAuditorias = () => {
  cron.schedule('0 15 * * *', async () => {
    console.log('\n⏰ [Cron] Recordatorio URGENTE de auditorías (3:00 PM)...');
    try {
      await enviarRecordatoriosPorEstacion(true); // urgente = true
    } catch (error) {
      console.error('❌ Error en recordatorio urgente:', error.message);
    }
  }, { timezone: process.env.TZ || 'America/Tegucigalpa' });
};

/**
 * Reporte diario de auditorías — todos los días a las 2:00 PM
 */
const programarReporteAuditorias = () => {
  // minuto hora * * * → 0 14 * * *  (2:00 PM, todos los días)
  cron.schedule('0 14 * * *', async () => {
    console.log('\n⏰ [Cron] Enviando reporte diario de auditorías (2:00 PM)...');
    try {
      await enviarReporteAuditorias();
    } catch (error) {
      console.error('❌ Error en reporte diario de auditorías:', error.message);
    }
  }, { timezone: process.env.TZ || 'America/Tegucigalpa' });
};

/**
 * Reporte diario de mantenimientos — todos los días a las 5:00 PM
 */
const programarReporteMantenimientos = () => {
  // 0 17 * * *  (5:00 PM, todos los días)
  cron.schedule('0 17 * * *', async () => {
    console.log('\n⏰ [Cron] Enviando reporte diario de mantenimientos (5:00 PM)...');
    try {
      await enviarReporteMantenimientos();
    } catch (error) {
      console.error('❌ Error en reporte diario de mantenimientos:', error.message);
    }
  }, { timezone: process.env.TZ || 'America/Tegucigalpa' });
};

/**
 * Reporte diario de tickets abiertos — todos los días a las 7:00 PM
 */
const programarReporteTickets = () => {
  // 0 19 * * *  (7:00 PM, todos los días)
  cron.schedule('0 19 * * *', async () => {
    console.log('\n⏰ [Cron] Enviando reporte diario de tickets (7:00 PM)...');
    try {
      await enviarReporteTickets();
    } catch (error) {
      console.error('❌ Error en reporte diario de tickets:', error.message);
    }
  }, { timezone: process.env.TZ || 'America/Tegucigalpa' });
};

/**
 * Iniciar todos los cron jobs
 */
const iniciarCronJobs = () => {
  console.log('\n🚀 Iniciando sistema de recordatorios automáticos...\n');
  programarRecordatoriosSemanales();
  reenviarRecordatoriosFallidos();
  programarRecordatorioAuditorias();
  programarRecordatorioUrgenteAuditorias();
  programarReporteAuditorias();
  programarReporteMantenimientos();
  programarReporteTickets();
  console.log('📅 Recordatorio matutino por estación:  9:00 AM (supervisores + copia admins)');
  console.log('📅 Recordatorio urgente por estación:   3:00 PM (supervisores + copia admins)');
  console.log('📅 Reportes diarios: 2:00 PM (auditorías), 5:00 PM (mantenimiento), 7:00 PM (tickets)');
  console.log('✅ Cron jobs activados\n');
};

module.exports = {
  iniciarCronJobs
};

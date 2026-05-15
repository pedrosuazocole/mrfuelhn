/**
 * UTILIDAD DE EMAILS - MR. FUEL
 * Envío de notificaciones con Nodemailer
 */

const nodemailer = require('nodemailer');

// Crear transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Enviar email de nueva auditoría completada
 */
const enviarNotificacionAuditoria = async (auditoria, estacion, auditor) => {
  try {
    const destinatarios = [
      ...(process.env.ADMIN_EMAILS || '').split(','),
      ...(process.env.SUPERVISOR_EMAILS || '').split(',')
    ].filter(email => email.trim());
    
    if (destinatarios.length === 0) {
      console.warn('⚠️  No hay destinatarios configurados para notificaciones');
      return;
    }
    
    const calificacionColor = auditoria.calificacion_general >= 80 ? '#28a745' : 
                               auditoria.calificacion_general >= 60 ? '#ffc107' : '#dc3545';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatarios.join(','),
      subject: `🔍 Nueva Auditoría - ${estacion.nombre} (${auditoria.calificacion_general}%)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ED1C24; color: white; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f8f9fa; padding: 20px; }
            .metric { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ED1C24; }
            .metric-title { font-weight: bold; color: #666; margin-bottom: 5px; }
            .metric-value { font-size: 18px; color: #333; }
            .score { font-size: 32px; font-weight: bold; color: ${calificacionColor}; text-align: center; margin: 20px 0; }
            .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
            .button { display: inline-block; background: #ED1C24; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛢️ Mr. Fuel - Cliente Misterioso</h1>
              <p>Sistema de Auditorías Texaco</p>
            </div>
            
            <div class="content">
              <h2>Nueva Auditoría Completada</h2>
              
              <div class="metric">
                <div class="metric-title">📍 Estación</div>
                <div class="metric-value">${estacion.nombre} (${estacion.codigo})</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">📅 Fecha de Visita</div>
                <div class="metric-value">${new Date(auditoria.fecha_visita).toLocaleDateString('es-HN')} - ${auditoria.hora_visita}</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">👤 Auditor</div>
                <div class="metric-value">${auditor.nombre}</div>
              </div>
              
              <div class="score">
                ${auditoria.calificacion_general}%
              </div>
              
              <h3>Detalle de Evaluación:</h3>
              
              <div class="metric">
                <div class="metric-title">🧹 Limpieza de Bombas</div>
                <div class="metric-value">${auditoria.limpieza_bombas}%</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">🛢️ Organización de Aceites</div>
                <div class="metric-value">${auditoria.aceites_organizados}%</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">👔 Uniforme Completo ${auditoria.uniforme_tiene_gorra ? '(con gorra ✓)' : '(sin gorra ✗)'}</div>
                <div class="metric-value">${auditoria.uniforme_completo}%</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">👋 Protocolo de Saludo</div>
                <div class="metric-value">${auditoria.saludo_protocolo}%</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">💬 Trato Durante Compra</div>
                <div class="metric-value">${auditoria.trato_compra}%</div>
              </div>
              
              <div class="metric">
                <div class="metric-title">👋 Despedida</div>
                <div class="metric-value">${auditoria.despedida_protocolo}%</div>
              </div>
              
              ${auditoria.observaciones_generales ? `
              <div class="metric">
                <div class="metric-title">📝 Observaciones</div>
                <div class="metric-value">${auditoria.observaciones_generales}</div>
              </div>
              ` : ''}
              
              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/auditorias/${auditoria.id}" class="button">
                  Ver Auditoría Completa
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>Mr. Fuel - Sistema de Cliente Misterioso Texaco</p>
              <p>Este es un mensaje automático, no responder.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Email de notificación enviado correctamente');
    
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    throw error;
  }
};

/**
 * Enviar recordatorio a supervisores
 */
const enviarRecordatorio = async (supervisor, estacion, fechaProgramada) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: supervisor.email,
      subject: `📅 Recordatorio: Auditoría Programada - ${estacion ? estacion.nombre : 'Estaciones Asignadas'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ED1C24; color: white; padding: 20px; text-align: center; }
            .content { background: #f8f9fa; padding: 20px; }
            .reminder { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .button { display: inline-block; background: #ED1C24; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Recordatorio de Auditoría</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${supervisor.nombre}</strong>,</p>
              
              <div class="reminder">
                <p><strong>📅 Fecha programada:</strong> ${new Date(fechaProgramada).toLocaleDateString('es-HN')}</p>
                ${estacion ? `<p><strong>📍 Estación:</strong> ${estacion.nombre}</p>` : ''}
                <p><strong>📋 Acción requerida:</strong> Realizar auditoría de cliente misterioso</p>
              </div>
              
              <p>Recordá completar el checklist de auditoría que incluye:</p>
              <ul>
                <li>✅ Limpieza de bombas</li>
                <li>✅ Organización de aceites</li>
                <li>✅ Uniforme completo (con gorra)</li>
                <li>✅ Protocolo de saludo</li>
                <li>✅ Trato durante la compra</li>
                <li>✅ Despedida profesional</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/auditorias/nueva" class="button">
                  Iniciar Auditoría
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Recordatorio enviado a ${supervisor.email}`);
    
  } catch (error) {
    console.error('❌ Error al enviar recordatorio:', error.message);
    throw error;
  }
};

module.exports = {
  enviarNotificacionAuditoria,
  enviarRecordatorio,
  transporter
};

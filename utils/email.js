/**
 * UTILIDADES DE EMAIL - MR. FUEL
 * Soporte para Resend y SMTP tradicional (Gmail, Brevo, Mailgun, etc)
 */

const nodemailer = require('nodemailer');

// Detectar servicio de email
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'smtp';

let transporter;
let resendClient;

// Configurar según el servicio
if (EMAIL_SERVICE === 'resend') {
  // Intentar usar Resend
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Servicio de email: Resend');
  } catch (error) {
    console.error('⚠️  Resend no instalado. Ejecutar: npm install resend');
    console.log('⚠️  Usando SMTP como fallback...');
  }
}

// Configurar SMTP (si no es Resend o como fallback)
if (!resendClient) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Servicio de email: SMTP -', process.env.EMAIL_HOST);
}

/**
 * Enviar email usando Resend
 */
const enviarEmailResend = async (destinatarios, asunto, html) => {
  try {
    const { data, error } = await resendClient.emails.send({
      from: process.env.EMAIL_FROM || 'Mr. Fuel <onboarding@resend.dev>',
      to: destinatarios,
      subject: asunto,
      html: html
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ Email enviado vía Resend:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error al enviar email con Resend:', error.message);
    throw error;
  }
};

/**
 * Enviar email usando SMTP tradicional
 */
const enviarEmailSMTP = async (destinatarios, asunto, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(destinatarios) ? destinatarios.join(',') : destinatarios,
      subject: asunto,
      html: html
    });

    console.log('✅ Email enviado vía SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error al enviar email con SMTP:', error.message);
    throw error;
  }
};

/**
 * Enviar email (auto-detecta servicio)
 */
const enviarEmail = async (destinatarios, asunto, html) => {
  const destArray = Array.isArray(destinatarios) ? destinatarios : [destinatarios];
  
  if (resendClient) {
    return await enviarEmailResend(destArray, asunto, html);
  } else {
    return await enviarEmailSMTP(destArray, asunto, html);
  }
};

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
    
    const html = `
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
          .score { font-size: 48px; font-weight: bold; color: ${calificacionColor}; text-align: center; margin: 20px 0; }
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
              <div class="metric-title">💬 Trato Durante la Compra</div>
              <div class="metric-value">${auditoria.trato_compra}%</div>
            </div>
            
            <div class="metric">
              <div class="metric-title">👋 Protocolo de Despedida</div>
              <div class="metric-value">${auditoria.despedida_protocolo}%</div>
            </div>
            
            ${auditoria.observaciones_generales ? `
            <div class="metric">
              <div class="metric-title">📝 Observaciones</div>
              <div class="metric-value">${auditoria.observaciones_generales}</div>
            </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'https://mrfuel-production.up.railway.app'}/auditorias/${auditoria.id}" class="button">
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
    `;
    
    await enviarEmail(
      destinatarios,
      `🔍 Nueva Auditoría - ${estacion.nombre} (${auditoria.calificacion_general}%)`,
      html
    );
    
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
    const html = `
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
          .checklist { background: white; padding: 15px; margin: 10px 0; }
          .checklist-item { padding: 8px; margin: 5px 0; }
          .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .button { display: inline-block; background: #ED1C24; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Recordatorio de Auditoría</h1>
            <p>Sistema Mr. Fuel - Texaco</p>
          </div>
          
          <div class="content">
            <h2>Hola ${supervisor.nombre},</h2>
            <p>Te recordamos que tenés programada una auditoría para <strong>${new Date(fechaProgramada).toLocaleDateString('es-HN')}</strong>.</p>
            
            ${estacion ? `
            <p><strong>Estación asignada:</strong> ${estacion.nombre}</p>
            <p><strong>Dirección:</strong> ${estacion.direccion}, ${estacion.ciudad}</p>
            ` : `
            <p><strong>Estaciones disponibles:</strong> Revisar en el sistema</p>
            `}
            
            <div class="checklist">
              <h3>✅ Checklist de Auditoría:</h3>
              <div class="checklist-item">✓ Limpieza de bombas</div>
              <div class="checklist-item">✓ Organización de aceites</div>
              <div class="checklist-item">✓ Uniforme completo (con gorra)</div>
              <div class="checklist-item">✓ Protocolo de saludo</div>
              <div class="checklist-item">✓ Trato durante la compra</div>
              <div class="checklist-item">✓ Despedida profesional</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'https://mrfuel-production.up.railway.app'}/auditorias/nueva" class="button">
                Iniciar Auditoría
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
    `;
    
    await enviarEmail(
      [supervisor.email],
      '📅 Recordatorio: Auditoría Programada - Estaciones Asignadas',
      html
    );
    
    console.log('✅ Recordatorio enviado a:', supervisor.email);
    
  } catch (error) {
    console.error('❌ Error al enviar recordatorio:', error.message);
    throw error;
  }
};

/**
 * Enviar email de nueva auditoría v2 completada
 */
const enviarNotificacionAuditoriaV2 = async (auditoria, estacion, auditor, evaluaciones, fotos) => {
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
    
    // Agrupar evaluaciones por categoría
    const evaluacionesPorCategoria = {};
    evaluaciones.forEach(eval => {
      if (!evaluacionesPorCategoria[eval.categoria_nombre]) {
        evaluacionesPorCategoria[eval.categoria_nombre] = [];
      }
      evaluacionesPorCategoria[eval.categoria_nombre].push(eval);
    });
    
    // Generar HTML de evaluaciones por categoría
    let htmlEvaluaciones = '';
    for (const categoria in evaluacionesPorCategoria) {
      htmlEvaluaciones += `
        <div style="margin: 20px 0;">
          <h3 style="color: #ED1C24; border-bottom: 2px solid #ED1C24; padding-bottom: 5px;">${categoria}</h3>
      `;
      
      evaluacionesPorCategoria[categoria].forEach(eval => {
        const iconoCumple = eval.cumple ? '✅' : '❌';
        const colorCumple = eval.cumple ? '#28a745' : '#dc3545';
        
        htmlEvaluaciones += `
          <div style="background: white; padding: 10px; margin: 5px 0; border-left: 4px solid ${colorCumple};">
            <span style="font-weight: bold;">${iconoCumple} ${eval.item_nombre}</span>
            ${eval.observacion ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">${eval.observacion}</p>` : ''}
          </div>
        `;
      });
      
      htmlEvaluaciones += `</div>`;
    }
    
    // Generar galería de fotos
    let htmlFotos = '';
    if (fotos.length > 0) {
      htmlFotos = '<h3>📸 Evidencias Fotográficas</h3><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">';
      fotos.forEach(foto => {
        htmlFotos += `
          <div style="text-align: center;">
            <img src="${process.env.APP_URL || 'https://mrfuel-production.up.railway.app'}${foto.ruta_archivo}" 
                 style="width: 100%; max-width: 200px; border-radius: 5px; border: 2px solid #ddd;" 
                 alt="${foto.item_nombre}">
            <p style="font-size: 11px; color: #666; margin: 5px 0;">${foto.categoria_nombre}: ${foto.item_nombre}</p>
          </div>
        `;
      });
      htmlFotos += '</div>';
    }
    
    const piePagina = await getAsync("SELECT valor FROM configuracion WHERE clave = 'pie_pagina'");
    const piePaginaTexto = piePagina ? piePagina.valor : 'Asesores Lab - WhatsApp: +504 9697 8435';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #ED1C24; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 20px; }
          .metric { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ED1C24; }
          .metric-title { font-weight: bold; color: #666; margin-bottom: 5px; }
          .metric-value { font-size: 18px; color: #333; }
          .score { font-size: 48px; font-weight: bold; color: ${calificacionColor}; text-align: center; margin: 20px 0; }
          .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .button { display: inline-block; background: #ED1C24; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .firma { border: 2px solid #ddd; padding: 10px; margin: 10px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛢️ Mr. Fuel v2.0 - Auditoría Completa</h1>
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
            
            <div style="text-align: center; font-size: 18px; margin: 10px 0;">
              <strong>Cumplimiento: ${auditoria.items_cumplidos} de ${auditoria.total_items} ítems</strong>
            </div>
            
            <h2>📋 Detalle de Evaluación</h2>
            ${htmlEvaluaciones}
            
            ${auditoria.observaciones_generales ? `
            <div class="metric">
              <div class="metric-title">📝 Observaciones Generales</div>
              <div class="metric-value">${auditoria.observaciones_generales}</div>
            </div>
            ` : ''}
            
            ${auditoria.recomendaciones ? `
            <div class="metric">
              <div class="metric-title">💡 Recomendaciones</div>
              <div class="metric-value">${auditoria.recomendaciones}</div>
            </div>
            ` : ''}
            
            ${auditoria.supervisor_nombre ? `
            <div class="metric">
              <div class="metric-title">👨‍💼 Supervisor</div>
              <div class="metric-value">${auditoria.supervisor_nombre}</div>
              ${auditoria.supervisor_firma ? `
                <div class="firma">
                  <img src="${auditoria.supervisor_firma}" style="max-width: 200px; height: auto;" alt="Firma">
                  <p style="margin: 5px 0; font-size: 12px;">Firma Digital</p>
                </div>
              ` : ''}
            </div>
            ` : ''}
            
            ${htmlFotos}
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'https://mrfuel-production.up.railway.app'}/auditorias-v2/${auditoria.id}" class="button">
                Ver Auditoría Completa
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Mr. Fuel v2.0 - Sistema de Auditorías Texaco</p>
            <p>${piePaginaTexto}</p>
            <p>Este es un mensaje automático, no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await enviarEmail(
      destinatarios,
      `🔍 Nueva Auditoría v2.0 - ${estacion.nombre} (${auditoria.calificacion_general}%)`,
      html
    );
    
    console.log('✅ Email de notificación v2 enviado correctamente');
    
  } catch (error) {
    console.error('❌ Error al enviar email v2:', error.message);
    throw error;
  }
};

module.exports = {
  enviarNotificacionAuditoria,
  enviarNotificacionAuditoriaV2,
  enviarRecordatorio
};

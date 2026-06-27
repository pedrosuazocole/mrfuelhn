/**
 * AGENTE DE IA — MR. FUEL v2.0
 * Responde preguntas, genera resúmenes y redacta notificaciones
 * usando Claude (Anthropic API) con acceso de solo lectura a la BD.
 *
 * IMPORTANTE: este agente NUNCA modifica datos — solo consulta y redacta.
 * Todas las herramientas (tools) son consultas SELECT, sin INSERT/UPDATE/DELETE.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { getAsync, allAsync } = require('../config/database');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // se configura como variable de entorno en Railway
});

// Modelo económico para preguntas y notificaciones (rápido y barato)
const MODELO_RAPIDO = 'claude-haiku-4-5-20251001';
// Modelo balanceado para resúmenes y análisis más profundos
const MODELO_ANALISIS = 'claude-sonnet-4-6';

// ════════════════════════════════════════════════════════════════════════════
// HERRAMIENTAS (TOOLS) — Lo único que el agente puede hacer es esto
// ════════════════════════════════════════════════════════════════════════════

const herramientas = [
  {
    name: 'consultar_estado_estacion',
    description: 'Obtiene la última calificación de auditoría y mantenimiento de una estación específica por nombre.',
    input_schema: {
      type: 'object',
      properties: {
        nombre_estacion: { type: 'string', description: 'Nombre o parte del nombre de la estación, ej: "Buenos Aires"' }
      },
      required: ['nombre_estacion']
    }
  },
  {
    name: 'listar_estaciones_bajo_cumplimiento',
    description: 'Lista las estaciones cuya última auditoría o mantenimiento tuvo calificación menor al umbral indicado.',
    input_schema: {
      type: 'object',
      properties: {
        umbral: { type: 'number', description: 'Porcentaje mínimo aceptable, ej: 80' }
      },
      required: ['umbral']
    }
  },
  {
    name: 'contar_tickets_abiertos',
    description: 'Cuenta los tickets de fallas que están en estado pendiente o en_proceso, opcionalmente filtrados por estación.',
    input_schema: {
      type: 'object',
      properties: {
        nombre_estacion: { type: 'string', description: 'Opcional. Nombre de la estación a filtrar.' }
      }
    }
  },
  {
    name: 'items_mas_incumplidos',
    description: 'Devuelve los ítems de checklist que más veces no han cumplido en los últimos 30 días, across todas las estaciones.',
    input_schema: { type: 'object', properties: {} }
  }
];

// ════════════════════════════════════════════════════════════════════════════
// IMPLEMENTACIÓN REAL DE CADA HERRAMIENTA (consultas SQL de solo lectura)
// ════════════════════════════════════════════════════════════════════════════

async function ejecutarHerramienta(nombre, input) {
  switch (nombre) {

    case 'consultar_estado_estacion': {
      const estacion = await getAsync(
        `SELECT id, nombre FROM estaciones WHERE nombre LIKE ? LIMIT 1`,
        [`%${input.nombre_estacion}%`]
      );
      if (!estacion) return { error: 'Estación no encontrada' };

      const ultimaAuditoria = await getAsync(
        `SELECT calificacion_general, fecha_visita FROM auditorias_v2
         WHERE estacion_id = ? ORDER BY fecha_visita DESC LIMIT 1`,
        [estacion.id]
      );
      const ultimoMant = await getAsync(
        `SELECT calificacion_general, fecha_visita FROM mantenimientos
         WHERE estacion_id = ? ORDER BY fecha_visita DESC LIMIT 1`,
        [estacion.id]
      );
      return {
        estacion: estacion.nombre,
        ultima_auditoria: ultimaAuditoria || 'Sin auditorías registradas',
        ultimo_mantenimiento: ultimoMant || 'Sin mantenimientos registrados'
      };
    }

    case 'listar_estaciones_bajo_cumplimiento': {
      const rows = await allAsync(
        `SELECT e.nombre, a.calificacion_general, a.fecha_visita
         FROM estaciones e
         JOIN auditorias_v2 a ON a.estacion_id = e.id
         WHERE a.calificacion_general < ?
           AND a.fecha_visita = (
             SELECT MAX(fecha_visita) FROM auditorias_v2 WHERE estacion_id = e.id
           )
         ORDER BY a.calificacion_general ASC`,
        [input.umbral]
      );
      return { estaciones_bajo_umbral: rows };
    }

    case 'contar_tickets_abiertos': {
      let query = `SELECT COUNT(*) AS total FROM tickets t
                   WHERE t.estado IN ('pendiente','en_proceso')`;
      const params = [];
      if (input.nombre_estacion) {
        query += ` AND t.estacion_id = (SELECT id FROM estaciones WHERE nombre LIKE ? LIMIT 1)`;
        params.push(`%${input.nombre_estacion}%`);
      }
      const row = await getAsync(query, params);
      return { tickets_abiertos: row.total };
    }

    case 'items_mas_incumplidos': {
      const rows = await allAsync(
        `SELECT i.nombre AS item, COUNT(*) AS veces_incumplido
         FROM evaluaciones_items ev
         JOIN items_auditoria i ON ev.item_id = i.id
         JOIN auditorias_v2 a ON ev.auditoria_id = a.id
         WHERE ev.cumple = 0
           AND a.fecha_visita >= date('now','-30 days')
         GROUP BY i.nombre
         ORDER BY veces_incumplido DESC
         LIMIT 5`
      );
      return { items_recurrentes: rows };
    }

    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: responder una pregunta en lenguaje natural
// ════════════════════════════════════════════════════════════════════════════

async function responderPregunta(pregunta, modelo = MODELO_RAPIDO) {
  const mensajes = [{ role: 'user', content: pregunta }];

  // Primera llamada: Claude decide si necesita usar una herramienta
  let respuesta = await anthropic.messages.create({
    model: modelo,
    max_tokens: 1024,
    system: `Eres el asistente de Mr. Fuel, un sistema de gestión para estaciones de servicio en Honduras.
Respondes en español hondureño, de forma breve y directa, como si hablaras por WhatsApp.
Usa las herramientas disponibles para consultar datos reales — nunca inventes cifras.
Si no encuentras información, dilo claramente.`,
    tools: herramientas,
    messages: mensajes,
  });

  // Si Claude pidió usar una herramienta, la ejecutamos y le devolvemos el resultado
  while (respuesta.stop_reason === 'tool_use') {
    const bloqueHerramienta = respuesta.content.find(b => b.type === 'tool_use');
    const resultado = await ejecutarHerramienta(bloqueHerramienta.name, bloqueHerramienta.input);

    mensajes.push({ role: 'assistant', content: respuesta.content });
    mensajes.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: bloqueHerramienta.id,
        content: JSON.stringify(resultado),
      }]
    });

    respuesta = await anthropic.messages.create({
      model: modelo,
      max_tokens: 1024,
      system: `Eres el asistente de Mr. Fuel. Responde en español hondureño, breve y directo.`,
      tools: herramientas,
      messages: mensajes,
    });
  }

  const textoFinal = respuesta.content.find(b => b.type === 'text');
  return textoFinal ? textoFinal.text : 'No pude generar una respuesta.';
}

module.exports = { responderPregunta, MODELO_RAPIDO, MODELO_ANALISIS };

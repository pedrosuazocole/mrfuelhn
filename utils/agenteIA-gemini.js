/**
 * AGENTE DE IA — MR. FUEL v2.0 — VERSIÓN GEMINI
 * Misma lógica y herramientas que utils/agenteIA.js (Claude),
 * pero usando el SDK de Google Gemini (@google/genai).
 *
 * El agente NUNCA modifica datos — solo consulta y redacta.
 */

const { GoogleGenAI } = require('@google/genai');
const { getAsync, allAsync } = require('../config/database');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modelo económico para preguntas y notificaciones
const MODELO_RAPIDO = 'gemini-2.5-flash';

const esperar = ms => new Promise(r => setTimeout(r, ms));

/**
 * Llama a generateContent con reintentos automáticos cuando Gemini
 * responde 503 (UNAVAILABLE / alta demanda) — error transitorio común,
 * normalmente se resuelve solo en pocos segundos.
 */
async function generarConReintento(params, maxIntentos = 4) {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const es503 = err.message && (err.message.includes('"code":503') || err.message.includes('UNAVAILABLE'));
      if (es503 && intento < maxIntentos) {
        const espera = 1000 * intento; // 1s, 2s, 3s...
        console.warn(`⚠️  [Agente IA] Gemini 503 (intento ${intento}/${maxIntentos}), reintentando en ${espera}ms...`);
        await esperar(espera);
        continue;
      }
      throw err; // error distinto, o se acabaron los intentos
    }
  }
}
// Modelo balanceado para resúmenes y análisis más profundos
const MODELO_ANALISIS = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Eres el asistente de Mr. Fuel, un sistema de gestión para estaciones de
servicio en Honduras. Respondes en español hondureño, de forma breve y directa, como si hablaras
por WhatsApp. Usa las herramientas disponibles para consultar datos reales — nunca inventes cifras.
Si no encuentras información, dilo claramente.`;

// ════════════════════════════════════════════════════════════════════════════
// HERRAMIENTAS — mismo formato de declaración que usa Gemini (functionDeclarations)
// ════════════════════════════════════════════════════════════════════════════

const herramientas = [{
  functionDeclarations: [
    {
      name: 'consultar_estado_estacion',
      description: 'Obtiene la última calificación de auditoría y mantenimiento de una estación específica por nombre.',
      parameters: {
        type: 'object',
        properties: {
          nombre_estacion: { type: 'string', description: 'Nombre o parte del nombre de la estación, ej: "Buenos Aires"' }
        },
        required: ['nombre_estacion']
      }
    },
    {
      name: 'listar_estaciones_bajo_cumplimiento',
      description: 'Lista las estaciones cuya última auditoría tuvo calificación menor al umbral indicado.',
      parameters: {
        type: 'object',
        properties: {
          umbral: { type: 'number', description: 'Porcentaje mínimo aceptable, ej: 80' }
        },
        required: ['umbral']
      }
    },
    {
      name: 'contar_tickets_abiertos',
      description: 'Cuenta los tickets de fallas en estado pendiente o en_proceso, opcionalmente filtrados por estación.',
      parameters: {
        type: 'object',
        properties: {
          nombre_estacion: { type: 'string', description: 'Opcional. Nombre de la estación a filtrar.' }
        }
      }
    },
    {
      name: 'items_mas_incumplidos',
      description: 'Devuelve los ítems de checklist que más veces no han cumplido en los últimos 30 días.',
      parameters: { type: 'object', properties: {} }
    }
  ]
}];

// ════════════════════════════════════════════════════════════════════════════
// IMPLEMENTACIÓN REAL (idéntica a la versión Claude — mismas consultas SQL)
// ════════════════════════════════════════════════════════════════════════════

async function ejecutarHerramienta(nombre, args) {
  switch (nombre) {

    case 'consultar_estado_estacion': {
      const estacion = await getAsync(
        `SELECT id, nombre FROM estaciones WHERE nombre LIKE ? LIMIT 1`,
        [`%${args.nombre_estacion}%`]
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
        [args.umbral]
      );
      return { estaciones_bajo_umbral: rows };
    }

    case 'contar_tickets_abiertos': {
      let query = `SELECT COUNT(*) AS total FROM tickets t
                   WHERE t.estado IN ('pendiente','en_proceso')`;
      const params = [];
      if (args.nombre_estacion) {
        query += ` AND t.estacion_id = (SELECT id FROM estaciones WHERE nombre LIKE ? LIMIT 1)`;
        params.push(`%${args.nombre_estacion}%`);
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
// FUNCIÓN PRINCIPAL: responder una pregunta en lenguaje natural (Gemini)
// ════════════════════════════════════════════════════════════════════════════

async function responderPregunta(pregunta, modelo = MODELO_RAPIDO) {
  const contents = [{ role: 'user', parts: [{ text: pregunta }] }];

  let respuesta = await generarConReintento({
    model: modelo,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: herramientas,
    },
  });

  // Mientras Gemini siga pidiendo ejecutar funciones, las resolvemos
  let intentos = 0;
  while (respuesta.functionCalls && respuesta.functionCalls.length > 0 && intentos < 5) {
    intentos++;
    const llamada = respuesta.functionCalls[0];
    const resultado = await ejecutarHerramienta(llamada.name, llamada.args || {});

    // Agregar el turno del modelo (la llamada a función) y la respuesta de la función
    contents.push({ role: 'model', parts: [{ functionCall: llamada }] });
    contents.push({
      role: 'user',
      parts: [{ functionResponse: { name: llamada.name, response: resultado } }]
    });

    respuesta = await generarConReintento({
      model: modelo,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: herramientas,
      },
    });
  }

  return respuesta.text || 'No pude generar una respuesta.';
}

module.exports = { responderPregunta, MODELO_RAPIDO, MODELO_ANALISIS };

/**
 * CONTROLADOR DEL AGENTE IA — MR. FUEL v2.0
 *
 * Elige el proveedor de IA según la variable de entorno PROVEEDOR_IA:
 *   PROVEEDOR_IA=claude  -> usa Anthropic (utils/agenteIA.js)        [valor por defecto]
 *   PROVEEDOR_IA=gemini  -> usa Google Gemini (utils/agenteIA-gemini.js)
 *
 * Ambos módulos exponen la misma función responderPregunta(texto),
 * así que cambiar de proveedor no requiere tocar nada más.
 */

const proveedor = (process.env.PROVEEDOR_IA || 'claude').toLowerCase();
const { responderPregunta } = proveedor === 'gemini'
  ? require('../utils/agenteIA-gemini')
  : require('../utils/agenteIA');

console.log(`🤖 [Agente IA] Proveedor activo: ${proveedor}`);

const { enviarTexto } = require('../utils/textmebot'); // función ya existente en tu proyecto

/**
 * Webhook que recibe mensajes entrantes de WhatsApp (vía TextMeBot)
 * y responde usando el agente de IA.
 *
 * POST /agente-ia/whatsapp-webhook
 *
 * TextMeBot puede enviar el payload con distintos nombres de campo según
 * la versión/configuración. Este código acepta varias formas comunes:
 *   { numero, mensaje } | { phone, text } | { from, body } | { sender, message }
 */
exports.recibirMensajeWhatsApp = async (req, res) => {
  try {
    console.log('📩 [Agente IA] Webhook crudo recibido:', JSON.stringify(req.body));

    const body = req.body || {};
    const numero  = body.numero  || body.phone  || body.from   || body.sender  || body.recipient;
    const mensaje = body.mensaje || body.text    || body.body   || body.message;

    if (!numero || !mensaje) {
      console.warn('⚠️  [Agente IA] Webhook sin numero/mensaje reconocibles. Revisar formato real de TextMeBot arriba.');
      return res.status(200).json({ success: false, mensaje: 'Formato no reconocido (ver logs)' });
      // Nota: respondemos 200 para que TextMeBot no reintente indefinidamente
    }

    console.log(`🤖 [Agente IA] Pregunta de ${numero}: ${mensaje}`);
    const respuesta = await responderPregunta(mensaje);
    console.log(`🤖 [Agente IA] Respuesta: ${respuesta}`);

    // Reenviar la respuesta al mismo número por WhatsApp
    await enviarTexto(numero, respuesta);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error en agente IA (WhatsApp):', error.message);
    res.status(500).json({ success: false, mensaje: 'Error al procesar la pregunta' });
  }
};

/**
 * Endpoint para preguntar al agente desde el dashboard (chat embebido).
 *
 * POST /agente-ia/preguntar
 * Body: { pregunta }
 */
exports.preguntarDesdeApp = async (req, res) => {
  try {
    const { pregunta } = req.body;
    if (!pregunta || !pregunta.trim()) {
      return res.status(400).json({ success: false, mensaje: 'Escribe una pregunta' });
    }

    const respuesta = await responderPregunta(pregunta);
    res.json({ success: true, respuesta });
  } catch (error) {
    console.error('❌ Error en agente IA (dashboard):', error.message);
    res.status(500).json({ success: false, mensaje: 'Error al procesar la pregunta' });
  }
};

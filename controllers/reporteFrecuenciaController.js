/**
 * REPORTE DE FRECUENCIA — MR. FUEL v2.0
 * Muestra con qué frecuencia se realizan mantenimientos y auditorías,
 * agrupados por técnico/auditor, con filtros de fecha y responsable.
 *
 * NOTA SOBRE REGISTROS ELIMINADOS:
 * SQLite no tiene soft-delete en estas tablas — los registros borrados
 * desaparecen físicamente. Por eso usamos LEFT JOIN en lugar de INNER JOIN
 * para incluir mantenimientos/auditorías cuyo técnico, estación o categoría
 * hayan sido eliminados del sistema (aparecen como "Eliminado del sistema").
 */

const { allAsync, getAsync } = require('../config/database');
const moment = require('moment-timezone');
const TZ = process.env.TZ || 'America/Tegucigalpa';

// ── MANTENIMIENTOS ────────────────────────────────────────────────────────

exports.reporteMantenimientos = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tecnico_id } = req.query;

    // Fechas por defecto: últimos 90 días
    const hoy = moment().tz(TZ).format('YYYY-MM-DD');
    const hace90 = moment().tz(TZ).subtract(90, 'days').format('YYYY-MM-DD');
    const fi = fecha_inicio || hace90;
    const ff = fecha_fin    || hoy;

    // Lista de técnicos para el filtro (solo los que tienen registros en el rango)
    const tecnicos = await allAsync(`
      SELECT DISTINCT
        COALESCE(u.id, 0) AS id,
        COALESCE(u.nombre, 'Eliminado del sistema') AS nombre
      FROM mantenimientos m
      LEFT JOIN usuarios u ON m.tecnico_id = u.id
      WHERE m.fecha_visita BETWEEN ? AND ?
      ORDER BY nombre ASC
    `, [fi, ff]);

    // Construcción dinámica de la cláusula WHERE según filtros activos
    const params = [fi, ff];
    let whereExtra = '';
    if (tecnico_id && tecnico_id !== 'todos') {
      whereExtra = ' AND m.tecnico_id = ?';
      params.push(tecnico_id);
    }

    // Frecuencia de mantenimientos por técnico (de mayor a menor)
    const porTecnico = await allAsync(`
      SELECT
        COALESCE(u.id, 0)                            AS tecnico_id,
        COALESCE(u.nombre, 'Eliminado del sistema')  AS tecnico_nombre,
        COALESCE(u.rol,    'N/A')                    AS tecnico_rol,
        COUNT(*)                                     AS total,
        ROUND(AVG(m.calificacion_general), 1)        AS promedio_calificacion,
        MIN(m.fecha_visita)                          AS primera_fecha,
        MAX(m.fecha_visita)                          AS ultima_fecha,
        SUM(CASE WHEN m.calificacion_general >= 80 THEN 1 ELSE 0 END) AS aprobados,
        SUM(CASE WHEN m.calificacion_general < 80 AND m.calificacion_general IS NOT NULL THEN 1 ELSE 0 END) AS reprobados
      FROM mantenimientos m
      LEFT JOIN usuarios u ON m.tecnico_id = u.id
      WHERE m.fecha_visita BETWEEN ? AND ?${whereExtra}
      GROUP BY m.tecnico_id
      ORDER BY total DESC, promedio_calificacion DESC
    `, params);

    // Detalle de mantenimientos individuales (para la tabla expandible)
    const detalle = await allAsync(`
      SELECT
        m.id,
        m.fecha_visita,
        m.hora_visita,
        m.calificacion_general,
        m.estado,
        COALESCE(u.nombre,   'Eliminado del sistema') AS tecnico_nombre,
        COALESCE(e.nombre,   'Estación eliminada')    AS estacion_nombre,
        COALESCE(mc.nombre,  'Categoría eliminada')   AS categoria_nombre
      FROM mantenimientos m
      LEFT JOIN usuarios               u  ON m.tecnico_id   = u.id
      LEFT JOIN estaciones             e  ON m.estacion_id  = e.id
      LEFT JOIN mantenimiento_categorias mc ON m.categoria_id = mc.id
      WHERE m.fecha_visita BETWEEN ? AND ?${whereExtra}
      ORDER BY m.fecha_visita DESC, m.hora_visita DESC
    `, params);

    // Resumen general
    const resumen = {
      totalMantenimientos: detalle.length,
      promedioGeneral: porTecnico.length
        ? (porTecnico.reduce((s, r) => s + (r.promedio_calificacion || 0), 0) / porTecnico.length).toFixed(1)
        : 0,
      tecnicos: porTecnico.length,
    };

    res.render('reportes/frecuencia-mantenimientos', {
      title: 'Reporte de Frecuencia de Mantenimientos',
      porTecnico,
      detalle,
      tecnicos,
      resumen,
      filtros: { fecha_inicio: fi, fecha_fin: ff, tecnico_id: tecnico_id || 'todos' },
      user: req.session,
    });
  } catch (err) {
    console.error('Error en reporteMantenimientos:', err);
    res.status(500).send('Error generando el reporte de mantenimientos.');
  }
};

// ── AUDITORÍAS ────────────────────────────────────────────────────────────

exports.reporteAuditorias = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, auditor_id } = req.query;

    const hoy = moment().tz(TZ).format('YYYY-MM-DD');
    const hace90 = moment().tz(TZ).subtract(90, 'days').format('YYYY-MM-DD');
    const fi = fecha_inicio || hace90;
    const ff = fecha_fin    || hoy;

    // Lista de auditores para el filtro
    const auditores = await allAsync(`
      SELECT DISTINCT
        COALESCE(u.id, 0) AS id,
        COALESCE(u.nombre, 'Eliminado del sistema') AS nombre
      FROM auditorias_v2 a
      LEFT JOIN usuarios u ON a.auditor_id = u.id
      WHERE a.fecha_visita BETWEEN ? AND ?
      ORDER BY nombre ASC
    `, [fi, ff]);

    const params = [fi, ff];
    let whereExtra = '';
    if (auditor_id && auditor_id !== 'todos') {
      whereExtra = ' AND a.auditor_id = ?';
      params.push(auditor_id);
    }

    // Frecuencia de auditorías por auditor (de mayor a menor)
    const porAuditor = await allAsync(`
      SELECT
        COALESCE(u.id, 0)                            AS auditor_id,
        COALESCE(u.nombre, 'Eliminado del sistema')  AS auditor_nombre,
        COALESCE(u.rol,    'N/A')                    AS auditor_rol,
        COUNT(*)                                     AS total,
        ROUND(AVG(a.calificacion_general), 1)        AS promedio_calificacion,
        MIN(a.fecha_visita)                          AS primera_fecha,
        MAX(a.fecha_visita)                          AS ultima_fecha,
        SUM(CASE WHEN a.calificacion_general >= 80 THEN 1 ELSE 0 END) AS aprobadas,
        SUM(CASE WHEN a.calificacion_general < 80 AND a.calificacion_general IS NOT NULL THEN 1 ELSE 0 END) AS reprobadas
      FROM auditorias_v2 a
      LEFT JOIN usuarios u ON a.auditor_id = u.id
      WHERE a.fecha_visita BETWEEN ? AND ?${whereExtra}
      GROUP BY a.auditor_id
      ORDER BY total DESC, promedio_calificacion DESC
    `, params);

    // Detalle individual de cada auditoría
    const detalle = await allAsync(`
      SELECT
        a.id,
        a.fecha_visita,
        a.hora_visita,
        a.calificacion_general,
        a.estado,
        a.supervisor_nombre,
        COALESCE(u.nombre, 'Eliminado del sistema') AS auditor_nombre,
        COALESCE(e.nombre, 'Estación eliminada')    AS estacion_nombre
      FROM auditorias_v2 a
      LEFT JOIN usuarios   u ON a.auditor_id  = u.id
      LEFT JOIN estaciones e ON a.estacion_id = e.id
      WHERE a.fecha_visita BETWEEN ? AND ?${whereExtra}
      ORDER BY a.fecha_visita DESC, a.hora_visita DESC
    `, params);

    const resumen = {
      totalAuditorias: detalle.length,
      promedioGeneral: porAuditor.length
        ? (porAuditor.reduce((s, r) => s + (r.promedio_calificacion || 0), 0) / porAuditor.length).toFixed(1)
        : 0,
      auditores: porAuditor.length,
    };

    res.render('reportes/frecuencia-auditorias', {
      title: 'Reporte de Frecuencia de Auditorías',
      porAuditor,
      detalle,
      auditores,
      resumen,
      filtros: { fecha_inicio: fi, fecha_fin: ff, auditor_id: auditor_id || 'todos' },
      user: req.session,
    });
  } catch (err) {
    console.error('Error en reporteAuditorias:', err);
    res.status(500).send('Error generando el reporte de auditorías.');
  }
};

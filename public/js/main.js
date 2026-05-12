/**
 * JAVASCRIPT PRINCIPAL - MR. FUEL
 */

// Utilidad para formatear fechas
function formatearFecha(fecha) {
  const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-HN', opciones);
}

// Confirmar eliminación
function confirmarEliminacion(mensaje = '¿Estás seguro de eliminar este registro?') {
  return confirm(mensaje);
}

// Toast/Notificación simple
function mostrarNotificacion(mensaje, tipo = 'success') {
  const colores = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
    warning: '#ffc107'
  };
  
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colores[tipo]};
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;
  div.textContent = mensaje;
  
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

// Event listener para eliminar auditorías
document.addEventListener('click', async (e) => {
  if (e.target.matches('[data-eliminar-auditoria]')) {
    e.preventDefault();
    
    if (!confirmarEliminacion('¿Estás seguro de eliminar esta auditoría? Esta acción no se puede deshacer.')) {
      return;
    }
    
    const auditoriaId = e.target.dataset.eliminarAuditoria;
    
    try {
      const response = await fetch(`/auditorias/${auditoriaId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        mostrarNotificacion('Auditoría eliminada correctamente', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        mostrarNotificacion('Error al eliminar: ' + result.mensaje, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error de conexión', 'error');
    }
  }
});

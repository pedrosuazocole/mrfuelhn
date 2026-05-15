/**
 * JAVASCRIPT PRINCIPAL - MR. FUEL
 */

// ==========================================
// REGISTRO DEL SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration.scope);
        
        // Verificar actualizaciones cada 1 hora
        setInterval(() => {
          registration.update();
        }, 3600000);
      })
      .catch(error => {
        console.log('❌ Error al registrar Service Worker:', error);
      });
  });
}

// ==========================================
// MENÚ HAMBURGUESA (RESPONSIVE)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navbarMenu = document.getElementById('navbarMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  
  if (menuToggle && navbarMenu && menuOverlay) {
    // Toggle menú
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navbarMenu.classList.toggle('active');
      menuOverlay.classList.toggle('active');
      
      // Prevenir scroll del body cuando el menú está abierto
      if (navbarMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
    
    // Cerrar menú al hacer click en overlay
    menuOverlay.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navbarMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
    
    // Cerrar menú al hacer click en un enlace
    const menuLinks = navbarMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navbarMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
    
    // Cerrar menú con tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navbarMenu.classList.contains('active')) {
        menuToggle.classList.remove('active');
        navbarMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
});

// ==========================================
// INSTALACIÓN PWA
// ==========================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir el prompt automático
  e.preventDefault();
  deferredPrompt = e;
  
  // Mostrar botón de instalación personalizado
  mostrarBotonInstalar();
});

function mostrarBotonInstalar() {
  // Verificar si ya existe el botón
  if (document.getElementById('btn-instalar-pwa')) return;
  
  const btn = document.createElement('button');
  btn.id = 'btn-instalar-pwa';
  btn.innerHTML = '<i class="fas fa-download"></i> Instalar App';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #ED1C24;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(237, 28, 36, 0.4);
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: bounce 2s infinite;
  `;
  
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Mostrar prompt de instalación
    deferredPrompt.prompt();
    
    // Esperar respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar la PWA');
      mostrarNotificacion('¡App instalada! Búscala en tu pantalla de inicio', 'success');
    }
    
    // Limpiar
    deferredPrompt = null;
    btn.remove();
  });
  
  document.body.appendChild(btn);
  
  // Agregar animación bounce
  if (!document.getElementById('pwa-animation-style')) {
    const style = document.createElement('style');
    style.id = 'pwa-animation-style';
    style.textContent = `
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Detectar cuando la app fue instalada
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA instalada exitosamente');
  mostrarNotificacion('¡Mr. Fuel instalado! Ya puedes usarlo como app', 'success');
  
  // Remover botón si existe
  const btn = document.getElementById('btn-instalar-pwa');
  if (btn) btn.remove();
});

// ==========================================
// UTILIDADES
// ==========================================

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

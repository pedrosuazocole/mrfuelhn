/**
 * JAVASCRIPT PARA AUDITORÍA V2.0 - MR. FUEL
 */

// Función para seleccionar área (PISTA o TIENDA)
function seleccionarArea(area) {
  // Ocultar todos los grupos
  document.querySelectorAll('.grupo-categoria').forEach(grupo => {
    grupo.style.display = 'none';
  });
  
  // Quitar selección de botones
  document.querySelectorAll('.btn-selector').forEach(btn => {
    btn.classList.remove('selected');
    btn.classList.remove('disabled');
  });
  
  // Marcar botón seleccionado
  const btnSeleccionado = document.getElementById(`btn-${area}`);
  btnSeleccionado.classList.add('selected');
  
  // Bloquear el botón NO seleccionado
  const otraArea = area === 'pista' ? 'tienda' : 'pista';
  const btnBloqueado = document.getElementById(`btn-${otraArea}`);
  btnBloqueado.classList.add('disabled');
  
  // Mostrar grupo seleccionado
  document.getElementById(`grupo-${area}`).style.display = 'block';
  
  // Guardar área evaluada
  document.getElementById('area_evaluada').value = area;
  
  // Scroll suave al checklist
  setTimeout(() => {
    document.getElementById(`grupo-${area}`).scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }, 100);
}

// Función para toggle de grupos (debe estar disponible globalmente para onclick)
function toggleGrupo(grupoId) {
  const contenido = document.getElementById(`contenido-${grupoId}`);
  const icon = document.getElementById(`icon-${grupoId}`);
  const header = document.querySelector(`[onclick="toggleGrupo('${grupoId}')"]`);
  
  contenido.classList.toggle('collapsed');
  header.classList.toggle('collapsed');
}

// Función para marcar cumplimiento Si/No
function marcarCumplimiento(itemId, valor) {
  // Obtener ambos botones del item
  const botones = document.querySelectorAll(`[data-item-id="${itemId}"][data-valor]`);
  const inputHidden = document.querySelector(`.item-cumple-value[data-item-id="${itemId}"]`);
  
  // Quitar active de todos los botones del item
  botones.forEach(btn => btn.classList.remove('active'));
  
  // Agregar active al botón clickeado
  const botonClickeado = document.querySelector(`[data-item-id="${itemId}"][data-valor="${valor}"]`);
  botonClickeado.classList.add('active');
  
  // Guardar valor en input hidden (1 = cumple, 0 = no cumple)
  inputHidden.value = valor === 'si' ? '1' : '0';
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 Inicializando formulario de auditoría v2.0...');
  
  // Configurar fecha y hora actual por defecto
  const hoy = new Date().toISOString().split('T')[0];
  const ahora = new Date().toTimeString().slice(0, 5);
  document.getElementById('fecha_visita').value = hoy;
  document.getElementById('hora_visita').value = ahora;
  
  // Toggle de observaciones
  document.querySelectorAll('[data-toggle-observacion]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.toggleObservacion;
      const container = document.getElementById(`obs-${itemId}`);
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });
  });
  
  // Toggle de fotos
  document.querySelectorAll('[data-toggle-fotos]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.toggleFotos;
      const container = document.getElementById(`fotos-${itemId}`);
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });
  });
  
  // Manejo de fotos
  document.querySelectorAll('.foto-preview').forEach(preview => {
    preview.addEventListener('click', () => {
      const slotId = preview.dataset.fotoSlot;
      const input = document.querySelector(`[data-foto-input="${slotId}"]`);
      input.click();
    });
  });
  
  document.querySelectorAll('[data-foto-input]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const slotId = input.dataset.fotoInput;
      const preview = document.querySelector(`[data-foto-slot="${slotId}"]`);
      const itemId = slotId.split('-')[0];
      
      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.innerHTML = `
          <img src="${event.target.result}" alt="Foto">
          <span class="remove-foto" data-remove-foto="${slotId}">×</span>
        `;
        
        // Actualizar contador
        actualizarContadorFotos(itemId);
      };
      reader.readAsDataURL(file);
    });
  });
  
  // Remover fotos
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-remove-foto]')) {
      const slotId = e.target.dataset.removeFoto;
      const preview = document.querySelector(`[data-foto-slot="${slotId}"]`);
      const input = document.querySelector(`[data-foto-input="${slotId}"]`);
      const itemId = slotId.split('-')[0];
      
      preview.innerHTML = '<i class="fas fa-camera" style="font-size: 24px; color: #ccc;"></i>';
      input.value = '';
      
      actualizarContadorFotos(itemId);
    }
  });
  
  function actualizarContadorFotos(itemId) {
    const inputs = document.querySelectorAll(`[data-foto-input^="${itemId}-"]`);
    let count = 0;
    inputs.forEach(input => {
      if (input.files.length > 0) count++;
    });
    
    const counter = document.querySelector(`[data-count-for="${itemId}"]`);
    counter.textContent = count;
  }
  
  // Canvas de firma
  const canvas = document.getElementById('firma-canvas');
  const ctx = canvas.getContext('2d');
  let firmando = false;
  let ultimoX = 0;
  let ultimoY = 0;
  
  // Ajustar tamaño del canvas
  function ajustarCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  ajustarCanvas();
  window.addEventListener('resize', ajustarCanvas);
  
  function obtenerPosicion(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }
  
  canvas.addEventListener('mousedown', (e) => {
    firmando = true;
    const pos = obtenerPosicion(e);
    ultimoX = pos.x;
    ultimoY = pos.y;
  });
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    firmando = true;
    const pos = obtenerPosicion(e);
    ultimoX = pos.x;
    ultimoY = pos.y;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (!firmando) return;
    const pos = obtenerPosicion(e);
    
    ctx.beginPath();
    ctx.moveTo(ultimoX, ultimoY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ultimoX = pos.x;
    ultimoY = pos.y;
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!firmando) return;
    const pos = obtenerPosicion(e);
    
    ctx.beginPath();
    ctx.moveTo(ultimoX, ultimoY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ultimoX = pos.x;
    ultimoY = pos.y;
  });
  
  canvas.addEventListener('mouseup', () => firmando = false);
  canvas.addEventListener('touchend', () => firmando = false);
  canvas.addEventListener('mouseleave', () => firmando = false);
  
  document.getElementById('limpiarFirma').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  
  // Envío del formulario
  document.getElementById('formAuditoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
      // Recopilar evaluaciones (ahora desde inputs hidden)
      const evaluaciones = {};
      document.querySelectorAll('.item-cumple-value').forEach(input => {
        const itemId = input.dataset.itemId;
        const observacionTextarea = document.querySelector(`[data-observacion-item="${itemId}"]`);
        const valorCumple = input.value; // '1' = cumple, '0' = no cumple, '' = sin evaluar
        
        evaluaciones[itemId] = {
          cumple: valorCumple === '1',
          observacion: observacionTextarea ? observacionTextarea.value.trim() : ''
        };
      });
      
      // Preparar FormData
      const formData = new FormData(e.target);
      formData.append('evaluaciones', JSON.stringify(evaluaciones));
      
      // Capturar firma
      const firmaDataURL = canvas.toDataURL();
      const firmaVacia = ctx.getImageData(0, 0, canvas.width, canvas.height).data.every(v => v === 0 || v === 255);
      if (!firmaVacia) {
        formData.set('supervisor_firma', firmaDataURL);
      }
      
      // Mostrar progreso
      const progressBar = document.getElementById('progressBar');
      progressBar.style.width = '30%';
      
      // Enviar
      const response = await fetch('/auditorias-v2/nueva', {
        method: 'POST',
        body: formData
      });
      
      progressBar.style.width = '70%';
      
      const result = await response.json();
      
      progressBar.style.width = '100%';
      
      if (result.success) {
        alert(`✅ Auditoría guardada exitosamente\n\nCalificación: ${result.calificacion}%`);
        window.location.href = `/auditorias-v2/${result.auditoriaId}`;
      } else {
        throw new Error(result.mensaje || 'Error al guardar');
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al guardar la auditoría: ' + error.message);
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Auditoría';
    }
  });
  
  console.log('✅ Formulario listo');
});

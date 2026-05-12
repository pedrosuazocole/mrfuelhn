/**
 * JAVASCRIPT PARA AUDITORÍA V2.0 - MR. FUEL
 */

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
      // Recopilar evaluaciones
      const evaluaciones = {};
      document.querySelectorAll('.item-cumple').forEach(checkbox => {
        const itemId = checkbox.dataset.itemId;
        const observacionTextarea = document.querySelector(`[data-observacion-item="${itemId}"]`);
        
        evaluaciones[itemId] = {
          cumple: checkbox.checked,
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

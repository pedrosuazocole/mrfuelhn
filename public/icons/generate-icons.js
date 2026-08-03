/**
 * Script para generar íconos PWA con Canvas (Node.js)
 * Ejecutar con: node generate-icons.js
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconColor = '#ED1C24'; // Rojo Texaco

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fondo rojo Texaco
  ctx.fillStyle = iconColor;
  ctx.fillRect(0, 0, size, size);
  
  // Estrella blanca (simplificada)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐', size / 2, size / 2);
  
  // Guardar
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}x${size}.png`, buffer);
  console.log(`✅ Generado: icon-${size}x${size}.png`);
});

console.log('🎉 Todos los íconos generados');

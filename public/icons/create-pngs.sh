#!/bin/bash
# Crear íconos PNG a partir del SVG usando conversión simple

# Si está disponible ImageMagick
if command -v convert &> /dev/null; then
    echo "Usando ImageMagick para generar íconos..."
    for size in 72 96 128 144 152 192 384 512; do
        convert -background none -density 300 base-icon.svg -resize ${size}x${size} icon-${size}x${size}.png
        echo "✅ Generado: icon-${size}x${size}.png"
    done
else
    echo "⚠️ ImageMagick no disponible"
    echo "Usando SVG directamente como fallback"
    for size in 72 96 128 144 152 192 384 512; do
        cp base-icon.svg icon-${size}x${size}.png
    done
fi

echo "✅ Proceso completado"

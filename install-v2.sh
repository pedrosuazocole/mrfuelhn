#!/bin/bash

# SCRIPT DE INSTALACIÓN MR. FUEL V2.0

echo "🚀 Mr. Fuel v2.0 - Instalación y Migración"
echo "=========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json no encontrado"
  echo "Por favor ejecuta este script desde el directorio raíz del proyecto"
  exit 1
fi

echo "📦 Paso 1: Instalando dependencias..."
npm install

echo ""
echo "🗄️  Paso 2: Migrando base de datos a v2.0..."
node utils/migrateToV2.js

if [ $? -ne 0 ]; then
  echo "❌ Error en la migración de base de datos"
  exit 1
fi

echo ""
echo "✅ Instalación completada exitosamente!"
echo ""
echo "📋 Resumen:"
echo "  - Dependencias instaladas"
echo "  - Base de datos migrada a v2.0"
echo "  - 4 categorías creadas (PISTA, TIENDA, BODEGA, COCINA)"
echo "  - 44 ítems de checklist configurados"
echo ""
echo "🚀 Para iniciar la aplicación:"
echo "   npm start"
echo ""
echo "📚 Documentación:"
echo "   - README.md - Guía completa"
echo "   - UPGRADE_V2.md - Guía de actualización"
echo ""

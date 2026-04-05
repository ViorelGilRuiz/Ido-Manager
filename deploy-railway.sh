#!/bin/bash

# Script para desplegar I Do Manager a Railway.app
# Uso: ./deploy-railway.sh

echo "🚀 Iniciando despliegue a Railway.app"
echo ""

# Verificar si Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI no está instalado"
    echo "Instálalo desde: https://docs.railway.app/cli/install"
    exit 1
fi

# Verificar si está dentro de un proyecto Railway
echo "📍 Conectando a proyecto Railway..."
railway link

if [ $? -ne 0 ]; then
    echo "❌ No se pudo conectar a un proyecto Railway"
    echo "Crea un proyecto en https://railway.app primero"
    exit 1
fi

# Establecer el directorio correcto para el backend
echo "📦 Configurando backend (apps/api)..."
railway service add nodejs@latest

echo "🔧 Configurando variables de entorno..."
echo "Asegúrate de agregar estas variables en el dashboard de Railway:"
echo ""
echo "NODE_ENV=production"
echo "DATABASE_URL=file:./prisma/dev.db"
echo "JWT_ACCESS_SECRET=<pon-un-valor-seguro-aqui>"
echo "JWT_REFRESH_SECRET=<pon-otro-valor-seguro-aqui>"
echo "CLIENT_URL=https://tu-dominio-netlify.netlify.app"
echo ""

echo "🚀 Deplegando..."
git push railway main

echo ""
echo "✅ Despliegue completado!"
echo "🔗 Accede a tu proyecto en: https://railway.app"
echo ""
echo "Próximos pasos:"
echo "1. Obtén la URL pública del servicio"
echo "2. Actualiza el frontend con la nueva URL del backend"
echo "3. Re-despliega el frontend en Netlify"

# Script para desplegar I Do Manager Backend a Railway.app
# Ejecutar: .\deploy-to-railway.ps1

Write-Host "🚀 Iniciando despliegue del Backend a Railway.app" -ForegroundColor Green
Write-Host ""

# Verificar si git está disponible
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar si Railway CLI está instalado
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Railway CLI no está instalado" -ForegroundColor Yellow
    Write-Host "Instálalo desde: https://docs.railway.app/cli/install" -ForegroundColor Yellow
    Write-Host "Luego ejecuta este script nuevamente" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git y Railway CLI detectados" -ForegroundColor Green
Write-Host ""

# Hacer commit de los cambios
Write-Host "📝 Haciendo commit de los cambios..." -ForegroundColor Cyan
git add -A
git commit -m "Deploy backend a Railway" -q

# Hacer push a GitHub
Write-Host "📤 Empujando cambios a GitHub..." -ForegroundColor Cyan
git push origin main -q

# Conectar a Railway
Write-Host "🔗 Conectando a Railway..." -ForegroundColor Cyan
railway link

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No se pudo conectar a Railway" -ForegroundColor Red
    Write-Host "Crea un proyecto en https://railway.app e intenta nuevamente" -ForegroundColor Red
    exit 1
}

# Esperar a que se despliegue
Write-Host ""
Write-Host "⏳ Desplegando... esto puede tomar 2-3 minutos" -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Obtener la URL del servicio
Write-Host ""
Write-Host "🔍 Obteniendo URL del servicio..." -ForegroundColor Cyan
$serviceUrl = railway service list | Select-String "nodejs" | Split-String -d " " | Select-Object -First 1

Write-Host ""
Write-Host "✅ ¡Despliegue completado!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Tu API está en: " -ForegroundColor Yellow -NoNewline
Write-Host "https://tu-servicio-railway.app/api/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚙️  Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Obtén la URL exacta desde el dashboard de Railway" -ForegroundColor Yellow
Write-Host "  2. Copia la variable de entorno API_BASE_URL" -ForegroundColor Yellow
Write-Host "  3. Agrega la URL en Netlify (Settings > Environment variables)" -ForegroundColor Yellow
Write-Host ""

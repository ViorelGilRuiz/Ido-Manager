$railwayUrl = "https://railway.app/new?repo=https://github.com/ViorelGilRuiz/Ido-Manager&rootDirectory=apps/api"

Write-Host "🚀 Abriendo Railway.app..." -ForegroundColor Green
Write-Host "Se abrirá tu navegador automáticamente" -ForegroundColor Cyan
Write-Host ""
Write-Host "La URL incluye: " -ForegroundColor Yellow
Write-Host "  ✓ Tu repositorio de GitHub" -ForegroundColor Green
Write-Host "  ✓ Directorio correcto (apps/api)" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2

# Abrir en el navegador predeterminado
Start-Process $railwayUrl

Write-Host ""
Write-Host "⏳ Espera a que se abra el navegador..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Una vez en Railway:" -ForegroundColor Yellow
Write-Host "  1. Autoriza con GitHub" -ForegroundColor White
Write-Host "  2. Railway creará el proyecto automáticamente" -ForegroundColor White
Write-Host "  3. Verifica que el 'Root Directory' sea: apps/api" -ForegroundColor White
Write-Host "  4. Agrega las variables de entorno:" -ForegroundColor White
Write-Host ""
Write-Host "     NODE_ENV=production" -ForegroundColor Gray
Write-Host "     DATABASE_URL=file:./prisma/dev.db" -ForegroundColor Gray
Write-Host "     JWT_ACCESS_SECRET=mi-secreto-super-largo-1234567890" -ForegroundColor Gray
Write-Host "     JWT_REFRESH_SECRET=otro-secreto-diferente-9876543210" -ForegroundColor Gray
Write-Host "     CLIENT_URL=https://ido-manager-app-front.netlify.app" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Presiona 'Deploy'" -ForegroundColor White
Write-Host "  6. ¡Listo! En 2-3 minutos tu backend estará activo" -ForegroundColor Green
Write-Host ""

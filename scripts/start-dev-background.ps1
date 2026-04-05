$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$webLog = Join-Path $root 'apps\web\web-dev.log'
$webErr = Join-Path $root 'apps\web\web-dev.err.log'
$apiLog = Join-Path $root 'apps\api\api-dev.log'
$apiErr = Join-Path $root 'apps\api\api-dev.err.log'

function Stop-PortProcessIfAny([int]$Port) {
  $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port }
  if (-not $listeners) { return }
  $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Host "Stopped process on port $Port (PID $procId)"
    } catch {
      Write-Host "Could not stop PID $procId on port $Port"
    }
  }
}

function Start-ServiceBackground([string]$Name, [string]$CommandArgs, [string]$Log, [string]$ErrLog) {
  if (Test-Path $Log) { Remove-Item $Log -Force }
  if (Test-Path $ErrLog) { Remove-Item $ErrLog -Force }
  Start-Process -FilePath npm.cmd -ArgumentList $CommandArgs -WorkingDirectory $root -RedirectStandardOutput $Log -RedirectStandardError $ErrLog | Out-Null
  Write-Host "Started $Name in background"
}

Stop-PortProcessIfAny -Port 4200
Stop-PortProcessIfAny -Port 3000

Start-ServiceBackground -Name 'web' -CommandArgs '--workspace apps/web run start' -Log $webLog -ErrLog $webErr
Start-ServiceBackground -Name 'api' -CommandArgs '--workspace apps/api run start:dev' -Log $apiLog -ErrLog $apiErr

Start-Sleep -Seconds 12

$webOk = $false
$apiOk = $false
try {
  $webStatus = (Invoke-WebRequest -Uri 'http://127.0.0.1:4200' -UseBasicParsing -TimeoutSec 5).StatusCode
  $webOk = $webStatus -eq 200
} catch {}
try {
  $apiStatus = (Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 5).StatusCode
  $apiOk = $apiStatus -eq 200
} catch {}

Write-Host "WEB_OK=$webOk API_OK=$apiOk"
Write-Host "Web logs: $webLog"
Write-Host "API logs: $apiLog"

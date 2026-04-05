$ErrorActionPreference = 'SilentlyContinue'

$ports = 3000, 4200
$listeners = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in $ports }
$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($procId in $pids) {
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Host "Stopped PID $procId"
  } catch {
    Write-Host "Could not stop PID $procId"
  }
}

Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $ports } |
  Select-Object LocalAddress, LocalPort, OwningProcess

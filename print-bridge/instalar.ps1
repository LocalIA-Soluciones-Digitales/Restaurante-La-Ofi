# Instalador del print-bridge de La Ofi en la TPV (Windows).
# Ejecutar en PowerShell COMO ADMINISTRADOR:
#   irm https://raw.githubusercontent.com/LocalIA-Soluciones-Digitales/Restaurante-La-Ofi/main/print-bridge/instalar.ps1 | iex
#
# Deja el servicio en C:\laofi\print-bridge, arrancando solo con Windows (tarea
# programada como SYSTEM que lo relanza si se cae) y con log en bridge.log.
# Opcional: panel /admin abierto al encender e inicio de sesion automatico.
# Se puede volver a ejecutar para cambiar IPs o credenciales: pregunta de nuevo.
# Mensajes sin tildes a proposito: PowerShell 5.1 lee los .ps1 sin BOM como ANSI.

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "https://raw.githubusercontent.com/LocalIA-Soluciones-Digitales/Restaurante-La-Ofi/main/print-bridge"
$Dir = "C:\laofi\print-bridge"
$Tarea = "LaOfiPrintBridge"
$PanelUrl = "https://www.laofiparke.com/admin"
# Publicas (las mismas que lleva la web en el navegador); la contrasena se pregunta.
$SupabaseUrl = "https://ukhfaphloxlszomccgde.supabase.co"
$SupabaseAnon = "sb_publishable_CalLFpdGIixVv0fV3ic62w_fUH9qLqK"

function Paso($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   OK  $t" -ForegroundColor Green }
function Aviso($t) { Write-Host "   !!  $t" -ForegroundColor Yellow }
function Preguntar($t, $def) {
  $r = Read-Host "   $t$(if ($def) { " [$def]" })"
  if ([string]::IsNullOrWhiteSpace($r)) { $def } else { $r.Trim() }
}
function RefrescarPath {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw "Abre PowerShell como administrador (clic derecho > Ejecutar como administrador) y repite." }

# 1. Node.js ------------------------------------------------------------------
Paso "Node.js"
RefrescarPath
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id OpenJS.NodeJS.LTS --scope machine --accept-source-agreements --accept-package-agreements
  } else {
    # Sin winget (Windows antiguo): MSI de la ultima LTS desde nodejs.org.
    $lts = (Invoke-RestMethod "https://nodejs.org/dist/index.json") | Where-Object { $_.lts -and $_.files -contains "win-x64-msi" } | Select-Object -First 1
    $msi = Join-Path $env:TEMP "node-$($lts.version)-x64.msi"
    Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/node-$($lts.version)-x64.msi" -OutFile $msi
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$msi`" /qn"
  }
  RefrescarPath
}
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "No se encuentra node.exe tras instalarlo. Cierra PowerShell, abrelo de nuevo como administrador y repite." }
$nodeVer = (& $node --version)
if ([int]($nodeVer.TrimStart("v").Split(".")[0]) -lt 18) { throw "Node $nodeVer es demasiado antiguo (minimo 18). Actualizalo y repite." }
Ok "$nodeVer en $node"
$npm = Join-Path (Split-Path $node) "npm.cmd"

# 2. Archivos -----------------------------------------------------------------
# Si ya estaba instalado, se para antes (si no, quedarian dos copias imprimiendo).
function PararBridge {
  Stop-ScheduledTask -TaskName $Tarea -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -eq "powershell.exe" -and $_.CommandLine -like "*laofi\print-bridge\arrancar.ps1*") -or
    ($_.Name -eq "node.exe" -and $_.CommandLine -like "*src/index.js*")
  } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
PararBridge
Paso "Descargando el print-bridge en $Dir"
New-Item -ItemType Directory -Force "$Dir\src" | Out-Null
foreach ($f in "package.json", "src/index.js") {
  Invoke-WebRequest "$Repo/$f" -OutFile (Join-Path $Dir $f) -UseBasicParsing
}
Ok "package.json, src\index.js"

# 3. Impresoras ---------------------------------------------------------------
Paso "Impresoras (IP de la hoja de autotest: FEED pulsado al encenderla)"
$previo = @{}
if (Test-Path "$Dir\.env") {
  Get-Content "$Dir\.env" | Where-Object { $_ -match "^\s*([A-Z_]+)=(.*)$" } | ForEach-Object { $previo[$Matches[1]] = $Matches[2] }
}
$ipDe = { param($v) if ($v) { ($v -replace "^tcp://", "") -replace ":\d+$", "" } }
$ipCocina = Preguntar "IP impresora COCINA" (& $ipDe $previo["PRINTER_COCINA_INTERFACE"])
$ipBarra = Preguntar "IP impresora BARRA" (& $ipDe $previo["PRINTER_BARRA_INTERFACE"])
$tipo = (Preguntar "Marca/juego de comandos: EPSON o STAR" $(if ($previo["PRINTER_TIPO"]) { $previo["PRINTER_TIPO"] } else { "EPSON" })).ToUpper()
foreach ($p in @(@("COCINA", $ipCocina), @("BARRA", $ipBarra))) {
  if (-not $p[1]) { Aviso "$($p[0]): sin IP, no se imprimira"; continue }
  $c = New-Object Net.Sockets.TcpClient
  try { $abierta = $c.ConnectAsync($p[1], 9100).Wait(3000) -and $c.Connected } catch { $abierta = $false }
  $c.Close()
  if ($abierta) { Ok "$($p[0]) responde en $($p[1]):9100" } else { Aviso "$($p[0]) NO responde en $($p[1]):9100 (IP, cable o red distinta)" }
}

# 4. Cuenta del servicio --------------------------------------------------------
Paso "Cuenta de La Ofi (la misma con la que se entra en /admin en la TPV)"
$email = Preguntar "Email" $previo["BRIDGE_EMAIL"]
$pass = $previo["BRIDGE_PASSWORD"]
$seg = Read-Host "   Contrasena$(if ($pass) { ' [Intro = mantener la guardada]' })" -AsSecureString
$nueva = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))
if ($nueva) { $pass = $nueva }
try {
  $body = @{ email = $email; password = $pass } | ConvertTo-Json
  Invoke-RestMethod -Method Post "$SupabaseUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $SupabaseAnon } -ContentType "application/json" -Body $body | Out-Null
  Ok "credenciales correctas"
} catch {
  throw "Supabase rechaza el email o la contrasena ($($_.Exception.Message)). Revisalos y repite."
}

@(
  "SUPABASE_URL=$SupabaseUrl"
  "SUPABASE_ANON_KEY=$SupabaseAnon"
  "BRIDGE_EMAIL=$email"
  "BRIDGE_PASSWORD=$pass"
  "PRINTER_COCINA_INTERFACE=$(if ($ipCocina) { "tcp://${ipCocina}:9100" })"
  "PRINTER_BARRA_INTERFACE=$(if ($ipBarra) { "tcp://${ipBarra}:9100" })"
  "PRINTER_BARRA_PUERTO_WINDOWS="
  "PRINTER_TIPO=$tipo"
) | Set-Content -Encoding ASCII "$Dir\.env"
# Solo administradores y SYSTEM pueden leer el .env (lleva la contrasena).
icacls "$Dir\.env" /inheritance:r /grant:r "*S-1-5-32-544:F" "*S-1-5-18:F" | Out-Null
Ok ".env guardado"

# 5. Dependencias y prueba -----------------------------------------------------
Paso "Instalando dependencias"
Push-Location $Dir
try {
  & $npm install --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install ha fallado" }
  Paso "Ticket de prueba en cada impresora"
  & $node src/index.js --prueba
} finally { Pop-Location }
if ((Preguntar "Ha salido un ticket en cada impresora? (s/n)" "s") -notmatch "^s") {
  Aviso "Revisa IPs y PRINTER_TIPO (prueba STAR si salen simbolos raros) y vuelve a ejecutar el instalador."
  return
}

# 6. Arranque automatico ---------------------------------------------------------
Paso "Arranque automatico con Windows"
# Bucle que relanza el servicio si se cae (p. ej. sin internet al encender) y
# rota el log al pasar de 5 MB.
@"
`$ErrorActionPreference = 'Continue'
Set-Location '$Dir'
while (`$true) {
  if ((Test-Path bridge.log) -and (Get-Item bridge.log).Length -gt 5MB) { Move-Item -Force bridge.log bridge.log.1 }
  "`n[`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Arrancando" | Out-File -Append -Encoding utf8 bridge.log
  & '$node' src/index.js *>&1 | Out-File -Append -Encoding utf8 bridge.log
  Start-Sleep -Seconds 10
}
"@ | Set-Content -Encoding UTF8 "$Dir\arrancar.ps1"

PararBridge
Unregister-ScheduledTask -TaskName $Tarea -Confirm:$false -ErrorAction SilentlyContinue
$accion = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Dir\arrancar.ps1`"" -WorkingDirectory $Dir
$inicio = New-ScheduledTaskTrigger -AtStartup
$ajustes = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$usuario = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $Tarea -Action $accion -Trigger $inicio -Settings $ajustes -Principal $usuario -Description "Comandas de La Ofi a las impresoras de cocina y barra" | Out-Null
Start-ScheduledTask -TaskName $Tarea
Ok "tarea '$Tarea' creada y en marcha"

Start-Sleep -Seconds 8
$log = Get-Content "$Dir\bridge.log" -Tail 10 -ErrorAction SilentlyContinue
$log | ForEach-Object { Write-Host "   | $_" }
if ($log -match "Realtime: SUBSCRIBED") { Ok "conectado: imprimira al aceptar comandas en /admin/cocina" }
else { Aviso "todavia no aparece 'Realtime: SUBSCRIBED'. Mira el log en unos segundos: Get-Content $Dir\bridge.log -Tail 20 -Wait" }

# 7. Windows de la TPV -------------------------------------------------------------
Paso "Ajustes de Windows para la TPV"
if ((Preguntar "Quitar la suspension y fijar horas activas de Windows Update de 7:00 a 1:00? (s/n)" "s") -match "^s") {
  powercfg /change standby-timeout-ac 0
  powercfg /change hibernate-timeout-ac 0
  $wu = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
  # Sin -Force sobre una clave existente: en el registro la vaciaria.
  if (-not (Test-Path $wu)) { New-Item $wu | Out-Null }
  Set-ItemProperty $wu ActiveHoursStart 7 -Type DWord
  Set-ItemProperty $wu ActiveHoursEnd 1 -Type DWord
  Ok "sin suspension; Windows no reinicia por actualizaciones entre 7:00 y 1:00"
}

# 8. Panel abierto al encender ------------------------------------------------------
# Chrome en modo aplicacion (ventana propia, sin barra de direcciones) y no kiosko:
# en la TPV sigue su programa de cobro y hay que poder cambiar de ventana. Perfil
# normal de Chrome para que la sesion de /admin se conserve (el kiosko de Edge es
# InPrivate y pediria el login en cada arranque). --kiosk-printing: imprime sin
# dialogo en la impresora predeterminada.
Paso "Panel de La Ofi al encender la TPV"
if ((Preguntar "Abrir el panel (/admin) automaticamente al iniciar Windows? (s/n)" "s") -match "^s") {
  $buscarChrome = {
    @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
      "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
      "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  $chrome = & $buscarChrome
  if (-not $chrome -and (Get-Command winget -ErrorAction SilentlyContinue)) {
    winget install -e --id Google.Chrome --scope machine --accept-source-agreements --accept-package-agreements
    $chrome = & $buscarChrome
  }
  if (-not $chrome) {
    Aviso "no hay Chrome y no se ha podido instalar: instalalo desde google.com/chrome y vuelve a ejecutar el instalador"
  } else {
    $wsh = New-Object -ComObject WScript.Shell
    foreach ($lnk in "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp\Panel La Ofi.lnk", "$env:PUBLIC\Desktop\Panel La Ofi.lnk") {
      $s = $wsh.CreateShortcut($lnk)
      $s.TargetPath = $chrome
      $s.Arguments = "--app=$PanelUrl --start-maximized --kiosk-printing"
      $s.WorkingDirectory = Split-Path $chrome
      $s.Save()
    }
    Ok "se abrira al iniciar sesion; si lo cierran, icono 'Panel La Ofi' en el escritorio"
    Aviso "inicia sesion en el panel UNA vez desde ese icono, con el usuario de Windows de la TPV (no el de administrador)"
  }
}

# 9. Inicio de sesion automatico en Windows -------------------------------------------
# Autologon de Sysinternals (Microsoft) guarda la contrasena cifrada como secreto LSA,
# no en texto plano en el registro como hace AutoAdminLogon a mano.
Paso "Inicio de sesion automatico de Windows"
if ((Preguntar "La TPV pide contrasena al encender y quieres que entre sola? (s/n)" "n") -match "^s") {
  $sesion = (Get-CimInstance Win32_ComputerSystem).UserName
  $usuarioWin = Preguntar "Usuario de Windows de la TPV" $(if ($sesion) { $sesion.Split("\")[-1] })
  $local = Get-LocalUser -Name $usuarioWin -ErrorAction SilentlyContinue
  if (-not $local) {
    Aviso "'$usuarioWin' no es una cuenta local. Si es una cuenta Microsoft (correo), hazlo a mano: Win+R > netplwiz > desmarcar 'Los usuarios deben escribir su nombre y contrasena'"
  } elseif ($local.PrincipalSource -eq "MicrosoftAccount") {
    Aviso "'$usuarioWin' es una cuenta Microsoft: hazlo a mano con Win+R > netplwiz (ver README)"
  } else {
    $segWin = Read-Host "   Contrasena de Windows de '$usuarioWin'" -AsSecureString
    $passWin = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($segWin))
    $exe = Join-Path $env:TEMP "Autologon64.exe"
    Invoke-WebRequest "https://live.sysinternals.com/Autologon64.exe" -OutFile $exe -UseBasicParsing
    & $exe $usuarioWin $env:COMPUTERNAME $passWin /accepteula
    Remove-Item $exe -Force -ErrorAction SilentlyContinue
    if ((Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon").AutoAdminLogon -eq "1") { Ok "Windows entrara solo como '$usuarioWin'" }
    else { Aviso "no se ha podido activar; hazlo a mano con Win+R > netplwiz" }
  }
}

Write-Host "`nListo. Log: $Dir\bridge.log" -ForegroundColor Green
Write-Host "Reiniciar: Stop-Process -Name node -Force (vuelve solo en 10 s)  |  Cambiar IPs o cuenta: ejecutar de nuevo este instalador" -ForegroundColor Green

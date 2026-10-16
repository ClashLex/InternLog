# InternLog — administrator login diagnostic (safe, read-only; holds no session on disk).
# Run this in the SAME PowerShell window where you start the Java backend (Windows PowerShell or PowerShell 7).
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\diagnose-admin-login.ps1
#
# It checks the admin settings that the Java process will read from THIS window,
# checks what is listening on port 8080, and (if a server is already running) can
# test the login endpoint directly and print the backend's raw answer.

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "== 1. Administrator settings visible to THIS terminal ==" -ForegroundColor Cyan
Write-Host "(Environment variables are per-window. They must be set in the window that starts Java.)"
$email = $env:ADMIN_EMAIL
$hash = $env:ADMIN_PASSWORD_HASH
$envOk = $true

if ([string]::IsNullOrEmpty($email)) {
  Write-Host "ADMIN_EMAIL: NOT SET in this window." -ForegroundColor Red
  Write-Host "  Fix: `$env:ADMIN_EMAIL = 'your-admin-email'" -ForegroundColor Yellow
  $envOk = $false
} else {
  Write-Host "ADMIN_EMAIL: [$email]"
  if ($email -ne $email.Trim()) {
    Write-Host "  WARNING: value has leading/trailing spaces or a newline. Re-set it cleanly." -ForegroundColor Red
    $envOk = $false
  }
}

if ([string]::IsNullOrEmpty($hash)) {
  Write-Host "ADMIN_PASSWORD_HASH: NOT SET in this window." -ForegroundColor Red
  Write-Host "  Fix: generate it, then set it with SINGLE quotes:" -ForegroundColor Yellow
  Write-Host "    java -jar backend\target\internlog-backend-1.0.0.jar --hash-admin-password"
  Write-Host "    `$env:ADMIN_PASSWORD_HASH = '`$2a`$10`$...'" -ForegroundColor Yellow
  $envOk = $false
} else {
  Write-Host ("ADMIN_PASSWORD_HASH length: {0} (must be exactly 60)" -f $hash.Length)
  $hasPrefix = $hash.StartsWith('$2a$10$')
  Write-Host ("Starts with `$2a`$10`$: {0}" -f $hasPrefix)
  if (-not $hasPrefix -or $hash.Length -ne 60) {
    Write-Host "  WARNING: this is not a complete BCrypt hash." -ForegroundColor Red
    Write-Host "  Common causes: double quotes around it in PowerShell (the `$ characters got expanded)," -ForegroundColor Yellow
    Write-Host "  or a plain password / incomplete copy was pasted. Regenerate and use SINGLE quotes." -ForegroundColor Yellow
    $envOk = $false
  }
  if ($hash -ne $hash.Trim()) {
    Write-Host "  WARNING: value has leading/trailing spaces or a newline. Re-set it cleanly." -ForegroundColor Red
    $envOk = $false
  }
}

Write-Host ""
Write-Host "== 2. What is listening on port 8080? ==" -ForegroundColor Cyan
$listening = $false
try {
  $conns = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction Stop
  $listening = $true
  foreach ($c in $conns) {
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) { Write-Host ("Listening PID {0}: {1}" -f $c.OwningProcess, $proc.ProcessName) }
    else { Write-Host ("Listening PID {0}" -f $c.OwningProcess) }
  }
  Write-Host "Reminder: a server started BEFORE you set the variables never sees them." -ForegroundColor Yellow
  Write-Host "If it is a Docker container from an earlier run, refresh it:" -ForegroundColor Yellow
  Write-Host "  docker compose -f backend/docker-compose.yml up -d --force-recreate app" -ForegroundColor Yellow
} catch {
  Write-Host "Nothing is listening on 8080 yet (start Java after this check)."
}

if ($listening) {
  Write-Host ""
  Write-Host "== 3. Backend tests against http://localhost:8080 ==" -ForegroundColor Cyan
  try {
    $health = Invoke-RestMethod 'http://localhost:8080/api/health' -TimeoutSec 5
    Write-Host ("/api/health says: status={0}, service={1}" -f $health.status, $health.service)
  } catch {
    Write-Host "Could not reach /api/health: $($_.Exception.Message)" -ForegroundColor Red
  }

  $answer = Read-Host "Type YES to test the admin login endpoint now (your typing will be visible)"
  if ($answer -eq "YES") {
    $testEmail = Read-Host "Admin email"
    $testPassword = Read-Host "Admin password (the NORMAL password, never the hash)"
    try {
      $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
      $csrf = Invoke-RestMethod 'http://localhost:8080/api/auth/csrf' -WebSession $s
      $body = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
      $headers = @{}
      $headers[$csrf.headerName] = $csrf.token
      $result = Invoke-RestMethod 'http://localhost:8080/api/auth/login' -Method Post -WebSession $s -ContentType 'application/json' -Headers $headers -Body $body
      Write-Host ("LOGIN OK - role returned: {0}" -f $result.role) -ForegroundColor Green
      if ($result.role -ne "admin") {
        Write-Host "But the role is not 'admin'. Check that the email matches ADMIN_EMAIL exactly." -ForegroundColor Yellow
      }
    } catch {
      Write-Host "LOGIN FAILED - backend's raw answer:" -ForegroundColor Red
      $raw = $null
      try { $raw = $_.ErrorDetails.Message } catch {}
      if ($raw) { Write-Host $raw } else { Write-Host $_.Exception.Message }
      Write-Host ""
      Write-Host "If it says 'Invalid email or password', the RUNNING server does not have matching admin settings."
      Write-Host "Stop it, fix the values in section 1 above, and start it again in THIS window."
    }
  }
} else {
  Write-Host ""
  Write-Host "== 3. Next steps ==" -ForegroundColor Cyan
  Write-Host "If section 1 passed, start Java in THIS window:"
  Write-Host "    cd backend"
  Write-Host "    .\mvnw.cmd spring-boot:run"
  Write-Host "Then open  http://localhost:8080/admin/login.html"
  Write-Host "and sign in with your NORMAL password."
}

Write-Host ""
if (-not $envOk) {
  Write-Host "Section 1 found problems. Fix them in this window, then start Java here." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Section 1 passed." -ForegroundColor Green
  Write-Host "If login still fails after starting Java in this window, the server answering on 8080 is stale - stop it and restart it here." -ForegroundColor Yellow
}

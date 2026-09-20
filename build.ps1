# ============================================================
#  Iqra - one-command test build
# ------------------------------------------------------------
#  Run:   .\build.ps1
#
#  web build -> copy to android -> build APK -> put a
#  timestamped copy on the Desktop -> print the build stamp.
#
#  The printed stamp must match what you see inside the app at
#  More -> Settings -> bottom of the page.
#
#  NOTE: this file is intentionally ASCII only. PowerShell 5
#  reads .ps1 as ANSI unless the file has a UTF-8 BOM, so Arabic
#  text here turns into garbage and breaks parsing.
# ============================================================

$ErrorActionPreference = "Stop"

if (-not $env:JAVA_HOME) {
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}

Set-Location C:\iqra

Write-Host ""
Write-Host "[1/4] Building web..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Web build FAILED." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "[2/4] Syncing to android..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "Sync FAILED." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "[3/4] Building APK..." -ForegroundColor Cyan
Set-Location C:\iqra\android
.\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) { Write-Host "APK build FAILED." -ForegroundColor Red; exit 1 }
Set-Location C:\iqra

Write-Host ""
Write-Host "[4/4] Copying to Desktop..." -ForegroundColor Cyan

# Read the stamp out of the bundle that was actually built, not
# from the clock - so a failed build can never print a fake one.
$bundle = Get-ChildItem C:\iqra\dist\assets\index-*.js |
          Sort-Object Length -Descending | Select-Object -First 1
$stamp = $null
if ($bundle) {
  $m = [regex]::Match((Get-Content $bundle.FullName -Raw), '(\d{4}-\d{2}-\d{2} \d{2}:\d{2})')
  if ($m.Success) { $stamp = $m.Groups[1].Value }
}

$name = "iqra-" + (Get-Date -Format "MMdd-HHmm") + ".apk"
$dest = Join-Path ([Environment]::GetFolderPath("Desktop")) $name
Copy-Item C:\iqra\android\app\build\outputs\apk\debug\app-debug.apk $dest -Force

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DONE" -ForegroundColor Green
Write-Host "  File  : $name"
if ($stamp) {
  Write-Host "  STAMP : $stamp" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  In the app: More > Settings > bottom of page"
  Write-Host "  It must show exactly the same number."
} else {
  Write-Host "  STAMP : (not found - check the build output)" -ForegroundColor Red
}
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

explorer.exe ([Environment]::GetFolderPath("Desktop"))

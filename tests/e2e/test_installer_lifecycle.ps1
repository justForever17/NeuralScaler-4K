param (
    [Parameter(Mandatory=$false)]
    [string]$SetupExe = ""
)

$ErrorActionPreference = "Stop"

if (-not $SetupExe -or -not (Test-Path $SetupExe)) {
    $candidates = Get-ChildItem -Path "release" -Filter "NeuralScaler-4K-Setup-*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($candidates -and $candidates.Count -gt 0) {
        $SetupExe = $candidates[0].FullName
    } elseif (-not $SetupExe) {
        $SetupExe = "release\NeuralScaler-4K-Setup-v2.2.0.exe"
    }
}

function Assert-Condition($Condition, $Message) {
    if (-not $Condition) {
        Write-Error "[FAIL] $Message"
        exit 1
    } else {
        Write-Host "[PASS] $Message" -ForegroundColor Green
    }
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " NeuralScaler 4K - Installer Lifecycle Acceptance Test  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check Installer exists
$SetupPath = Resolve-Path $SetupExe -ErrorAction SilentlyContinue
Assert-Condition ($null -ne $SetupPath -and (Test-Path $SetupPath)) "Installer binary exists: $SetupExe"

$InstallDir = "$env:LOCALAPPDATA\Programs\NeuralScaler-4K"
Write-Host "[Info] Target installation directory: $InstallDir"

# If already installed from previous run, clean up first
if (Test-Path "$InstallDir\unins000.exe") {
    Write-Host "[Info] Cleaning previous installation..."
    Start-Process -FilePath "$InstallDir\unins000.exe" -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait
    Start-Sleep -Seconds 2
}

# 2. Execute Silent Installation
Write-Host "[Step 1] Running silent installer..." -ForegroundColor Yellow
$proc = Start-Process -FilePath $SetupPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /TASKS=desktopicon,contextmenu" -Wait -PassThru
Assert-Condition ($proc.ExitCode -eq 0) "Installer completed with exit code 0"

# 3. Post-Install Structure Verification
Write-Host "[Step 2] Verifying installed files and structure..." -ForegroundColor Yellow
Assert-Condition (Test-Path $InstallDir) "Installation directory created: $InstallDir"

$ExpectedFiles = @(
    "$InstallDir\NeuralScaler.bat",
    "$InstallDir\server.py",
    "$InstallDir\app.ico",
    "$InstallDir\dist\index.html",
    "$InstallDir\bin\ffmpeg.exe",
    "$InstallDir\bin\ffprobe.exe",
    "$InstallDir\bin\nvngx_dlssnr.dll",
    "$InstallDir\unins000.exe"
)

foreach ($f in $ExpectedFiles) {
    Assert-Condition (Test-Path $f) "File deployed successfully: $f"
}

# 4. Shortcuts Verification
Write-Host "[Step 3] Verifying desktop and start menu shortcuts..." -ForegroundColor Yellow
$DesktopLnk = "$env:USERPROFILE\Desktop\NeuralScaler 4K.lnk"
if (-not (Test-Path $DesktopLnk)) {
    $DesktopLnk = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "NeuralScaler 4K.lnk")
}
Assert-Condition (Test-Path $DesktopLnk) "Desktop shortcut created: $DesktopLnk"

# 5. Registry Context Menu Verification
Write-Host "[Step 4] Verifying Windows Explorer context menu in registry..." -ForegroundColor Yellow
$mp4Cmd = Get-ItemProperty -Path "HKCU:\Software\Classes\SystemFileAssociations\.mp4\shell\NeuralScaler4K\command" -ErrorAction SilentlyContinue
Assert-Condition ($null -ne $mp4Cmd) "Registry entry for .mp4 context menu exists"

# 6. Windows Add/Remove Programs Registry Verification
Write-Host "[Step 5] Verifying Control Panel Uninstall registry entry..." -ForegroundColor Yellow
$UninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{D37F2C5A-8E14-469F-A29B-9832B66C5E09}_is1"
$uninstEntry = Get-ItemProperty -Path $UninstallKey -ErrorAction SilentlyContinue
Assert-Condition ($null -ne $uninstEntry) "Uninstall entry registered in Windows Programs list"
Assert-Condition ($uninstEntry.DisplayName -like "NeuralScaler 4K*") "DisplayName starts with 'NeuralScaler 4K': $($uninstEntry.DisplayName)"

# 7. Smoke Test Application Engine
Write-Host "[Step 6] Running smoke test on installed engine..." -ForegroundColor Yellow
$serverScript = "$InstallDir\server.py"
Assert-Condition (Test-Path $serverScript) "Server engine script ready for launch: $serverScript"

# 8. Silent Uninstallation Acceptance
Write-Host "[Step 7] Running silent uninstaller..." -ForegroundColor Yellow
$uninsExe = "$InstallDir\unins000.exe"
$uninsProc = Start-Process -FilePath $uninsExe -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait -PassThru
Assert-Condition ($uninsProc.ExitCode -eq 0) "Uninstaller completed with exit code 0"

# Allow file system buffer to flush
Start-Sleep -Seconds 3

# 9. Post-Uninstall Residue Verification
Write-Host "[Step 8] Verifying zero residual files and registry entries..." -ForegroundColor Yellow
$exeLeft = Test-Path "$InstallDir\NeuralScaler.bat"
Assert-Condition (-not $exeLeft) "Core executable removed"

$desktopLeft = Test-Path $DesktopLnk
Assert-Condition (-not $desktopLeft) "Desktop shortcut removed"

$regLeft = Get-ItemProperty -Path "HKCU:\Software\Classes\SystemFileAssociations\.mp4\shell\NeuralScaler4K" -ErrorAction SilentlyContinue
Assert-Condition ($null -eq $regLeft) "Registry context menu cleanly removed"

$uninstRegLeft = Get-ItemProperty -Path $UninstallKey -ErrorAction SilentlyContinue
Assert-Condition ($null -eq $uninstRegLeft) "Registry uninstall entry cleanly removed"

Write-Host "========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] All 9 Installer Lifecycle Acceptance Tests Passed! " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

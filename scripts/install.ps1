# ai-ticulate - one-liner installer for Chrome / Edge / Brave on Windows.
#
# Usage:
#   irm https://raw.githubusercontent.com/korb1nlummis-maker/ai-ticulate/main/scripts/install.ps1 | iex
#
# What it does:
#   1. Looks up the latest GitHub Release.
#   2. Downloads ai-ticulate-chrome-*.zip (~170 KB).
#   3. Extracts it to %LOCALAPPDATA%\ai-ticulate\extension (replacing any
#      previous install).
#   4. Copies that path to your clipboard.
#   5. Opens chrome://extensions (or edge://, brave://) so all you have to do
#      is enable Developer mode → click Load unpacked → paste the path.
#
# Re-run this command anytime to update to a newer release.

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$Repo = 'korb1nlummis-maker/ai-ticulate'
$InstallRoot = Join-Path $env:LOCALAPPDATA 'ai-ticulate'
$ExtDir = Join-Path $InstallRoot 'extension'

Write-Host ''
Write-Host 'ai-ticulate - installer' -ForegroundColor Cyan
Write-Host '------------------------'

# 1. Fetch latest release metadata
Write-Host 'Looking up the latest release...' -NoNewline
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" `
        -UserAgent 'ai-ticulate-installer' -ErrorAction Stop
} catch {
    Write-Host ' failed.' -ForegroundColor Red
    throw "Could not reach GitHub: $($_.Exception.Message)"
}
Write-Host " $($release.tag_name)" -ForegroundColor Green

$asset = $release.assets | Where-Object { $_.name -like 'ai-ticulate-chrome-*.zip' } | Select-Object -First 1
if (-not $asset) {
    throw "Release $($release.tag_name) has no Chrome ZIP asset."
}

# 2. Prepare directories
if (-not (Test-Path $InstallRoot)) {
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
}
$zipPath = Join-Path $InstallRoot 'ai-ticulate.zip'

# 3. Download
$sizeKB = [math]::Round($asset.size / 1024)
Write-Host "Downloading $($asset.name) (${sizeKB} KB)..." -NoNewline
try {
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath `
        -UserAgent 'ai-ticulate-installer' -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Host ' failed.' -ForegroundColor Red
    throw "Download failed: $($_.Exception.Message)"
}
Write-Host ' done.' -ForegroundColor Green

# 4. Replace any previous install with the fresh extract
if (Test-Path $ExtDir) {
    Remove-Item -Recurse -Force $ExtDir
}
Expand-Archive -Path $zipPath -DestinationPath $ExtDir -Force
Remove-Item $zipPath -Force

# 5. Sanity check
if (-not (Test-Path (Join-Path $ExtDir 'manifest.json'))) {
    throw "Extraction looks wrong - missing manifest.json in $ExtDir"
}

# 6. Copy path to clipboard
Set-Clipboard -Value $ExtDir
Write-Host ''
Write-Host 'Installed to:' -ForegroundColor Cyan
Write-Host "  $ExtDir"
Write-Host ''
Write-Host 'Path copied to your clipboard.' -ForegroundColor Green
Write-Host ''
Write-Host 'Final steps in your browser:' -ForegroundColor Cyan
Write-Host '  1. The Extensions page will open in a moment.'
Write-Host '  2. Toggle Developer mode (top right).'
Write-Host '  3. Click Load unpacked.'
Write-Host '  4. Paste the path (Ctrl+L then Ctrl+V) in the folder picker and confirm.'
Write-Host ''

# 7. Try to open extensions page in the first Chromium-family browser we find.
#    Each Chromium-family browser uses its own URL scheme for the extensions page.
$candidates = @(
    @{ Path = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe";              Url = 'chrome://extensions/' },
    @{ Path = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe";       Url = 'chrome://extensions/' },
    @{ Path = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe";              Url = 'chrome://extensions/' },
    @{ Path = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe";             Url = 'edge://extensions/'   },
    @{ Path = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe";      Url = 'edge://extensions/'   },
    @{ Path = "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe"; Url = 'brave://extensions/'  }
)
$opened = $false
foreach ($c in $candidates) {
    if (Test-Path $c.Path) {
        Start-Process -FilePath $c.Path -ArgumentList $c.Url
        $opened = $true
        break
    }
}
if (-not $opened) {
    Write-Host 'No Chrome/Edge/Brave install found in the usual places.' -ForegroundColor Yellow
    Write-Host 'Open chrome://extensions (or edge://, brave://) manually and continue from step 2.'
    Write-Host ''
}

Write-Host 'After loading, open claude.ai / chatgpt.com / gemini.google.com and click the sparkle.' -ForegroundColor Cyan
Write-Host ''

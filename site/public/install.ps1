# Korvid installer — Windows (PowerShell)
# https://korvid.ai

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "korvid" -ForegroundColor Cyan
Write-Host "installer"
Write-Host ""

# ── Check Node.js ──────────────────────────────────────────────

function Test-Node {
    try {
        $version = node -v 2>$null
        if ($version) {
            $major = [int]($version -replace 'v','' -split '\.' | Select-Object -First 1)
            if ($major -ge 18) {
                Write-Host "● node.js $version found" -ForegroundColor Cyan
                return $true
            }
        }
    } catch {}
    return $false
}

function Install-Node {
    Write-Host "● installing node.js..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "● node.js installed" -ForegroundColor Green
}

# ── Check pnpm ─────────────────────────────────────────────────

function Test-Pnpm {
    try {
        $v = pnpm -v 2>$null
        if ($v) {
            Write-Host "● pnpm $v found" -ForegroundColor Cyan
            return $true
        }
    } catch {}
    return $false
}

function Install-Pnpm {
    Write-Host "● installing pnpm..." -ForegroundColor Yellow
    try { corepack enable } catch {}
    npm install -g pnpm
    Write-Host "● pnpm installed" -ForegroundColor Green
}

# ── Install Korvid ─────────────────────────────────────────────

function Install-Korvid {
    Write-Host "● installing korvid cli..." -ForegroundColor Yellow
    npm install -g @korvid/cli
    Write-Host "● korvid cli installed" -ForegroundColor Green
}

# ── Main ───────────────────────────────────────────────────────

if (-not (Test-Node)) { Install-Node }
if (-not (Test-Pnpm)) { Install-Pnpm }
Install-Korvid

Write-Host ""
Write-Host "● done. run 'korvid init' to set up your assistant." -ForegroundColor Green
Write-Host ""

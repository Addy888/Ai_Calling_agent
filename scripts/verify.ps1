# AI Calling Agent - Verification Script
# Verifies the installation and configuration

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         AI CALLING AGENT - VERIFICATION SCRIPT               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Check Node.js
Write-Host "🔍 Checking Node.js..." -NoNewline
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ $nodeVersion" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check npm
Write-Host "🔍 Checking npm..." -NoNewline
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ v$npmVersion" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check .env file
Write-Host "🔍 Checking .env file..." -NoNewline
if (Test-Path ".env") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check node_modules
Write-Host "🔍 Checking root node_modules..." -NoNewline
if (Test-Path "node_modules") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check Prisma node_modules
Write-Host "🔍 Checking Prisma node_modules..." -NoNewline
if (Test-Path "database\prisma\node_modules") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check Prisma Client
Write-Host "🔍 Checking Prisma Client..." -NoNewline
if (Test-Path "node_modules\.prisma\client") {
    Write-Host " ✅ Generated" -ForegroundColor Green
} else {
    Write-Host " ❌ Not generated" -ForegroundColor Red
    $allPassed = $false
}

# Check schema.prisma
Write-Host "🔍 Checking schema.prisma..." -NoNewline
if (Test-Path "database\prisma\schema.prisma") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check seed.ts
Write-Host "🔍 Checking seed.ts..." -NoNewline
if (Test-Path "database\prisma\seed.ts") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check API build
Write-Host "🔍 Checking API build..." -NoNewline
if (Test-Path "apps\api\dist") {
    Write-Host " ✅ Built" -ForegroundColor Green
} else {
    Write-Host " ⚠️  Not built (run: npm run build:api)" -ForegroundColor Yellow
}

# Check auth module
Write-Host "🔍 Checking auth module..." -NoNewline
if (Test-Path "apps\api\src\modules\auth\auth.service.ts") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check guards
Write-Host "🔍 Checking JWT guard..." -NoNewline
if (Test-Path "apps\api\src\common\guards\jwt-auth.guard.ts") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "🔍 Checking Permissions guard..." -NoNewline
if (Test-Path "apps\api\src\common\guards\permissions.guard.ts") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

# Check decorators
Write-Host "🔍 Checking Public decorator..." -NoNewline
if (Test-Path "apps\api\src\common\decorators\public.decorator.ts") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "✅ All checks passed! System is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Start the API server with:" -ForegroundColor White
    Write-Host "npm run dev:api" -ForegroundColor Yellow
} else {
    Write-Host "❌ Some checks failed. Please run setup:" -ForegroundColor Red
    Write-Host ".\scripts\setup.ps1" -ForegroundColor Yellow
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

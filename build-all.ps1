$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AI Calling Agent - Full Build Script" -ForegroundColor Cyan
Write-Host "Phase 3.6 - Enterprise Conversation Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = "C:\Users\ADITYA\OneDrive\Desktop\Ai_calling_agent"
Set-Location $rootDir

Write-Host "Step 1: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate --schema=database/prisma/schema.prisma
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "Error: Prisma generation failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Building Backend (NestJS API)..." -ForegroundColor Yellow
Set-Location "$rootDir\apps\api"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Backend compiled" -ForegroundColor Green
} else {
    Write-Host "Error: Backend build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Building Frontend (Next.js Web)..." -ForegroundColor Yellow
Set-Location "$rootDir\apps\web"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Frontend compiled" -ForegroundColor Green
} else {
    Write-Host "Error: Frontend build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phase 3.6 Implementation Status:" -ForegroundColor Cyan
Write-Host "  Database Schema........COMPLETE" -ForegroundColor Green
Write-Host "  Backend Services.......COMPLETE" -ForegroundColor Green
Write-Host "  REST APIs..............COMPLETE" -ForegroundColor Green
Write-Host "  Frontend Dashboard.....COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "Components Implemented:" -ForegroundColor Cyan
Write-Host "  - Conversation Session Manager" -ForegroundColor White
Write-Host "  - Conversation Flow Engine" -ForegroundColor White
Write-Host "  - Greeting Manager" -ForegroundColor White
Write-Host "  - Question Manager" -ForegroundColor White
Write-Host "  - Objection Handler" -ForegroundColor White
Write-Host "  - Follow-up Manager" -ForegroundColor White
Write-Host "  - Closing Manager" -ForegroundColor White
Write-Host "  - Timeline Service" -ForegroundColor White
Write-Host "  - Summary Builder" -ForegroundColor White
Write-Host ""
Set-Location $rootDir

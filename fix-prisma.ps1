# Fix Prisma Client Generation on Windows
# This script helps resolve file locking issues

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Prisma Client Generation Fix" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any Node processes
Write-Host "Step 1: Stopping Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✓ Node processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Remove .prisma folder
Write-Host "Step 2: Removing existing Prisma client..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Removed .prisma folder" -ForegroundColor Green
} else {
    Write-Host "✓ No existing .prisma folder found" -ForegroundColor Green
}
Write-Host ""

# Step 3: Wait for file system
Write-Host "Step 3: Waiting for file system..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "✓ File system ready" -ForegroundColor Green
Write-Host ""

# Step 4: Generate Prisma client
Write-Host "Step 4: Generating Prisma client..." -ForegroundColor Yellow
Write-Host ""
npx prisma generate --schema=./database/prisma/schema.prisma
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "✓ Prisma client generated successfully!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run backend build: cd apps\api && npm run build" -ForegroundColor White
    Write-Host "2. Run frontend build: cd apps\web && npm run build" -ForegroundColor White
    Write-Host "3. Start backend: cd apps\api && npm run start:dev" -ForegroundColor White
    Write-Host "4. Start frontend: cd apps\web && npm run dev" -ForegroundColor White
} else {
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "✗ Prisma generation failed" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try these steps manually:" -ForegroundColor Yellow
    Write-Host "1. Close Visual Studio Code" -ForegroundColor White
    Write-Host "2. Close all terminals" -ForegroundColor White
    Write-Host "3. Restart your computer" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
}

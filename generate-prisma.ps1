$ErrorActionPreference = "Stop"

Write-Host "Generating Prisma Client..." -ForegroundColor Yellow

try {
    Set-Location "C:\Users\ADITYA\OneDrive\Desktop\Ai_calling_agent"
    
    $processesToStop = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*ts-node*" }
    if ($processesToStop) {
        Write-Host "Stopping Node processes..." -ForegroundColor Yellow
        $processesToStop | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    npx prisma generate --schema=database/prisma/schema.prisma
    
    Write-Host "Prisma Client generated successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

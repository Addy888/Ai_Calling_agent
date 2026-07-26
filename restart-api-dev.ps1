# Restart API Development Server
# This script cleans the build cache and restarts the dev server

Write-Host "🧹 Cleaning build cache..." -ForegroundColor Yellow

# Remove TypeScript build info
Remove-Item -Path "apps\api\tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue
Remove-Item -Path "tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue

# Remove dist folder
Remove-Item -Path "apps\api\dist" -Recurse -Force -ErrorAction SilentlyContinue

# Remove node_modules/.cache (NestJS cache)
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Build cache cleared" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Please restart your dev server manually:" -ForegroundColor Cyan
Write-Host "   npm run dev:api" -ForegroundColor White
Write-Host ""
Write-Host "Or rebuild the project:" -ForegroundColor Cyan
Write-Host "   cd apps/api" -ForegroundColor White
Write-Host "   npm run build" -ForegroundColor White
Write-Host ""

# Script to generate remaining API module directories
$modules = @(
    "users",
    "roles",
    "companies",
    "campaigns",
    "contacts",
    "scripts",
    "prompts",
    "knowledge-base",
    "voice-profiles",
    "calls",
    "analytics",
    "settings"
)

foreach ($module in $modules) {
    $modulePath = "apps\api\src\modules\$module"
    $dtoPath = "$modulePath\dto"
    
    Write-Host "Creating $modulePath..." -ForegroundColor Green
    
    if (!(Test-Path $modulePath)) {
        New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
    }
    
    if (!(Test-Path $dtoPath)) {
        New-Item -ItemType Directory -Path $dtoPath -Force | Out-Null
    }
}

Write-Host "`nAll module directories created successfully!" -ForegroundColor Cyan

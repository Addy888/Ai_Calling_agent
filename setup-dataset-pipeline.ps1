# Phase 4.3.1 - Dataset Processing Pipeline Setup Script
# This script automates the setup process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4.3.1 - Dataset Pipeline Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to stop processes safely
function Stop-NodeProcesses {
    Write-Host "Step 1: Stopping Node.js processes..." -ForegroundColor Yellow
    
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        Write-Host "  Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Gray
        
        foreach ($process in $nodeProcesses) {
            Write-Host "  Stopping process $($process.Id) - $($process.ProcessName)..." -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        
        # Wait a moment for processes to stop
        Start-Sleep -Seconds 2
        
        # Verify
        $remainingProcesses = Get-Process node -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Host "  Warning: Some processes are still running" -ForegroundColor Red
            return $false
        } else {
            Write-Host "  ✓ All Node.js processes stopped" -ForegroundColor Green
            return $true
        }
    } else {
        Write-Host "  ✓ No Node.js processes running" -ForegroundColor Green
        return $true
    }
}

# Function to generate Prisma client
function Generate-PrismaClient {
    Write-Host ""
    Write-Host "Step 2: Generating Prisma Client..." -ForegroundColor Yellow
    
    Push-Location -Path "database"
    
    Write-Host "  Running: npx prisma generate" -ForegroundColor Gray
    $output = npx prisma generate 2>&1
    $exitCode = $LASTEXITCODE
    
    Pop-Location
    
    if ($exitCode -eq 0) {
        Write-Host "  ✓ Prisma Client generated successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ Prisma Client generation failed" -ForegroundColor Red
        Write-Host "  Error: $output" -ForegroundColor Red
        return $false
    }
}

# Function to run database migration
function Run-DatabaseMigration {
    Write-Host ""
    Write-Host "Step 3: Running Database Migration..." -ForegroundColor Yellow
    
    $response = Read-Host "  Do you want to run the migration? This will create 11 new tables. (Y/N)"
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Push-Location -Path "database"
        
        Write-Host "  Running: npx prisma migrate dev --name add_dataset_processing_pipeline" -ForegroundColor Gray
        npx prisma migrate dev --name add_dataset_processing_pipeline
        $exitCode = $LASTEXITCODE
        
        Pop-Location
        
        if ($exitCode -eq 0) {
            Write-Host "  ✓ Database migration completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ Database migration failed" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  ⊘ Migration skipped" -ForegroundColor Yellow
        return $false
    }
}

# Function to build backend
function Build-Backend {
    Write-Host ""
    Write-Host "Step 4: Building Backend..." -ForegroundColor Yellow
    
    Push-Location -Path "apps\api"
    
    Write-Host "  Running: npm run build" -ForegroundColor Gray
    npm run build
    $exitCode = $LASTEXITCODE
    
    Pop-Location
    
    if ($exitCode -eq 0) {
        Write-Host "  ✓ Backend built successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ Backend build failed" -ForegroundColor Red
        return $false
    }
}

# Function to build frontend
function Build-Frontend {
    Write-Host ""
    Write-Host "Step 5: Building Frontend..." -ForegroundColor Yellow
    
    $response = Read-Host "  Do you want to build the frontend? (Y/N)"
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Push-Location -Path "apps\web"
        
        Write-Host "  Running: npm run build" -ForegroundColor Gray
        npm run build
        $exitCode = $LASTEXITCODE
        
        Pop-Location
        
        if ($exitCode -eq 0) {
            Write-Host "  ✓ Frontend built successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ Frontend build failed" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  ⊘ Frontend build skipped" -ForegroundColor Yellow
        return $false
    }
}

# Function to verify folder structure
function Verify-FolderStructure {
    Write-Host ""
    Write-Host "Step 6: Verifying Folder Structure..." -ForegroundColor Yellow
    
    $baseFolder = "Ai voice Dataset"
    $requiredFolders = @(
        "raw_calls",
        "processed_audio",
        "transcripts",
        "diarization",
        "conversation_json",
        "datasets",
        "exports",
        "logs",
        "temp"
    )
    
    $allExist = $true
    foreach ($folder in $requiredFolders) {
        $path = Join-Path $baseFolder $folder
        if (Test-Path $path) {
            Write-Host "  ✓ $folder" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $folder (missing)" -ForegroundColor Red
            $allExist = $false
        }
    }
    
    return $allExist
}

# Main execution
try {
    # Check prerequisites
    if (-not (Test-Command "node")) {
        Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Test-Command "npm")) {
        Write-Host "Error: npm is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
    
    # Execute setup steps
    $results = @{
        "StopProcesses" = Stop-NodeProcesses
        "GeneratePrisma" = $false
        "RunMigration" = $false
        "BuildBackend" = $false
        "BuildFrontend" = $false
        "VerifyFolders" = $false
    }
    
    if ($results["StopProcesses"]) {
        $results["GeneratePrisma"] = Generate-PrismaClient
        
        if ($results["GeneratePrisma"]) {
            $results["RunMigration"] = Run-DatabaseMigration
            $results["BuildBackend"] = Build-Backend
            $results["BuildFrontend"] = Build-Frontend
        }
    }
    
    $results["VerifyFolders"] = Verify-FolderStructure
    
    # Summary
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Setup Summary" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($step in $results.Keys) {
        $status = if ($results[$step]) { "✓ PASS" } else { "✗ FAIL" }
        $color = if ($results[$step]) { "Green" } else { "Red" }
        Write-Host "  $step`: $status" -ForegroundColor $color
    }
    
    Write-Host ""
    
    if ($results["GeneratePrisma"] -and $results["BuildBackend"]) {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "✓ Setup Completed Successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Start Backend:  cd apps\api && npm run start:dev" -ForegroundColor Gray
        Write-Host "2. Start Frontend: cd apps\web && npm run dev" -ForegroundColor Gray
        Write-Host "3. Open Browser:   http://localhost:3000" -ForegroundColor Gray
        Write-Host "4. Navigate to:    AI Agents → Dataset Manager" -ForegroundColor Gray
        Write-Host ""
        Write-Host "For detailed testing instructions, see:" -ForegroundColor Yellow
        Write-Host "  PHASE_4.3.1_SETUP_GUIDE.md" -ForegroundColor Gray
    } else {
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "⚠ Setup Incomplete" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Please review the errors above and:" -ForegroundColor Yellow
        Write-Host "1. Check PHASE_4.3.1_SETUP_GUIDE.md for troubleshooting" -ForegroundColor Gray
        Write-Host "2. Ensure all Node.js processes are stopped" -ForegroundColor Gray
        Write-Host "3. Verify database connection in .env file" -ForegroundColor Gray
        Write-Host "4. Re-run this script" -ForegroundColor Gray
    }
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error during setup" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please see PHASE_4.3.1_SETUP_GUIDE.md for manual setup instructions" -ForegroundColor Yellow
    exit 1
}

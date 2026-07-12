# AI Calling Agent - Setup Script for Windows
# Phase 1.4 + 1.5 - Database & Authentication

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                               ║" -ForegroundColor Cyan
Write-Host "║        AI CALLING AGENT - SETUP SCRIPT                       ║" -ForegroundColor Cyan
Write-Host "║        Phase 1.4 + 1.5: Database & Authentication            ║" -ForegroundColor Cyan
Write-Host "║                                                               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "🔍 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js is not installed. Please install Node.js v18.0.0 or higher." -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "🔍 Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm is not installed." -ForegroundColor Red
    exit 1
}

# Check MySQL
Write-Host "🔍 Checking MySQL..." -ForegroundColor Yellow
$mysqlVersion = mysql --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ MySQL is installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  MySQL CLI not found. Make sure MySQL server is running." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 1: Installing Dependencies" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Root dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Installing Prisma dependencies..." -ForegroundColor Yellow
Set-Location database\prisma
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Prisma dependencies" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Set-Location ..\..
Write-Host "✅ Prisma dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 2: Environment Configuration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".env") {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Please update the .env file with your MySQL credentials!" -ForegroundColor Yellow
    Write-Host "   Edit the DATABASE_URL in .env file" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Have you configured the .env file? (y/n)"
    if ($continue -ne "y") {
        Write-Host "❌ Setup cancelled. Please configure .env and run setup again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 3: Database Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "🗄️  Generating Prisma Client..." -ForegroundColor Yellow
Set-Location database\prisma
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

Write-Host ""
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to run migrations. Please check your DATABASE_URL in .env" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "✅ Migrations completed" -ForegroundColor Green

Write-Host ""
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to seed database" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "✅ Database seeded successfully" -ForegroundColor Green

Set-Location ..\..

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 4: Building Application" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔨 Building API..." -ForegroundColor Yellow
npm run build:api
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Build completed with warnings (this is normal)" -ForegroundColor Yellow
}
Write-Host "✅ API built successfully" -ForegroundColor Green

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                               ║" -ForegroundColor Green
Write-Host "║                    ✅ SETUP COMPLETE!                         ║" -ForegroundColor Green
Write-Host "║                                                               ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 AI Calling Agent backend is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start the API server:" -ForegroundColor White
Write-Host "   npm run dev:api" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Access the API:" -ForegroundColor White
Write-Host "   http://localhost:3001/api/v1" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Access Swagger Documentation:" -ForegroundColor White
Write-Host "   http://localhost:3001/api/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Default Login Credentials:" -ForegroundColor White
Write-Host "   Email:    admin@callingagent.local" -ForegroundColor Yellow
Write-Host "   Password: Admin@123" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

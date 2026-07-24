@echo off
REM AI Calling Agent MVP - Automated Installation Script
REM This script automates the installation process

echo ========================================
echo AI Calling Agent MVP - Installation
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js is installed
node --version
echo.

REM Check if npm is installed
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)
echo [OK] npm is installed
npm --version
echo.

REM Install root dependencies
echo Step 1: Installing root dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo [OK] Root dependencies installed
echo.

REM Install API dependencies
echo Step 2: Installing API dependencies...
cd apps\api
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install API dependencies
    cd ..\..
    pause
    exit /b 1
)

REM Install additional required packages
echo Installing additional packages (twilio, openai, xlsx)...
call npm install twilio openai xlsx
if %errorlevel% neq 0 (
    echo [WARNING] Some packages may have failed to install
)
cd ..\..
echo [OK] API dependencies installed
echo.

REM Install Web dependencies
echo Step 3: Installing Web dependencies...
cd apps\web
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Web dependencies
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo [OK] Web dependencies installed
echo.

REM Create .env file if it doesn't exist
echo Step 4: Setting up environment configuration...
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo [OK] .env file created
    echo.
    echo IMPORTANT: Please edit .env file and add your API keys:
    echo - OPENAI_API_KEY
    echo - ELEVENLABS_API_KEY
    echo - TWILIO_ACCOUNT_SID
    echo - TWILIO_AUTH_TOKEN
    echo - TWILIO_PHONE_NUMBER
    echo - DATABASE_URL
    echo.
) else (
    echo [OK] .env file already exists
)
echo.

REM Create storage directories
echo Step 5: Creating storage directories...
if not exist storage mkdir storage
if not exist storage\recordings mkdir storage\recordings
if not exist storage\transcripts mkdir storage\transcripts
echo [OK] Storage directories created
echo.

REM Generate Prisma Client
echo Step 6: Generating Prisma Client...
call npm run db:generate
if %errorlevel% neq 0 (
    echo [WARNING] Prisma generation had issues
    echo You may need to configure your database first
) else (
    echo [OK] Prisma Client generated
)
echo.

REM Check MySQL connection
echo Step 7: Database Setup...
echo.
echo Please ensure MySQL is running and configured in .env
echo Then run these commands:
echo   npm run db:migrate    (Run database migrations)
echo   npm run db:seed       (Optional: Seed sample data)
echo.

REM Final summary
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Edit .env file and add your API keys
echo 2. Configure MySQL database (if not done)
echo 3. Run: npm run db:migrate
echo 4. Run: npm run dev
echo.
echo For detailed instructions, see:
echo - INSTALL.md (Installation guide)
echo - CALLING_MVP_SETUP.md (Setup and testing)
echo.
echo To start the application now, run:
echo   npm run dev
echo.
echo API will be available at: http://localhost:3001
echo Web will be available at: http://localhost:3000
echo.
echo For Twilio webhooks (local development), run:
echo   ngrok http 3001
echo.
pause

@echo off
REM Quick Start Script for STT Development Environment (Windows)
REM This script sets up and starts the Speech-to-Text engine for development

echo ================================================
echo AI Calling Agent - STT Engine Quick Start
echo ================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed
    echo Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Desktop which includes Docker Compose
    exit /b 1
)

echo [OK] Docker is installed
echo [OK] Docker Compose is installed
echo.

REM Check for .env file
if not exist .env (
    echo [WARNING] .env file not found. Creating from .env.example...
    copy .env.example .env >nul
    echo [OK] Created .env file
    echo.
    echo Please review and update .env file with your configuration
    pause
)

echo ================================================
echo Step 1: Starting Whisper STT Service
echo ================================================
echo.

echo Starting Faster Whisper service (this may take a few minutes on first run)...
docker-compose -f docker-compose.stt.yml up -d whisper-stt

REM Wait for service to be ready
echo.
echo Waiting for Whisper service to be ready...
set max_attempts=30
set attempt=0

:wait_loop
if %attempt% geq %max_attempts% goto timeout

REM Try to connect to health endpoint
curl -s http://localhost:9000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Whisper service is ready!
    goto service_ready
)

set /a attempt+=1
echo|set /p=.
timeout /t 2 /nobreak >nul
goto wait_loop

:timeout
echo.
echo [ERROR] Whisper service failed to start
echo Check logs with: docker-compose -f docker-compose.stt.yml logs whisper-stt
exit /b 1

:service_ready
echo.
echo ================================================
echo Step 2: Testing Whisper Service
echo ================================================
echo.

REM Test health endpoint
echo Health check response:
curl -s http://localhost:9000/health

echo.
echo ================================================
echo Step 3: Starting Redis (Optional)
echo ================================================
echo.

echo Starting Redis for transcript caching...
docker-compose -f docker-compose.stt.yml up -d redis-stt

echo [OK] Redis started

echo.
echo ================================================
echo STT Engine Setup Complete!
echo ================================================
echo.
echo Services running:
echo   - Faster Whisper STT: http://localhost:9000
echo   - Redis: localhost:6380
echo.
echo Next steps:
echo   1. Start your API server: npm run dev:api
echo   2. Test STT endpoint:
echo      curl http://localhost:3001/api/v1/stt/providers
echo.
echo View logs:
echo   docker-compose -f docker-compose.stt.yml logs -f whisper-stt
echo.
echo Stop services:
echo   docker-compose -f docker-compose.stt.yml down
echo.
echo Documentation:
echo   - Implementation Guide: apps\api\src\modules\speech-recognition\IMPLEMENTATION_GUIDE.md
echo   - README: apps\api\src\modules\speech-recognition\README.md
echo   - Deployment: DEPLOYMENT_STT.md
echo.
echo Happy coding!
pause

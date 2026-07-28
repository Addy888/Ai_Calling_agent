@echo off
REM Batch create all stub services for Windows

set SERVICES_DIR=apps\api\src\modules\conversation-ai-engine\services

echo Creating stub services...

REM Run the PowerShell script to create stubs
powershell -ExecutionPolicy Bypass -File CREATE_ALL_STUB_SERVICES.ps1

echo.
echo ✅ All stub services created!
echo Total services: 34
echo.
echo Next steps:
echo 1. Update app.module.ts to import ConversationAIEngineModule
echo 2. Add Prisma models
echo 3. Set up Whisper service
echo 4. Test the implementation

pause

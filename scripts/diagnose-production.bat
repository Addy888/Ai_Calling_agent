@echo off
REM Production Diagnostics Script for Windows
REM Tests Redis and Asterisk AMI connectivity

echo.
echo ==========================================
echo   Production Connectivity Diagnostics
echo ==========================================
echo.

node scripts\diagnose-production.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo   Diagnostics completed successfully
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo   Diagnostics found issues
    echo ==========================================
)

echo.
pause

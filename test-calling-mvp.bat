@echo off
REM AI Calling MVP Test Script for Windows
REM This script tests the complete calling MVP flow

setlocal enabledelayedexpansion

REM Configuration
set API_URL=http://localhost:3001/api/v1
set COMPANY_ID=test-company-id
set USER_ID=test-user-id
set TOKEN=

echo ========================================
echo AI Calling MVP - Test Script (Windows)
echo ========================================
echo.

echo Test Configuration:
echo API URL: %API_URL%
echo Company ID: %COMPANY_ID%
echo User ID: %USER_ID%
echo.

REM Create test script file
echo Creating test files...
(
echo Hello! This is an AI assistant calling on behalf of our company.
echo.
echo I'm reaching out to inform you about our new product launch.
echo.
echo We have some exciting features that might interest you.
echo.
echo Would you like to hear more about our services?
echo.
echo If you're interested, I can schedule a demonstration for you.
echo.
echo Thank you for your time and have a great day!
) > test-script.txt

REM Create test contacts CSV
(
echo firstName,lastName,phone,email,language
echo John,Doe,+1234567890,john@example.com,en
echo Jane,Smith,+1234567891,jane@example.com,en
echo Bob,Johnson,+1234567892,bob@example.com,en
) > test-contacts.csv

echo [OK] Test files created
echo.

REM Step 1: Health Check
echo Step 1: Checking API Health...
curl -s "%API_URL%/calling/health"
echo.
echo [OK] API Health checked
echo.

REM Step 2: Create Campaign
echo Step 2: Creating Campaign...
curl -s -X POST "%API_URL%/campaigns" ^
  -H "Content-Type: application/json" ^
  -d "{\"companyId\":\"%COMPANY_ID%\",\"userId\":\"%USER_ID%\",\"name\":\"Test Campaign\",\"description\":\"Automated test campaign\"}" > campaign-response.json
echo.
echo [OK] Campaign created (see campaign-response.json)
echo.

REM Note: You would need to parse JSON to get campaign ID
REM For full automation, consider using PowerShell or installing jq for Windows

echo Step 3: To upload script:
echo curl -X POST "%API_URL%/campaigns/{CAMPAIGN_ID}/script/upload" -F "file=@test-script.txt"
echo.

echo Step 4: To upload contacts:
echo curl -X POST "%API_URL%/campaigns/{CAMPAIGN_ID}/contacts/upload" -F "file=@test-contacts.csv"
echo.

echo Step 5: To start campaign:
echo curl -X POST "%API_URL%/campaigns/{CAMPAIGN_ID}/start" -H "Content-Type: application/json" -d "{\"concurrentCalls\":2}"
echo.

echo Step 6: To check status:
echo curl "%API_URL%/campaigns/{CAMPAIGN_ID}/status"
echo.

echo Step 7: To get analytics:
echo curl "%API_URL%/campaigns/{CAMPAIGN_ID}/analytics"
echo.

echo ========================================
echo Test files created successfully!
echo ========================================
echo.
echo Files created:
echo - test-script.txt (sample script)
echo - test-contacts.csv (sample contacts)
echo - campaign-response.json (campaign creation response)
echo.
echo Next steps:
echo 1. Check campaign-response.json for the campaign ID
echo 2. Use the campaign ID in the commands above
echo 3. Start the campaign and monitor progress
echo.
echo For better automation on Windows, consider using PowerShell
echo See test-calling-mvp.ps1 for a PowerShell version
echo.

pause

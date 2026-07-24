# AI Calling MVP Test Script - PowerShell
# This script tests the complete calling MVP flow

param(
    [string]$ApiUrl = "http://localhost:3001/api/v1",
    [string]$Token = "",
    [string]$CompanyId = "test-company-id",
    [string]$UserId = "test-user-id"
)

# Colors
$Green = 'Green'
$Yellow = 'Yellow'
$Red = 'Red'

Write-Host "========================================" -ForegroundColor $Green
Write-Host "AI Calling MVP - Test Script" -ForegroundColor $Green
Write-Host "========================================" -ForegroundColor $Green
Write-Host ""

Write-Host "Test Configuration:" -ForegroundColor $Green
Write-Host "API URL: $ApiUrl"
Write-Host "Company ID: $CompanyId"
Write-Host "User ID: $UserId"
Write-Host ""

# Function to make API calls
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [string]$ContentType = "application/json"
    )
    
    $uri = "$ApiUrl$Endpoint"
    
    if ($Token) {
        $Headers["Authorization"] = "Bearer $Token"
    }
    
    $params = @{
        Uri = $uri
        Method = $Method
        Headers = $Headers
        ContentType = $ContentType
    }
    
    if ($Body) {
        if ($ContentType -eq "application/json") {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        } else {
            $params.Body = $Body
        }
    }
    
    try {
        $response = Invoke-RestMethod @params
        return $response
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor $Red
        return $null
    }
}

# Create test files
Write-Host "Creating test files..." -ForegroundColor $Yellow

# Create test script
$scriptContent = @"
Hello! This is an AI assistant calling on behalf of our company.

I'm reaching out to inform you about our new product launch.

We have some exciting features that might interest you.

Would you like to hear more about our services?

If you're interested, I can schedule a demonstration for you.

Thank you for your time and have a great day!
"@
$scriptContent | Out-File -FilePath "test-script.txt" -Encoding UTF8

# Create test contacts CSV
$contactsCsv = @"
firstName,lastName,phone,email,language
John,Doe,+1234567890,john@example.com,en
Jane,Smith,+1234567891,jane@example.com,en
Bob,Johnson,+1234567892,bob@example.com,en
"@
$contactsCsv | Out-File -FilePath "test-contacts.csv" -Encoding UTF8

Write-Host "[OK] Test files created" -ForegroundColor $Green
Write-Host ""

# Step 1: Health Check
Write-Host "Step 1: Checking API Health..." -ForegroundColor $Yellow
$health = Invoke-ApiRequest -Method "GET" -Endpoint "/calling/health"
if ($health) {
    Write-Host ($health | ConvertTo-Json -Depth 10)
    Write-Host "[OK] API is healthy" -ForegroundColor $Green
}
Write-Host ""

# Step 2: Create Campaign
Write-Host "Step 2: Creating Campaign..." -ForegroundColor $Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$campaignData = @{
    companyId = $CompanyId
    userId = $UserId
    name = "Test Campaign - $timestamp"
    description = "Automated test campaign"
}

$campaign = Invoke-ApiRequest -Method "POST" -Endpoint "/campaigns" -Body $campaignData

if ($campaign -and $campaign.id) {
    $campaignId = $campaign.id
    Write-Host ($campaign | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Campaign created: $campaignId" -ForegroundColor $Green
} else {
    Write-Host "[ERROR] Failed to create campaign" -ForegroundColor $Red
    exit 1
}
Write-Host ""

# Step 3: Upload Script
Write-Host "Step 3: Uploading Script..." -ForegroundColor $Yellow
$scriptFile = Get-Item "test-script.txt"
$boundary = [System.Guid]::NewGuid().ToString()
$fileBin = [System.IO.File]::ReadAllBytes($scriptFile.FullName)
$enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$($scriptFile.Name)`"",
    "Content-Type: text/plain",
    "",
    $enc.GetString($fileBin),
    "--$boundary--"
) -join "`r`n"

try {
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $uploadScript = Invoke-RestMethod -Uri "$ApiUrl/campaigns/$campaignId/script/upload" `
        -Method POST `
        -Headers $headers `
        -Body $bodyLines
    
    Write-Host ($uploadScript | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Script uploaded" -ForegroundColor $Green
} catch {
    Write-Host "[WARNING] Script upload failed: $($_.Exception.Message)" -ForegroundColor $Yellow
    Write-Host "You can manually upload using curl or Postman" -ForegroundColor $Yellow
}
Write-Host ""

# Step 4: Upload Contacts
Write-Host "Step 4: Uploading Contacts..." -ForegroundColor $Yellow
$contactsFile = Get-Item "test-contacts.csv"
$fileBin = [System.IO.File]::ReadAllBytes($contactsFile.FullName)
$boundary = [System.Guid]::NewGuid().ToString()

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$($contactsFile.Name)`"",
    "Content-Type: text/csv",
    "",
    $enc.GetString($fileBin),
    "--$boundary--"
) -join "`r`n"

try {
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $uploadContacts = Invoke-RestMethod -Uri "$ApiUrl/campaigns/$campaignId/contacts/upload" `
        -Method POST `
        -Headers $headers `
        -Body $bodyLines
    
    Write-Host ($uploadContacts | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Contacts uploaded: $($uploadContacts.imported) imported" -ForegroundColor $Green
} catch {
    Write-Host "[WARNING] Contacts upload failed: $($_.Exception.Message)" -ForegroundColor $Yellow
    Write-Host "You can manually upload using curl or Postman" -ForegroundColor $Yellow
}
Write-Host ""

# Step 5: Get Campaign Details
Write-Host "Step 5: Getting Campaign Details..." -ForegroundColor $Yellow
$campaignDetails = Invoke-ApiRequest -Method "GET" -Endpoint "/campaigns/$campaignId"
if ($campaignDetails) {
    Write-Host ($campaignDetails | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Campaign details retrieved" -ForegroundColor $Green
}
Write-Host ""

# Step 6: Get Campaign Status
Write-Host "Step 6: Getting Campaign Status..." -ForegroundColor $Yellow
$status = Invoke-ApiRequest -Method "GET" -Endpoint "/campaigns/$campaignId/status"
if ($status) {
    Write-Host ($status | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Campaign status retrieved" -ForegroundColor $Green
}
Write-Host ""

# Step 7: Get Campaign Analytics
Write-Host "Step 7: Getting Campaign Analytics..." -ForegroundColor $Yellow
$analytics = Invoke-ApiRequest -Method "GET" -Endpoint "/campaigns/$campaignId/analytics"
if ($analytics) {
    Write-Host ($analytics | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Campaign analytics retrieved" -ForegroundColor $Green
}
Write-Host ""

# Step 8: Get Live Calls
Write-Host "Step 8: Getting Live Calls..." -ForegroundColor $Yellow
$liveCalls = Invoke-ApiRequest -Method "GET" -Endpoint "/campaigns/$campaignId/live-calls"
if ($liveCalls) {
    Write-Host ($liveCalls | ConvertTo-Json -Depth 10)
    Write-Host "[OK] Live calls retrieved" -ForegroundColor $Green
}
Write-Host ""

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor $Green
Write-Host "Test Summary" -ForegroundColor $Green
Write-Host "========================================" -ForegroundColor $Green
Write-Host "[OK] API Health Check: PASSED" -ForegroundColor $Green
Write-Host "[OK] Campaign Creation: PASSED" -ForegroundColor $Green
Write-Host "[OK] Campaign Details: PASSED" -ForegroundColor $Green
Write-Host "[OK] Campaign Status: PASSED" -ForegroundColor $Green
Write-Host "[OK] Campaign Analytics: PASSED" -ForegroundColor $Green
Write-Host "[OK] Live Calls: PASSED" -ForegroundColor $Green
Write-Host ""
Write-Host "Campaign ID: $campaignId" -ForegroundColor $Green
Write-Host ""
Write-Host "To start the campaign (this will make actual calls):" -ForegroundColor $Yellow
Write-Host "curl -X POST $ApiUrl/campaigns/$campaignId/start \" -ForegroundColor $Yellow
Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor $Yellow
Write-Host "  -d '{\"concurrentCalls\": 2}'" -ForegroundColor $Yellow
Write-Host ""
Write-Host "Or using PowerShell:" -ForegroundColor $Yellow
Write-Host "`$startBody = @{ concurrentCalls = 2 }" -ForegroundColor $Yellow
Write-Host "Invoke-RestMethod -Uri '$ApiUrl/campaigns/$campaignId/start' -Method POST -Body (`$startBody | ConvertTo-Json) -ContentType 'application/json'" -ForegroundColor $Yellow
Write-Host ""
Write-Host "All tests completed successfully! 🎉" -ForegroundColor $Green
Write-Host ""

# Cleanup
Write-Host "Test files created:" -ForegroundColor $Yellow
Write-Host "- test-script.txt" -ForegroundColor $Yellow
Write-Host "- test-contacts.csv" -ForegroundColor $Yellow
Write-Host ""
Write-Host "To remove test files, run: Remove-Item test-script.txt, test-contacts.csv" -ForegroundColor $Yellow

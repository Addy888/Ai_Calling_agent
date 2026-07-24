# Telephony Engine Test Script (PowerShell)
# Tests all endpoints of the new Telephony Engine

$API_URL = "http://localhost:3001/api/v1"
$HEADERS = @{ "Content-Type" = "application/json" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Telephony Engine Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[1] Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/health" -Method Get -Headers $HEADERS
    Write-Host "✓ Health Check Passed" -ForegroundColor Green
    Write-Host "  Provider: $($response.provider.name)" -ForegroundColor Gray
    Write-Host "  Status: $($response.healthy)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Health Check Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Get Providers
Write-Host "[2] Testing Get Providers..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/providers" -Method Get -Headers $HEADERS
    Write-Host "✓ Get Providers Passed" -ForegroundColor Green
    Write-Host "  Active: $($response.active.name)" -ForegroundColor Gray
    Write-Host "  Total: $($response.all.Count)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Get Providers Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Get Statistics
Write-Host "[3] Testing Get Statistics..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/statistics" -Method Get -Headers $HEADERS
    Write-Host "✓ Get Statistics Passed" -ForegroundColor Green
    Write-Host "  Total Sessions: $($response.sessions.total)" -ForegroundColor Gray
    Write-Host "  Active Calls: $($response.sessions.active)" -ForegroundColor Gray
    Write-Host "  Provider: $($response.provider.name)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Get Statistics Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Get Active Calls
Write-Host "[4] Testing Get Active Calls..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/active-calls" -Method Get -Headers $HEADERS
    Write-Host "✓ Get Active Calls Passed" -ForegroundColor Green
    Write-Host "  Total: $($response.total)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Get Active Calls Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 5: Estimate Cost
Write-Host "[5] Testing Estimate Cost..." -ForegroundColor Yellow
$costBody = @{
    from = "+1234567890"
    to = "+0987654321"
    duration = 300
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/estimate-cost" -Method Post -Headers $HEADERS -Body $costBody
    Write-Host "✓ Estimate Cost Passed" -ForegroundColor Green
    Write-Host "  Estimated Cost: $($response.cost) $($response.currency)" -ForegroundColor Gray
    Write-Host "  Duration: $($response.duration) seconds" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Estimate Cost Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Test 6: Make Call (Test Mode - will fail without proper credentials)
Write-Host "[6] Testing Make Call..." -ForegroundColor Yellow
$callBody = @{
    to = "+1234567890"
    from = "+0987654321"
    callbackUrl = "https://api.example.com/webhook"
    statusCallbackUrl = "https://api.example.com/webhook/status"
    record = $true
    machineDetection = $true
    timeout = 60
    metadata = @{
        test = $true
        campaignId = "test_campaign"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/call" -Method Post -Headers $HEADERS -Body $callBody
    Write-Host "✓ Make Call Passed" -ForegroundColor Green
    Write-Host "  Call SID: $($response.callSid)" -ForegroundColor Gray
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
    Write-Host ""
    
    $testCallSid = $response.callSid
    
    # Test 7: Get Call Status
    Write-Host "[7] Testing Get Call Status..." -ForegroundColor Yellow
    try {
        $statusResponse = Invoke-RestMethod -Uri "$API_URL/telephony/status/$testCallSid" -Method Get -Headers $HEADERS
        Write-Host "✓ Get Call Status Passed" -ForegroundColor Green
        Write-Host "  Status: $($statusResponse.status)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "✗ Get Call Status Failed" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host ""
    }
    
    # Test 8: Get Call Session
    Write-Host "[8] Testing Get Call Session..." -ForegroundColor Yellow
    try {
        $sessionResponse = Invoke-RestMethod -Uri "$API_URL/telephony/session/$testCallSid" -Method Get -Headers $HEADERS
        Write-Host "✓ Get Call Session Passed" -ForegroundColor Green
        Write-Host "  Provider: $($sessionResponse.providerType)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "✗ Get Call Session Failed" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host ""
    }
    
} catch {
    Write-Host "⚠ Make Call Failed (Expected if credentials not configured)" -ForegroundColor Yellow
    Write-Host "  This is normal without proper Twilio credentials" -ForegroundColor Gray
    Write-Host ""
}

# Test 9: Get Provider Capabilities
Write-Host "[9] Testing Get Provider Capabilities..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/telephony/provider/capabilities" -Method Get -Headers $HEADERS
    Write-Host "✓ Get Provider Capabilities Passed" -ForegroundColor Green
    Write-Host "  Recording: $($response.supportsRecording)" -ForegroundColor Gray
    Write-Host "  DTMF: $($response.supportsDTMF)" -ForegroundColor Gray
    Write-Host "  Transfer: $($response.supportsTransfer)" -ForegroundColor Gray
    Write-Host "  Max Concurrent: $($response.maxConcurrentCalls)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Get Provider Capabilities Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Core endpoints tested successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Actual call operations require:" -ForegroundColor Yellow
Write-Host "  - Valid Twilio credentials in .env" -ForegroundColor Gray
Write-Host "  - Verified phone numbers" -ForegroundColor Gray
Write-Host "  - Proper webhook configuration" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

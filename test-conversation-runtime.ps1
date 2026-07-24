# Test Conversation Runtime Engine (PowerShell)
# Enterprise AI Calling Agent - Conversation Runtime Testing Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Conversation Runtime Engine Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "http://localhost:3001/api/v1"
$AUTH_TOKEN = $env:TEST_JWT_TOKEN

if (-not $AUTH_TOKEN) {
    Write-Host "Error: TEST_JWT_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host "Please set it with: `$env:TEST_JWT_TOKEN = 'your-token'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $AUTH_TOKEN"
}

# Test Data
$testCallId = "test-call-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$testCampaignId = "campaign-test-123"
$testContactId = "contact-test-456"
$testCompanyId = "company-test-789"
$sessionId = $null

Write-Host "Test Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $API_URL" -ForegroundColor Gray
Write-Host "  Call ID: $testCallId" -ForegroundColor Gray
Write-Host ""

# Test 1: Health Check
Write-Host "[TEST 1] Health Check" -ForegroundColor Green
Write-Host "Testing: GET /conversation-runtime/health" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/health" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "  ✓ Status: " -NoNewline -ForegroundColor Green
    Write-Host $response.healthy -ForegroundColor White
    Write-Host "  ✓ Active Sessions: " -NoNewline -ForegroundColor Green
    Write-Host $response.activeSessions -ForegroundColor White
    Write-Host "  ✓ Timestamp: " -NoNewline -ForegroundColor Green
    Write-Host $response.timestamp -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Start Conversation
Write-Host "[TEST 2] Start Conversation" -ForegroundColor Green
Write-Host "Testing: POST /conversation-runtime/start" -ForegroundColor Gray

$startPayload = @{
    callId = $testCallId
    campaignId = $testCampaignId
    contactId = $testContactId
    companyId = $testCompanyId
    customerPhone = "+1234567890"
    customerName = "John Doe"
    customerLanguage = "en"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/start" `
        -Method POST `
        -Headers $headers `
        -Body $startPayload `
        -ErrorAction Stop

    $sessionId = $response.session.sessionId

    Write-Host "  ✓ Session Created: $sessionId" -ForegroundColor Green
    Write-Host "  ✓ State: " -NoNewline -ForegroundColor Green
    Write-Host $response.session.state -ForegroundColor White
    Write-Host "  ✓ Greeting Generated: " -NoNewline -ForegroundColor Green
    Write-Host ($response.greeting.response.Substring(0, [Math]::Min(50, $response.greeting.response.Length)) + "...") -ForegroundColor White
    Write-Host "  ✓ Greeting Success: " -NoNewline -ForegroundColor Green
    Write-Host $response.greeting.success -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 3: Get Session
Write-Host "[TEST 3] Get Session" -ForegroundColor Green
Write-Host "Testing: GET /conversation-runtime/session/:sessionId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/session/$sessionId" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "  ✓ Session ID: " -NoNewline -ForegroundColor Green
    Write-Host $response.sessionId -ForegroundColor White
    Write-Host "  ✓ Call ID: " -NoNewline -ForegroundColor Green
    Write-Host $response.callId -ForegroundColor White
    Write-Host "  ✓ State: " -NoNewline -ForegroundColor Green
    Write-Host $response.state -ForegroundColor White
    Write-Host "  ✓ Is Active: " -NoNewline -ForegroundColor Green
    Write-Host $response.isActive -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Process Message - Interested
Write-Host "[TEST 4] Process Message - Customer Interested" -ForegroundColor Green
Write-Host "Testing: POST /conversation-runtime/message" -ForegroundColor Gray

$messagePayload = @{
    sessionId = $sessionId
    message = "Yes, I am interested in learning more"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/message" `
        -Method POST `
        -Headers $headers `
        -Body $messagePayload `
        -ErrorAction Stop

    Write-Host "  ✓ Response Generated: " -NoNewline -ForegroundColor Green
    Write-Host ($response.response.Substring(0, [Math]::Min(60, $response.response.Length)) + "...") -ForegroundColor White
    Write-Host "  ✓ Intent: " -NoNewline -ForegroundColor Green
    Write-Host $response.intent -ForegroundColor White
    Write-Host "  ✓ Confidence: " -NoNewline -ForegroundColor Green
    Write-Host $response.confidence -ForegroundColor White
    Write-Host "  ✓ Success: " -NoNewline -ForegroundColor Green
    Write-Host $response.success -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 5: Process Message - Question
Write-Host "[TEST 5] Process Message - Customer Question" -ForegroundColor Green
Write-Host "Testing: POST /conversation-runtime/message" -ForegroundColor Gray

$questionPayload = @{
    sessionId = $sessionId
    message = "Can you tell me more about the pricing?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/message" `
        -Method POST `
        -Headers $headers `
        -Body $questionPayload `
        -ErrorAction Stop

    Write-Host "  ✓ Response Generated: " -NoNewline -ForegroundColor Green
    Write-Host ($response.response.Substring(0, [Math]::Min(60, $response.response.Length)) + "...") -ForegroundColor White
    Write-Host "  ✓ Intent: " -NoNewline -ForegroundColor Green
    Write-Host $response.intent -ForegroundColor White
    Write-Host "  ✓ Success: " -NoNewline -ForegroundColor Green
    Write-Host $response.success -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 6: Get Session State
Write-Host "[TEST 6] Get Session State" -ForegroundColor Green
Write-Host "Testing: GET /conversation-runtime/state/:sessionId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/state/$sessionId" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "  ✓ State: " -NoNewline -ForegroundColor Green
    Write-Host $response.state -ForegroundColor White
    Write-Host "  ✓ Is Active: " -NoNewline -ForegroundColor Green
    Write-Host $response.isActive -ForegroundColor White
    Write-Host "  ✓ Turn Count: " -NoNewline -ForegroundColor Green
    Write-Host $response.turnCount -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 7: Get Statistics
Write-Host "[TEST 7] Get Session Statistics" -ForegroundColor Green
Write-Host "Testing: GET /conversation-runtime/statistics/:sessionId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/statistics/$sessionId" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "  ✓ Duration: " -NoNewline -ForegroundColor Green
    Write-Host "$($response.duration) seconds" -ForegroundColor White
    Write-Host "  ✓ Turn Count: " -NoNewline -ForegroundColor Green
    Write-Host $response.turnCount -ForegroundColor White
    Write-Host "  ✓ Customer Messages: " -NoNewline -ForegroundColor Green
    Write-Host $response.customerMessageCount -ForegroundColor White
    Write-Host "  ✓ AI Messages: " -NoNewline -ForegroundColor Green
    Write-Host $response.aiMessageCount -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 8: Get Active Sessions
Write-Host "[TEST 8] Get Active Sessions" -ForegroundColor Green
Write-Host "Testing: GET /conversation-runtime/sessions/active" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/sessions/active" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "  ✓ Active Sessions: " -NoNewline -ForegroundColor Green
    Write-Host $response.count -ForegroundColor White
    Write-Host "  ✓ Sessions List Length: " -NoNewline -ForegroundColor Green
    Write-Host $response.sessions.Length -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 9: Get Transcript
Write-Host "[TEST 9] Get Transcript" -ForegroundColor Green
Write-Host "Testing: GET /conversation-runtime/transcript/:sessionId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/transcript/$sessionId" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "  ✓ Total Entries: " -NoNewline -ForegroundColor Green
    Write-Host $response.totalEntries -ForegroundColor White
    Write-Host "  ✓ Transcript Length: " -NoNewline -ForegroundColor Green
    Write-Host $response.transcript.Length -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 10: End Conversation
Write-Host "[TEST 10] End Conversation" -ForegroundColor Green
Write-Host "Testing: POST /conversation-runtime/end" -ForegroundColor Gray

$endPayload = @{
    sessionId = $sessionId
    reason = "COMPLETED"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/conversation-runtime/end" `
        -Method POST `
        -Headers $headers `
        -Body $endPayload `
        -ErrorAction Stop

    Write-Host "  ✓ Session Ended" -ForegroundColor Green
    Write-Host "  ✓ State: " -NoNewline -ForegroundColor Green
    Write-Host $response.session.state -ForegroundColor White
    Write-Host "  ✓ Is Active: " -NoNewline -ForegroundColor Green
    Write-Host $response.session.isActive -ForegroundColor White
    
    if ($response.goodbye) {
        Write-Host "  ✓ Goodbye Message: " -NoNewline -ForegroundColor Green
        Write-Host ($response.goodbye.response.Substring(0, [Math]::Min(50, $response.goodbye.response.Length)) + "...") -ForegroundColor White
    }
    Write-Host ""
}
catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Suite Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All conversation runtime tests executed." -ForegroundColor Green
Write-Host "Review the output above for any failures." -ForegroundColor Yellow
Write-Host ""
Write-Host "Session ID used: $sessionId" -ForegroundColor Gray
Write-Host "Call ID used: $testCallId" -ForegroundColor Gray
Write-Host ""

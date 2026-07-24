#!/bin/bash

# Test Conversation Runtime Engine (Bash)
# Enterprise AI Calling Agent - Conversation Runtime Testing Script

echo "========================================"
echo "Conversation Runtime Engine Test Suite"
echo "========================================"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
AUTH_TOKEN="${TEST_JWT_TOKEN}"

if [ -z "$AUTH_TOKEN" ]; then
    echo "Error: TEST_JWT_TOKEN environment variable not set"
    echo "Please set it with: export TEST_JWT_TOKEN='your-token'"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Test Data
TEST_CALL_ID="test-call-$(date +%Y%m%d-%H%M%S)"
TEST_CAMPAIGN_ID="campaign-test-123"
TEST_CONTACT_ID="contact-test-456"
TEST_COMPANY_ID="company-test-789"
SESSION_ID=""

echo -e "${YELLOW}Test Configuration:${NC}"
echo -e "${GRAY}  API URL: $API_URL${NC}"
echo -e "${GRAY}  Call ID: $TEST_CALL_ID${NC}"
echo ""

# Test 1: Health Check
echo -e "${GREEN}[TEST 1] Health Check${NC}"
echo -e "${GRAY}Testing: GET /conversation-runtime/health${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/conversation-runtime/health" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if [ $? -eq 0 ]; then
    HEALTHY=$(echo $RESPONSE | grep -o '"healthy":[^,}]*' | cut -d ':' -f 2)
    ACTIVE_SESSIONS=$(echo $RESPONSE | grep -o '"activeSessions":[^,}]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Status: $HEALTHY${NC}"
    echo -e "  ${GREEN}✓ Active Sessions: $ACTIVE_SESSIONS${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 2: Start Conversation
echo -e "${GREEN}[TEST 2] Start Conversation${NC}"
echo -e "${GRAY}Testing: POST /conversation-runtime/start${NC}"

START_PAYLOAD=$(cat <<EOF
{
  "callId": "$TEST_CALL_ID",
  "campaignId": "$TEST_CAMPAIGN_ID",
  "contactId": "$TEST_CONTACT_ID",
  "companyId": "$TEST_COMPANY_ID",
  "customerPhone": "+1234567890",
  "customerName": "John Doe",
  "customerLanguage": "en"
}
EOF
)

RESPONSE=$(curl -s -X POST "$API_URL/conversation-runtime/start" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$START_PAYLOAD")

if [ $? -eq 0 ]; then
    SESSION_ID=$(echo $RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d '"' -f 4)
    STATE=$(echo $RESPONSE | grep -o '"state":"[^"]*' | cut -d '"' -f 4)
    SUCCESS=$(echo $RESPONSE | grep -o '"success":[^,}]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Session Created: $SESSION_ID${NC}"
    echo -e "  ${GREEN}✓ State: $STATE${NC}"
    echo -e "  ${GREEN}✓ Greeting Success: $SUCCESS${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
    exit 1
fi
echo ""

# Test 3: Get Session
echo -e "${GREEN}[TEST 3] Get Session${NC}"
echo -e "${GRAY}Testing: GET /conversation-runtime/session/:sessionId${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/conversation-runtime/session/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if [ $? -eq 0 ]; then
    CALL_ID=$(echo $RESPONSE | grep -o '"callId":"[^"]*' | cut -d '"' -f 4)
    IS_ACTIVE=$(echo $RESPONSE | grep -o '"isActive":[^,}]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Session ID: $SESSION_ID${NC}"
    echo -e "  ${GREEN}✓ Call ID: $CALL_ID${NC}"
    echo -e "  ${GREEN}✓ Is Active: $IS_ACTIVE${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 4: Process Message - Interested
echo -e "${GREEN}[TEST 4] Process Message - Customer Interested${NC}"
echo -e "${GRAY}Testing: POST /conversation-runtime/message${NC}"

MESSAGE_PAYLOAD=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "message": "Yes, I am interested in learning more"
}
EOF
)

RESPONSE=$(curl -s -X POST "$API_URL/conversation-runtime/message" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$MESSAGE_PAYLOAD")

if [ $? -eq 0 ]; then
    SUCCESS=$(echo $RESPONSE | grep -o '"success":[^,}]*' | cut -d ':' -f 2)
    INTENT=$(echo $RESPONSE | grep -o '"intent":"[^"]*' | cut -d '"' -f 4)
    CONFIDENCE=$(echo $RESPONSE | grep -o '"confidence":[0-9.]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Response Generated${NC}"
    echo -e "  ${GREEN}✓ Intent: $INTENT${NC}"
    echo -e "  ${GREEN}✓ Confidence: $CONFIDENCE${NC}"
    echo -e "  ${GREEN}✓ Success: $SUCCESS${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 5: Process Message - Question
echo -e "${GREEN}[TEST 5] Process Message - Customer Question${NC}"
echo -e "${GRAY}Testing: POST /conversation-runtime/message${NC}"

QUESTION_PAYLOAD=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "message": "Can you tell me more about the pricing?"
}
EOF
)

RESPONSE=$(curl -s -X POST "$API_URL/conversation-runtime/message" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$QUESTION_PAYLOAD")

if [ $? -eq 0 ]; then
    SUCCESS=$(echo $RESPONSE | grep -o '"success":[^,}]*' | cut -d ':' -f 2)
    INTENT=$(echo $RESPONSE | grep -o '"intent":"[^"]*' | cut -d '"' -f 4)
    
    echo -e "  ${GREEN}✓ Response Generated${NC}"
    echo -e "  ${GREEN}✓ Intent: $INTENT${NC}"
    echo -e "  ${GREEN}✓ Success: $SUCCESS${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 6: Get Session State
echo -e "${GREEN}[TEST 6] Get Session State${NC}"
echo -e "${GRAY}Testing: GET /conversation-runtime/state/:sessionId${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/conversation-runtime/state/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if [ $? -eq 0 ]; then
    STATE=$(echo $RESPONSE | grep -o '"state":"[^"]*' | cut -d '"' -f 4)
    IS_ACTIVE=$(echo $RESPONSE | grep -o '"isActive":[^,}]*' | cut -d ':' -f 2)
    TURN_COUNT=$(echo $RESPONSE | grep -o '"turnCount":[0-9]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ State: $STATE${NC}"
    echo -e "  ${GREEN}✓ Is Active: $IS_ACTIVE${NC}"
    echo -e "  ${GREEN}✓ Turn Count: $TURN_COUNT${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 7: Get Statistics
echo -e "${GREEN}[TEST 7] Get Session Statistics${NC}"
echo -e "${GRAY}Testing: GET /conversation-runtime/statistics/:sessionId${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/conversation-runtime/statistics/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if [ $? -eq 0 ]; then
    DURATION=$(echo $RESPONSE | grep -o '"duration":[0-9]*' | cut -d ':' -f 2)
    TURN_COUNT=$(echo $RESPONSE | grep -o '"turnCount":[0-9]*' | cut -d ':' -f 2)
    CUSTOMER_COUNT=$(echo $RESPONSE | grep -o '"customerMessageCount":[0-9]*' | cut -d ':' -f 2)
    AI_COUNT=$(echo $RESPONSE | grep -o '"aiMessageCount":[0-9]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Duration: ${DURATION}s${NC}"
    echo -e "  ${GREEN}✓ Turn Count: $TURN_COUNT${NC}"
    echo -e "  ${GREEN}✓ Customer Messages: $CUSTOMER_COUNT${NC}"
    echo -e "  ${GREEN}✓ AI Messages: $AI_COUNT${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 8: Get Active Sessions
echo -e "${GREEN}[TEST 8] Get Active Sessions${NC}"
echo -e "${GRAY}Testing: GET /conversation-runtime/sessions/active${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/conversation-runtime/sessions/active" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if [ $? -eq 0 ]; then
    COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Active Sessions: $COUNT${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 9: Get Transcript
echo -e "${GREEN}[TEST 9] Get Transcript${NC}"
echo -e "${GRAY}Testing: GET /conversation-runtime/transcript/:sessionId${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/conversation-runtime/transcript/$SESSION_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if [ $? -eq 0 ]; then
    TOTAL_ENTRIES=$(echo $RESPONSE | grep -o '"totalEntries":[0-9]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Total Entries: $TOTAL_ENTRIES${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Test 10: End Conversation
echo -e "${GREEN}[TEST 10] End Conversation${NC}"
echo -e "${GRAY}Testing: POST /conversation-runtime/end${NC}"

END_PAYLOAD=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "reason": "COMPLETED"
}
EOF
)

RESPONSE=$(curl -s -X POST "$API_URL/conversation-runtime/end" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$END_PAYLOAD")

if [ $? -eq 0 ]; then
    STATE=$(echo $RESPONSE | grep -o '"state":"[^"]*' | cut -d '"' -f 4)
    IS_ACTIVE=$(echo $RESPONSE | grep -o '"isActive":[^,}]*' | cut -d ':' -f 2)
    
    echo -e "  ${GREEN}✓ Session Ended${NC}"
    echo -e "  ${GREEN}✓ State: $STATE${NC}"
    echo -e "  ${GREEN}✓ Is Active: $IS_ACTIVE${NC}"
else
    echo -e "  ${RED}✗ FAILED${NC}"
fi
echo ""

# Summary
echo "========================================"
echo "Test Suite Complete"
echo "========================================"
echo ""
echo -e "${GREEN}All conversation runtime tests executed.${NC}"
echo -e "${YELLOW}Review the output above for any failures.${NC}"
echo ""
echo -e "${GRAY}Session ID used: $SESSION_ID${NC}"
echo -e "${GRAY}Call ID used: $TEST_CALL_ID${NC}"
echo ""

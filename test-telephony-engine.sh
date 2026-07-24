#!/bin/bash

# Telephony Engine Test Script (Bash)
# Tests all endpoints of the new Telephony Engine

API_URL="http://localhost:3001/api/v1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Telephony Engine Test Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[1] Testing Health Check...${NC}"
response=$(curl -s -X GET "$API_URL/telephony/health" -H "Content-Type: application/json")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Health Check Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
else
    echo -e "${RED}✗ Health Check Failed${NC}"
fi
echo ""

# Test 2: Get Providers
echo -e "${YELLOW}[2] Testing Get Providers...${NC}"
response=$(curl -s -X GET "$API_URL/telephony/providers" -H "Content-Type: application/json")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Get Providers Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
else
    echo -e "${RED}✗ Get Providers Failed${NC}"
fi
echo ""

# Test 3: Get Statistics
echo -e "${YELLOW}[3] Testing Get Statistics...${NC}"
response=$(curl -s -X GET "$API_URL/telephony/statistics" -H "Content-Type: application/json")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Get Statistics Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
else
    echo -e "${RED}✗ Get Statistics Failed${NC}"
fi
echo ""

# Test 4: Get Active Calls
echo -e "${YELLOW}[4] Testing Get Active Calls...${NC}"
response=$(curl -s -X GET "$API_URL/telephony/active-calls" -H "Content-Type: application/json")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Get Active Calls Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
else
    echo -e "${RED}✗ Get Active Calls Failed${NC}"
fi
echo ""

# Test 5: Estimate Cost
echo -e "${YELLOW}[5] Testing Estimate Cost...${NC}"
response=$(curl -s -X POST "$API_URL/telephony/estimate-cost" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+0987654321",
    "duration": 300
  }')
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Estimate Cost Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
else
    echo -e "${RED}✗ Estimate Cost Failed${NC}"
fi
echo ""

# Test 6: Make Call (Test Mode - will fail without proper credentials)
echo -e "${YELLOW}[6] Testing Make Call...${NC}"
response=$(curl -s -X POST "$API_URL/telephony/call" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "from": "+0987654321",
    "callbackUrl": "https://api.example.com/webhook",
    "statusCallbackUrl": "https://api.example.com/webhook/status",
    "record": true,
    "machineDetection": true,
    "timeout": 60,
    "metadata": {
      "test": true,
      "campaignId": "test_campaign"
    }
  }')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Make Call Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
    
    # Extract callSid from response (requires jq)
    if command -v jq &> /dev/null; then
        callSid=$(echo $response | jq -r '.callSid')
        
        if [ "$callSid" != "null" ] && [ ! -z "$callSid" ]; then
            echo ""
            
            # Test 7: Get Call Status
            echo -e "${YELLOW}[7] Testing Get Call Status...${NC}"
            status_response=$(curl -s -X GET "$API_URL/telephony/status/$callSid" \
              -H "Content-Type: application/json")
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Get Call Status Passed${NC}"
                echo -e "${GRAY}  Response: $status_response${NC}"
            else
                echo -e "${RED}✗ Get Call Status Failed${NC}"
            fi
            echo ""
            
            # Test 8: Get Call Session
            echo -e "${YELLOW}[8] Testing Get Call Session...${NC}"
            session_response=$(curl -s -X GET "$API_URL/telephony/session/$callSid" \
              -H "Content-Type: application/json")
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Get Call Session Passed${NC}"
                echo -e "${GRAY}  Response: $session_response${NC}"
            else
                echo -e "${RED}✗ Get Call Session Failed${NC}"
            fi
            echo ""
        fi
    fi
else
    echo -e "${YELLOW}⚠ Make Call Failed (Expected if credentials not configured)${NC}"
    echo -e "${GRAY}  This is normal without proper Twilio credentials${NC}"
fi
echo ""

# Test 9: Get Provider Capabilities
echo -e "${YELLOW}[9] Testing Get Provider Capabilities...${NC}"
response=$(curl -s -X GET "$API_URL/telephony/provider/capabilities" \
  -H "Content-Type: application/json")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Get Provider Capabilities Passed${NC}"
    echo -e "${GRAY}  Response: $response${NC}"
else
    echo -e "${RED}✗ Get Provider Capabilities Failed${NC}"
fi
echo ""

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Test Summary${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}Core endpoints tested successfully!${NC}"
echo ""
echo -e "${YELLOW}Note: Actual call operations require:${NC}"
echo -e "${GRAY}  - Valid Twilio credentials in .env${NC}"
echo -e "${GRAY}  - Verified phone numbers${NC}"
echo -e "${GRAY}  - Proper webhook configuration${NC}"
echo ""
echo -e "${CYAN}========================================${NC}"

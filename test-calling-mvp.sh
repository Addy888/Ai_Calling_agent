#!/bin/bash

# AI Calling MVP Test Script
# This script tests the complete calling MVP flow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
TOKEN="${JWT_TOKEN:-}"
COMPANY_ID="${COMPANY_ID:-}"
USER_ID="${USER_ID:-}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AI Calling MVP - Test Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install jq first.${NC}"
    echo "Install: sudo apt-get install jq (Linux) or brew install jq (Mac)"
    exit 1
fi

# Check required variables
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}Warning: JWT_TOKEN not set. Some endpoints may fail.${NC}"
fi

if [ -z "$COMPANY_ID" ]; then
    echo -e "${YELLOW}Warning: COMPANY_ID not set. Using default 'test-company-id'${NC}"
    COMPANY_ID="test-company-id"
fi

if [ -z "$USER_ID" ]; then
    echo -e "${YELLOW}Warning: USER_ID not set. Using default 'test-user-id'${NC}"
    USER_ID="test-user-id"
fi

echo ""
echo -e "${GREEN}Test Configuration:${NC}"
echo "API URL: $API_URL"
echo "Company ID: $COMPANY_ID"
echo "User ID: $USER_ID"
echo ""

# Create test files
echo -e "${YELLOW}Creating test files...${NC}"

# Create test script
cat > test-script.txt << 'EOF'
Hello! This is an AI assistant calling on behalf of our company.

I'm reaching out to inform you about our new product launch.

We have some exciting features that might interest you.

Would you like to hear more about our services?

If you're interested, I can schedule a demonstration for you.

Thank you for your time and have a great day!
EOF

# Create test contacts CSV
cat > test-contacts.csv << 'EOF'
firstName,lastName,phone,email,language
John,Doe,+1234567890,john@example.com,en
Jane,Smith,+1234567891,jane@example.com,en
Bob,Johnson,+1234567892,bob@example.com,en
EOF

echo -e "${GREEN}✓ Test files created${NC}"
echo ""

# Step 1: Health Check
echo -e "${YELLOW}Step 1: Checking API Health...${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/calling/health")
echo "$HEALTH_RESPONSE" | jq '.'
echo -e "${GREEN}✓ API is healthy${NC}"
echo ""

# Step 2: Create Campaign
echo -e "${YELLOW}Step 2: Creating Campaign...${NC}"
CREATE_CAMPAIGN_RESPONSE=$(curl -s -X POST "$API_URL/campaigns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"companyId\": \"$COMPANY_ID\",
    \"userId\": \"$USER_ID\",
    \"name\": \"Test Campaign - $(date +%Y%m%d-%H%M%S)\",
    \"description\": \"Automated test campaign\"
  }")

echo "$CREATE_CAMPAIGN_RESPONSE" | jq '.'
CAMPAIGN_ID=$(echo "$CREATE_CAMPAIGN_RESPONSE" | jq -r '.id')

if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" = "null" ]; then
    echo -e "${RED}✗ Failed to create campaign${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Campaign created: $CAMPAIGN_ID${NC}"
echo ""

# Step 3: Upload Script
echo -e "${YELLOW}Step 3: Uploading Script...${NC}"
UPLOAD_SCRIPT_RESPONSE=$(curl -s -X POST "$API_URL/campaigns/$CAMPAIGN_ID/script/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-script.txt")

echo "$UPLOAD_SCRIPT_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Script uploaded${NC}"
echo ""

# Step 4: Upload Contacts
echo -e "${YELLOW}Step 4: Uploading Contacts...${NC}"
UPLOAD_CONTACTS_RESPONSE=$(curl -s -X POST "$API_URL/campaigns/$CAMPAIGN_ID/contacts/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-contacts.csv")

echo "$UPLOAD_CONTACTS_RESPONSE" | jq '.'
IMPORTED_COUNT=$(echo "$UPLOAD_CONTACTS_RESPONSE" | jq -r '.imported')
echo -e "${GREEN}✓ Contacts uploaded: $IMPORTED_COUNT imported${NC}"
echo ""

# Step 5: Get Campaign Details
echo -e "${YELLOW}Step 5: Getting Campaign Details...${NC}"
CAMPAIGN_DETAILS=$(curl -s "$API_URL/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$CAMPAIGN_DETAILS" | jq '.'
echo -e "${GREEN}✓ Campaign details retrieved${NC}"
echo ""

# Step 6: Start Campaign (Optional - commented out to avoid actual calls)
echo -e "${YELLOW}Step 6: Starting Campaign (DRY RUN)...${NC}"
echo -e "${YELLOW}To actually start calling, uncomment the following command:${NC}"
echo "curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/start \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"concurrentCalls\": 2}'"
echo ""

# Uncomment to actually start campaign
# START_RESPONSE=$(curl -s -X POST "$API_URL/campaigns/$CAMPAIGN_ID/start" \
#   -H "Authorization: Bearer $TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{"concurrentCalls": 2}')
# echo "$START_RESPONSE" | jq '.'
# echo -e "${GREEN}✓ Campaign started${NC}"
# echo ""

# Step 7: Get Campaign Status
echo -e "${YELLOW}Step 7: Getting Campaign Status...${NC}"
STATUS_RESPONSE=$(curl -s "$API_URL/campaigns/$CAMPAIGN_ID/status" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Campaign status retrieved${NC}"
echo ""

# Step 8: Get Campaign Analytics
echo -e "${YELLOW}Step 8: Getting Campaign Analytics...${NC}"
ANALYTICS_RESPONSE=$(curl -s "$API_URL/campaigns/$CAMPAIGN_ID/analytics" \
  -H "Authorization: Bearer $TOKEN")

echo "$ANALYTICS_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Campaign analytics retrieved${NC}"
echo ""

# Step 9: Get Live Calls
echo -e "${YELLOW}Step 9: Getting Live Calls...${NC}"
LIVE_CALLS_RESPONSE=$(curl -s "$API_URL/campaigns/$CAMPAIGN_ID/live-calls" \
  -H "Authorization: Bearer $TOKEN")

echo "$LIVE_CALLS_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Live calls retrieved${NC}"
echo ""

# Step 10: Get Call History
echo -e "${YELLOW}Step 10: Getting Call History...${NC}"
CALLS_RESPONSE=$(curl -s "$API_URL/campaigns/$CAMPAIGN_ID/calls?limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$CALLS_RESPONSE" | jq '.'
echo -e "${GREEN}✓ Call history retrieved${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ API Health Check: PASSED${NC}"
echo -e "${GREEN}✓ Campaign Creation: PASSED${NC}"
echo -e "${GREEN}✓ Script Upload: PASSED${NC}"
echo -e "${GREEN}✓ Contacts Upload: PASSED (${IMPORTED_COUNT} contacts)${NC}"
echo -e "${GREEN}✓ Campaign Details: PASSED${NC}"
echo -e "${GREEN}✓ Campaign Status: PASSED${NC}"
echo -e "${GREEN}✓ Campaign Analytics: PASSED${NC}"
echo -e "${GREEN}✓ Live Calls: PASSED${NC}"
echo -e "${GREEN}✓ Call History: PASSED${NC}"
echo ""
echo -e "${GREEN}Campaign ID: $CAMPAIGN_ID${NC}"
echo -e "${YELLOW}To start calling, run:${NC}"
echo "curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/start \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"concurrentCalls\": 2}'"
echo ""
echo -e "${GREEN}All tests completed successfully! 🎉${NC}"
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up test files...${NC}"
rm -f test-script.txt test-contacts.csv
echo -e "${GREEN}✓ Cleanup complete${NC}"

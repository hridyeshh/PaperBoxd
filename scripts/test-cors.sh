#!/bin/bash

# CORS Testing Script for Capacitor iOS App
# Tests both preflight (OPTIONS) and actual requests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to production
API_URL="${1:-https://paperboxd.in}"

echo -e "${YELLOW}Testing CORS for Capacitor iOS app${NC}"
echo -e "${YELLOW}API URL: ${API_URL}${NC}"
echo ""

# Test 1: OPTIONS request (preflight) to /api/books/sphere
echo -e "${YELLOW}Test 1: OPTIONS preflight to /api/books/sphere${NC}"
echo "---"

RESPONSE=$(curl -s -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -w "\nHTTP_CODE:%{http_code}" \
  -o /dev/null \
  "${API_URL}/api/books/sphere")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Preflight request successful (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Preflight request failed (HTTP $HTTP_CODE)${NC}"
    echo -e "${RED}  Expected: 204 or 200${NC}"
    echo -e "${RED}  Got: $HTTP_CODE${NC}"
    exit 1
fi

# Get headers
HEADERS=$(curl -s -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -i \
  "${API_URL}/api/books/sphere" 2>&1)

# Check for CORS headers
if echo "$HEADERS" | grep -qi "access-control-allow-origin: capacitor://localhost"; then
    echo -e "${GREEN}✓ CORS header 'Access-Control-Allow-Origin' present${NC}"
else
    echo -e "${RED}✗ CORS header 'Access-Control-Allow-Origin' missing${NC}"
    exit 1
fi

if echo "$HEADERS" | grep -qi "access-control-allow-credentials: true"; then
    echo -e "${GREEN}✓ CORS header 'Access-Control-Allow-Credentials' present${NC}"
else
    echo -e "${RED}✗ CORS header 'Access-Control-Allow-Credentials' missing${NC}"
fi

echo ""

# Test 2: Actual GET request
echo -e "${YELLOW}Test 2: GET request to /api/books/sphere${NC}"
echo "---"

GET_RESPONSE=$(curl -s -X GET \
  -H "Origin: capacitor://localhost" \
  -w "\nHTTP_CODE:%{http_code}" \
  "${API_URL}/api/books/sphere?limit=5")

GET_HTTP_CODE=$(echo "$GET_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$GET_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ GET request successful (HTTP $GET_HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ GET request failed (HTTP $GET_HTTP_CODE)${NC}"
    exit 1
fi

# Check response has data
if echo "$GET_RESPONSE" | grep -q "books"; then
    echo -e "${GREEN}✓ Response contains data${NC}"
else
    echo -e "${RED}✗ Response does not contain expected data${NC}"
fi

echo ""

# Test 3: OPTIONS to token login endpoint
echo -e "${YELLOW}Test 3: OPTIONS preflight to /api/auth/token/login${NC}"
echo "---"

LOGIN_RESPONSE=$(curl -s -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -w "\nHTTP_CODE:%{http_code}" \
  -o /dev/null \
  "${API_URL}/api/auth/token/login")

LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

if [ "$LOGIN_HTTP_CODE" = "204" ] || [ "$LOGIN_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Login endpoint preflight successful (HTTP $LOGIN_HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Login endpoint preflight failed (HTTP $LOGIN_HTTP_CODE)${NC}"
    exit 1
fi

echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All CORS tests passed! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Rebuild iOS app: npm run build:capacitor"
echo "2. Open in Xcode: npx cap open ios"
echo "3. Test authentication in the app"

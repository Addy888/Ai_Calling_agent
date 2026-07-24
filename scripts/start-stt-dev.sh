#!/bin/bash

# Quick Start Script for STT Development Environment
# This script sets up and starts the Speech-to-Text engine for development

set -e

echo "================================================"
echo "AI Calling Agent - STT Engine Quick Start"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"
echo -e "${GREEN}✓${NC} Docker Compose is installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠${NC} .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file"
    echo ""
    echo -e "${YELLOW}Please review and update .env file with your configuration${NC}"
    echo "Press Enter to continue..."
    read
fi

echo "================================================"
echo "Step 1: Starting Whisper STT Service"
echo "================================================"
echo ""

# Start Whisper service using Docker Compose
echo "Starting Faster Whisper service (this may take a few minutes on first run)..."
docker-compose -f docker-compose.stt.yml up -d whisper-stt

# Wait for service to be ready
echo ""
echo "Waiting for Whisper service to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:9000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Whisper service is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo -e "${RED}Error: Whisper service failed to start${NC}"
    echo "Check logs with: docker-compose -f docker-compose.stt.yml logs whisper-stt"
    exit 1
fi

echo ""
echo "================================================"
echo "Step 2: Testing Whisper Service"
echo "================================================"
echo ""

# Test health endpoint
health_response=$(curl -s http://localhost:9000/health)
echo "Health check response:"
echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"

echo ""
echo "================================================"
echo "Step 3: Starting Redis (Optional)"
echo "================================================"
echo ""

echo "Starting Redis for transcript caching..."
docker-compose -f docker-compose.stt.yml up -d redis-stt

echo -e "${GREEN}✓${NC} Redis started"

echo ""
echo "================================================"
echo "🎉 STT Engine Setup Complete!"
echo "================================================"
echo ""
echo "Services running:"
echo "  • Faster Whisper STT: http://localhost:9000"
echo "  • Redis: localhost:6380"
echo ""
echo "Next steps:"
echo "  1. Start your API server: npm run dev:api"
echo "  2. Test STT endpoint:"
echo "     curl http://localhost:3001/api/v1/stt/providers"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.stt.yml logs -f whisper-stt"
echo ""
echo "Stop services:"
echo "  docker-compose -f docker-compose.stt.yml down"
echo ""
echo "Documentation:"
echo "  • Implementation Guide: apps/api/src/modules/speech-recognition/IMPLEMENTATION_GUIDE.md"
echo "  • README: apps/api/src/modules/speech-recognition/README.md"
echo "  • Deployment: DEPLOYMENT_STT.md"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"

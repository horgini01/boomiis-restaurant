#!/bin/bash

# ============================================
# Docker Build Test Script
# Tests the Dockerfile locally before deploying to Railway
# ============================================

set -e  # Exit on error

echo "======================================"
echo "RestaurantPro Docker Build Test"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✓ Docker is installed"
echo ""

# Build the Docker image
echo "Building Docker image..."
echo "This may take 5-10 minutes on first build"
echo ""

docker build -t restaurantpro:test .

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Docker image built successfully!"
    echo ""
    echo "======================================"
    echo "Build Information"
    echo "======================================"
    docker images restaurantpro:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo "======================================"
    echo "Next Steps"
    echo "======================================"
    echo ""
    echo "To run the container locally:"
    echo "  docker run -p 3000:3000 --env-file .env restaurantpro:test"
    echo ""
    echo "To test the health endpoint:"
    echo "  curl http://localhost:3000/api/health"
    echo ""
    echo "To view container logs:"
    echo "  docker logs <container-id>"
    echo ""
    echo "To stop the container:"
    echo "  docker stop <container-id>"
    echo ""
    echo "To remove the test image:"
    echo "  docker rmi restaurantpro:test"
    echo ""
else
    echo ""
    echo "❌ Docker build failed"
    echo "Please check the error messages above"
    exit 1
fi

#!/bin/bash

echo "Starting 2048 Game Services..."
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Start all services
echo "Starting Docker containers..."
docker-compose up -d

echo ""
echo "================================"
echo "Services started successfully!"
echo "================================"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:8080"
echo "PostgreSQL: localhost:5432"
echo "Redis: localhost:6379"
echo ""
echo "Use 'docker-compose down' to stop all services"
echo "Use 'docker-compose logs -f' to view logs"
echo "================================"
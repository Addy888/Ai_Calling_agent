#!/bin/bash

# Run tests

echo "Running tests..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run pytest with coverage
pytest --cov=app --cov-report=html --cov-report=term -v

echo "Tests complete!"
echo "Coverage report: htmlcov/index.html"

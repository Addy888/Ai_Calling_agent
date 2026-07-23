#!/bin/bash

# Setup Training Engine

echo "Setting up AI Training Engine..."

# Check Python version
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit .env with your configuration"
fi

# Create required directories
echo "Creating directories..."
mkdir -p data/training
mkdir -p data/models
mkdir -p data/checkpoints
mkdir -p logs

echo "Setup complete!"
echo "To start the server, run: python main.py"

#!/bin/bash

# Start Training Engine in development mode

echo "Starting AI Training Engine..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start server with auto-reload
python main.py

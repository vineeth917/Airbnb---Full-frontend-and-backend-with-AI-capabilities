#!/bin/bash

echo "🚀 Starting AI Service..."

# Get the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to ai-service directory
cd "${PROJECT_DIR}/ai-service"

# Start the AI service (Python path is handled in main.py)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload


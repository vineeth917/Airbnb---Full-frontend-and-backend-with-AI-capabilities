#!/bin/bash

echo "🚀 Starting Frontend..."

# Get the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to frontend directory
cd "${PROJECT_DIR}/frontend"

# Start the frontend
npm run dev


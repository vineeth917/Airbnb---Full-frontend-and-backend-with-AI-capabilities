#!/bin/bash

echo "🚀 Starting Backend Server..."

# Get the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to backend directory
cd "${PROJECT_DIR}/backend"

# Start the backend server
npm run dev


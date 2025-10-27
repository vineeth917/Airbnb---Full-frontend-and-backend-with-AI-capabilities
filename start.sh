#!/bin/bash

echo "🚀 Starting Airbnb Lab Application..."

# Kill any existing processes on ports 3000, 5001, 8000
echo "🔄 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Get the absolute path of the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create .env files if they don't exist
echo "📝 Setting up environment files..."

# Backend .env
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
PORT=5001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=airbnb_lab
DB_USER=root
DB_PASSWORD=pass1234
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
SESSION_SECRET=your-session-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=16777216
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_SERVICE_URL=http://localhost:8000
EOF
    echo "✅ Created backend/.env"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:5001/api
VITE_AI_SERVICE_URL=http://localhost:8000
EOF
    echo "✅ Created frontend/.env"
fi

# AI Service .env
if [ ! -f "ai-service/.env" ]; then
    cat > ai-service/.env << EOF
PYTHONPATH=${PROJECT_DIR}/ai-service
EOF
    echo "✅ Created ai-service/.env"
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Backend
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Frontend
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# AI Service
echo "Installing AI service dependencies..."
cd ai-service
pip3 install -r requirements.txt
cd ..

echo "✅ All dependencies installed!"

echo ""
echo "🎉 Setup complete! To start the application:"
echo ""
echo "1. Start Backend (Terminal 1):"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start Frontend (Terminal 2):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Start AI Service (Terminal 3):"
echo "   cd ai-service && PYTHONPATH=${PROJECT_DIR}/ai-service python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "🌐 Access Points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5001"
echo "   API Docs: http://localhost:5001/api-docs"
echo "   AI Service: http://localhost:8000"
echo "   AI Docs: http://localhost:8000/docs"
echo ""
echo "🔑 Login Credentials:"
echo "   Traveler: traveler@airbnb.com / traveler123"
echo "   Host: host@airbnb.com / host123"
echo ""

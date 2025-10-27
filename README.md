# Airbnb Lab - Full Stack Application

A complete Airbnb-like application built with Node.js + Express.js backend, React frontend, and Python FastAPI AI service.

## 🏗️ Architecture

```
airbnb-lab/
├── backend/          # Node.js + Express.js API
├── frontend/         # React + Vite + TailwindCSS
├── ai-service/       # Python FastAPI AI service
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- Python 3.8+
- MySQL 8.0+

### Option 1: Use Individual Startup Scripts (Recommended)

Open **3 separate terminals** and run:

**Terminal 1 - Backend:**
```bash
./start-backend.sh
```

**Terminal 2 - Frontend:**
```bash
./start-frontend.sh
```

**Terminal 3 - AI Service:**
```bash
./start-ai.sh
```

### Option 2: Manual Setup

#### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

#### 3. AI Service Setup

```bash
cd ai-service
pip install -r requirements.txt
PYTHONPATH=$(pwd) python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

- **Backend API**: http://localhost:5001/api-docs
- **AI Service**: http://localhost:8000/docs

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=airbnb_lab
DB_USER=root
DB_PASSWORD=pass1234
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001/api
VITE_AI_SERVICE_URL=http://localhost:8000
```

### AI Service (.env)
```
PYTHONPATH=/path/to/your/project/ai-service
```

## 🎯 Features

### ✅ Implemented
- User Authentication (JWT + Sessions)
- Property Management (CRUD)
- Booking System
- Favorites System
- User Preferences
- Availability Management
- Analytics Dashboard
- AI Travel Assistant
- Responsive Design
- API Documentation

### 🔄 In Progress
- Advanced Search & Filtering
- Payment Integration
- Real-time Notifications
- Image Upload
- Advanced Analytics

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL + Sequelize ORM
- **Authentication**: JWT + Express Sessions
- **Validation**: Express Validator
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

### AI Service
- **Framework**: FastAPI
- **AI/ML**: Langchain (ready for Ollama integration)
- **Validation**: Pydantic

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **AI Service**: http://localhost:8000
- **API Docs**: http://localhost:5001/api-docs
- **AI Docs**: http://localhost:8000/docs

## 🔑 Login Credentials

- **Traveler**: `traveler@airbnb.com` / `traveler123`
- **Host**: `host@airbnb.com` / `host123`

## 🐛 Troubleshooting

### Port Already in Use

If you get port conflicts:

```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### AI Service Loading Wrong App

If you see errors about "Aparavi" or other projects:

```bash
# Make sure to set PYTHONPATH
cd ai-service
PYTHONPATH=$(pwd) python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or use the provided startup script:
```bash
./start-ai.sh
```

### MySQL Connection Issues

1. Check if MySQL is running:
```bash
brew services list | grep mysql
```

2. Start MySQL if needed:
```bash
brew services start mysql
```

3. Initialize the database:
```bash
mysql -u root -ppass1234 < backend/init.sql
```

## 🤖 AI Integration (Llama 3.1 8B)

To integrate Ollama with Llama 3.1 8B:

1. Install Ollama:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

2. Pull Llama 3.1 8B model:
```bash
ollama pull llama3.1:8b
```

3. Update the AI service to use Ollama (coming soon)

## 📦 Deployment

### Docker
```bash
docker-compose up -d
```

### Manual Deployment
1. Build frontend: `npm run build`
2. Start backend: `npm start`
3. Start AI service: `python -m uvicorn app.main:app`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support, create an issue on GitHub.

---

**Built with ❤️ for the Airbnb Lab Assignment**

## 📝 Important Notes

- **Port 5001** is used instead of 5000 to avoid conflicts with macOS AirPlay Receiver
- **PYTHONPATH** is set explicitly to avoid conflicts with other Python projects
- All environment files are pre-configured for local development

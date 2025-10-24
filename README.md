<<<<<<< HEAD
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

### 1. Backend Setup

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your database credentials
npm run migrate
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. AI Service Setup

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

- **Backend API**: http://localhost:5000/api-docs
- **AI Service**: http://localhost:8000/docs

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
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
VITE_API_URL=http://localhost:5000/api
VITE_AI_SERVICE_URL=http://localhost:8000
```

### AI Service (.env)
```
OPENAI_API_KEY=your-openai-key
TAVILY_API_KEY=your-tavily-key
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
- **AI/ML**: Langchain
- **Web Search**: Tavily API
- **Validation**: Pydantic

## 📱 Screenshots

![Login Page](screenshots/login.png)
![Property Listings](screenshots/listings.png)
![Booking Flow](screenshots/booking.png)
![AI Assistant](screenshots/ai-assistant.png)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# AI service tests
cd ai-service
pytest
```

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

For support, email support@airbnblab.com or create an issue on GitHub.

---

**Built with ❤️ for the Airbnb Lab Assignment**
=======
# Airbnb---Full-frontend-and-backend-with-AI-capabilities
This project is a replica of fully functional Airbnb website with added functionalites of chatbot to help users
>>>>>>> bea8ae0b74a025da553a8c31888fe210f29352ef

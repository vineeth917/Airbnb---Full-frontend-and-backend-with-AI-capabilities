# Airbnb Lab - Login Credentials

## Application URLs
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Backend Health Check**: http://localhost:5000/health
- **API Documentation**: http://localhost:5000/api/docs

## Login Credentials

### Traveler Account
- **Username**: `traveler`
- **Password**: `traveler1234`
- **Email**: `traveler@airbnb.com`
- **User Type**: Traveler
- **Name**: John Doe
- **Location**: New York, USA

### Host/Owner Account (Original)
- **Username**: `host`
- **Password**: `host1234`
- **Email**: `host@airbnb.com`
- **User Type**: Owner
- **Name**: Jane Smith
- **Location**: Miami, USA

### Host/Owner Account (New - Working)
- **Username**: `newhost`
- **Password**: `password123`
- **Email**: `newhost@example.com`
- **User Type**: Owner
- **Name**: New Host
- **Location**: San Jose, USA

## How to Start the Application

### Backend Server
```bash
cd backend
node src/working-server.js
```

### Frontend Server
```bash
cd frontend
npm run dev
```

## API Testing

### Test Login (Traveler)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"traveler","password":"traveler1234"}'
```

### Test Login (Host - Original)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"host","password":"host1234"}'
```

### Test Login (Host - New Working)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newhost","password":"password123"}'
```

### Get Listings
```bash
curl http://localhost:5000/api/listings
```

## Database Connection
- **Host**: localhost
- **Port**: 3306
- **Database**: airbnb_lab
- **Username**: root
- **Password**: pass1234

## Issues Fixed ✅

### 1. Host Login Issue - FIXED
- **Problem**: Host login was failing with "Invalid credentials"
- **Root Cause**: Incorrect password hash in database
- **Solution**: Regenerated bcrypt hashes for both users
- **Status**: Both traveler and host login now working

### 2. Image Loading Issue - FIXED  
- **Problem**: Images showing as colorful gradients instead of real property images
- **Root Cause**: `process.env.PUBLIC_URL` was undefined, causing incorrect image paths
- **Solution**: Removed `process.env.PUBLIC_URL` prefix from all image paths
- **Status**: Images now loading correctly from `/images/` directory

### 3. Session Management Issue - FIXED
- **Problem**: 401 Unauthorized errors for `/api/auth/me` endpoint
- **Root Cause**: Session cookies not being properly set/sent
- **Solution**: Fixed session configuration and cookie handling
- **Status**: Session persistence now working correctly

## Notes
- The backend is using a complete Node.js/Express.js implementation
- Login credentials are case-sensitive
- **Passwords must be at least 8 characters long** (frontend validation requirement)
- Session-based authentication (not JWT)
- CORS is enabled for http://localhost:3000
- All images are served from `/images/` directory


# Airbnb Lab - API Routes Documentation

## Base URLs
- **Backend API**: http://localhost:5001
- **AI Service**: http://localhost:8000
- **Frontend**: http://localhost:3000

---

## Authentication Endpoints

### Sign Up
- **URL**: `POST /api/auth/register`
- **Description**: Register a new user (Traveler or Owner/Host)
- **Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "userType": "traveler" | "owner",
    "first_name": "string",
    "last_name": "string",
    "phone": "string",
    "city": "string",
    "country": "string",
    "gender": "string"
  }
  ```

### Login
- **URL**: `POST /api/auth/login`
- **Description**: Login as Traveler or Owner/Host
- **Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```

### Logout
- **URL**: `POST /api/auth/logout`
- **Description**: Logout current user

### Get Current User
- **URL**: `GET /api/auth/me`
- **Description**: Get current logged-in user's details
- **Auth**: Required

---

## Profile Endpoints

### Get Profile
- **URL**: `GET /api/auth/me`
- **Description**: Get user profile details
- **Auth**: Required

### Update Profile
- **URL**: `PUT /api/auth/profile`
- **Description**: Update user profile
- **Auth**: Required
- **Body**:
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "aboutMe": "string",
    "city": "string",
    "country": "string",
    "languages": ["string"],
    "gender": "string",
    "profilePicture": "string"
  }
  ```

---

## Property Endpoints

### Get All Properties
- **URL**: `GET /api/listings`
- **Description**: Get all available properties
- **Query Params**: `location`, `property_type`, `min_price`, `max_price`, `max_guests`, `amenities`, `check_in`, `check_out`

### Get Property Details
- **URL**: `GET /api/listings/:id`
- **Description**: Get detailed information about a specific property

### Create Property (Owner Only)
- **URL**: `POST /api/listings`
- **Description**: Create a new property listing
- **Auth**: Required (Owner)
- **Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "price_per_night": number,
    "location": "string",
    "latitude": number,
    "longitude": number,
    "property_type": "string",
    "amenities": ["string"],
    "max_guests": number,
    "bedrooms": number,
    "bathrooms": number
  }
  ```

### Update Property (Owner Only)
- **URL**: `PUT /api/listings/:id`
- **Description**: Update property details
- **Auth**: Required (Owner)

### Delete Property (Owner Only)
- **URL**: `DELETE /api/listings/:id`
- **Description**: Delete a property listing
- **Auth**: Required (Owner)

---

## Booking Endpoints

### Get User Bookings
- **URL**: `GET /api/bookings`
- **Description**: Get all bookings for current user
- **Auth**: Required
- **Query Params**: `status`, `as_host`

### Create Booking
- **URL**: `POST /api/bookings`
- **Description**: Create a new booking request
- **Auth**: Required (Traveler)
- **Body**:
  ```json
  {
    "listing_id": "string",
    "check_in": "YYYY-MM-DD",
    "check_out": "YYYY-MM-DD",
    "guests": number
  }
  ```

### Accept Booking (Owner Only)
- **URL**: `POST /api/bookings/:id/accept`
- **Description**: Accept a booking request
- **Auth**: Required (Owner)

### Cancel Booking
- **URL**: `POST /api/bookings/:id/cancel`
- **Description**: Cancel a booking
- **Auth**: Required
- **Body**:
  ```json
  {
    "cancellation_reason": "string"
  }
  ```

### Delete Pending Booking
- **URL**: `DELETE /api/bookings/:id`
- **Description**: Delete a pending booking
- **Auth**: Required (Booking owner)

---

## Favorites Endpoints

### Get Favorites
- **URL**: `GET /api/favorites`
- **Description**: Get user's favorite properties
- **Auth**: Required

### Add to Favorites
- **URL**: `POST /api/favorites`
- **Description**: Add property to favorites
- **Auth**: Required
- **Body**:
  ```json
  {
    "listing_id": "string"
  }
  ```

### Remove from Favorites
- **URL**: `DELETE /api/favorites/:listing_id`
- **Description**: Remove property from favorites
- **Auth**: Required

---

## AI Agent Endpoints

### AI Chat
- **URL**: `POST http://localhost:8000/api/ai/chat`
- **Description**: Get AI-powered recommendations and chat
- **Body**:
  ```json
  {
    "message": "string",
    "user_id": "string",
    "location": "string"
  }
  ```

---

## Messages Endpoints

### Get Messages
- **URL**: `GET /api/messages`
- **Description**: Get messages between traveler and host (based on confirmed bookings)
- **Auth**: Required

### Send Message
- **URL**: `POST /api/messages`
- **Description**: Send a message
- **Auth**: Required
- **Body**:
  ```json
  {
    "booking_id": "string",
    "receiver_id": "string",
    "message": "string"
  }
  ```

### Mark Message as Read
- **URL**: `PUT /api/messages/:id/read`
- **Description**: Mark a message as read
- **Auth**: Required

---

## Analytics Endpoints (Owner Only)

### Get Property Analytics
- **URL**: `GET /api/analytics/property/:listing_id`
- **Description**: Get analytics for a specific property
- **Auth**: Required (Owner)

### Get Host Analytics
- **URL**: `GET /api/analytics/host/:host_id`
- **Description**: Get overall host analytics
- **Auth**: Required (Owner)

---

## Availability Endpoints (Owner Only)

### Get Availability
- **URL**: `GET /api/availability/:listing_id`
- **Description**: Get availability calendar for a property

### Update Availability
- **URL**: `POST /api/availability/:listing_id`
- **Description**: Update property availability
- **Auth**: Required (Owner)

### Bulk Update Availability
- **URL**: `POST /api/availability/:listing_id/bulk`
- **Description**: Bulk update availability dates
- **Auth**: Required (Owner)

### Delete Availability Date
- **URL**: `DELETE /api/availability/:listing_id/:date`
- **Description**: Remove a blocked date
- **Auth**: Required (Owner)

---

## Test Endpoints

### Health Check
- **URL**: `GET /health`
- **Description**: Check if server is running

### Test
- **URL**: `GET /api/test`
- **Description**: Test endpoint

---

## Notes
- All `/api/` routes are served by the backend at `http://localhost:5001`
- AI service runs at `http://localhost:8000`
- Frontend runs at `http://localhost:3000`
- Use Vite proxy (configured in `vite.config.ts`) for frontend to access backend

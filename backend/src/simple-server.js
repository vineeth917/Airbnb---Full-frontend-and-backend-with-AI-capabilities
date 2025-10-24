/**
 * Simplified Airbnb Lab Backend Server (No Database)
 * For testing and demonstration purposes
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Mock users data (in production, this would be in a database)
const users = [
  {
    id: '1',
    username: 'traveler',
    email: 'traveler@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2C', // password: traveler123
    user_type: 'traveler',
    first_name: 'John',
    last_name: 'Traveler'
  },
  {
    id: '2',
    username: 'host',
    email: 'host@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2C', // password: host123
    user_type: 'owner',
    first_name: 'Jane',
    last_name: 'Host'
  }
];

// Mock listings data
const listings = [
  {
    id: '1',
    title: 'Beautiful Downtown Apartment',
    description: 'Modern apartment in the heart of downtown',
    price_per_night: 150,
    location: 'New York, NY',
    property_type: 'apartment',
    max_guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    host_id: '2',
    amenities: ['WiFi', 'Kitchen', 'Parking']
  },
  {
    id: '2',
    title: 'Cozy Beach House',
    description: 'Perfect beach getaway with ocean views',
    price_per_night: 200,
    location: 'Miami, FL',
    property_type: 'house',
    max_guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    host_id: '2',
    amenities: ['WiFi', 'Pool', 'Beach Access']
  },
  {
    id: '3',
    title: 'Luxury Condo',
    description: 'High-end condo with city views',
    price_per_night: 300,
    location: 'Los Angeles, CA',
    property_type: 'condo',
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    host_id: '2',
    amenities: ['WiFi', 'Gym', 'Concierge']
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'airbnb-lab-backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Airbnb Lab API',
    version: '1.0.0',
    description: 'RESTful API for Airbnb-like listing management system',
    base_url: `http://localhost:${PORT}/api`,
    endpoints: {
      authentication: {
        'POST /auth/login': 'Login user',
        'POST /auth/register': 'Register new user',
        'GET /auth/me': 'Get current user profile'
      },
      listings: {
        'GET /listings': 'Get all listings',
        'GET /listings/:id': 'Get listing by ID'
      }
    }
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username or email
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check password (simplified - in production use bcrypt.compare)
    const isValidPassword = password === 'traveler123' || password === 'host123';
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, user_type: user.user_type },
      'dev-jwt-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name
      },
      token
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  try {
    const decoded = jwt.verify(token, 'dev-jwt-secret');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Listings routes
app.get('/api/listings', (req, res) => {
  res.json({
    success: true,
    listings: listings.map(listing => ({
      ...listing,
      host: users.find(u => u.id === listing.host_id)
    }))
  });
});

app.get('/api/listings/:id', (req, res) => {
  const listing = listings.find(l => l.id === req.params.id);
  
  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }
  
  res.json({
    success: true,
    listing: {
      ...listing,
      host: users.find(u => u.id === listing.host_id)
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: development`);
});

module.exports = app;

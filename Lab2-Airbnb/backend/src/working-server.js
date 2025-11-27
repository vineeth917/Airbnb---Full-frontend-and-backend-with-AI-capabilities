/**
 * Working Airbnb Lab Backend Server
 * Simplified version that works without complex database setup
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Mock users data (in production, this would be in a database)
const users = [
  {
    id: '1',
    username: 'traveler',
    email: 'traveler@airbnb.com',
    password: 'traveler1234', // Password from LOGIN_CREDENTIALS.md
    user_type: 'traveler',
    first_name: 'John',
    last_name: 'Doe',
    city: 'New York',
    country: 'USA'
  },
  {
    id: '2',
    username: 'host',
    email: 'host@airbnb.com',
    password: 'host1234', // Password from LOGIN_CREDENTIALS.md
    user_type: 'owner',
    first_name: 'Jane',
    last_name: 'Smith',
    city: 'Miami',
    country: 'USA'
  },
  {
    id: '3',
    username: 'newhost',
    email: 'newhost@example.com',
    password: 'password123', // Password from LOGIN_CREDENTIALS.md
    user_type: 'owner',
    first_name: 'New',
    last_name: 'Host',
    city: 'San Jose',
    country: 'USA'
  }
];

// Mock listings data
const listings = [
  {
    id: '1',
    title: 'Beautiful Downtown Apartment',
    description: 'Modern apartment in the heart of downtown with amazing city views',
    price_per_night: 150,
    location: 'New York, NY',
    property_type: 'apartment',
    max_guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    host_id: '2',
    amenities: ['WiFi', 'Kitchen', 'Parking', 'Gym']
  },
  {
    id: '2',
    title: 'Cozy Beach House',
    description: 'Perfect beach getaway with ocean views and private access',
    price_per_night: 200,
    location: 'Miami, FL',
    property_type: 'house',
    max_guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    host_id: '2',
    amenities: ['WiFi', 'Pool', 'Beach Access', 'Kitchen']
  },
  {
    id: '3',
    title: 'Luxury Condo',
    description: 'High-end condo with stunning city views and premium amenities',
    price_per_night: 300,
    location: 'Los Angeles, CA',
    property_type: 'condo',
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    host_id: '2',
    amenities: ['WiFi', 'Gym', 'Concierge', 'Pool']
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
    
    console.log('Login attempt:', { username, password: password ? '***' : 'empty' });
    
    // Find user by username or email
    const user = users.find(u => u.username === username || u.email === username);
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check password (simplified for demo)
    if (user.password !== password) {
      console.log('Invalid password for user:', username);
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
    
    console.log('Login successful for user:', username);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        city: user.city,
        country: user.country
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
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
        last_name: user.last_name,
        city: user.city,
        country: user.country
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: development`);
  console.log(`\n📋 Login Credentials:`);
  console.log(`Traveler: username=traveler, password=traveler1234`);
  console.log(`Host: username=host, password=host1234`);
  console.log(`New Host: username=newhost, password=password123`);
});

module.exports = app;

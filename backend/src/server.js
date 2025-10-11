/**
 * Lab 1 Airbnb - Backend API Server
 * Node.js + Express.js Implementation
 * Distributed Systems for Data Engineering (DATA 236)
 */

// Load environment variables FIRST
require('dotenv').config();


const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'pass1234',
  database: 'airbnb_lab',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Session store
const sessionStore = new MySQLStore({
  ...dbConfig,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware (using memory store for now)
app.set('trust proxy', 1);
app.use(session({
  key: 'airbnb_session',
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

// Diagnostic: check session
app.get('/api/auth/session-check', (req, res) => {
  res.json({ hasSession: !!req.session.userId, userId: req.session.userId || null, userType: req.session.userType || null });
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
};

const requireOwner = (req, res, next) => {
  if (!req.session.userId || req.session.userType !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Owner privileges required'
    });
  }
  next();
};

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Airbnb Lab Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      listings: '/api/listings',
      bookings: '/api/bookings',
      favorites: '/api/favorites',
      preferences: '/api/preferences',
      availability: '/api/availability',
      analytics: '/api/analytics'
    },
    documentation: '/api/docs'
  });
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'airbnb-lab-backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== AUTHENTICATION ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      userType,
      firstName,
      lastName,
      phone,
      city,
      country,
      gender
    } = req.body;

    // Validation
    if (!username || !email || !password || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, user_type, first_name, last_name, phone, city, country, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, email, passwordHash, userType, firstName || null, lastName || null, phone || null, city || null, country || null, gender || null]
    );

    // Set session
    req.session.userId = userId;
    req.session.userType = userType;

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: userId,
        username,
        email,
        user_type: userType,
        first_name: firstName,
        last_name: lastName
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', { username });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.userType = user.user_type;

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
        phone: user.phone,
        city: user.city,
        country: user.country,
        gender: user.gender,
        profile_picture: user.profile_picture
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Get current user
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, user_type, first_name, last_name, phone, city, country, gender, profile_picture, about_me, languages FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// Update profile
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      aboutMe,
      city,
      country,
      languages,
      gender,
      profilePicture
    } = req.body;

    console.log('Profile update request for user:', req.session.userId);
    console.log('Profile picture length:', profilePicture ? profilePicture.length : 'null');

    // Truncate profile picture if it's too large (limit to 50MB = ~41.9 million chars)
    let profilePictureToSave = profilePicture;
    if (profilePicture && profilePicture.length > 40000000) {
      console.warn('Profile picture too large, not saving');
      profilePictureToSave = null;
    }

    await pool.query(
      `UPDATE users 
       SET first_name = ?, last_name = ?, phone = ?, about_me = ?, 
           city = ?, country = ?, languages = ?, gender = ?, profile_picture = ?
       WHERE id = ?`,
      [firstName, lastName, phone, aboutMe, city, country, 
       languages ? JSON.stringify(languages) : null, gender, profilePictureToSave, req.session.userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile: ' + error.message
    });
  }
});

// ==================== LISTINGS ROUTES ====================

// Get all listings
app.get('/api/listings', async (req, res) => {
  try {
    const {
      location,
      property_type,
      min_price,
      max_price,
      max_guests,
      amenities,
      check_in,
      check_out
    } = req.query;

    let query = `
      SELECT l.*, u.username as host_username, u.first_name as host_first_name, u.last_name as host_last_name
      FROM listings l
      JOIN users u ON l.host_id = u.id
      WHERE l.is_active = true
    `;
    const params = [];

    if (location) {
      query += ' AND l.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (property_type) {
      query += ' AND l.property_type = ?';
      params.push(property_type);
    }

    if (min_price) {
      query += ' AND l.price_per_night >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ' AND l.price_per_night <= ?';
      params.push(parseFloat(max_price));
    }

    if (max_guests) {
      query += ' AND l.max_guests >= ?';
      params.push(parseInt(max_guests));
    }

    query += ' ORDER BY l.created_at DESC';

    const [listings] = await pool.query(query, params);

    // Parse JSON amenities
    const processedListings = listings.map(listing => ({
      ...listing,
      amenities: typeof listing.amenities === 'string' ? JSON.parse(listing.amenities) : listing.amenities
    }));

    res.json({
      success: true,
      listings: processedListings,
      count: processedListings.length
    });

  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get listings'
    });
  }
});

// Get single listing
app.get('/api/listings/:id', async (req, res) => {
  try {
    const [listings] = await pool.query(
      `SELECT l.*, u.username as host_username, u.first_name as host_first_name, u.last_name as host_last_name
       FROM listings l
       JOIN users u ON l.host_id = u.id
       WHERE l.id = ?`,
      [req.params.id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    const listing = listings[0];
    listing.amenities = typeof listing.amenities === 'string' ? JSON.parse(listing.amenities) : listing.amenities;

    // Get availability for this listing
    const [availability] = await pool.query(
      `SELECT date, is_available FROM availability WHERE listing_id = ?`,
      [listing.id]
    );

    // Format availability for frontend (key-value pairs)
    const availabilityMap = {};
    availability.forEach(item => {
      availabilityMap[item.date] = item.is_available;
    });

    listing.availability = availabilityMap;

    res.json({
      success: true,
      listing
    });

  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get listing'
    });
  }
});

// Create listing
app.post('/api/listings', requireOwner, async (req, res) => {
  try {
    console.log('Create listing request body:', req.body);
    const {
      title,
      description,
      price_per_night,
      location,
      latitude,
      longitude,
      property_type,
      amenities,
      max_guests,
      bedrooms,
      bathrooms
    } = req.body;

    // Validation
    if (!title || !price_per_night || !location || !property_type) {
      console.log('Missing required fields:', { title, price_per_night, location, property_type });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const listingId = uuidv4();
    
    // Convert numeric fields to numbers and handle nulls
    const price = parseFloat(price_per_night);
    const guests = parseInt(max_guests) || 1;
    const bed = parseInt(bedrooms) || 1;
    const bath = parseInt(bathrooms) || 1;
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    
    console.log('Creating listing with:', {
      listingId,
      title,
      description: description || '',
      price,
      location,
      lat,
      lng,
      property_type,
      amenities: amenities || [],
      guests,
      bed,
      bath,
      hostId: req.session.userId
    });

    await pool.query(
      `INSERT INTO listings (id, title, description, price_per_night, location, latitude, longitude, 
       property_type, amenities, max_guests, bedrooms, bathrooms, host_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [listingId, title, description || '', price, location, lat, lng,
       property_type, JSON.stringify(amenities || []), guests, bed, bath, req.session.userId, true]
    );

    console.log('Listing created successfully:', listingId);
    
    res.json({
      success: true,
      message: 'Listing created successfully',
      listing_id: listingId
    });

  } catch (error) {
    console.error('Create listing error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to create listing: ' + error.message
    });
  }
});

// Update listing
app.put('/api/listings/:id', requireOwner, async (req, res) => {
  try {
    const {
      title,
      description,
      price_per_night,
      location,
      latitude,
      longitude,
      property_type,
      amenities,
      max_guests,
      bedrooms,
      bathrooms,
      is_active
    } = req.body;

    // Verify ownership
    const [listings] = await pool.query(
      'SELECT host_id FROM listings WHERE id = ?',
      [req.params.id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listings[0].host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this listing'
      });
    }

    await pool.query(
      `UPDATE listings 
       SET title = ?, description = ?, price_per_night = ?, location = ?, latitude = ?, longitude = ?,
           property_type = ?, amenities = ?, max_guests = ?, bedrooms = ?, bathrooms = ?, is_active = ?
       WHERE id = ?`,
      [title, description, price_per_night, location, latitude, longitude,
       property_type, JSON.stringify(amenities || []), max_guests, bedrooms, bathrooms, is_active !== undefined ? is_active : true, req.params.id]
    );

    res.json({
      success: true,
      message: 'Listing updated successfully'
    });

  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update listing'
    });
  }
});

// Delete listing
app.delete('/api/listings/:id', requireOwner, async (req, res) => {
  try {
    // Verify ownership
    const [listings] = await pool.query(
      'SELECT host_id FROM listings WHERE id = ?',
      [req.params.id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listings[0].host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this listing'
      });
    }

    await pool.query('DELETE FROM listings WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });

  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete listing'
    });
  }
});

// ==================== BOOKINGS ROUTES ====================

// Create/Get bookings
app.route('/api/bookings')
  .post(requireAuth, async (req, res) => {
    try {
      const { listing_id, check_in, check_out, total_price } = req.body;

      if (!listing_id || !check_in || !check_out || !total_price) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check if listing exists
      const [listings] = await pool.query(
        'SELECT id, host_id FROM listings WHERE id = ?',
        [listing_id]
      );

      if (listings.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Listing not found'
        });
      }

      // Check for overlapping bookings (confirmed or pending)
      const [existingBookings] = await pool.query(
        `SELECT * FROM bookings 
         WHERE listing_id = ? 
         AND status IN ('confirmed', 'pending')
         AND (
           (check_in <= ? AND check_out > ?) OR
           (check_in < ? AND check_out >= ?) OR
           (check_in >= ? AND check_out <= ?)
         )`,
        [listing_id, check_in, check_in, check_out, check_out, check_in, check_out]
      );

      if (existingBookings.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'These dates are already booked. Please choose different dates.'
        });
      }

      const bookingId = uuidv4();
      await pool.query(
        `INSERT INTO bookings (id, listing_id, guest_id, check_in, check_out, total_price, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [bookingId, listing_id, req.session.userId, check_in, check_out, total_price]
      );

      // Get listing details to include in response
      const [listingDetails] = await pool.query(
        'SELECT title, location FROM listings WHERE id = ?',
        [listing_id]
      );

      res.json({
        success: true,
        message: 'Booking created successfully',
        id: bookingId,
        status: 'pending',
        listing_title: listingDetails[0]?.title || 'Property',
        listing_location: listingDetails[0]?.location || 'Location not specified'
      });

    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create booking'
      });
    }
  })
  .get(requireAuth, async (req, res) => {
    try {
      const { status, as_host } = req.query;
      
      console.log('Get bookings request:', {
        userId: req.session.userId,
        userType: req.session.userType,
        as_host: as_host,
        status: status
      });

      let query = `
        SELECT b.*, l.title as listing_title, l.location as listing_location, l.property_type,
               g.username as guest_username, g.first_name as guest_first_name, g.last_name as guest_last_name,
               h.username as host_username, h.first_name as host_first_name, h.last_name as host_last_name
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        JOIN users g ON b.guest_id = g.id
        JOIN users h ON l.host_id = h.id
        WHERE 
      `;

      const params = [];

      if (as_host === 'true') {
        query += ' l.host_id = ?';
        params.push(req.session.userId);
        console.log('Host query - looking for host_id:', req.session.userId);
      } else {
        query += ' b.guest_id = ?';
        params.push(req.session.userId);
        console.log('Guest query - looking for guest_id:', req.session.userId);
      }

      if (status) {
        query += ' AND b.status = ?';
        params.push(status);
      }

      query += ' ORDER BY b.created_at DESC';
      
      console.log('Final query:', query);
      console.log('Query params:', params);

      const [bookings] = await pool.query(query, params);
      
      console.log('Query result - found bookings:', bookings.length);

      res.json({
        success: true,
        bookings
      });

    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bookings'
      });
    }
  });

// Get single booking
app.get('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, l.title as listing_title, l.location as listing_location, l.property_type,
              l.price_per_night, l.host_id,
              g.username as guest_username, g.first_name as guest_first_name, g.last_name as guest_last_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users g ON b.guest_id = g.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Verify authorization
    if (booking.guest_id !== req.session.userId && booking.host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get booking'
    });
  }
});

// Accept booking
app.post('/api/bookings/:id/accept', requireOwner, async (req, res) => {
  try {
    // Get booking with host info
    const [bookings] = await pool.query(
      `SELECT b.*, l.host_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    if (booking.host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to accept this booking'
      });
    }

    await pool.query(
      `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
      [req.params.id]
    );

    // Block availability for [check_in, check_out)
    const start = new Date(booking.check_in);
    const end = new Date(booking.check_out);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      await pool.query(
        `INSERT INTO availability (id, listing_id, date, is_available)
         VALUES (?, ?, ?, false)
         ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)`,
        [uuidv4(), booking.listing_id, dateStr]
      );
    }

    res.json({
      success: true,
      message: 'Booking accepted successfully'
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept booking'
    });
  }
});

// Cancel booking
app.post('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    // Get booking with host info
    const [bookings] = await pool.query(
      `SELECT b.*, l.host_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Can cancel if you're the guest or the host
    if (booking.guest_id !== req.session.userId && booking.host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this booking'
      });
    }

    await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
      [req.params.id]
    );

    // If this was a confirmed booking, release the blocked dates in availability table
    if (booking.status === 'confirmed') {
      const start = new Date(booking.check_in);
      const end = new Date(booking.check_out);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        await pool.query(
          `UPDATE availability SET is_available = true 
           WHERE listing_id = ? AND date = ?`,
          [booking.listing_id, dateStr]
        );
      }
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking'
    });
  }
});

// Delete booking (only for pending bookings by guest)
app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    // Get booking details
    const [bookings] = await pool.query(
      `SELECT b.*, l.host_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Only allow guests to delete their own pending bookings
    if (booking.guest_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this booking'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending bookings can be deleted'
      });
    }

    // Delete the booking
    await pool.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete booking'
    });
  }
});

// ==================== FAVORITES ROUTES ====================

// Get favorites
app.get('/api/favorites', requireAuth, async (req, res) => {
  try {
    const [favorites] = await pool.query(
      `SELECT f.*, l.title, l.description, l.price_per_night, l.location, l.property_type, 
              l.max_guests, l.bedrooms, l.bathrooms, l.amenities
       FROM favorites f
       JOIN listings l ON f.listing_id = l.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.session.userId]
    );

    // Parse amenities
    const processedFavorites = favorites.map(fav => ({
      ...fav,
      amenities: typeof fav.amenities === 'string' ? JSON.parse(fav.amenities) : fav.amenities
    }));

    res.json({
      success: true,
      favorites: processedFavorites
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get favorites'
    });
  }
});

// Add favorite
app.post('/api/favorites', requireAuth, async (req, res) => {
  try {
    const { listing_id } = req.body;

    if (!listing_id) {
      return res.status(400).json({
        success: false,
        error: 'Listing ID required'
      });
    }

    // Check if already favorited
    const [existing] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?',
      [req.session.userId, listing_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Already in favorites'
      });
    }

    const favoriteId = uuidv4();
    await pool.query(
      'INSERT INTO favorites (id, user_id, listing_id) VALUES (?, ?, ?)',
      [favoriteId, req.session.userId, listing_id]
    );

    res.json({
      success: true,
      message: 'Added to favorites'
    });

  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite'
    });
  }
});

// Remove favorite
app.delete('/api/favorites/:listing_id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND listing_id = ?',
      [req.session.userId, req.params.listing_id]
    );

    res.json({
      success: true,
      message: 'Removed from favorites'
    });

  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite'
    });
  }
});

// ==================== USER PREFERENCES ROUTES ====================

// Get preferences
app.get('/api/preferences', requireAuth, async (req, res) => {
  try {
    const [preferences] = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.session.userId]
    );

    if (preferences.length === 0) {
      return res.json({
        success: true,
        preferences: null
      });
    }

    const pref = preferences[0];
    
    // Parse JSON fields
    res.json({
      success: true,
      preferences: {
        ...pref,
        budget_range: typeof pref.budget_range === 'string' ? JSON.parse(pref.budget_range) : pref.budget_range,
        interests: typeof pref.interests === 'string' ? JSON.parse(pref.interests) : pref.interests,
        mobility_needs: typeof pref.mobility_needs === 'string' ? JSON.parse(pref.mobility_needs) : pref.mobility_needs,
        dietary_restrictions: typeof pref.dietary_restrictions === 'string' ? JSON.parse(pref.dietary_restrictions) : pref.dietary_restrictions,
        preferred_property_types: typeof pref.preferred_property_types === 'string' ? JSON.parse(pref.preferred_property_types) : pref.preferred_property_types,
        preferred_amenities: typeof pref.preferred_amenities === 'string' ? JSON.parse(pref.preferred_amenities) : pref.preferred_amenities
      }
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
});

// Update preferences
app.put('/api/preferences', requireAuth, async (req, res) => {
  try {
    const {
      budget_range,
      interests,
      mobility_needs,
      dietary_restrictions,
      preferred_property_types,
      preferred_amenities
    } = req.body;

    // Check if preferences exist
    const [existing] = await pool.query(
      'SELECT id FROM user_preferences WHERE user_id = ?',
      [req.session.userId]
    );

    if (existing.length > 0) {
      // Update
      await pool.query(
        `UPDATE user_preferences 
         SET budget_range = ?, interests = ?, mobility_needs = ?, dietary_restrictions = ?,
             preferred_property_types = ?, preferred_amenities = ?
         WHERE user_id = ?`,
        [
          budget_range ? JSON.stringify(budget_range) : null,
          interests ? JSON.stringify(interests) : null,
          mobility_needs ? JSON.stringify(mobility_needs) : null,
          dietary_restrictions ? JSON.stringify(dietary_restrictions) : null,
          preferred_property_types ? JSON.stringify(preferred_property_types) : null,
          preferred_amenities ? JSON.stringify(preferred_amenities) : null,
          req.session.userId
        ]
      );
    } else {
      // Insert
      const prefId = uuidv4();
      await pool.query(
        `INSERT INTO user_preferences 
         (id, user_id, budget_range, interests, mobility_needs, dietary_restrictions, preferred_property_types, preferred_amenities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prefId,
          req.session.userId,
          budget_range ? JSON.stringify(budget_range) : null,
          interests ? JSON.stringify(interests) : null,
          mobility_needs ? JSON.stringify(mobility_needs) : null,
          dietary_restrictions ? JSON.stringify(dietary_restrictions) : null,
          preferred_property_types ? JSON.stringify(preferred_property_types) : null,
          preferred_amenities ? JSON.stringify(preferred_amenities) : null
        ]
      );
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// ==================== AVAILABILITY ROUTES ====================

// Get availability for a listing
app.get('/api/availability/:listing_id', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM availability WHERE listing_id = ?';
    const params = [req.params.listing_id];

    if (start_date && end_date) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY date';

    const [availability] = await pool.query(query, params);

    res.json({
      success: true,
      availability
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get availability'
    });
  }
});

// Set availability for a listing
app.post('/api/availability/:listing_id', requireOwner, async (req, res) => {
  try {
    const { date, is_available, price_override, min_nights, max_nights, notes } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date required'
      });
    }

    // Verify ownership
    const [listings] = await pool.query(
      'SELECT host_id FROM listings WHERE id = ?',
      [req.params.listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listings[0].host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Check if exists
    const [existing] = await pool.query(
      'SELECT id FROM availability WHERE listing_id = ? AND date = ?',
      [req.params.listing_id, date]
    );

    if (existing.length > 0) {
      // Update
      await pool.query(
        `UPDATE availability 
         SET is_available = ?, price_override = ?, min_nights = ?, max_nights = ?, notes = ?
         WHERE listing_id = ? AND date = ?`,
        [is_available, price_override, min_nights, max_nights, notes, req.params.listing_id, date]
      );
    } else {
      // Insert
      const availId = uuidv4();
      await pool.query(
        `INSERT INTO availability (id, listing_id, date, is_available, price_override, min_nights, max_nights, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [availId, req.params.listing_id, date, is_available, price_override, min_nights, max_nights, notes]
      );
    }

    res.json({
      success: true,
      message: 'Availability updated successfully'
    });

  } catch (error) {
    console.error('Set availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set availability'
    });
  }
});

// Bulk update availability
app.post('/api/availability/:listing_id/bulk', requireOwner, async (req, res) => {
  try {
    const { start_date, end_date, is_available, price_override } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date required'
      });
    }

    // Verify ownership
    const [listings] = await pool.query(
      'SELECT host_id FROM listings WHERE id = ?',
      [req.params.listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listings[0].host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Generate dates between start and end
    const dates = [];
    const currentDate = new Date(start_date);
    const lastDate = new Date(end_date);

    while (currentDate <= lastDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Bulk insert/update
    for (const date of dates) {
      const [existing] = await pool.query(
        'SELECT id FROM availability WHERE listing_id = ? AND date = ?',
        [req.params.listing_id, date]
      );

      if (existing.length > 0) {
        await pool.query(
          'UPDATE availability SET is_available = ?, price_override = ? WHERE listing_id = ? AND date = ?',
          [is_available, price_override, req.params.listing_id, date]
        );
      } else {
        const availId = uuidv4();
        await pool.query(
          'INSERT INTO availability (id, listing_id, date, is_available, price_override) VALUES (?, ?, ?, ?, ?)',
          [availId, req.params.listing_id, date, is_available, price_override]
        );
      }
    }

    res.json({
      success: true,
      message: 'Bulk availability updated successfully',
      count: dates.length
    });

  } catch (error) {
    console.error('Bulk availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bulk availability'
    });
  }
});

// Delete availability
app.delete('/api/availability/:listing_id/:date', requireOwner, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM availability WHERE listing_id = ? AND date = ?',
      [req.params.listing_id, req.params.date]
    );

    res.json({
      success: true,
      message: 'Availability deleted successfully'
    });

  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete availability'
    });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get property analytics
app.get('/api/analytics/property/:listing_id', requireOwner, async (req, res) => {
  try {
    // Verify ownership
    const [listings] = await pool.query(
      'SELECT host_id FROM listings WHERE id = ?',
      [req.params.listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listings[0].host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Get booking stats
    const [bookingStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
         SUM(CASE WHEN status = 'confirmed' THEN total_price ELSE 0 END) as total_revenue,
         AVG(CASE WHEN status = 'confirmed' THEN total_price ELSE NULL END) as average_booking_value
       FROM bookings
       WHERE listing_id = ?`,
      [req.params.listing_id]
    );

    res.json({
      success: true,
      analytics: bookingStats[0]
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

// Get host analytics
app.get('/api/analytics/host/:host_id', requireOwner, async (req, res) => {
  try {
    if (req.params.host_id !== req.session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Get overall stats
    const [stats] = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM listings WHERE host_id = ?) as total_listings,
         (SELECT COUNT(*) FROM bookings b JOIN listings l ON b.listing_id = l.id WHERE l.host_id = ?) as total_bookings,
         (SELECT SUM(total_price) FROM bookings b JOIN listings l ON b.listing_id = l.id WHERE l.host_id = ? AND b.status = 'confirmed') as total_revenue
      `,
      [req.session.userId, req.session.userId, req.session.userId]
    );

    res.json({
      success: true,
      analytics: stats[0]
    });

  } catch (error) {
    console.error('Get host analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get host analytics'
    });
  }
});

// ==================== METRICS ENDPOINT ====================
app.get('/api/metrics', (req, res) => {
  res.json({
    success: true,
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

// ==================== TEST ENDPOINT ====================
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    session: {
      active: !!req.session.userId,
      userId: req.session.userId,
      userType: req.session.userType
    }
  });
});

// ==================== MESSAGES ROUTES ====================

// Get messages for current user (based on confirmed bookings)
app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;

    if (userType === 'traveler') {
      // For travelers: Get messages from confirmed bookings only
      const [messages] = await pool.query(
        `SELECT m.*, 
                s.username as sender_username, s.first_name as sender_first_name, s.last_name as sender_last_name,
                r.username as receiver_username, r.first_name as receiver_first_name, r.last_name as receiver_last_name,
                b.listing_id,
                l.title as listing_title, l.location as listing_location,
                b.check_in, b.check_out, b.status as booking_status
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         JOIN users r ON m.receiver_id = r.id
         JOIN bookings b ON m.booking_id = b.id
         JOIN listings l ON b.listing_id = l.id
         WHERE b.guest_id = ? AND b.status = 'confirmed'
         ORDER BY m.created_at DESC`,
        [userId]
      );
      res.json({ success: true, messages });
    } else {
      // For hosts: Get messages from confirmed bookings only
      const [messages] = await pool.query(
        `SELECT m.*, 
                s.username as sender_username, s.first_name as sender_first_name, s.last_name as sender_last_name,
                r.username as receiver_username, r.first_name as receiver_first_name, r.last_name as receiver_last_name,
                b.listing_id,
                l.title as listing_title, l.location as listing_location,
                b.check_in, b.check_out, b.status as booking_status
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         JOIN users r ON m.receiver_id = r.id
         JOIN bookings b ON m.booking_id = b.id
         JOIN listings l ON b.listing_id = l.id
         WHERE l.host_id = ? AND b.status = 'confirmed'
         ORDER BY m.created_at DESC`,
        [userId]
      );
      res.json({ success: true, messages });
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// Send a message
app.post('/api/messages', requireAuth, async (req, res) => {
  try {
    const { booking_id, receiver_id, message } = req.body;
    const sender_id = req.session.userId;

    if (!booking_id || !receiver_id || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Verify the booking exists and is confirmed
    const [bookings] = await pool.query(
      `SELECT b.*, l.host_id 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ? AND b.status = 'confirmed'`,
      [booking_id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Confirmed booking not found' });
    }

    const booking = bookings[0];
    
    // Verify sender is either guest or host of this booking
    if (sender_id !== booking.guest_id && sender_id !== booking.host_id) {
      return res.status(403).json({ success: false, error: 'Not authorized to send message for this booking' });
    }

    const messageId = uuidv4();
    await pool.query(
      `INSERT INTO messages (id, booking_id, sender_id, receiver_id, message)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, booking_id, sender_id, receiver_id, message]
    );

    res.json({ 
      success: true, 
      message: { id: messageId, booking_id, sender_id, receiver_id, message, created_at: new Date() }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Mark message as read
app.put('/api/messages/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE messages SET is_read = true WHERE id = ? AND receiver_id = ?`,
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// ==================== 404 HANDLER ====================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    // Test database connection
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection established successfully');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📋 Login Credentials:`);
      console.log(`Traveler: username=traveler, password=traveler123`);
      console.log(`Host: username=host, password=host123`);
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

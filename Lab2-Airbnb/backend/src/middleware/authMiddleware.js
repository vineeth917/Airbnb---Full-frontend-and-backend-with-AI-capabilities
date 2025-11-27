/**
 * Authentication Middleware
 * Handles user authentication and authorization
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check if user is owner
 */
const requireOwner = (req, res, next) => {
  if (req.user.user_type !== 'owner') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Owner privileges required'
    });
  }
  next();
};

/**
 * Middleware to check if user is traveler
 */
const requireTraveler = (req, res, next) => {
  if (req.user.user_type !== 'traveler') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Traveler privileges required'
    });
  }
  next();
};

/**
 * Middleware to check resource ownership
 */
const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;

      let resource;
      switch (resourceType) {
        case 'listing':
          const { Listing } = require('../models');
          resource = await Listing.findByPk(resourceId);
          if (resource && resource.host_id !== userId) {
            return res.status(403).json({
              error: 'Access denied',
              message: 'You can only access your own listings'
            });
          }
          break;
        case 'booking':
          const { Booking } = require('../models');
          resource = await Booking.findByPk(resourceId);
          if (resource && resource.guest_id !== userId && resource.host_id !== userId) {
            return res.status(403).json({
              error: 'Access denied',
              message: 'You can only access your own bookings'
            });
          }
          break;
        default:
          return res.status(500).json({
            error: 'Internal error',
            message: 'Invalid resource type'
          });
      }

      if (!resource) {
        return res.status(404).json({
          error: 'Not found',
          message: `${resourceType} not found`
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        error: 'Internal error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.is_active) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireOwner,
  requireTraveler,
  checkResourceOwnership,
  optionalAuth
};

/**
 * Authentication Routes
 * Handles user registration, login, logout, and profile management
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - user_type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         username:
 *           type: string
 *           description: Username
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *         user_type:
 *           type: string
 *           enum: [traveler, owner]
 *           description: User type
 *         first_name:
 *           type: string
 *           description: First name
 *         last_name:
 *           type: string
 *           description: Last name
 *         phone:
 *           type: string
 *           description: Phone number
 *         about_me:
 *           type: string
 *           description: About me description
 *         city:
 *           type: string
 *           description: City
 *         country:
 *           type: string
 *           description: Country
 *         languages:
 *           type: array
 *           items:
 *             type: string
 *           description: Languages spoken
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: Gender
 *         profile_picture:
 *           type: string
 *           description: Profile picture URL
 *         is_active:
 *           type: boolean
 *           description: Account active status
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - user_type
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               user_type:
 *                 type: string
 *                 enum: [traveler, owner]
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               about_me:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('user_type')
    .isIn(['traveler', 'owner'])
    .withMessage('User type must be either traveler or owner'),
  body('first_name')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('last_name')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters'),
  body('about_me')
    .optional()
    .isLength({ max: 500 })
    .withMessage('About me must be less than 500 characters'),
  body('city')
    .optional()
    .isLength({ max: 50 })
    .withMessage('City must be less than 50 characters'),
  body('country')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Country must be less than 50 characters'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const {
    username,
    email,
    password,
    user_type,
    first_name,
    last_name,
    phone,
    about_me,
    city,
    country,
    languages,
    gender
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      $or: [
        { username },
        { email }
      ]
    }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists',
      message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
    });
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password_hash: password, // Will be hashed by the model hook
    user_type,
    first_name,
    last_name,
    phone,
    about_me,
    city,
    country,
    languages: languages || [],
    gender
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, user_type: user.user_type },
    process.env.JWT_SECRET || 'dev-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: user.toJSON(),
    token
  });
}));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email
 *               password:
 *                 type: string
 *                 description: Password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { username, password } = req.body;

  // Find user by username or email
  const user = await User.findOne({
    where: {
      $or: [
        { username },
        { email: username }
      ]
    }
  });

  if (!user || !(await user.checkPassword(password))) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      message: 'Username/email or password is incorrect'
    });
  }

  if (!user.is_active) {
    return res.status(401).json({
      success: false,
      error: 'Account deactivated',
      message: 'Your account has been deactivated'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, user_type: user.user_type },
    process.env.JWT_SECRET || 'dev-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    user: user.toJSON(),
    token
  });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token. For additional security, you could
  // maintain a blacklist of tokens, but that's not implemented here.
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user.toJSON()
  });
}));

module.exports = router;

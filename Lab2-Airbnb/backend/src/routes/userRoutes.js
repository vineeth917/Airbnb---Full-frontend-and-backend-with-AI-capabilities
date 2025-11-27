/**
 * User Routes
 * Handles user profile management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
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
router.get('/profile', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user.toJSON()
  });
}));

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *               profile_picture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', [
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
    .withMessage('Gender must be male, female, or other'),
  body('profile_picture')
    .optional()
    .isURL()
    .withMessage('Profile picture must be a valid URL')
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
    first_name,
    last_name,
    phone,
    about_me,
    city,
    country,
    languages,
    gender,
    profile_picture
  } = req.body;

  // Update user profile
  await req.user.update({
    first_name: first_name || req.user.first_name,
    last_name: last_name || req.user.last_name,
    phone: phone || req.user.phone,
    about_me: about_me || req.user.about_me,
    city: city || req.user.city,
    country: country || req.user.country,
    languages: languages || req.user.languages,
    gender: gender || req.user.gender,
    profile_picture: profile_picture || req.user.profile_picture
  });

  // Refresh user data
  await req.user.reload();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: req.user.toJSON()
  });
}));

module.exports = router;

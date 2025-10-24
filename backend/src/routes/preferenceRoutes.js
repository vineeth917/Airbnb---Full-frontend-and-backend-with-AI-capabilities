/**
 * Preference Routes
 * Handles user preferences management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { UserPreference } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  let preferences = await UserPreference.findOne({
    where: { user_id: req.user.id }
  });

  if (!preferences) {
    // Create default preferences if none exist
    preferences = await UserPreference.create({
      user_id: req.user.id,
      budget_min: null,
      budget_max: null,
      property_types: [],
      amenities: [],
      locations: []
    });
  }

  res.json({
    success: true,
    preferences
  });
}));

/**
 * @swagger
 * /api/preferences:
 *   put:
 *     summary: Update user preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               budget_min:
 *                 type: number
 *                 format: decimal
 *               budget_max:
 *                 type: number
 *                 format: decimal
 *               property_types:
 *                 type: array
 *                 items:
 *                   type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/', authenticateToken, [
  body('budget_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget min must be a positive number'),
  body('budget_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget max must be a positive number'),
  body('property_types')
    .optional()
    .isArray()
    .withMessage('Property types must be an array'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('locations')
    .optional()
    .isArray()
    .withMessage('Locations must be an array')
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

  const { budget_min, budget_max, property_types, amenities, locations } = req.body;

  // Validate budget range
  if (budget_min && budget_max && budget_min > budget_max) {
    return res.status(400).json({
      success: false,
      error: 'Invalid budget range',
      message: 'Minimum budget cannot be greater than maximum budget'
    });
  }

  // Find or create preferences
  let preferences = await UserPreference.findOne({
    where: { user_id: req.user.id }
  });

  if (!preferences) {
    preferences = await UserPreference.create({
      user_id: req.user.id,
      budget_min,
      budget_max,
      property_types: property_types || [],
      amenities: amenities || [],
      locations: locations || []
    });
  } else {
    await preferences.update({
      budget_min: budget_min !== undefined ? budget_min : preferences.budget_min,
      budget_max: budget_max !== undefined ? budget_max : preferences.budget_max,
      property_types: property_types !== undefined ? property_types : preferences.property_types,
      amenities: amenities !== undefined ? amenities : preferences.amenities,
      locations: locations !== undefined ? locations : preferences.locations
    });
  }

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    preferences
  });
}));

module.exports = router;

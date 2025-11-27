/**
 * Availability Routes
 * Handles property availability management
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Availability, Listing } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireOwner, checkResourceOwnership } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/availability/{listingId}:
 *   get:
 *     summary: Get listing availability
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Availability retrieved successfully
 *       404:
 *         description: Listing not found
 */
router.get('/:listingId', [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format')
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

  const { listingId } = req.params;
  const { start_date, end_date } = req.query;

  // Check if listing exists
  const listing = await Listing.findByPk(listingId);
  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  // Build where clause
  const whereClause = { listing_id: listingId };
  
  if (start_date && end_date) {
    whereClause.date = {
      [Op.between]: [start_date, end_date]
    };
  } else if (start_date) {
    whereClause.date = {
      [Op.gte]: start_date
    };
  } else if (end_date) {
    whereClause.date = {
      [Op.lte]: end_date
    };
  }

  const availability = await Availability.findAll({
    where: whereClause,
    order: [['date', 'ASC']]
  });

  res.json({
    success: true,
    availability
  });
}));

/**
 * @swagger
 * /api/availability/{listingId}:
 *   put:
 *     summary: Update listing availability
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *         schema:
 *           type: object
 *           properties:
 *             dates:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   is_available:
 *                     type: boolean
 *                   price_override:
 *                     type: number
 *                     format: decimal
 *                   min_nights:
 *                     type: integer
 *                   max_nights:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Owner privileges required
 *       404:
 *         description: Listing not found
 */
router.put('/:listingId', authenticateToken, requireOwner, [
  body('dates')
    .isArray()
    .withMessage('Dates must be an array'),
  body('dates.*.date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('dates.*.is_available')
    .isBoolean()
    .withMessage('is_available must be a boolean'),
  body('dates.*.price_override')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price override must be a positive number'),
  body('dates.*.min_nights')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min nights must be a positive integer'),
  body('dates.*.max_nights')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max nights must be a positive integer')
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

  const { listingId } = req.params;
  const { dates } = req.body;

  // Check if listing exists and belongs to user
  const listing = await Listing.findOne({
    where: {
      id: listingId,
      host_id: req.user.id
    }
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found or access denied'
    });
  }

  // Update or create availability records
  for (const dateData of dates) {
    const { date, is_available, price_override, min_nights, max_nights } = dateData;

    await Availability.upsert({
      listing_id: listingId,
      date,
      is_available,
      price_override: price_override || null,
      min_nights: min_nights || null,
      max_nights: max_nights || null
    });
  }

  res.json({
    success: true,
    message: 'Availability updated successfully'
  });
}));

/**
 * @swagger
 * /api/availability/{listingId}/bulk:
 *   post:
 *     summary: Bulk update availability
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *         schema:
 *           type: object
 *           properties:
 *             start_date:
 *               type: string
 *               format: date
 *             end_date:
 *               type: string
 *               format: date
 *             is_available:
 *               type: boolean
 *             price_override:
 *               type: number
 *               format: decimal
 *             min_nights:
 *               type: integer
 *             max_nights:
 *               type: integer
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Owner privileges required
 *       404:
 *         description: Listing not found
 */
router.post('/:listingId/bulk', authenticateToken, requireOwner, [
  body('start_date')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('end_date')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('is_available')
    .isBoolean()
    .withMessage('is_available must be a boolean'),
  body('price_override')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price override must be a positive number'),
  body('min_nights')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min nights must be a positive integer'),
  body('max_nights')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max nights must be a positive integer')
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

  const { listingId } = req.params;
  const { start_date, end_date, is_available, price_override, min_nights, max_nights } = req.body;

  // Validate date range
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  if (startDate >= endDate) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date range',
      message: 'End date must be after start date'
    });
  }

  // Check if listing exists and belongs to user
  const listing = await Listing.findOne({
    where: {
      id: listingId,
      host_id: req.user.id
    }
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found or access denied'
    });
  }

  // Generate dates between start and end
  const dates = [];
  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Bulk update availability
  const bulkData = dates.map(date => ({
    listing_id: listingId,
    date: date.toISOString().split('T')[0],
    is_available,
    price_override: price_override || null,
    min_nights: min_nights || null,
    max_nights: max_nights || null
  }));

  await Availability.bulkCreate(bulkData, {
    updateOnDuplicate: ['is_available', 'price_override', 'min_nights', 'max_nights', 'updated_at']
  });

  res.json({
    success: true,
    message: 'Bulk availability update completed',
    updated_dates: dates.length
  });
}));

module.exports = router;

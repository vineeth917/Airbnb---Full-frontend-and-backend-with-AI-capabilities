/**
 * Booking Routes
 * Handles booking management
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Booking, Listing, User } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, checkResourceOwnership } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - listing_id
 *         - check_in
 *         - check_out
 *         - total_price
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Booking ID
 *         listing_id:
 *           type: string
 *           format: uuid
 *           description: Listing ID
 *         guest_id:
 *           type: string
 *           format: uuid
 *           description: Guest user ID
 *         host_id:
 *           type: string
 *           format: uuid
 *           description: Host user ID
 *         check_in:
 *           type: string
 *           format: date
 *           description: Check-in date
 *         check_out:
 *           type: string
 *           format: date
 *           description: Check-out date
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *           description: Booking status
 *         total_price:
 *           type: number
 *           format: decimal
 *           description: Total booking price
 *         special_requests:
 *           type: string
 *           description: Special requests
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get user bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: Filter by booking status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', [
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], authenticateToken, asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { status, page = 1, limit = 10 } = req.query;

  // Build where clause based on user type
  let whereClause;
  if (req.user.user_type === 'owner') {
    whereClause = { host_id: req.user.id };
  } else {
    whereClause = { guest_id: req.user.id };
  }

  if (status) {
    whereClause.status = status;
  }

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get bookings with pagination
  const { count, rows: bookings } = await Booking.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Listing,
        as: 'listing',
        attributes: ['id', 'title', 'location', 'property_type', 'price_per_night']
      },
      {
        model: User,
        as: req.user.user_type === 'owner' ? 'guest' : 'host',
        attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture']
      }
    ],
    limit: parseInt(limit),
    offset,
    order: [['created_at', 'DESC']]
  });

  const totalPages = Math.ceil(count / parseInt(limit));

  res.json({
    success: true,
    bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: totalPages
    }
  });
}));

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listing_id
 *               - check_in
 *               - check_out
 *             properties:
 *               listing_id:
 *                 type: string
 *                 format: uuid
 *                 description: Listing ID
 *               check_in:
 *                 type: string
 *                 format: date
 *                 description: Check-in date
 *               check_out:
 *                 type: string
 *                 format: date
 *                 description: Check-out date
 *               special_requests:
 *                 type: string
 *                 description: Special requests
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Traveler privileges required
 */
router.post('/', authenticateToken, [
  body('listing_id')
    .isUUID()
    .withMessage('Valid listing ID is required'),
  body('check_in')
    .isISO8601()
    .withMessage('Valid check-in date is required')
    .custom((value) => {
      const checkInDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkInDate < today) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  body('check_out')
    .isISO8601()
    .withMessage('Valid check-out date is required')
    .custom((value, { req }) => {
      const checkOutDate = new Date(value);
      const checkInDate = new Date(req.body.check_in);
      if (checkOutDate <= checkInDate) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),
  body('special_requests')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special requests must be less than 500 characters')
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

  // Only travelers can create bookings
  if (req.user.user_type !== 'traveler') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Only travelers can create bookings'
    });
  }

  const { listing_id, check_in, check_out, special_requests } = req.body;

  // Get listing details
  const listing = await Listing.findByPk(listing_id, {
    include: [
      {
        model: User,
        as: 'host',
        attributes: ['id']
      }
    ]
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  if (!listing.is_active) {
    return res.status(400).json({
      success: false,
      error: 'Listing is not available'
    });
  }

  // Check for existing bookings in the same date range
  const existingBooking = await Booking.findOne({
    where: {
      listing_id,
      status: ['pending', 'confirmed'],
      [Op.or]: [
        {
          check_in: {
            [Op.between]: [check_in, check_out]
          }
        },
        {
          check_out: {
            [Op.between]: [check_in, check_out]
          }
        },
        {
          [Op.and]: [
            { check_in: { [Op.lte]: check_in } },
            { check_out: { [Op.gte]: check_out } }
          ]
        }
      ]
    }
  });

  if (existingBooking) {
    return res.status(400).json({
      success: false,
      error: 'Dates not available',
      message: 'The selected dates are already booked'
    });
  }

  // Calculate total price
  const checkInDate = new Date(check_in);
  const checkOutDate = new Date(check_out);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const total_price = nights * parseFloat(listing.price_per_night);

  // Create booking
  const booking = await Booking.create({
    listing_id,
    guest_id: req.user.id,
    host_id: listing.host.id,
    check_in,
    check_out,
    total_price,
    special_requests,
    status: 'pending'
  });

  // Include related data in response
  const bookingWithDetails = await Booking.findByPk(booking.id, {
    include: [
      {
        model: Listing,
        as: 'listing',
        attributes: ['id', 'title', 'location', 'property_type']
      },
      {
        model: User,
        as: 'host',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    booking: bookingWithDetails
  });
}));

/**
 * @swagger
 * /api/bookings/{id}/accept:
 *   post:
 *     summary: Accept booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking not found
 */
router.post('/:id/accept', authenticateToken, checkResourceOwnership('booking'), asyncHandler(async (req, res) => {
  const booking = req.resource;

  // Only hosts can accept bookings
  if (req.user.user_type !== 'owner' || booking.host_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Only the host can accept this booking'
    });
  }

  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: 'Invalid booking status',
      message: 'Only pending bookings can be accepted'
    });
  }

  await booking.update({ status: 'confirmed' });

  res.json({
    success: true,
    message: 'Booking accepted successfully',
    booking
  });
}));

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellation_reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking not found
 */
router.post('/:id/cancel', authenticateToken, checkResourceOwnership('booking'), [
  body('cancellation_reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must be less than 500 characters')
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

  const booking = req.resource;
  const { cancellation_reason } = req.body;

  // Check if user can cancel this booking
  const canCancel = booking.guest_id === req.user.id || booking.host_id === req.user.id;
  if (!canCancel) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only cancel your own bookings'
    });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      error: 'Booking already cancelled'
    });
  }

  await booking.update({ 
    status: 'cancelled',
    cancellation_reason: cancellation_reason || null
  });

  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    booking
  });
}));

module.exports = router;

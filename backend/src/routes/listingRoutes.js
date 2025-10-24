/**
 * Listing Routes
 * Handles property listing management
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Listing, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireOwner, checkResourceOwnership } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Listing:
 *       type: object
 *       required:
 *         - title
 *         - price_per_night
 *         - location
 *         - property_type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Listing ID
 *         title:
 *           type: string
 *           description: Property title
 *         description:
 *           type: string
 *           description: Property description
 *         price_per_night:
 *           type: number
 *           format: decimal
 *           description: Price per night
 *         location:
 *           type: string
 *           description: Property location
 *         latitude:
 *           type: number
 *           format: decimal
 *           description: Latitude coordinate
 *         longitude:
 *           type: number
 *           format: decimal
 *           description: Longitude coordinate
 *         property_type:
 *           type: string
 *           enum: [apartment, house, condo, villa, studio, loft, townhouse]
 *           description: Property type
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           description: Property amenities
 *         max_guests:
 *           type: integer
 *           description: Maximum guests
 *         bedrooms:
 *           type: integer
 *           description: Number of bedrooms
 *         bathrooms:
 *           type: number
 *           format: decimal
 *           description: Number of bathrooms
 *         host_id:
 *           type: string
 *           format: uuid
 *           description: Host user ID
 *         is_active:
 *           type: boolean
 *           description: Listing active status
 */

/**
 * @swagger
 * /api/listings:
 *   get:
 *     summary: Get all listings
 *     tags: [Listings]
 *     parameters:
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
 *       - in: query
 *         name: property_type
 *         schema:
 *           type: string
 *         description: Filter by property type
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location search
 *     responses:
 *       200:
 *         description: Listings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 listings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
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
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('min_price').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('max_price').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number')
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
    page = 1,
    limit = 10,
    property_type,
    min_price,
    max_price,
    location
  } = req.query;

  // Build where clause
  const whereClause = { is_active: true };
  
  if (property_type) {
    whereClause.property_type = property_type;
  }
  
  if (min_price || max_price) {
    whereClause.price_per_night = {};
    if (min_price) whereClause.price_per_night[Op.gte] = parseFloat(min_price);
    if (max_price) whereClause.price_per_night[Op.lte] = parseFloat(max_price);
  }
  
  if (location) {
    whereClause.location = {
      [Op.iLike]: `%${location}%`
    };
  }

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get listings with pagination
  const { count, rows: listings } = await Listing.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'host',
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
    listings,
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
 * /api/listings/{id}:
 *   get:
 *     summary: Get listing by ID
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 listing:
 *                   $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const listing = await Listing.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'host',
        attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture', 'phone']
      }
    ]
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  res.json({
    success: true,
    listing
  });
}));

/**
 * @swagger
 * /api/listings:
 *   post:
 *     summary: Create new listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price_per_night
 *               - location
 *               - property_type
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price_per_night:
 *                 type: number
 *                 format: decimal
 *               location:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: decimal
 *               longitude:
 *                 type: number
 *                 format: decimal
 *               property_type:
 *                 type: string
 *                 enum: [apartment, house, condo, villa, studio, loft, townhouse]
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               max_guests:
 *                 type: integer
 *               bedrooms:
 *                 type: integer
 *               bathrooms:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       201:
 *         description: Listing created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Owner privileges required
 */
router.post('/', authenticateToken, requireOwner, [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('price_per_night')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Price must be between $1 and $10,000'),
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters'),
  body('property_type')
    .isIn(['apartment', 'house', 'condo', 'villa', 'studio', 'loft', 'townhouse'])
    .withMessage('Invalid property type'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('max_guests')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max guests must be between 1 and 20'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),
  body('bathrooms')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20')
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

  const listing = await Listing.create({
    title,
    description,
    price_per_night,
    location,
    latitude,
    longitude,
    property_type,
    amenities: amenities || [],
    max_guests: max_guests || 1,
    bedrooms: bedrooms || 1,
    bathrooms: bathrooms || 1.0,
    host_id: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Listing created successfully',
    listing
  });
}));

/**
 * @swagger
 * /api/listings/{id}:
 *   put:
 *     summary: Update listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price_per_night:
 *                 type: number
 *                 format: decimal
 *               location:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: decimal
 *               longitude:
 *                 type: number
 *                 format: decimal
 *               property_type:
 *                 type: string
 *                 enum: [apartment, house, condo, villa, studio, loft, townhouse]
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               max_guests:
 *                 type: integer
 *               bedrooms:
 *                 type: integer
 *               bathrooms:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       200:
 *         description: Listing updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Listing not found
 */
router.put('/:id', authenticateToken, checkResourceOwnership('listing'), [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('price_per_night')
    .optional()
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Price must be between $1 and $10,000'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters'),
  body('property_type')
    .optional()
    .isIn(['apartment', 'house', 'condo', 'villa', 'studio', 'loft', 'townhouse'])
    .withMessage('Invalid property type'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('max_guests')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max guests must be between 1 and 20'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),
  body('bathrooms')
    .optional()
    .isFloat({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20')
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

  const updateData = req.body;
  await req.resource.update(updateData);

  res.json({
    success: true,
    message: 'Listing updated successfully',
    listing: req.resource
  });
}));

/**
 * @swagger
 * /api/listings/{id}:
 *   delete:
 *     summary: Delete listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Listing not found
 */
router.delete('/:id', authenticateToken, checkResourceOwnership('listing'), asyncHandler(async (req, res) => {
  await req.resource.destroy();

  res.json({
    success: true,
    message: 'Listing deleted successfully'
  });
}));

module.exports = router;

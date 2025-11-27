/**
 * Favorite Routes
 * Handles user favorites management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Favorite, Listing, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get user favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 favorites:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       listing:
 *                         $ref: '#/components/schemas/Listing'
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const favorites = await Favorite.findAll({
    where: { user_id: req.user.id },
    include: [
      {
        model: Listing,
        as: 'listing',
        include: [
          {
            model: User,
            as: 'host',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture']
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    favorites
  });
}));

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Add favorite
 *     tags: [Favorites]
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
 *             properties:
 *               listing_id:
 *                 type: string
 *                 format: uuid
 *                 description: Listing ID to add to favorites
 *     responses:
 *       201:
 *         description: Favorite added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Already in favorites
 */
router.post('/', authenticateToken, [
  body('listing_id')
    .isUUID()
    .withMessage('Valid listing ID is required')
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

  const { listing_id } = req.body;

  // Check if listing exists
  const listing = await Listing.findByPk(listing_id);
  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found'
    });
  }

  // Check if already in favorites
  const existingFavorite = await Favorite.findOne({
    where: {
      user_id: req.user.id,
      listing_id
    }
  });

  if (existingFavorite) {
    return res.status(409).json({
      success: false,
      error: 'Already in favorites',
      message: 'This listing is already in your favorites'
    });
  }

  // Add to favorites
  const favorite = await Favorite.create({
    user_id: req.user.id,
    listing_id
  });

  // Include listing details
  const favoriteWithListing = await Favorite.findByPk(favorite.id, {
    include: [
      {
        model: Listing,
        as: 'listing',
        include: [
          {
            model: User,
            as: 'host',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_picture']
          }
        ]
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Added to favorites successfully',
    favorite: favoriteWithListing
  });
}));

/**
 * @swagger
 * /api/favorites/{listingId}:
 *   delete:
 *     summary: Remove favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID to remove from favorites
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite not found
 */
router.delete('/:listingId', authenticateToken, asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  const favorite = await Favorite.findOne({
    where: {
      user_id: req.user.id,
      listing_id: listingId
    }
  });

  if (!favorite) {
    return res.status(404).json({
      success: false,
      error: 'Favorite not found',
      message: 'This listing is not in your favorites'
    });
  }

  await favorite.destroy();

  res.json({
    success: true,
    message: 'Removed from favorites successfully'
  });
}));

module.exports = router;

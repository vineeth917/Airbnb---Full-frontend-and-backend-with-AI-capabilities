/**
 * Analytics Routes
 * Handles analytics and reporting
 */

const express = require('express');
const { Booking, Listing, User } = require('../models');
const { Op } = require('sequelize');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireOwner } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/analytics/host/{hostId}:
 *   get:
 *     summary: Get host analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Host ID
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Host not found
 */
router.get('/host/:hostId', authenticateToken, requireOwner, asyncHandler(async (req, res) => {
  const { hostId } = req.params;

  // Verify host exists and user has access
  const host = await User.findByPk(hostId);
  if (!host || host.user_type !== 'owner') {
    return res.status(404).json({
      success: false,
      error: 'Host not found'
    });
  }

  // Check if user is accessing their own analytics
  if (req.user.id !== hostId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only view your own analytics'
    });
  }

  // Get host's listings
  const listings = await Listing.findAll({
    where: { host_id: hostId },
    attributes: ['id']
  });
  const listingIds = listings.map(listing => listing.id);

  // Get all bookings for host's listings
  const bookings = await Booking.findAll({
    where: {
      host_id: hostId,
      status: ['confirmed', 'cancelled']
    },
    include: [
      {
        model: Listing,
        as: 'listing',
        attributes: ['id', 'title', 'price_per_night']
      },
      {
        model: User,
        as: 'guest',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Calculate metrics
  const totalRevenue = bookings
    .filter(booking => booking.status === 'confirmed')
    .reduce((sum, booking) => sum + parseFloat(booking.total_price), 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed');
  const cancelledBookings = bookings.filter(booking => booking.status === 'cancelled');

  // Calculate occupancy rate (simplified)
  const totalNights = confirmedBookings.reduce((sum, booking) => {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return sum + nights;
  }, 0);

  // Assume 365 days for occupancy calculation
  const totalAvailableNights = listings.length * 365;
  const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

  // Calculate average rating (mock data for now)
  const averageRating = 4.8;

  // Get recent bookings (last 10)
  const recentBookings = bookings.slice(0, 10);

  // Get upcoming bookings (confirmed, check-in in future)
  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = confirmedBookings.filter(booking => booking.check_in >= today);

  // Monthly revenue breakdown (last 12 months)
  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthBookings = confirmedBookings.filter(booking => {
      const bookingDate = new Date(booking.created_at);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });
    
    const monthRevenue = monthBookings.reduce((sum, booking) => sum + parseFloat(booking.total_price), 0);
    
    monthlyRevenue.push({
      month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      revenue: monthRevenue
    });
  }

  // Popular amenities (mock data)
  const popularAmenities = ['WiFi', 'Kitchen', 'Parking', 'Pool', 'Gym'];

  res.json({
    success: true,
    analytics: {
      total_revenue: totalRevenue,
      total_bookings: totalBookings,
      confirmed_bookings: confirmedBookings.length,
      cancelled_bookings: cancelledBookings.length,
      average_rating: averageRating,
      occupancy_rate: Math.round(occupancyRate * 100) / 100,
      recent_bookings: recentBookings,
      upcoming_bookings: upcomingBookings,
      monthly_revenue: monthlyRevenue,
      popular_amenities: popularAmenities,
      total_listings: listings.length
    }
  });
}));

module.exports = router;

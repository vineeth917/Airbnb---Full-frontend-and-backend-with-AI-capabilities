"""
Booking Service - Lab 2 Airbnb Microservices
Distributed Systems for Data Engineering (DATA 236)

This service handles booking operations:
- Booking creation and management
- Status updates (pending, confirmed, cancelled)
- Date validation
- Price calculation
- Kafka event publishing for booking requests
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from kafka import KafkaProducer
import os
import logging
import uuid
import json
import jwt
from functools import wraps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Configuration
MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://mongodb:27017/airbnb_lab')
KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092').split(',')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Initialize MongoDB
try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client['airbnb_lab']
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Initialize Kafka Producer
try:
    kafka_producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        acks='all',
        retries=3
    )
    logger.info("Kafka producer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Kafka producer: {str(e)}")
    kafka_producer = None

# Enable CORS
CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'], supports_credentials=True)

def verify_jwt_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        if token.startswith('Bearer '):
            token = token[7:]
        payload, error = verify_jwt_token(token)
        if error:
            return jsonify({'error': error}), 401
        request.user = payload
        return f(*args, **kwargs)
    return decorated_function

def publish_booking_request(booking_data):
    """Publish booking request event to Kafka"""
    if not kafka_producer:
        logger.warning("Kafka producer not available")
        return False
    
    try:
        event = {
            'event_type': 'booking_created',
            'event_id': str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat(),
            'booking_id': booking_data['_id'],
            'listing_id': booking_data['listing_id'],
            'guest_id': booking_data['guest_id'],
            'host_id': booking_data.get('host_id'),
            'check_in': booking_data['check_in'].isoformat() if isinstance(booking_data['check_in'], datetime) else str(booking_data['check_in']),
            'check_out': booking_data['check_out'].isoformat() if isinstance(booking_data['check_out'], datetime) else str(booking_data['check_out']),
            'total_price': booking_data['total_price'],
            'status': booking_data['status'],
            'metadata': {
                'guest_count': booking_data.get('guest_count', 1),
                'special_requests': booking_data.get('special_requests', '')
            }
        }
        
        kafka_producer.send('booking-requests', value=event)
        kafka_producer.flush()
        logger.info(f"Published booking request for {booking_data['_id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to publish booking request: {str(e)}")
        return False

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    try:
        db.command('ping')
        return jsonify({
            'status': 'healthy',
            'service': 'booking-service',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'booking-service',
            'error': str(e)
        }), 503

# Booking Routes
@app.route('/api/bookings', methods=['POST'])
@require_auth
def create_booking():
    """Create a new booking"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['listing_id', 'check_in', 'check_out']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get listing details
        listing = db.listings.find_one({'_id': data['listing_id']})
        if not listing or not listing.get('is_active'):
            return jsonify({'error': 'Listing not found or inactive'}), 404
        
        # Parse dates
        try:
            check_in = datetime.fromisoformat(data['check_in'].replace('Z', '+00:00'))
            check_out = datetime.fromisoformat(data['check_out'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use ISO format'}), 400
        
        # Validate dates
        if check_out <= check_in:
            return jsonify({'error': 'Check-out must be after check-in'}), 400
        
        if check_in.date() < datetime.now().date():
            return jsonify({'error': 'Check-in date cannot be in the past'}), 400
        
        # Calculate price
        nights = (check_out - check_in).days
        total_price = nights * listing['price_per_night']
        
        # Check for overlapping bookings
        overlapping = db.bookings.find_one({
            'listing_id': data['listing_id'],
            'status': {'$in': ['pending', 'confirmed']},
            '$or': [
                {
                    'check_in': {'$lte': check_in},
                    'check_out': {'$gt': check_in}
                },
                {
                    'check_in': {'$lt': check_out},
                    'check_out': {'$gte': check_out}
                },
                {
                    'check_in': {'$gte': check_in},
                    'check_out': {'$lte': check_out}
                }
            ]
        })
        
        if overlapping:
            return jsonify({'error': 'Dates not available'}), 409
        
        # Create booking
        booking_doc = {
            '_id': str(uuid.uuid4()),
            'listing_id': data['listing_id'],
            'guest_id': request.user['user_id'],
            'host_id': listing['host_id'],
            'check_in': check_in,
            'check_out': check_out,
            'total_price': total_price,
            'status': 'pending',
            'guest_count': int(data.get('guest_count', 1)),
            'special_requests': data.get('special_requests', ''),
            'payment_status': 'pending',
            'version': 1,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert booking
        db.bookings.insert_one(booking_doc)
        
        # Publish event to Kafka
        publish_booking_request(booking_doc)
        
        logger.info(f"Created new booking: {booking_doc['_id']}")
        return jsonify(booking_doc), 201
        
    except Exception as e:
        logger.error(f"Error creating booking: {str(e)}")
        return jsonify({'error': 'Failed to create booking'}), 500

@app.route('/api/bookings/<booking_id>', methods=['GET'])
@require_auth
def get_booking(booking_id):
    """Get a specific booking by ID"""
    try:
        booking = db.bookings.find_one({'_id': booking_id})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Verify access (guest or host)
        listing = db.listings.find_one({'_id': booking['listing_id']})
        if booking['guest_id'] != request.user['user_id'] and listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Add listing details
        booking['listing'] = listing
        
        return jsonify(booking), 200
        
    except Exception as e:
        logger.error(f"Error retrieving booking: {str(e)}")
        return jsonify({'error': 'Failed to retrieve booking'}), 500

@app.route('/api/bookings/user/<user_id>', methods=['GET'])
@require_auth
def get_user_bookings(user_id):
    """Get bookings for a specific user"""
    try:
        # Verify user can access these bookings
        if user_id != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        user_type = request.args.get('user_type', 'traveler')
        
        if user_type == 'traveler':
            # Get bookings where user is the guest
            bookings = list(db.bookings.find({'guest_id': user_id}))
        elif user_type == 'owner':
            # Get bookings for properties owned by user
            properties = list(db.listings.find({'host_id': user_id}))
            property_ids = [prop['_id'] for prop in properties]
            bookings = list(db.bookings.find({'listing_id': {'$in': property_ids}}))
        else:
            return jsonify({'error': 'Invalid user_type'}), 400
        
        # Add listing details
        for booking in bookings:
            listing = db.listings.find_one({'_id': booking['listing_id']})
            if listing:
                booking['listing'] = listing
        
        return jsonify({'bookings': bookings}), 200
        
    except Exception as e:
        logger.error(f"Error fetching user bookings: {str(e)}")
        return jsonify({'error': 'Failed to fetch bookings'}), 500

@app.route('/api/bookings/<booking_id>', methods=['PUT'])
@require_auth
def update_booking(booking_id):
    """Update booking status"""
    try:
        booking = db.bookings.find_one({'_id': booking_id})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Verify access
        listing = db.listings.find_one({'_id': booking['listing_id']})
        if booking['guest_id'] != request.user['user_id'] and listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update allowed fields
        allowed_fields = ['status', 'special_requests', 'guest_count']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = datetime.utcnow()
        update_data['version'] = booking.get('version', 1) + 1
        
        result = db.bookings.update_one(
            {'_id': booking_id},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
        
        updated_booking = db.bookings.find_one({'_id': booking_id})
        
        logger.info(f"Updated booking: {booking_id}")
        return jsonify(updated_booking), 200
        
    except Exception as e:
        logger.error(f"Error updating booking: {str(e)}")
        return jsonify({'error': 'Failed to update booking'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5004))
    logger.info(f"Starting Booking Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


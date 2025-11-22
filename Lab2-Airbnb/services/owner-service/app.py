"""
Owner Service - Lab 2 Airbnb Microservices
Distributed Systems for Data Engineering (DATA 236)

This service handles owner-specific operations:
- Owner authentication
- Booking management (accept/cancel)
- Property analytics
- Availability management
- Kafka consumer for booking requests
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from kafka import KafkaConsumer, KafkaProducer
import os
import logging
import bcrypt
import uuid
import re
import json
import threading
from email_validator import validate_email, EmailNotValidError
from functools import wraps
import jwt

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
JWT_EXPIRATION_HOURS = 24

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

# Utility functions (similar to traveler service)
def validate_input(data, required_fields=None, max_lengths=None):
    if not isinstance(data, dict):
        return False, "Invalid data format"
    if required_fields:
        for field in required_fields:
            if field not in data or not data[field]:
                return False, f"Missing required field: {field}"
    if max_lengths:
        for field, max_len in max_lengths.items():
            if field in data and len(str(data[field])) > max_len:
                return False, f"Field {field} exceeds maximum length of {max_len}"
    return True, "Valid"

def sanitize_string(text):
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r'[<>"\']', '', text)
    return text.strip()

def validate_email_format(email):
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

def validate_password_strength(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_jwt_token(user_data):
    payload = {
        'user_id': str(user_data['_id']),
        'username': user_data['username'],
        'user_type': user_data['user_type'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

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

# Kafka Functions
def publish_booking_update(booking_id, status, message):
    """Publish booking status update to Kafka"""
    if not kafka_producer:
        logger.warning("Kafka producer not available")
        return False
    
    try:
        event = {
            'event_type': 'booking_status_updated',
            'event_id': str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat(),
            'booking_id': booking_id,
            'new_status': status,
            'message': message
        }
        
        kafka_producer.send('booking-updates', value=event)
        kafka_producer.flush()
        logger.info(f"Published booking update for {booking_id}: {status}")
        return True
    except Exception as e:
        logger.error(f"Failed to publish booking update: {str(e)}")
        return False

def start_kafka_consumer():
    """Start Kafka consumer in background thread"""
    try:
        consumer = KafkaConsumer(
            'booking-requests',
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id='owner-service-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=True
        )
        
        logger.info("Kafka consumer started successfully")
        
        for message in consumer:
            try:
                event = message.value
                logger.info(f"Received booking request: {event.get('booking_id')}")
                # Process booking request event (update owner notifications, etc.)
                # In a real implementation, you'd notify the owner or update a notification queue
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                
    except Exception as e:
        logger.error(f"Failed to start Kafka consumer: {str(e)}")

# Start Kafka consumer in background thread
if kafka_producer:
    consumer_thread = threading.Thread(target=start_kafka_consumer, daemon=True)
    consumer_thread.start()

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    try:
        db.command('ping')
        return jsonify({
            'status': 'healthy',
            'service': 'owner-service',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'owner-service',
            'error': str(e)
        }), 503

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new owner"""
    try:
        data = request.get_json()
        
        is_valid, error_msg = validate_input(data, required_fields=['username', 'email', 'password'])
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Sanitize and validate
        data['username'] = sanitize_string(data['username'])
        data['email'] = sanitize_string(data['email'])
        
        if not validate_email_format(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        is_strong, pwd_error = validate_password_strength(data['password'])
        if not is_strong:
            return jsonify({'error': pwd_error}), 400
        
        if not re.match(r'^[a-zA-Z0-9_]+$', data['username']):
            return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400
        
        # Check if exists
        if db.users.find_one({'username': data['username']}):
            return jsonify({'error': 'Username already exists'}), 409
        
        if db.users.find_one({'email': data['email']}):
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create owner
        user_doc = {
            '_id': str(uuid.uuid4()),
            'username': data['username'],
            'email': data['email'],
            'password_hash': hash_password(data['password']),
            'user_type': 'owner',
            'first_name': data.get('first_name', ''),
            'last_name': data.get('last_name', ''),
            'phone': data.get('phone', ''),
            'profile': {
                'about_me': data.get('about_me', ''),
                'city': data.get('city', ''),
                'country': data.get('country', ''),
                'languages': data.get('languages', []),
                'gender': data.get('gender', '')
            },
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        db.users.insert_one(user_doc)
        user_doc.pop('password_hash')
        
        logger.info(f"New owner registered: {user_doc['username']}")
        return jsonify({
            'message': 'Owner registered successfully',
            'user': user_doc
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering owner: {str(e)}")
        return jsonify({'error': 'Failed to register owner'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login owner and generate JWT token"""
    try:
        data = request.get_json()
        
        is_valid, error_msg = validate_input(data, required_fields=['username', 'password'])
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        username = sanitize_string(data['username'])
        
        user = db.users.find_one({
            '$or': [{'username': username}, {'email': username}],
            'user_type': 'owner'
        })
        
        if not user or not check_password(data['password'], user['password_hash']):
            logger.warning(f"Failed login attempt for owner: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.get('is_active', False):
            return jsonify({'error': 'Account is deactivated'}), 401
        
        token = generate_jwt_token(user)
        user.pop('password_hash')
        
        logger.info(f"Owner logged in: {user['username']}")
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

# Booking Management Routes
@app.route('/api/bookings', methods=['GET'])
@require_auth
def get_bookings():
    """Get bookings for owner's properties"""
    try:
        # Get all properties owned by this owner
        properties = list(db.listings.find({'host_id': request.user['user_id']}))
        property_ids = [prop['_id'] for prop in properties]
        
        # Get bookings for these properties
        bookings = list(db.bookings.find({'listing_id': {'$in': property_ids}}))
        
        # Add listing details
        for booking in bookings:
            listing = db.listings.find_one({'_id': booking['listing_id']})
            if listing:
                booking['listing'] = listing
        
        return jsonify({'bookings': bookings}), 200
        
    except Exception as e:
        logger.error(f"Error fetching bookings: {str(e)}")
        return jsonify({'error': 'Failed to fetch bookings'}), 500

@app.route('/api/bookings/<booking_id>/accept', methods=['POST'])
@require_auth
def accept_booking(booking_id):
    """Accept a booking request"""
    try:
        booking = db.bookings.find_one({'_id': booking_id})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Verify ownership
        listing = db.listings.find_one({'_id': booking['listing_id']})
        if not listing or listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update booking status
        db.bookings.update_one(
            {'_id': booking_id},
            {'$set': {
                'status': 'confirmed',
                'updated_at': datetime.utcnow()
            }}
        )
        
        # Publish event to Kafka
        publish_booking_update(booking_id, 'confirmed', 'Booking confirmed by owner')
        
        logger.info(f"Booking {booking_id} accepted by owner {request.user['user_id']}")
        return jsonify({
            'message': 'Booking accepted successfully',
            'booking_id': booking_id,
            'status': 'confirmed'
        }), 200
        
    except Exception as e:
        logger.error(f"Error accepting booking: {str(e)}")
        return jsonify({'error': 'Failed to accept booking'}), 500

@app.route('/api/bookings/<booking_id>/cancel', methods=['POST'])
@require_auth
def cancel_booking(booking_id):
    """Cancel a booking"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'No reason provided')
        
        booking = db.bookings.find_one({'_id': booking_id})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Verify ownership
        listing = db.listings.find_one({'_id': booking['listing_id']})
        if not listing or listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update booking status
        db.bookings.update_one(
            {'_id': booking_id},
            {'$set': {
                'status': 'cancelled',
                'cancellation_reason': reason,
                'updated_at': datetime.utcnow()
            }}
        )
        
        # Publish event to Kafka
        publish_booking_update(booking_id, 'cancelled', f'Booking cancelled by owner: {reason}')
        
        logger.info(f"Booking {booking_id} cancelled by owner {request.user['user_id']}")
        return jsonify({
            'message': 'Booking cancelled successfully',
            'booking_id': booking_id,
            'status': 'cancelled'
        }), 200
        
    except Exception as e:
        logger.error(f"Error cancelling booking: {str(e)}")
        return jsonify({'error': 'Failed to cancel booking'}), 500

# Analytics Routes
@app.route('/api/analytics', methods=['GET'])
@require_auth
def get_analytics():
    """Get analytics for owner's properties"""
    try:
        # Get owner's properties
        properties = list(db.listings.find({'host_id': request.user['user_id']}))
        property_ids = [prop['_id'] for prop in properties]
        
        # Get bookings for these properties
        bookings = list(db.bookings.find({'listing_id': {'$in': property_ids}}))
        
        # Calculate metrics
        total_bookings = len(bookings)
        confirmed_bookings = len([b for b in bookings if b['status'] == 'confirmed'])
        total_revenue = sum(b.get('total_price', 0) for b in bookings if b['status'] == 'confirmed')
        
        analytics = {
            'total_properties': len(properties),
            'total_bookings': total_bookings,
            'confirmed_bookings': confirmed_bookings,
            'cancelled_bookings': len([b for b in bookings if b['status'] == 'cancelled']),
            'pending_bookings': len([b for b in bookings if b['status'] == 'pending']),
            'total_revenue': total_revenue,
            'avg_revenue_per_property': total_revenue / len(properties) if properties else 0
        }
        
        return jsonify({'analytics': analytics}), 200
        
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        return jsonify({'error': 'Failed to fetch analytics'}), 500

# Availability Management
@app.route('/api/availability/<listing_id>', methods=['GET'])
@require_auth
def get_availability(listing_id):
    """Get availability for a listing"""
    try:
        # Verify ownership
        listing = db.listings.find_one({'_id': listing_id})
        if not listing or listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = {'listing_id': listing_id}
        if start_date:
            query['date'] = {'$gte': datetime.fromisoformat(start_date).date()}
        if end_date:
            if 'date' in query:
                query['date']['$lte'] = datetime.fromisoformat(end_date).date()
            else:
                query['date'] = {'$lte': datetime.fromisoformat(end_date).date()}
        
        availability = list(db.availability.find(query))
        
        return jsonify({'availability': availability}), 200
        
    except Exception as e:
        logger.error(f"Error fetching availability: {str(e)}")
        return jsonify({'error': 'Failed to fetch availability'}), 500

@app.route('/api/availability/<listing_id>', methods=['PUT'])
@require_auth
def update_availability(listing_id):
    """Update availability for a listing"""
    try:
        # Verify ownership
        listing = db.listings.find_one({'_id': listing_id})
        if not listing or listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        date_str = data.get('date')
        is_available = data.get('is_available', True)
        
        if not date_str:
            return jsonify({'error': 'Date is required'}), 400
        
        date_obj = datetime.fromisoformat(date_str).date()
        
        db.availability.update_one(
            {'listing_id': listing_id, 'date': date_obj},
            {'$set': {
                'is_available': is_available,
                'price_override': data.get('price_override'),
                'updated_at': datetime.utcnow()
            }},
            upsert=True
        )
        
        logger.info(f"Availability updated for listing {listing_id}")
        return jsonify({'message': 'Availability updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating availability: {str(e)}")
        return jsonify({'error': 'Failed to update availability'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    logger.info(f"Starting Owner Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


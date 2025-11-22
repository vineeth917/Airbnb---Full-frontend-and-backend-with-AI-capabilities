"""
Traveler Service - Lab 2 Airbnb Microservices
Distributed Systems for Data Engineering (DATA 236)

This service handles traveler-specific operations:
- User authentication (travelers only)
- Property browsing
- Booking creation
- Favorites management
- User preferences
- Kafka consumer for booking status updates
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from kafka import KafkaConsumer
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

# Initialize MongoDB client
try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client['airbnb_lab']
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Enable CORS
CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'], supports_credentials=True)

# Kafka Consumer for booking updates
def start_kafka_consumer():
    """Start Kafka consumer in background thread to receive booking status updates"""
    try:
        consumer = KafkaConsumer(
            'booking-updates',
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id='traveler-service-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=True
        )
        
        logger.info("Kafka consumer started successfully - listening for booking updates")
        
        for message in consumer:
            try:
                event = message.value
                booking_id = event.get('booking_id')
                new_status = event.get('new_status')
                message_text = event.get('message', '')
                
                logger.info(f"Received booking update: {booking_id} -> {new_status}")
                
                # Create notification for traveler
                booking = db.bookings.find_one({'_id': booking_id})
                if booking:
                    notification_doc = {
                        '_id': str(uuid.uuid4()),
                        'user_id': booking['guest_id'],
                        'type': 'booking_update',
                        'booking_id': booking_id,
                        'title': f'Booking {new_status.title()}',
                        'message': message_text,
                        'status': new_status,
                        'is_read': False,
                        'created_at': datetime.utcnow()
                    }
                    db.notifications.insert_one(notification_doc)
                    logger.info(f"Created notification for user {booking['guest_id']}")
                
            except Exception as e:
                logger.error(f"Error processing booking update message: {str(e)}")
                
    except Exception as e:
        logger.error(f"Failed to start Kafka consumer: {str(e)}")

# Start Kafka consumer in background thread
consumer_thread = threading.Thread(target=start_kafka_consumer, daemon=True)
consumer_thread.start()

# Security headers middleware
@app.after_request
def after_request(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# Utility functions
def validate_input(data, required_fields=None, max_lengths=None):
    """Validate input data for security and completeness"""
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
    """Sanitize string input to prevent XSS"""
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r'[<>"\']', '', text)
    text = text.strip()
    return text

def validate_email_format(email):
    """Validate email format"""
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def hash_password(password):
    """Hash password using bcrypt with 12 rounds"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password, password_hash):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_jwt_token(user_data):
    """Generate JWT token for authenticated user"""
    payload = {
        'user_id': str(user_data['_id']),
        'username': user_data['username'],
        'user_type': user_data['user_type'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token):
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"

def require_auth(f):
    """Decorator to require authentication"""
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

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Kubernetes"""
    try:
        # Check MongoDB connection
        db.command('ping')
        return jsonify({
            'status': 'healthy',
            'service': 'traveler-service',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'traveler-service',
            'error': str(e)
        }), 503

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new traveler"""
    try:
        data = request.get_json()
        
        # Validate input
        is_valid, error_msg = validate_input(data, required_fields=['username', 'email', 'password'])
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Validate field lengths
        max_lengths = {
            'username': 50,
            'email': 100,
            'first_name': 50,
            'last_name': 50,
            'phone': 20
        }
        is_valid, error_msg = validate_input(data, max_lengths=max_lengths)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Sanitize inputs
        data['username'] = sanitize_string(data['username'])
        data['email'] = sanitize_string(data['email'])
        
        # Validate email
        if not validate_email_format(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        is_strong, pwd_error = validate_password_strength(data['password'])
        if not is_strong:
            return jsonify({'error': pwd_error}), 400
        
        # Validate username format
        if not re.match(r'^[a-zA-Z0-9_]+$', data['username']):
            return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400
        
        # Check if username or email already exists
        if db.users.find_one({'username': data['username']}):
            return jsonify({'error': 'Username already exists'}), 409
        
        if db.users.find_one({'email': data['email']}):
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create new user
        user_doc = {
            '_id': str(uuid.uuid4()),
            'username': data['username'],
            'email': data['email'],
            'password_hash': hash_password(data['password']),
            'user_type': 'traveler',
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
        
        # Remove password_hash from response
        user_doc.pop('password_hash')
        
        logger.info(f"New traveler registered: {user_doc['username']}")
        return jsonify({
            'message': 'User registered successfully',
            'user': user_doc
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        return jsonify({'error': 'Failed to register user'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login traveler and generate JWT token"""
    try:
        data = request.get_json()
        
        # Validate required fields
        is_valid, error_msg = validate_input(data, required_fields=['username', 'password'])
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Sanitize username
        username = sanitize_string(data['username'])
        
        # Find user by username or email
        user = db.users.find_one({
            '$or': [
                {'username': username},
                {'email': username}
            ],
            'user_type': 'traveler'
        })
        
        if not user or not check_password(data['password'], user['password_hash']):
            logger.warning(f"Failed login attempt for username: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.get('is_active', False):
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
        # Remove password_hash from response
        user.pop('password_hash')
        
        logger.info(f"Traveler logged in: {user['username']}")
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user profile"""
    try:
        user = db.users.find_one({'_id': request.user['user_id']})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.pop('password_hash', None)
        return jsonify({'user': user}), 200
        
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return jsonify({'error': 'Failed to get user profile'}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@require_auth
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        
        # Allowed fields to update
        allowed_fields = ['first_name', 'last_name', 'phone', 'profile']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = datetime.utcnow()
        
        result = db.users.update_one(
            {'_id': request.user['user_id']},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
        
        user = db.users.find_one({'_id': request.user['user_id']})
        user.pop('password_hash', None)
        
        logger.info(f"Profile updated for user: {user['username']}")
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

# Favorites Routes
@app.route('/api/favorites', methods=['GET'])
@require_auth
def get_favorites():
    """Get user's favorite listings"""
    try:
        favorites = list(db.favorites.find({'user_id': request.user['user_id']}))
        
        # Get listing details for each favorite
        for favorite in favorites:
            listing = db.listings.find_one({'_id': favorite['listing_id']})
            if listing:
                favorite['listing'] = listing
        
        return jsonify({'favorites': favorites}), 200
        
    except Exception as e:
        logger.error(f"Error fetching favorites: {str(e)}")
        return jsonify({'error': 'Failed to fetch favorites'}), 500

@app.route('/api/favorites', methods=['POST'])
@require_auth
def add_favorite():
    """Add a listing to favorites"""
    try:
        data = request.get_json()
        listing_id = data.get('listing_id')
        
        if not listing_id:
            return jsonify({'error': 'listing_id is required'}), 400
        
        # Check if already favorited
        existing = db.favorites.find_one({
            'user_id': request.user['user_id'],
            'listing_id': listing_id
        })
        
        if existing:
            return jsonify({'error': 'Listing already in favorites'}), 400
        
        # Add to favorites
        favorite_doc = {
            '_id': str(uuid.uuid4()),
            'user_id': request.user['user_id'],
            'listing_id': listing_id,
            'created_at': datetime.utcnow()
        }
        
        db.favorites.insert_one(favorite_doc)
        
        logger.info(f"Added favorite for user {request.user['username']}: {listing_id}")
        return jsonify({
            'message': 'Added to favorites',
            'favorite': favorite_doc
        }), 201
        
    except Exception as e:
        logger.error(f"Error adding favorite: {str(e)}")
        return jsonify({'error': 'Failed to add favorite'}), 500

@app.route('/api/favorites/<listing_id>', methods=['DELETE'])
@require_auth
def remove_favorite(listing_id):
    """Remove a listing from favorites"""
    try:
        result = db.favorites.delete_one({
            'user_id': request.user['user_id'],
            'listing_id': listing_id
        })
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Favorite not found'}), 404
        
        logger.info(f"Removed favorite for user {request.user['username']}: {listing_id}")
        return jsonify({'message': 'Removed from favorites'}), 200
        
    except Exception as e:
        logger.error(f"Error removing favorite: {str(e)}")
        return jsonify({'error': 'Failed to remove favorite'}), 500

# User Preferences Routes
@app.route('/api/preferences', methods=['GET'])
@require_auth
def get_preferences():
    """Get user preferences"""
    try:
        preferences = db.user_preferences.find_one({'user_id': request.user['user_id']})
        
        if not preferences:
            # Create default preferences
            preferences = {
                '_id': str(uuid.uuid4()),
                'user_id': request.user['user_id'],
                'budget_range': {'min': 50, 'max': 500},
                'interests': [],
                'mobility_needs': [],
                'dietary_restrictions': [],
                'preferred_property_types': [],
                'preferred_amenities': [],
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            db.user_preferences.insert_one(preferences)
        
        return jsonify({'preferences': preferences}), 200
        
    except Exception as e:
        logger.error(f"Error fetching preferences: {str(e)}")
        return jsonify({'error': 'Failed to fetch preferences'}), 500

@app.route('/api/preferences', methods=['PUT'])
@require_auth
def update_preferences():
    """Update user preferences"""
    try:
        data = request.get_json()
        
        # Allowed fields
        allowed_fields = [
            'budget_range', 'interests', 'mobility_needs',
            'dietary_restrictions', 'preferred_property_types', 'preferred_amenities'
        ]
        
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = datetime.utcnow()
        
        result = db.user_preferences.update_one(
            {'user_id': request.user['user_id']},
            {'$set': update_data},
            upsert=True
        )
        
        preferences = db.user_preferences.find_one({'user_id': request.user['user_id']})
        
        logger.info(f"Preferences updated for user: {request.user['username']}")
        return jsonify({
            'message': 'Preferences updated successfully',
            'preferences': preferences
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        return jsonify({'error': 'Failed to update preferences'}), 500

# Bookings Routes (Traveler view)
@app.route('/api/bookings', methods=['GET'])
@require_auth
def get_bookings():
    """Get traveler's bookings"""
    try:
        bookings = list(db.bookings.find({'guest_id': request.user['user_id']}))
        
        # Get listing details for each booking
        for booking in bookings:
            listing = db.listings.find_one({'_id': booking['listing_id']})
            if listing:
                booking['listing'] = listing
        
        return jsonify({'bookings': bookings}), 200
        
    except Exception as e:
        logger.error(f"Error fetching bookings: {str(e)}")
        return jsonify({'error': 'Failed to fetch bookings'}), 500

# Notifications Routes
@app.route('/api/notifications', methods=['GET'])
@require_auth
def get_notifications():
    """Get user notifications"""
    try:
        notifications = list(db.notifications.find(
            {'user_id': request.user['user_id']}
        ).sort('created_at', -1).limit(50))
        
        return jsonify({'notifications': notifications}), 200
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        return jsonify({'error': 'Failed to fetch notifications'}), 500

@app.route('/api/notifications/<notification_id>/read', methods=['PUT'])
@require_auth
def mark_notification_read(notification_id):
    """Mark notification as read"""
    try:
        result = db.notifications.update_one(
            {'_id': notification_id, 'user_id': request.user['user_id']},
            {'$set': {'is_read': True, 'read_at': datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Notification not found'}), 404
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        return jsonify({'error': 'Failed to update notification'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting Traveler Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


"""
Property Service - Lab 2 Airbnb Microservices
Distributed Systems for Data Engineering (DATA 236)

This service handles property operations:
- Property CRUD operations
- Property search and filtering
- Location-based queries
- Property details and amenities
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import os
import logging
import uuid
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
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Initialize MongoDB
try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client['airbnb_lab']
    # Create geospatial index
    db.listings.create_index([('location.coordinates', '2dsphere')])
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

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

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    try:
        db.command('ping')
        return jsonify({
            'status': 'healthy',
            'service': 'property-service',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'property-service',
            'error': str(e)
        }), 503

# Property Routes
@app.route('/api/properties', methods=['GET'])
def get_properties():
    """Get all properties with filtering and pagination"""
    try:
        # Pagination
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 10)), 100)
        skip = (page - 1) * per_page
        
        # Filters
        query = {'is_active': True}
        
        if request.args.get('location'):
            query['$or'] = [
                {'location.city': {'$regex': request.args.get('location'), '$options': 'i'}},
                {'location.state': {'$regex': request.args.get('location'), '$options': 'i'}},
                {'location.country': {'$regex': request.args.get('location'), '$options': 'i'}}
            ]
        
        if request.args.get('property_type'):
            query['property_type'] = request.args.get('property_type')
        
        if request.args.get('min_price'):
            query['price_per_night'] = {'$gte': float(request.args.get('min_price'))}
        
        if request.args.get('max_price'):
            if 'price_per_night' in query:
                query['price_per_night']['$lte'] = float(request.args.get('max_price'))
            else:
                query['price_per_night'] = {'$lte': float(request.args.get('max_price'))}
        
        if request.args.get('max_guests'):
            query['capacity.max_guests'] = {'$gte': int(request.args.get('max_guests'))}
        
        # Execute query
        total = db.listings.count_documents(query)
        listings = list(db.listings.find(query).skip(skip).limit(per_page))
        
        logger.info(f"Retrieved {len(listings)} properties")
        
        return jsonify({
            'listings': listings,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page,
                'has_next': skip + per_page < total,
                'has_prev': page > 1
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving properties: {str(e)}")
        return jsonify({'error': 'Failed to retrieve properties'}), 500

@app.route('/api/properties/<property_id>', methods=['GET'])
def get_property(property_id):
    """Get a specific property by ID"""
    try:
        listing = db.listings.find_one({'_id': property_id})
        if not listing:
            return jsonify({'error': 'Property not found'}), 404
        
        return jsonify(listing), 200
        
    except Exception as e:
        logger.error(f"Error retrieving property: {str(e)}")
        return jsonify({'error': 'Failed to retrieve property'}), 500

@app.route('/api/properties', methods=['POST'])
@require_auth
def create_property():
    """Create a new property (owner only)"""
    try:
        if request.user.get('user_type') != 'owner':
            return jsonify({'error': 'Only owners can create properties'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'price_per_night', 'property_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate price
        try:
            price = float(data['price_per_night'])
            if price <= 0 or price > 10000:
                return jsonify({'error': 'Price must be between $1 and $10,000 per night'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid price format'}), 400
        
        # Create property document
        property_doc = {
            '_id': str(uuid.uuid4()),
            'title': data['title'],
            'description': data.get('description', ''),
            'price_per_night': price,
            'location': {
                'address': data.get('address', ''),
                'city': data.get('city', ''),
                'state': data.get('state', ''),
                'country': data.get('country', ''),
                'coordinates': {
                    'type': 'Point',
                    'coordinates': data.get('coordinates', [0, 0])  # [longitude, latitude]
                }
            },
            'property_type': data['property_type'],
            'amenities': data.get('amenities', []),
            'capacity': {
                'max_guests': int(data.get('max_guests', 1)),
                'bedrooms': int(data.get('bedrooms', 1)),
                'bathrooms': float(data.get('bathrooms', 1.0)),
                'beds': int(data.get('beds', 1))
            },
            'host_id': request.user['user_id'],
            'images': data.get('images', []),
            'is_active': True,
            'version': 1,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        db.listings.insert_one(property_doc)
        
        logger.info(f"Created new property: {property_doc['_id']}")
        return jsonify(property_doc), 201
        
    except Exception as e:
        logger.error(f"Error creating property: {str(e)}")
        return jsonify({'error': 'Failed to create property'}), 500

@app.route('/api/properties/<property_id>', methods=['PUT'])
@require_auth
def update_property(property_id):
    """Update a property"""
    try:
        listing = db.listings.find_one({'_id': property_id})
        if not listing:
            return jsonify({'error': 'Property not found'}), 404
        
        # Verify ownership
        if listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = [
            'title', 'description', 'price_per_night', 'property_type',
            'amenities', 'capacity', 'location', 'images', 'is_active'
        ]
        
        update_data = {k: v for k, v in data.items() if k in updatable_fields}
        update_data['updated_at'] = datetime.utcnow()
        update_data['version'] = listing.get('version', 1) + 1
        
        result = db.listings.update_one(
            {'_id': property_id},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'No changes made'}), 400
        
        updated_listing = db.listings.find_one({'_id': property_id})
        
        logger.info(f"Updated property: {property_id}")
        return jsonify(updated_listing), 200
        
    except Exception as e:
        logger.error(f"Error updating property: {str(e)}")
        return jsonify({'error': 'Failed to update property'}), 500

@app.route('/api/properties/<property_id>', methods=['DELETE'])
@require_auth
def delete_property(property_id):
    """Soft delete a property"""
    try:
        listing = db.listings.find_one({'_id': property_id})
        if not listing:
            return jsonify({'error': 'Property not found'}), 404
        
        # Verify ownership
        if listing['host_id'] != request.user['user_id']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Soft delete
        db.listings.update_one(
            {'_id': property_id},
            {'$set': {
                'is_active': False,
                'updated_at': datetime.utcnow()
            }}
        )
        
        logger.info(f"Soft deleted property: {property_id}")
        return jsonify({'message': 'Property deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting property: {str(e)}")
        return jsonify({'error': 'Failed to delete property'}), 500

@app.route('/api/properties/search', methods=['GET'])
def search_properties():
    """Search properties by location (geospatial search)"""
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        max_distance = request.args.get('max_distance', default=10000, type=int)  # meters
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'latitude and longitude are required'}), 400
        
        # Geospatial query
        query = {
            'location.coordinates': {
                '$near': {
                    '$geometry': {
                        'type': 'Point',
                        'coordinates': [longitude, latitude]
                    },
                    '$maxDistance': max_distance
                }
            },
            'is_active': True
        }
        
        listings = list(db.listings.find(query).limit(50))
        
        return jsonify({'listings': listings}), 200
        
    except Exception as e:
        logger.error(f"Error searching properties: {str(e)}")
        return jsonify({'error': 'Failed to search properties'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    logger.info(f"Starting Property Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


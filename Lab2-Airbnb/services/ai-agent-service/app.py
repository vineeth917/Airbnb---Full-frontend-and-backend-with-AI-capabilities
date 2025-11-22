"""
AI Agent Service - Lab 2 Airbnb Microservices
Distributed Systems for Data Engineering (DATA 236)

This service handles AI-powered operations:
- Itinerary planning
- Activity recommendations
- Weather integration
- Personalized suggestions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
import logging
import random

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
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', '')

# Enable CORS
CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'], supports_credentials=True)

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Kubernetes"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-agent-service',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0'
    }), 200

# AI Routes
@app.route('/api/ai/recommendations', methods=['POST'])
def get_recommendations():
    """Get personalized property recommendations"""
    try:
        data = request.get_json()
        
        # Extract user preferences
        budget = data.get('budget', {'min': 50, 'max': 500})
        interests = data.get('interests', [])
        location = data.get('location', 'any')
        
        # Generate mock recommendations (in production, use ML model or OpenAI)
        property_types = ['apartment', 'house', 'condo', 'villa', 'studio']
        amenities_list = ['wifi', 'pool', 'parking', 'kitchen', 'gym', 'pet-friendly']
        
        recommendations = []
        for i in range(5):
            recommendation = {
                'property_type': random.choice(property_types),
                'suggested_amenities': random.sample(amenities_list, k=random.randint(2, 4)),
                'price_range': {
                    'min': budget['min'],
                    'max': budget['max']
                },
                'location_suggestion': location,
                'match_score': round(random.uniform(0.7, 0.99), 2),
                'reasons': [
                    f"Matches your interest in {random.choice(interests)}" if interests else "Great value for money",
                    "Highly rated by similar travelers",
                    "Popular in this area"
                ]
            }
            recommendations.append(recommendation)
        
        logger.info(f"Generated {len(recommendations)} recommendations")
        return jsonify({
            'recommendations': recommendations,
            'total': len(recommendations)
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({'error': 'Failed to generate recommendations'}), 500

@app.route('/api/ai/itinerary', methods=['POST'])
def plan_itinerary():
    """Generate travel itinerary"""
    try:
        data = request.get_json()
        
        destination = data.get('destination', 'Unknown')
        duration_days = int(data.get('duration_days', 3))
        interests = data.get('interests', ['sightseeing'])
        
        # Generate mock itinerary
        activities = [
            'Visit local attractions',
            'Explore museums',
            'Try local cuisine',
            'Shopping districts',
            'Nature walks',
            'Historical sites',
            'Beach activities',
            'Cultural experiences',
            'Adventure sports',
            'Relaxation and spa'
        ]
        
        itinerary = []
        for day in range(1, duration_days + 1):
            day_plan = {
                'day': day,
                'date': (datetime.now() + datetime.timedelta(days=day)).strftime('%Y-%m-%d'),
                'activities': [],
                'meals': {
                    'breakfast': f'Local cafe near {destination}',
                    'lunch': f'Traditional restaurant in {destination}',
                    'dinner': f'Fine dining in {destination}'
                }
            }
            
            # Add 3-4 activities per day
            num_activities = random.randint(3, 4)
            selected_activities = random.sample(activities, k=num_activities)
            
            for idx, activity in enumerate(selected_activities):
                time_slot = ['Morning', 'Afternoon', 'Evening'][idx % 3]
                day_plan['activities'].append({
                    'time': time_slot,
                    'activity': activity,
                    'duration': f'{random.randint(1, 3)} hours',
                    'estimated_cost': f'${random.randint(20, 100)}'
                })
            
            itinerary.append(day_plan)
        
        logger.info(f"Generated itinerary for {duration_days} days in {destination}")
        return jsonify({
            'destination': destination,
            'duration_days': duration_days,
            'itinerary': itinerary,
            'estimated_total_cost': f'${random.randint(300, 1000)}',
            'tips': [
                f'Best time to visit {destination} is during spring or fall',
                'Book activities in advance for better prices',
                'Try local transportation for authentic experience'
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error planning itinerary: {str(e)}")
        return jsonify({'error': 'Failed to plan itinerary'}), 500

@app.route('/api/ai/activities', methods=['GET'])
def get_activities():
    """Get activity recommendations for a location"""
    try:
        location = request.args.get('location', 'Unknown')
        category = request.args.get('category', 'all')
        
        # Mock activity data
        activity_categories = {
            'outdoor': ['Hiking', 'Beach sports', 'Cycling', 'Rock climbing'],
            'cultural': ['Museum visits', 'Historical tours', 'Art galleries', 'Local festivals'],
            'food': ['Food tours', 'Cooking classes', 'Wine tasting', 'Street food exploration'],
            'adventure': ['Zip-lining', 'Surfing', 'Parasailing', 'Scuba diving'],
            'relaxation': ['Spa treatments', 'Yoga classes', 'Meditation retreats', 'Beach lounging']
        }
        
        if category == 'all':
            all_activities = []
            for cat, acts in activity_categories.items():
                for act in acts:
                    all_activities.append({
                        'name': act,
                        'category': cat,
                        'location': location,
                        'rating': round(random.uniform(4.0, 5.0), 1),
                        'duration': f'{random.randint(1, 4)} hours',
                        'price': f'${random.randint(20, 150)}',
                        'popularity': random.choice(['High', 'Medium', 'Very High'])
                    })
            activities = random.sample(all_activities, k=min(10, len(all_activities)))
        else:
            acts = activity_categories.get(category, [])
            activities = [
                {
                    'name': act,
                    'category': category,
                    'location': location,
                    'rating': round(random.uniform(4.0, 5.0), 1),
                    'duration': f'{random.randint(1, 4)} hours',
                    'price': f'${random.randint(20, 150)}',
                    'popularity': random.choice(['High', 'Medium', 'Very High'])
                }
                for act in acts
            ]
        
        logger.info(f"Retrieved {len(activities)} activities for {location}")
        return jsonify({
            'location': location,
            'category': category,
            'activities': activities,
            'total': len(activities)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching activities: {str(e)}")
        return jsonify({'error': 'Failed to fetch activities'}), 500

@app.route('/api/ai/weather', methods=['GET'])
def get_weather():
    """Get weather information for a location"""
    try:
        location = request.args.get('location', 'Unknown')
        days = int(request.args.get('days', 5))
        
        # Mock weather data
        weather_conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Windy']
        
        forecast = []
        for day in range(days):
            forecast.append({
                'date': (datetime.now() + datetime.timedelta(days=day)).strftime('%Y-%m-%d'),
                'condition': random.choice(weather_conditions),
                'temperature': {
                    'high': random.randint(70, 85),
                    'low': random.randint(50, 65),
                    'unit': 'F'
                },
                'humidity': f'{random.randint(40, 80)}%',
                'precipitation_chance': f'{random.randint(0, 60)}%',
                'wind_speed': f'{random.randint(5, 20)} mph'
            })
        
        logger.info(f"Retrieved weather forecast for {location}")
        return jsonify({
            'location': location,
            'forecast_days': days,
            'forecast': forecast,
            'current': forecast[0] if forecast else None
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching weather: {str(e)}")
        return jsonify({'error': 'Failed to fetch weather'}), 500

@app.route('/api/ai/analyze-preferences', methods=['POST'])
def analyze_preferences():
    """Analyze user preferences and provide insights"""
    try:
        data = request.get_json()
        
        preferences = data.get('preferences', {})
        booking_history = data.get('booking_history', [])
        
        # Mock analysis
        insights = {
            'preferred_property_types': ['apartment', 'house'],
            'average_budget': {'min': 80, 'max': 300},
            'favorite_locations': ['Santa Monica', 'San Francisco', 'Los Angeles'],
            'booking_patterns': {
                'typical_duration': '3-5 days',
                'booking_frequency': 'Monthly',
                'preferred_season': 'Spring/Fall'
            },
            'recommendations': [
                'You tend to book coastal properties - consider exploring mountain destinations',
                'Your bookings suggest you enjoy urban environments with cultural activities',
                'Based on your history, mid-range properties offer you the best value'
            ]
        }
        
        logger.info("Generated preference analysis")
        return jsonify(insights), 200
        
    except Exception as e:
        logger.error(f"Error analyzing preferences: {str(e)}")
        return jsonify({'error': 'Failed to analyze preferences'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5005))
    logger.info(f"Starting AI Agent Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


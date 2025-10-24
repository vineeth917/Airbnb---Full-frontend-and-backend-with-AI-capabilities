"""
Airbnb Lab AI Service
FastAPI + Langchain + Tavily API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Airbnb Lab AI Service",
    description="AI-powered travel recommendations and itinerary planning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class BookingContext(BaseModel):
    check_in: str
    check_out: str
    location: str
    guests: int
    property_type: str

class UserPreferences(BaseModel):
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    interests: List[str] = []
    mobility_needs: List[str] = []
    dietary_restrictions: List[str] = []

class ItineraryRequest(BaseModel):
    booking_context: BookingContext
    user_preferences: UserPreferences
    query: str

class ActivityCard(BaseModel):
    title: str
    description: str
    address: str
    price_tier: str
    duration: str
    tags: List[str]
    wheelchair_friendly: bool = False
    child_friendly: bool = False

class RestaurantRecommendation(BaseModel):
    name: str
    cuisine: str
    address: str
    price_range: str
    rating: float
    dietary_friendly: List[str] = []

class DayPlan(BaseModel):
    date: str
    morning: List[ActivityCard] = []
    afternoon: List[ActivityCard] = []
    evening: List[ActivityCard] = []
    restaurants: List[RestaurantRecommendation] = []

class PackingItem(BaseModel):
    item: str
    category: str
    essential: bool = False
    weather_dependent: bool = False

class ItineraryResponse(BaseModel):
    weather_forecast: Dict[str, Any]
    daily_plans: List[DayPlan]
    packing_checklist: List[PackingItem]
    local_events: List[Dict[str, Any]]
    recommendations: Dict[str, Any]

# Mock data for demonstration
MOCK_ACTIVITIES = [
    ActivityCard(
        title="City Walking Tour",
        description="Explore the historic downtown area with a local guide",
        address="123 Main Street, Downtown",
        price_tier="$$",
        duration="2-3 hours",
        tags=["sightseeing", "culture", "walking"],
        wheelchair_friendly=True,
        child_friendly=True
    ),
    ActivityCard(
        title="Art Museum Visit",
        description="Discover local and international art collections",
        address="456 Art Avenue, Cultural District",
        price_tier="$$$",
        duration="1-2 hours",
        tags=["art", "culture", "indoor"],
        wheelchair_friendly=True,
        child_friendly=False
    ),
    ActivityCard(
        title="Food Market Tour",
        description="Taste local delicacies and meet vendors",
        address="789 Market Square",
        price_tier="$$",
        duration="1.5 hours",
        tags=["food", "culture", "walking"],
        wheelchair_friendly=True,
        child_friendly=True
    )
]

MOCK_RESTAURANTS = [
    RestaurantRecommendation(
        name="The Local Bistro",
        cuisine="Modern American",
        address="321 Food Street",
        price_range="$$$",
        rating=4.5,
        dietary_friendly=["vegetarian", "gluten-free"]
    ),
    RestaurantRecommendation(
        name="Seaside Cafe",
        cuisine="Mediterranean",
        address="654 Harbor View",
        price_range="$$",
        rating=4.2,
        dietary_friendly=["vegan", "vegetarian"]
    )
]

MOCK_PACKING = [
    PackingItem(item="Comfortable walking shoes", category="Footwear", essential=True),
    PackingItem(item="Light jacket", category="Clothing", essential=True, weather_dependent=True),
    PackingItem(item="Camera", category="Electronics", essential=False),
    PackingItem(item="Sunscreen", category="Health", essential=True, weather_dependent=True),
    PackingItem(item="Travel adapter", category="Electronics", essential=True)
]

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Airbnb Lab AI Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.post("/api/ai/itinerary/plan", response_model=ItineraryResponse)
async def plan_itinerary(request: ItineraryRequest):
    """
    Generate a comprehensive travel itinerary based on booking context and preferences
    """
    try:
        # Mock weather data
        weather_forecast = {
            "temperature": "22°C",
            "condition": "Sunny",
            "humidity": "65%",
            "wind": "10 km/h"
        }

        # Generate daily plans
        daily_plans = []
        from datetime import datetime, timedelta
        
        check_in = datetime.strptime(request.booking_context.check_in, "%Y-%m-%d")
        check_out = datetime.strptime(request.booking_context.check_out, "%Y-%m-%d")
        
        current_date = check_in
        while current_date < check_out:
            day_plan = DayPlan(
                date=current_date.strftime("%Y-%m-%d"),
                morning=MOCK_ACTIVITIES[:1],
                afternoon=MOCK_ACTIVITIES[1:2],
                evening=MOCK_ACTIVITIES[2:3],
                restaurants=MOCK_RESTAURANTS
            )
            daily_plans.append(day_plan)
            current_date += timedelta(days=1)

        # Generate recommendations
        recommendations = {
            "best_time_to_visit": "Morning hours for outdoor activities",
            "transportation_tips": "Public transport is efficient and affordable",
            "safety_notes": "Stay aware of your surroundings in tourist areas",
            "local_customs": "Tipping 15-20% is customary in restaurants"
        }

        # Mock local events
        local_events = [
            {
                "name": "Weekly Farmers Market",
                "date": "Every Saturday",
                "time": "8:00 AM - 2:00 PM",
                "location": "Central Park",
                "description": "Fresh local produce and handmade crafts"
            },
            {
                "name": "Jazz Night",
                "date": "Friday Evening",
                "time": "7:00 PM - 11:00 PM",
                "location": "Downtown Jazz Club",
                "description": "Live jazz music and cocktails"
            }
        ]

        return ItineraryResponse(
            weather_forecast=weather_forecast,
            daily_plans=daily_plans,
            packing_checklist=MOCK_PACKING,
            local_events=local_events,
            recommendations=recommendations
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating itinerary: {str(e)}")

@app.post("/api/ai/itinerary/nlu")
async def natural_language_itinerary(request: ItineraryRequest):
    """
    Process natural language queries for itinerary planning
    """
    try:
        query = request.query.lower()
        
        # Simple keyword matching for demo
        if "weather" in query:
            return {
                "response": "The weather forecast shows sunny skies with temperatures around 22°C. Perfect for outdoor activities!",
                "type": "weather",
                "data": {
                    "temperature": "22°C",
                    "condition": "Sunny",
                    "recommendation": "Great weather for sightseeing and outdoor activities"
                }
            }
        elif "restaurant" in query or "food" in query or "eat" in query:
            return {
                "response": "Here are some great dining options in the area:",
                "type": "restaurants",
                "data": {
                    "restaurants": [
                        {
                            "name": "The Local Bistro",
                            "cuisine": "Modern American",
                            "rating": 4.5,
                            "price_range": "$$$"
                        },
                        {
                            "name": "Seaside Cafe",
                            "cuisine": "Mediterranean",
                            "rating": 4.2,
                            "price_range": "$$"
                        }
                    ]
                }
            }
        elif "activity" in query or "things to do" in query:
            return {
                "response": "Here are some recommended activities for your stay:",
                "type": "activities",
                "data": {
                    "activities": [
                        {
                            "title": "City Walking Tour",
                            "description": "Explore the historic downtown area",
                            "duration": "2-3 hours",
                            "price": "$$"
                        },
                        {
                            "title": "Art Museum Visit",
                            "description": "Discover local art collections",
                            "duration": "1-2 hours",
                            "price": "$$$"
                        }
                    ]
                }
            }
        elif "packing" in query or "what to bring" in query:
            return {
                "response": "Here's a suggested packing list for your trip:",
                "type": "packing",
                "data": {
                    "essentials": [
                        "Comfortable walking shoes",
                        "Light jacket",
                        "Sunscreen",
                        "Travel adapter"
                    ],
                    "optional": [
                        "Camera",
                        "Extra memory cards",
                        "Travel guidebook"
                    ]
                }
            }
        else:
            return {
                "response": "I can help you with weather information, restaurant recommendations, activities, and packing tips. What would you like to know?",
                "type": "general",
                "data": {}
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/api/ai/health")
async def ai_health():
    return {"status": "healthy", "ai_service": "operational"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

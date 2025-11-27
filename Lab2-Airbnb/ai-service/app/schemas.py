"""
Pydantic schemas for the AI service
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

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

class ItineraryRequest(BaseModel):
    booking_context: BookingContext
    user_preferences: UserPreferences
    query: str

class ItineraryResponse(BaseModel):
    weather_forecast: Dict[str, Any]
    daily_plans: List[DayPlan]
    packing_checklist: List[PackingItem]
    local_events: List[Dict[str, Any]]
    recommendations: Dict[str, Any]

class NLUResponse(BaseModel):
    response: str
    type: str
    data: Dict[str, Any]

"""
Airbnb Lab AI Service
FastAPI + Langchain + Ollama (Llama 3.1 8B) + Tavily API
"""

# Fix Python path to avoid conflicts with other projects
import sys
import os
from pathlib import Path

# Get the ai-service directory and add it to the beginning of sys.path
current_dir = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(current_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
import json
import mysql.connector
from datetime import datetime, timedelta
import ollama
from tavily import TavilyClient

# Load environment variables
load_dotenv()

# Initialize Tavily client (for web search)
tavily_api_key = os.getenv("TAVILY_API_KEY", "")
tavily_client = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None

# Ollama configuration
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

# MySQL configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "database": os.getenv("DB_NAME", "airbnb_lab"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "pass1234")
}

# Initialize FastAPI app
app = FastAPI(
    title="Airbnb Lab AI Service",
    description="AI-powered travel recommendations and itinerary planning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper Functions
def get_db_connection():
    """Create and return a MySQL database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        return None

def get_user_bookings(user_id: str):
    """Fetch user's ACTIVE or FUTURE bookings from database (not completed)"""
    try:
        conn = get_db_connection()
        if not conn:
            return []
        
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT b.*, l.title as property_name, l.location, l.property_type
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE b.guest_id = %s
            AND b.status != 'cancelled'
            AND b.check_out >= CURDATE()
            ORDER BY b.check_in ASC
            LIMIT 5
        """
        cursor.execute(query, (user_id,))
        bookings = cursor.fetchall()
        cursor.close()
        conn.close()
        return bookings
    except Exception as e:
        print(f"Error fetching bookings: {e}")
        return []

def search_with_tavily(query: str, location: str = None):
    """Search for real-time information using Tavily API"""
    if not tavily_client:
        return {"error": "Tavily API not configured"}
    
    try:
        search_query = f"{query} in {location}" if location else query
        response = tavily_client.search(
            query=search_query,
            search_depth="advanced",
            max_results=5
        )
        return response
    except Exception as e:
        print(f"Tavily search error: {e}")
        return {"error": str(e)}

def call_llama(prompt: str, context: str = "") -> str:
    """Call Ollama Llama 3.1 8B model"""
    try:
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI travel assistant for an Airbnb platform. Provide concise, friendly, and accurate travel recommendations. Focus on restaurants, activities, weather, and itinerary planning. Keep responses conversational and under 300 words. IMPORTANT: If the user asks about a specific location, provide recommendations for THAT location only. Do NOT reference past/completed bookings. Only mention active or upcoming bookings if directly relevant to the user's question."
                },
                {
                    "role": "user",
                    "content": full_prompt
                }
            ]
        )
        
        return response['message']['content']
    except Exception as e:
        print(f"Ollama error: {e}")
        return f"I'm having trouble processing your request. Error: {str(e)}"

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

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Airbnb Lab AI Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.get("/api/ai/health")
async def ai_health():
    return {"status": "healthy", "ai_service": "operational"}

# New Chat Endpoint with Llama 3.1 8B
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    location: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[Dict[str, Any]]] = []
    context_used: Optional[Dict[str, Any]] = {}

@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Main chat endpoint using Llama 3.1 8B with Tavily search and MySQL context
    """
    try:
        user_message = request.message.lower()
        context_info = {}
        sources = []
        
        # Fetch user's booking context if user_id provided
        if request.user_id:
            bookings = get_user_bookings(request.user_id)
            if bookings:
                context_info["bookings"] = bookings
        
        # Determine if we need Tavily search
        needs_search = any(keyword in user_message for keyword in [
            "restaurant", "food", "eat", "dining", "cafe",
            "activity", "activities", "things to do", "attractions",
            "weather", "forecast", "temperature",
            "hotel", "accommodation", "stay"
        ])
        
        # Build context for Llama
        context = ""
        
        # Add booking context (only active/future bookings)
        if context_info.get("bookings") and len(context_info["bookings"]) > 0:
            from datetime import date
            latest_booking = context_info["bookings"][0]
            check_in_date = latest_booking['check_in']
            check_out_date = latest_booking['check_out']
            today = date.today()
            
            # Determine if booking is active or future
            if check_in_date <= today <= check_out_date:
                booking_status = "currently staying at"
            elif check_in_date > today:
                booking_status = "has an upcoming booking at"
            else:
                booking_status = None  # Should not happen due to query filter
            
            if booking_status:
                context += f"IMPORTANT: User {booking_status} {latest_booking['property_name']} in {latest_booking['location']} "
                context += f"from {check_in_date} to {check_out_date}. "
                context += f"Use this location context ONLY if relevant to their question. "
                context += f"If they ask about a different location, ignore this booking and provide general recommendations for their requested location.\n"
        
        # Perform Tavily search if needed
        if needs_search and tavily_client:
            # Extract location from user's message if they specify one
            user_specified_location = None
            location_keywords = ["in ", "near ", "at ", "around "]
            for keyword in location_keywords:
                if keyword in user_message:
                    # Extract location after the keyword
                    parts = user_message.split(keyword)
                    if len(parts) > 1:
                        # Get the part after keyword and clean it up
                        potential_location = parts[1].split()[0:3]  # Take up to 3 words
                        user_specified_location = " ".join(potential_location).strip(".,!?")
                        break
            
            # Priority: 1) User specified location, 2) Booking location, 3) Request location param, 4) Default
            if user_specified_location:
                location = user_specified_location
                print(f"Using user-specified location: {location}")
            elif context_info.get("bookings") and len(context_info["bookings"]) > 0:
                location = context_info["bookings"][0].get("location")
                print(f"Using booking location: {location}")
            elif request.location:
                location = request.location
                print(f"Using request location: {location}")
            else:
                location = "San Francisco"
                print(f"Using default location: {location}")
            
            # Determine search query based on user intent
            if any(word in user_message for word in ["restaurant", "food", "eat", "dining"]):
                search_query = f"best restaurants in {location}"
            elif any(word in user_message for word in ["activity", "activities", "things to do"]):
                search_query = f"top activities and attractions in {location}"
            elif any(word in user_message for word in ["weather", "forecast"]):
                search_query = f"weather forecast {location}"
            else:
                search_query = user_message
            
            tavily_results = search_with_tavily(search_query, location)
            
            if "results" in tavily_results:
                context += f"\nRecent search results for '{search_query}' in {location}:\n"
                for idx, result in enumerate(tavily_results["results"][:3], 1):
                    context += f"{idx}. {result.get('title', 'N/A')}: {result.get('content', 'N/A')[:200]}...\n"
                    sources.append({
                        "title": result.get('title'),
                        "url": result.get('url'),
                        "snippet": result.get('content', '')[:150]
                    })
        
        # Create prompt for Llama
        prompt = f"User question: {request.message}\n\nPlease provide a helpful, friendly response based on the context above."
        
        # Call Llama 3.1 8B
        ai_response = call_llama(prompt, context)
        
        return ChatResponse(
            response=ai_response,
            sources=sources if sources else None,
            context_used=context_info if context_info else None
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

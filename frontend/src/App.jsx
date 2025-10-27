/*
Lab 1 Airbnb - Frontend React Application
Distributed Systems for Data Engineering (DATA 236)

This module implements a modern React frontend for the Airbnb listing management system
with responsive design, state management, and distributed systems integration.
*/

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './App.css';

// Helper function to extract numeric ID from string ID
const getNumericId = (id) => {
  if (typeof id === 'string' && id.startsWith('listing-')) {
    return parseInt(id.replace('listing-', ''));
  }
  return parseInt(id) || 1;
};

// Helper function to get property image based on type
const getPropertyImage = (propertyType, listingId) => {
  const numericId = getNumericId(listingId);
  const imageIndex = (numericId % 7) + 1;
  
  switch (propertyType) {
    case 'apartment':
    case 'studio':
    case 'loft':
      return `apartment${imageIndex}.jpg`;
    case 'condo':
      return `condo${imageIndex}.jpg`;
    case 'villa':
      return `villa${imageIndex}.jpg`;
    case 'house':
    case 'cabin':
    default:
      return `house${imageIndex}.jpg`;
  }
};

// API Configuration for distributed systems
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

// Main App Component
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [selectedListingForCalendar, setSelectedListingForCalendar] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [hostAnalytics, setHostAnalytics] = useState(null);
  const [currentView, setCurrentView] = useState('homes');
  const [userType, setUserType] = useState(null); // 'owner' or 'traveller'
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Force login page
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    userType: 'traveler' // 'traveler' or 'host'
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'traveler',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    country: '',
    gender: ''
  });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: ''
  });
  const [filters, setFilters] = useState({
    location: '',
    property_type: '',
    min_price: '',
    max_price: '',
    max_guests: '',
    amenities: [],
    instant_book: false,
    superhost: false,
    checkIn: '',
    checkOut: ''
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    totalNights: 0,
    totalPrice: 0,
    serviceFee: 0,
    cleaningFee: 0,
    taxes: 0
  });
  const [sessionFavoriteIds, setSessionFavoriteIds] = useState([]); // hearts in this session only

  // Available amenities for filtering
  const availableAmenities = [
    'WiFi', 'Kitchen', 'Air Conditioning', 'TV', 'Pool', 'Garden', 'Parking',
    'Washing Machine', 'Dryer', 'Dishwasher', 'Microwave', 'Refrigerator',
    'Coffee Maker', 'Iron', 'Hair Dryer', 'Hot Tub', 'Fireplace', 'Balcony',
    'Terrace', 'Gym', 'Spa', 'Sauna', 'Tennis Court', 'BBQ Grill', 'Pet Friendly',
    'Wheelchair Accessible', 'Elevator', 'Doorman', 'Security', 'Concierge'
  ];

  // Authentication functions
  const validateLoginForm = (formData) => {
    const errors = {};
    
    if (!formData.username || formData.username.trim().length === 0) {
      errors.username = 'Username is required';
    } else if (formData.username.length > 50) {
      errors.username = 'Username must be less than 50 characters';
    }
    
    if (!formData.password || formData.password.length === 0) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    
    return errors;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    // Client-side validation
    const validationErrors = validateLoginForm(loginForm);
    if (Object.keys(validationErrors).length > 0) {
      setLoginError(Object.values(validationErrors)[0]);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Login successful, user_type:', data.user.user_type);
        
        // Validate that the user_type matches the selected account type
        const selectedUserType = loginForm.userType === 'owner' ? 'owner' : 'traveler';
        const actualUserType = data.user.user_type;
        
        if (actualUserType !== selectedUserType) {
          setLoginError(`Invalid account type. You selected "${loginForm.userType}" but the account is "${actualUserType}". Please select the correct account type.`);
          return;
        }
        
        setUserType(data.user.user_type);
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        setCurrentView(data.user.user_type === 'owner' ? 'today' : 'homes');
        setLoginForm({ username: '', password: '', userType: 'traveler' });
      } else {
        const errorText = await response.text();
        try {
          const data = JSON.parse(errorText);
        setLoginError(data.error || 'Login failed');
        } catch {
          setLoginError('Invalid credentials or server error');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Network error. Please try again.');
    }
  };

  const validateRegisterForm = (formData) => {
    const errors = {};
    
    // Username validation
    if (!formData.username || formData.username.trim().length === 0) {
      errors.username = 'Username is required';
    } else if (formData.username.length > 50) {
      errors.username = 'Username must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    // Email validation
    if (!formData.email || formData.email.trim().length === 0) {
      errors.email = 'Email is required';
    } else if (formData.email.length > 100) {
      errors.email = 'Email must be less than 100 characters';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password || formData.password.length === 0) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one letter and one number';
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // User type validation
    if (!formData.userType) {
      errors.user_type = 'Please select a user type';
    }
    
    return errors;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    
    // Client-side validation
    const validationErrors = validateRegisterForm(registerForm);
    if (Object.keys(validationErrors).length > 0) {
      setRegisterError(Object.values(validationErrors)[0]);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: registerForm.username.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          userType: registerForm.userType,
          first_name: registerForm.firstName,
          last_name: registerForm.lastName,
          phone: registerForm.phone,
          city: registerForm.city,
          country: registerForm.country,
          gender: registerForm.gender
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUserType(data.user.user_type);
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        setCurrentView(data.user.user_type === 'owner' ? 'today' : 'homes');
        setShowRegisterForm(false);
        setRegisterForm({
          username: '', email: '', password: '', confirmPassword: '',
          userType: 'traveler', firstName: '', lastName: '', phone: '',
          city: '', country: '', gender: ''
        });
      } else {
        setRegisterError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setRegisterError('Network error. Please try again.');
    }
  };

  const handleLoginFormChange = (field, value) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
    setLoginError(''); // Clear error when user types
  };

  const handleRegisterFormChange = (field, value) => {
    setRegisterForm(prev => ({
      ...prev,
      [field]: value
    }));
    setRegisterError(''); // Clear error when user types
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setFavorites([]); // Clear favorites on logout
      setSessionFavoriteIds([]); // Clear session hearts
    setLoginForm({
      username: '',
      password: '',
      userType: 'traveler'
    });
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserType(data.user.user_type);
          setCurrentUser(data.user);
          setIsLoggedIn(true);
          setCurrentView(data.user.user_type === 'owner' ? 'today' : 'homes');
        } else if (response.status === 401) {
          // User is not authenticated, this is normal on login screen
          // Silently handle - no need to log anything
        }
      } catch (error) {
        // Silently handle network errors on first load
      }
    };
    
    checkAuthStatus();
  }, []);

  // Sync URL with currentView and userType for bookmarking/navigation
  useEffect(() => {
    if (isLoggedIn && userType) {
      if (userType === 'traveler') {
        navigate(`/traveler/${currentView}`, { replace: true });
      } else if (userType === 'owner') {
        navigate(`/host/${currentView}`, { replace: true });
      }
    } else if (!isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [currentView, userType, isLoggedIn, navigate]);

  // Parse URL on load to set currentView
  useEffect(() => {
    if (isLoggedIn && location.pathname.startsWith('/traveler/')) {
      const view = location.pathname.split('/')[2] || 'homes';
      if (view !== currentView) {
        setCurrentView(view);
      }
    } else if (isLoggedIn && location.pathname.startsWith('/host/')) {
      const view = location.pathname.split('/')[2] || 'today';
      if (view !== currentView) {
        setCurrentView(view);
      }
    }
  }, [location.pathname, isLoggedIn]);

  // Sample listings data for search functionality
  const sampleListings = [
    { id: "listing-1", title: "Cozy Studio in Downtown LA", location: "Los Angeles, CA", price_per_night: 115, property_type: "apartment", max_guests: 2 },
    { id: "listing-2", title: "Modern House in Burbank", location: "Burbank, CA", price_per_night: 229, property_type: "house", max_guests: 6 },
    { id: "listing-3", title: "Luxury Condo in Santa Monica", location: "Santa Monica, CA", price_per_night: 210, property_type: "condo", max_guests: 4 },
    { id: "listing-4", title: "Beautiful Apartment in Downtown", location: "San Francisco, CA", price_per_night: 150, property_type: "apartment", max_guests: 2 },
    { id: "listing-5", title: "Beach House in Venice", location: "Venice, CA", price_per_night: 280, property_type: "house", max_guests: 8 },
    { id: "listing-6", title: "Urban Apartment in Hollywood", location: "Hollywood, CA", price_per_night: 180, property_type: "apartment", max_guests: 4 },
    { id: "listing-7", title: "Charming Bedroom in West Hollywood", location: "West Hollywood, CA", price_per_night: 165, property_type: "apartment", max_guests: 2 },
    { id: "listing-8", title: "Spacious Villa in Malibu", location: "Malibu, CA", price_per_night: 350, property_type: "villa", max_guests: 10 },
    { id: "listing-9", title: "Downtown Loft with City Views", location: "Los Angeles, CA", price_per_night: 195, property_type: "apartment", max_guests: 3 },
    { id: "listing-10", title: "Cozy Cabin in Big Bear", location: "Big Bear, CA", price_per_night: 120, property_type: "house", max_guests: 4 },
    { id: "listing-11", title: "Historic Brownstone in Brooklyn", location: "Brooklyn, NY", price_per_night: 220, property_type: "house", max_guests: 6 },
    { id: "listing-12", title: "Penthouse in Manhattan", location: "New York, NY", price_per_night: 450, property_type: "apartment", max_guests: 4 },
    { id: "listing-13", title: "Beachfront Condo in Miami", location: "Miami, FL", price_per_night: 320, property_type: "condo", max_guests: 6 },
    { id: "listing-14", title: "Mountain Cabin in Aspen", location: "Aspen, CO", price_per_night: 280, property_type: "cabin", max_guests: 8 },
    { id: "listing-15", title: "Luxury Suite in Las Vegas", location: "Las Vegas, NV", price_per_night: 180, property_type: "apartment", max_guests: 2 },
    { id: "listing-16", title: "Seattle Downtown Apartment", location: "Seattle, WA", price_per_night: 190, property_type: "apartment", max_guests: 3 },
    { id: "listing-17", title: "Capitol Hill Studio", location: "Seattle, WA", price_per_night: 140, property_type: "studio", max_guests: 2 },
    { id: "listing-18", title: "Queen Anne House", location: "Seattle, WA", price_per_night: 250, property_type: "house", max_guests: 6 },
    { id: "listing-19", title: "Belltown Condo", location: "Seattle, WA", price_per_night: 220, property_type: "condo", max_guests: 4 },
    { id: "listing-20", title: "Fremont Loft", location: "Seattle, WA", price_per_night: 170, property_type: "apartment", max_guests: 3 },
    { id: "listing-21", title: "Times Square Apartment", location: "New York, NY", price_per_night: 380, property_type: "apartment", max_guests: 4 },
    { id: "listing-22", title: "Central Park Studio", location: "New York, NY", price_per_night: 320, property_type: "studio", max_guests: 2 },
    
    { id: "listing-23", title: "SoHo Loft", location: "New York, NY", price_per_night: 450, property_type: "apartment", max_guests: 3 },
    { id: "listing-24", title: "Austin Downtown Condo", location: "Austin, TX", price_per_night: 180, property_type: "condo", max_guests: 4 },
    { id: "listing-25", title: "South by Southwest House", location: "Austin, TX", price_per_night: 220, property_type: "house", max_guests: 6 }
  ];

  // Favorites functionality
  const favoritePendingRef = useRef(new Set());

  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data.favorites) ? data.favorites : [];
        // Deduplicate by listing_id to avoid any accidental dupes
        const uniqueByListing = [...new Map(list.map(f => [String(f.listing_id), f])).values()];
        setFavorites(uniqueByListing);
      } else {
        console.error('Failed to fetch favorites:', response.status);
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
    }
  };

  const addToFavorites = async (listingId) => {
    try {
      if (favoritePendingRef.current.has(listingId)) return;
      favoritePendingRef.current.add(listingId);

      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ listing_id: listingId })
      });
      
      if (!response.ok) {
        let errorBody = {};
        try { errorBody = await response.json(); } catch (_) {}
        const alreadyFavorited = response.status === 400 || response.status === 409 || (errorBody && /already/i.test(String(errorBody.error || '')));
        if (!alreadyFavorited) {
          console.error('Error adding to favorites:', errorBody.error || response.statusText);
        }
      }
      // Always refresh so UI reflects true server state
      await fetchFavorites();
      // Maintain session hearts so they reset on refresh
      setSessionFavoriteIds(prev => Array.from(new Set([...prev, String(listingId)])));
    } catch (error) {
      console.error('Error adding to favorites:', error);
    } finally {
      favoritePendingRef.current.delete(listingId);
    }
  };

  const removeFromFavorites = async (listingId) => {
    try {
      if (favoritePendingRef.current.has(listingId)) return;
      favoritePendingRef.current.add(listingId);

      const response = await fetch(`${API_BASE_URL}/favorites/${listingId}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok && response.status !== 404) {
        let errorBody = {};
        try { errorBody = await response.json(); } catch (_) {}
        console.error('Error removing from favorites:', errorBody.error || response.statusText);
      }
      await fetchFavorites();
      setSessionFavoriteIds(prev => prev.filter(id => id !== String(listingId)));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    } finally {
      favoritePendingRef.current.delete(listingId);
    }
  };

  const isFavorite = (listingId) => {
    return sessionFavoriteIds.includes(String(listingId));
  };

  const toggleFavorite = async (listingId) => {
    try {
    if (isFavorite(listingId)) {
        await removeFromFavorites(listingId);
    } else {
        await addToFavorites(listingId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // User preferences functionality
  const fetchUserPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/preferences`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const updateUserPreferences = async (preferences) => {
    try {
      const response = await fetch(`${API_BASE_URL}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.preferences);
        setShowPreferencesModal(false);
        console.log('Preferences updated successfully');
      } else {
        const error = await response.json();
        console.error('Error updating preferences:', error.error);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Convert gender to lowercase to match database ENUM
      let genderValue = profileData.gender;
      if (genderValue && typeof genderValue === 'string') {
        genderValue = genderValue.toLowerCase();
      }
      
      // Get profile picture from state if available
      let profilePictureValue = '';
      if (profileData.profilePicture) {
        profilePictureValue = profileData.profilePicture;
      } else {
        // Try to get from localStorage
        const savedPicture = localStorage.getItem(`profile_picture_${currentUser?.id}`);
        if (savedPicture) {
          profilePictureValue = savedPicture;
        }
      }
      
      // Transform snake_case to camelCase if needed
      const dataToSend = {
        firstName: profileData.firstName || profileData.first_name,
        lastName: profileData.lastName || profileData.last_name,
        phone: profileData.phone,
        aboutMe: profileData.aboutMe || profileData.about_me,
        city: profileData.city,
        country: profileData.country,
        languages: profileData.languages,
        gender: genderValue,
        profilePicture: profilePictureValue
      };
      
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        console.log('Profile updated successfully');
        return true;
      } else {
        const error = await response.json();
        console.error('Error updating profile:', error.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  // Availability management functions
  const fetchAvailability = async (listingId, startDate = null, endDate = null) => {
    try {
      let url = `${API_BASE_URL}/availability/${listingId}`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.availability || []);
        return data.availability || [];
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
    return [];
  };

  const updateAvailability = async (listingId, date, availabilityData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/availability/${listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ date, ...availabilityData })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh availability data
        fetchAvailability(listingId);
        return data;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  };

  const bulkUpdateAvailability = async (listingId, dates, availabilityData) => {
    try {
      const requestData = {
        dates: dates,
        ...availabilityData
      };
      console.log('Bulk update request data:', requestData);
      
      const response = await fetch(`${API_BASE_URL}/availability/${listingId}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Bulk update response:', data);
        // Refresh availability data
        fetchAvailability(listingId);
        return data;
      } else {
        const error = await response.json();
        console.error('Bulk update error:', error);
        throw new Error(error.error || 'Failed to bulk update availability');
      }
    } catch (error) {
      console.error('Error bulk updating availability:', error);
      throw error;
    }
  };

  // Analytics functions
  const fetchPropertyAnalytics = async (listingId, startDate = null, endDate = null) => {
    try {
      let url = `${API_BASE_URL}/analytics/property/${listingId}`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching property analytics:', error);
    }
    return null;
  };

  const fetchHostAnalytics = async (hostId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/host/${hostId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setHostAnalytics(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching host analytics:', error);
    }
    return null;
  };

  // Search functionality
  const handleSearch = () => {
    console.log('Searching with filters:', searchFilters);
    // Get all listings to filter
    const allListings = listings.length > 0 ? listings : sampleListings;
    
    // Filter listings based on search criteria
    const filteredListings = allListings.filter(listing => {
      const locationMatch = !searchFilters.location || 
        listing.location.toLowerCase().includes(searchFilters.location.toLowerCase());
      const propertyTypeMatch = !searchFilters.property_type || 
        listing.property_type === searchFilters.property_type;
      const maxGuestsMatch = !searchFilters.guests || 
        listing.max_guests >= parseInt(searchFilters.guests);
      
      return locationMatch && propertyTypeMatch && maxGuestsMatch;
    });
    
    setListings(filteredListings);
    console.log(`Found ${filteredListings.length} listings for search:`, searchFilters.location);
  };

  // Advanced search functionality
  const handleAdvancedSearch = () => {
    console.log('Advanced search with filters:', filters);
    // Get all listings to filter
    const allListings = listings.length > 0 ? listings : sampleListings;
    
    const filteredListings = allListings.filter(listing => {
      const locationMatch = !filters.location || 
        listing.location.toLowerCase().includes(filters.location.toLowerCase());
      const propertyTypeMatch = !filters.property_type || 
        listing.property_type === filters.property_type;
      const priceMatch = (!filters.min_price || listing.price_per_night >= parseFloat(filters.min_price)) &&
        (!filters.max_price || listing.price_per_night <= parseFloat(filters.max_price));
      const guestsMatch = !filters.max_guests || listing.max_guests >= parseInt(filters.max_guests);
      
      return locationMatch && propertyTypeMatch && priceMatch && guestsMatch;
    });
    
    console.log('Found', filteredListings.length, 'listings for advanced search');
    setListings(filteredListings);
  };

  const handleAdvancedFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const clearAdvancedFilters = () => {
    setFilters({
      location: '',
      property_type: '',
      min_price: '',
      max_price: '',
      max_guests: '',
      amenities: [],
      instant_book: false,
      superhost: false,
      checkIn: '',
      checkOut: ''
    });
    // Reload all listings from backend
    fetchListings();
  };

  // AI Agent functions
  const openAIChat = () => {
    setShowAIChat(true);
    if (aiMessages.length === 0) {
      setAiMessages([{
        id: 1,
        type: 'ai',
        message: '👋 Hi! I\'m your AI travel assistant powered by Llama 3.1 8B. I can help you with:\n\n🍽️ Restaurant recommendations\n🎯 Activity suggestions\n🌤️ Weather information\n🗺️ Itinerary planning\n🧳 Packing tips\n\nI use real-time data to give you the best, most current recommendations. What would you like to know about your trip?',
        timestamp: new Date()
      }]);
    }
  };

  const closeAIChat = () => {
    setShowAIChat(false);
  };

  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: aiInput,
      timestamp: new Date()
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiLoading(true);

    try {
      // Simulate AI response (in real app, this would call the AI service)
      const aiResponse = await generateAIResponse(aiInput);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        message: aiResponse,
        timestamp: new Date()
      };

      setTimeout(() => {
        setAiMessages(prev => [...prev, aiMessage]);
        setAiLoading(false);
      }, 1000);

    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setAiMessages(prev => [...prev, errorMessage]);
      setAiLoading(false);
    }
  };

  const generateAIResponse = async (userInput) => {
    try {
      // Get user's location from their bookings
      let userLocation = null;
      if (bookings.length > 0) {
        // Get location from most recent booking
        const recentBooking = bookings[0];
        // Use the location directly from the booking data
        userLocation = recentBooking.listing_location || recentBooking.location;
      }
      
      // Call the new Llama-powered chat endpoint
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          message: userInput,
          user_id: currentUser?.id || null,
          location: userLocation || null  // Let AI service use booking location
          })
        });
        
        if (response.ok) {
          const data = await response.json();
        
        // Format response with sources if available
        let formattedResponse = data.response;
        
        if (data.sources && data.sources.length > 0) {
          formattedResponse += "\n\n📚 **Sources:**\n";
          data.sources.forEach((source, idx) => {
            formattedResponse += `${idx + 1}. [${source.title}](${source.url})\n`;
          });
        }
        
        return formattedResponse;
      } else {
        throw new Error('AI service returned an error');
      }
    } catch (error) {
      console.error('AI Service error:', error);
      return '🤖 I\'m having trouble connecting to my AI service right now. Please make sure:\n\n1. The AI service is running (port 8000)\n2. Ollama is installed and running\n3. Llama 3.1 8B model is downloaded\n\nTry asking me again in a moment!';
    }
  };

  // All AI responses now handled by Llama 3.1 8B via /api/ai/chat endpoint
  // Removed all hardcoded responses - now using real-time data from Tavily API

  // Booking functions
  const openBookingModal = async (listing) => {
    console.log('Opening booking modal for listing:', listing);
    // Use the listing passed directly (already has all necessary data)
    setSelectedListing(listing);
    
    setBookingData({
      checkIn: '',
      checkOut: '',
      guests: 1,
      totalNights: 0,
      totalPrice: 0,
      serviceFee: 0,
      cleaningFee: 0,
      taxes: 0
    });
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedListing(null);
    setBookingData({
      checkIn: '',
      checkOut: '',
      guests: 1,
      totalNights: 0,
      totalPrice: 0,
      serviceFee: 0,
      cleaningFee: 0,
      taxes: 0
    });
  };

  const calculateBookingTotal = (checkIn, checkOut, guests, pricePerNight) => {
    if (!checkIn || !checkOut) return { totalNights: 0, totalPrice: 0, serviceFee: 0, cleaningFee: 0, taxes: 0 };
    
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const totalNights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (totalNights <= 0) return { totalNights: 0, totalPrice: 0, serviceFee: 0, cleaningFee: 0, taxes: 0 };
    
    const basePrice = totalNights * pricePerNight;
    const serviceFee = Math.round(basePrice * 0.12); // 12% service fee
    const cleaningFee = Math.round(basePrice * 0.08); // 8% cleaning fee
    const taxes = Math.round(basePrice * 0.10); // 10% taxes
    const totalPrice = basePrice + serviceFee + cleaningFee + taxes;
    
    return { totalNights, totalPrice, serviceFee, cleaningFee, taxes };
  };

  const handleBookingDataChange = (field, value) => {
    const newBookingData = { ...bookingData, [field]: value };
    
    if (field === 'checkIn' || field === 'checkOut' || field === 'guests') {
      const { totalNights, totalPrice, serviceFee, cleaningFee, taxes } = calculateBookingTotal(
        field === 'checkIn' ? value : newBookingData.checkIn,
        field === 'checkOut' ? value : newBookingData.checkOut,
        field === 'guests' ? value : newBookingData.guests,
        selectedListing?.price_per_night || 0
      );
      
      newBookingData.totalNights = totalNights;
      newBookingData.totalPrice = totalPrice;
      newBookingData.serviceFee = serviceFee;
      newBookingData.cleaningFee = cleaningFee;
      newBookingData.taxes = taxes;
    }
    
    setBookingData(newBookingData);
  };

  const handleBookingSubmit = async () => {
    if (!selectedListing || !bookingData.checkIn || !bookingData.checkOut || !bookingData.guests) {
      alert('Please fill in all required fields');
      return;
    }

    if (bookingData.totalNights <= 0) {
      alert('Check-out date must be after check-in date');
      return;
    }

    if (bookingData.guests > selectedListing.max_guests) {
      alert(`This property can only accommodate ${selectedListing.max_guests} guests`);
      return;
    }

    try {
      // Create booking object
      const newBooking = {
        id: Date.now().toString(),
        listing_id: selectedListing.id,
        listing_title: selectedListing.title,
        listing_location: selectedListing.location,
        listing_image: `/images/house${(getNumericId(selectedListing.id) % 7) + 1}.jpg`,
        user_id: currentUser?.id,
        user_name: currentUser?.username || 'Guest',
        host_id: 'host-demo', // Use consistent host_id for demo
        check_in: bookingData.checkIn,
        check_out: bookingData.checkOut,
        guests: bookingData.guests,
        total_nights: bookingData.totalNights,
        price_per_night: selectedListing.price_per_night,
        total_price: bookingData.totalPrice,
        service_fee: bookingData.serviceFee,
        cleaning_fee: bookingData.cleaningFee,
        taxes: bookingData.taxes,
        status: 'pending', // Start as pending - owner needs to accept
        created_at: new Date().toISOString()
      };

      // Send booking to backend
      const backendBooking = {
        listing_id: selectedListing.id,
        guest_id: currentUser?.id || 'traveler-demo',
        check_in: bookingData.checkIn,
        check_out: bookingData.checkOut,
        total_price: bookingData.totalPrice
      };

      let created = false;
      try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backendBooking),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          const errorMessage = new Error(errorData.error || `HTTP error! status: ${response.status}`);
          errorMessage.status = response.status;
          throw errorMessage;
        }

        const backendBookingResult = await response.json();
        console.log('Backend booking created:', backendBookingResult);
        
        // Update the booking with the backend ID and status
        newBooking.id = backendBookingResult.id;
        newBooking.status = backendBookingResult.status || 'pending';
        
        // Keep the frontend listing data (selectedListing) as it's what the user saw and booked
        // Don't override with backend data
        newBooking.listing_title = selectedListing.title;
        newBooking.listing_location = selectedListing.location;
        
        // Normalize for History view (nested listing object)
        newBooking.listing = {
          title: selectedListing.title,
          location: selectedListing.location,
          property_type: selectedListing.property_type || 'apartment'
        };
        created = true;
      } catch (backendError) {
        console.error('Error creating backend booking:', backendError);
        // Check if it's a 409 Conflict (dates already booked)
        if (backendError.status === 409 || backendError.message.includes('already booked')) {
          alert(backendError.message || 'These dates are already booked. Please choose different dates.');
        } else {
          alert(backendError.message || 'Could not create booking. Please try again.');
        }
        return; // Do NOT add a local pending booking if backend failed
      }

      if (!created) return;

      // Add to bookings only when backend succeeded
      setBookings(prev => {
        const updatedBookings = [...prev, newBooking];
        console.log('New booking added:', newBooking);
        console.log('All bookings:', updatedBookings);
        return updatedBookings;
      });
      
      // Close modal and show pending info instead of confirmed
      closeBookingModal();
      alert(`Request sent. Your booking for "${selectedListing.title}" is pending host confirmation.`);
      // Navigate to History and highlight pending items (client-side)
      setCurrentView('history');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Fetch listings from distributed backend
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/listings?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setListings(data.listings || []);
      
      console.log(`Fetched ${data.listings?.length || 0} listings`);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to fetch listings. Please check if the backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Determine if we should fetch as host or guest based on current user type
      const isHost = currentUser?.user_type === 'owner';
      const url = isHost 
        ? `${API_BASE_URL}/bookings?as_host=true`
        : `${API_BASE_URL}/bookings`;
        
      console.log('Fetching bookings as:', isHost ? 'host' : 'guest', 'for user:', currentUser?.id);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setBookings(data.bookings || []);
      
      console.log(`Fetched ${data.bookings?.length || 0} bookings`);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to fetch bookings. Please check if the backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  // Create new listing
  const createListing = async (listingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newListing = await response.json();
      setListings(prev => [...prev, newListing]);
      return newListing;
    } catch (err) {
      console.error('Error creating listing:', err);
      throw err;
    }
  };

  // Create new booking
  const createBooking = async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newBooking = await response.json();
      setBookings(prev => [...prev, newBooking]);
      return newBooking;
    } catch (err) {
      console.error('Error creating booking:', err);
      throw err;
    }
  };

  // List bookings for travelers and owners
  const fetchUserBookings = async (userId, userType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings?user_id=${userId}&user_type=${userType}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const bookings = await response.json();
      return bookings;
    } catch (err) {
      console.error('Error fetching user bookings:', err);
      throw err;
    }
  };

  // Accept booking (Owner only)
  const acceptBooking = async (bookingId, ownerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ owner_id: ownerId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local bookings state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'confirmed' }
          : booking
      ));
      
      return result;
    } catch (err) {
      console.error('Error accepting booking:', err);
      throw err;
    }
  };

  // Cancel booking (Owner or Traveler)
  const cancelBooking = async (bookingId, userId, userType, cancellationReason = 'No reason provided') => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: userId, 
          user_type: userType,
          cancellation_reason: cancellationReason 
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local bookings state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' }
          : booking
      ));
      
      return result;
    } catch (err) {
      console.error('Error cancelling booking:', err);
      throw err;
    }
  };

  // Delete booking (Traveler only, pending bookings)
  const handleDeleteBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to delete this pending booking? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Remove booking from local state
      setBookings(prev => prev.filter(booking => booking.id !== bookingId));
      
      // Refresh history bookings to update the UI immediately
      const historyResponse = await fetch(`${API_BASE_URL}/bookings?user_id=${currentUser?.id || 'demo-traveler-1'}&user_type=traveler`, {
        credentials: 'include'
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const bookings = Array.isArray(historyData) ? historyData : (historyData.bookings || []);
        // Update the history bookings state in TravelerHistoryView
        // We'll need to pass a callback to update this
        window.dispatchEvent(new CustomEvent('bookingDeleted', { detail: bookings }));
      }
      
      alert('Booking deleted successfully');
      return result;
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert('Failed to delete booking. Please try again.');
      throw err;
    }
  };

  // Update listing
  const updateListing = async (id, updateData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedListing = await response.json();
      setListings(prev => 
        prev.map(listing => 
          listing.id === id ? updatedListing : listing
        )
      );
      return updatedListing;
    } catch (err) {
      console.error('Error updating listing:', err);
      throw err;
    }
  };

  // Delete listing
  const deleteListing = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setListings(prev => prev.filter(listing => listing.id !== id));
    } catch (err) {
      console.error('Error deleting listing:', err);
      throw err;
    }
  };

  // Health check for distributed systems monitoring
  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      const health = await response.json();
      console.log('Backend health status:', health);
      return health;
    } catch (err) {
      console.error('Health check failed:', err);
      return null;
    }
  };

  // Load data on component mount
  useEffect(() => {
    // Fetch listings from backend for traveler
    if (isLoggedIn && userType === 'traveler') {
      fetchListings();
    }
  }, [isLoggedIn, userType]);

  // Fetch favorites and preferences when user logs in
  useEffect(() => {
    const isTraveler = userType === 'traveler' || userType === 'traveller';
    if (currentUser && isTraveler) {
      fetchFavorites();
      fetchUserPreferences();
    } else if (userType === 'owner') {
      // Clear favorites for host users
      setFavorites([]);
    }
  }, [currentUser, userType]);

  // Re-fetch when filters change (only for travelers)
  useEffect(() => {
    if (isLoggedIn && userType === 'traveler') {
      fetchListings();
    }
  }, [filters]);

  // Refresh bookings when switching to History (traveler) or Today (host)
  useEffect(() => {
    const refreshOnView = async () => {
      try {
        if (userType === 'traveler' && currentView === 'history') {
          await fetchBookings();
        }
        if (userType === 'owner' && (currentView === 'today' || currentView === 'dashboard')) {
          // Reuse fetchBookings which loads bookings for current role in this demo
          await fetchBookings();
        }
      } catch (e) {}
    };
    refreshOnView();
  }, [currentView, userType]);

  // Show login screen if not logged in
  if (!isLoggedIn) {
  return (
      <div className="login-screen">
        <div className="login-container">
          <div className="airbnb-logo-large">
            <div className="airbnb-icon-large">🏠</div>
            <span className="airbnb-text-large">airbnb</span>
          </div>
          <h2>Welcome to Airbnb</h2>
          <p>Choose your account type and {showRegisterForm ? 'create an account' : 'sign in'}</p>
          
          {!showRegisterForm ? (
            // Login Form
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-group">
                <label>Account Type</label>
                <select 
                  value={loginForm.userType}
                  onChange={(e) => handleLoginFormChange('userType', e.target.value)}
                  className="form-select"
                >
                  <option value="traveler">Traveler</option>
                  <option value="owner">Host/Owner</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Username or Email</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => handleLoginFormChange('username', e.target.value)}
                  placeholder="Enter your username or email"
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => handleLoginFormChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className="form-input"
                  required
                />
              </div>
              
              {loginError && (
                <div className="error-message">
                  {loginError}
                </div>
              )}
              
              <button type="submit" className="login-btn">
                Sign In
              </button>
              
              <p className="switch-form">
                Don't have an account? 
                <button 
                  type="button" 
                  onClick={() => setShowRegisterForm(true)}
                  className="link-btn"
                >
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            // Registration Form
            <form onSubmit={handleRegisterSubmit} className="login-form">
              <div className="form-group">
                <label>Account Type</label>
                <select 
                  value={registerForm.userType} 
                  onChange={(e) => handleRegisterFormChange('userType', e.target.value)}
                  className="form-select"
                >
                  <option value="traveler">Traveler</option>
                  <option value="owner">Host/Owner</option>
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={registerForm.firstName}
                    onChange={(e) => handleRegisterFormChange('firstName', e.target.value)}
                    className="form-input"
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={registerForm.lastName}
                    onChange={(e) => handleRegisterFormChange('lastName', e.target.value)}
                    className="form-input"
                    placeholder="Last name"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => handleRegisterFormChange('username', e.target.value)}
                  className="form-input"
                  placeholder="Choose a username"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => handleRegisterFormChange('email', e.target.value)}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => handleRegisterFormChange('password', e.target.value)}
                    className="form-input"
                    placeholder="Create a password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => handleRegisterFormChange('confirmPassword', e.target.value)}
                    className="form-input"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={registerForm.city}
                    onChange={(e) => handleRegisterFormChange('city', e.target.value)}
                    className="form-input"
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={registerForm.country}
                    onChange={(e) => handleRegisterFormChange('country', e.target.value)}
                    className="form-input"
                    placeholder="Country"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={registerForm.phone}
                    onChange={(e) => handleRegisterFormChange('phone', e.target.value)}
                    className="form-input"
                    placeholder="Phone number"
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select 
                    value={registerForm.gender} 
                    onChange={(e) => handleRegisterFormChange('gender', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              {registerError && (
                <div className="error-message">
                  {registerError}
                </div>
              )}
              
              <button type="submit" className="login-btn">
                Create Account
              </button>
              
              <p className="switch-form">
                Already have an account? 
                <button 
                  type="button" 
                  onClick={() => setShowRegisterForm(false)}
                  className="link-btn"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Show Traveler UI
  if (userType === 'traveler') {
    return (
      <div className="App traveler-app">
        {/* Skip to main content link */}
        <a href="#main-content" className="skip-link">Skip to main content</a>
        
        {/* Traveler Header */}
        <header className="traveler-header" role="banner">
        <div className="header-content px-4 md:px-6 lg:px-8">
          <div className="logo" onClick={() => {
            if (currentView === 'homes') {
              window.location.reload();
            } else {
              setCurrentView('homes');
            }
          }} style={{ cursor: 'pointer' }}>
            <div className="airbnb-icon">🏠</div>
            <span className="airbnb-text">airbnb</span>
          </div>
          
          <nav className="main-nav hidden md:flex" role="navigation" aria-label="Main navigation">
            <button 
              className={`nav-item ${currentView === 'homes' ? 'active' : ''}`}
              onClick={() => setCurrentView('homes')}
              aria-label="View homes and accommodations"
              aria-current={currentView === 'homes' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">🏠</span>
              <span>Homes</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'experiences' ? 'active' : ''}`}
              onClick={() => setCurrentView('experiences')}
              aria-label="View experiences and activities"
              aria-current={currentView === 'experiences' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">🎈</span>
              <span>Experiences</span>
              <span className="new-badge" aria-label="New feature">NEW</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'services' ? 'active' : ''}`}
              onClick={() => setCurrentView('services')}
              aria-label="View services and amenities"
              aria-current={currentView === 'services' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">🔔</span>
              <span>Services</span>
              <span className="new-badge" aria-label="New feature">NEW</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
              onClick={() => setCurrentView('favorites')}
              aria-label={`View favorite properties (${favorites.length} saved)`}
              aria-current={currentView === 'favorites' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">❤️</span>
              <span>Favorites</span>
              {favorites.length > 0 && <span className="count-badge" aria-label={`${favorites.length} favorites`}>{favorites.length}</span>}
            </button>
            <button 
              className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentView('profile')}
              aria-label="View and edit your profile"
              aria-current={currentView === 'profile' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">👤</span>
              <span>Profile</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentView('history')}
              aria-label="View your booking history"
              aria-current={currentView === 'history' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">📋</span>
              <span>History</span>
            </button>
            <button 
              className={`nav-item ${currentView === 'messages' ? 'active' : ''}`}
              onClick={() => setCurrentView('messages')}
              aria-label="Messages with hosts"
            >
              <span className="nav-icon" aria-hidden="true">💬</span>
              <span>Messages</span>
            </button>
          </nav>

          <div className="header-actions">
              <button className="become-host-btn hidden md:block" onClick={() => handleLogout()}>
                Become a Host
              </button>
              <button className="mobile-menu-btn md:hidden" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                ☰
              </button>
              <div className="user-menu">
            <button className="profile-btn">M</button>
                <button className="menu-btn" onClick={() => setShowUserMenu(!showUserMenu)}>☰</button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-info">
                      <div className="user-avatar">M</div>
                      <div className="user-details">
                        <div className="user-name">Welcome, {userType === 'traveler' ? 'Traveler' : 'Host'}</div>
                        <div className="user-email">{loginForm.username}@airbnb.com</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={handleLogout}>Log out</button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </header>

      {/* Traveler Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <div className="search-field">
            <label>Where</label>
            <input 
              type="text" 
              placeholder="Search destinations"
              value={searchFilters.location}
              onChange={(e) => setSearchFilters(prev => ({...prev, location: e.target.value}))}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="search-field">
            <label>Check in</label>
            <input 
              type="date" 
              placeholder="Add dates"
              value={searchFilters.checkIn}
              onChange={(e) => setSearchFilters(prev => ({...prev, checkIn: e.target.value}))}
            />
          </div>
          <div className="search-field">
            <label>Check out</label>
            <input 
              type="date" 
              placeholder="Add dates"
              value={searchFilters.checkOut}
              onChange={(e) => setSearchFilters(prev => ({...prev, checkOut: e.target.value}))}
            />
          </div>
          <div className="search-field">
            <label>Who</label>
            <input 
              type="number" 
              placeholder="Add guests"
              value={searchFilters.guests}
              onChange={(e) => setSearchFilters(prev => ({...prev, guests: e.target.value}))}
              min="1"
              max="16"
            />
          </div>
          <button className="search-btn" onClick={handleSearch}>
            🔍
          </button>
        </div>
        
        {/* Advanced Search Toggle */}
        <div className="advanced-search-toggle">
          <button 
            className="toggle-filters-btn"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'} 🔧
          </button>
      </div>

        {/* Advanced Search Panel */}
        {showAdvancedFilters && (
          <div className="advanced-search-panel">
            <div className="advanced-search-content">
              <div className="filter-section">
                <h3>Price Range</h3>
                <div className="price-range">
                  <div className="price-input">
                    <label>Min Price</label>
                    <div className="price-input-field">
                      <span className="currency">$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.min_price}
                        onChange={(e) => handleAdvancedFilterChange('min_price', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="price-input">
                    <label>Max Price</label>
                    <div className="price-input-field">
                      <span className="currency">$</span>
                      <input
                        type="number"
                        placeholder="1000"
                        value={filters.max_price}
                        onChange={(e) => handleAdvancedFilterChange('max_price', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="filter-section">
                <h3>Property Type</h3>
                <select
                  value={filters.property_type}
                  onChange={(e) => handleAdvancedFilterChange('property_type', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Any Type</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="villa">Villa</option>
                  <option value="studio">Studio</option>
                  <option value="cabin">Cabin</option>
                  <option value="loft">Loft</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>

              <div className="filter-section">
                <h3>Number of Guests</h3>
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Guests"
                  value={filters.max_guests}
                  onChange={(e) => handleAdvancedFilterChange('max_guests', e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-section">
                <h3>Amenities</h3>
                <div className="amenities-filter">
                  {availableAmenities.slice(0, 12).map(amenity => (
                    <label key={amenity} className="amenity-filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h3>More Filters</h3>
                <div className="checkbox-filters">
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.instant_book}
                      onChange={(e) => handleAdvancedFilterChange('instant_book', e.target.checked)}
                    />
                    <span>Instant Book</span>
                  </label>
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.superhost}
                      onChange={(e) => handleAdvancedFilterChange('superhost', e.target.checked)}
                    />
                    <span>Superhost</span>
                  </label>
                </div>
              </div>

              <div className="filter-actions">
                <button className="clear-filters-btn" onClick={clearAdvancedFilters}>
                  Clear All
                </button>
                <button className="apply-filters-btn" onClick={handleAdvancedSearch}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedListing && (
          <div className="booking-modal-overlay">
            <div className="booking-modal">
              <div className="booking-modal-header">
                <h2>Book "{selectedListing.title}"</h2>
                <button className="close-btn" onClick={closeBookingModal}>×</button>
              </div>
              
              <div className="booking-modal-content">
                <div className="booking-listing-info">
                  <div className="listing-details">
                    <h3>{selectedListing.title}</h3>
                    <p className="location">{selectedListing.location}</p>
                    <p className="price">${selectedListing.price_per_night}/night</p>
                    <p className="capacity">{selectedListing.max_guests} guests • {selectedListing.bedrooms} bedrooms • {selectedListing.bathrooms} bathrooms</p>
                  </div>
                </div>

                <div className="booking-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Check-in Date *</label>
                      <input
                        type="date"
                        value={bookingData.checkIn}
                        onChange={(e) => handleBookingDataChange('checkIn', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Check-out Date *</label>
                      <input
                        type="date"
                        value={bookingData.checkOut}
                        onChange={(e) => handleBookingDataChange('checkOut', e.target.value)}
                        min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Number of Guests *</label>
                    <select
                      value={bookingData.guests}
                      onChange={(e) => handleBookingDataChange('guests', parseInt(e.target.value))}
                      required
                    >
                      {Array.from({ length: selectedListing.max_guests }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'guest' : 'guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bookingData.totalNights > 0 && (
                    <div className="booking-summary">
                      <h3>Booking Summary</h3>
                      <div className="summary-line">
                        <span>${selectedListing.price_per_night} × {bookingData.totalNights} nights</span>
                        <span>${bookingData.totalNights * selectedListing.price_per_night}</span>
                      </div>
                      <div className="summary-line">
                        <span>Service fee</span>
                        <span>${bookingData.serviceFee}</span>
                      </div>
                      <div className="summary-line">
                        <span>Cleaning fee</span>
                        <span>${bookingData.cleaningFee}</span>
                      </div>
                      <div className="summary-line">
                        <span>Taxes</span>
                        <span>${bookingData.taxes}</span>
                      </div>
                      <div className="summary-line total">
                        <span>Total</span>
                        <span>${bookingData.totalPrice}</span>
                      </div>
          </div>
        )}
                </div>
              </div>

              <div className="booking-modal-actions">
                <button className="cancel-btn" onClick={closeBookingModal}>Cancel</button>
                <button 
                  className="book-btn" 
                  onClick={handleBookingSubmit}
                  disabled={!bookingData.checkIn || !bookingData.checkOut || bookingData.totalNights <= 0}
                >
                  Book Now - ${bookingData.totalPrice || 0}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Interface */}
        {showAIChat && (
          <div className="ai-chat-overlay">
            <div className="ai-chat-container">
              <div className="ai-chat-header">
                <div className="ai-chat-title">
                  <div className="ai-avatar">🤖</div>
                  <div>
                    <h3>AI Travel Assistant</h3>
                    <p>Your personal trip planner</p>
                  </div>
                </div>
                <button className="ai-close-btn" onClick={closeAIChat}>×</button>
              </div>
              
              <div className="ai-chat-messages">
                {aiMessages.map(message => (
                  <div key={message.id} className={`ai-message ${message.type}`}>
                    <div className="message-content">
                      <div className="message-text">{message.message}</div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="ai-message ai">
                    <div className="message-content">
                      <div className="ai-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="ai-chat-input">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                  placeholder="Ask me about restaurants, activities, weather, or itinerary planning..."
                  disabled={aiLoading}
                />
                <button 
                  className="ai-send-btn" 
                  onClick={sendAIMessage}
                  disabled={!aiInput.trim() || aiLoading}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Floating Button */}
        {isLoggedIn && (
          <button className="ai-assistant-btn" onClick={openAIChat}>
            <span className="ai-icon">🤖</span>
            <span className="ai-text">AI Assistant</span>
          </button>
        )}
      </div>

      {/* Mobile Navigation */}
      {showMobileMenu && (
        <div className="mobile-nav md:hidden" role="navigation" aria-label="Mobile navigation">
          <button 
            className={`mobile-nav-item ${currentView === 'homes' ? 'active' : ''}`}
            onClick={() => {setCurrentView('homes'); setShowMobileMenu(false);}}
            aria-label="View homes and accommodations"
            aria-current={currentView === 'homes' ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">🏠</span>
            <span>Homes</span>
          </button>
          <button 
            className={`mobile-nav-item ${currentView === 'experiences' ? 'active' : ''}`}
            onClick={() => {setCurrentView('experiences'); setShowMobileMenu(false);}}
          >
            <span className="nav-icon">🎈</span>
            <span>Experiences</span>
          </button>
          <button 
            className={`mobile-nav-item ${currentView === 'services' ? 'active' : ''}`}
            onClick={() => {setCurrentView('services'); setShowMobileMenu(false);}}
          >
            <span className="nav-icon">🚗</span>
            <span>Services</span>
          </button>
          <button 
            className={`mobile-nav-item ${currentView === 'favorites' ? 'active' : ''}`}
            onClick={() => {setCurrentView('favorites'); setShowMobileMenu(false);}}
          >
            <span className="nav-icon">❤️</span>
            <span>Favorites</span>
            {favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}
          </button>
          <button 
            className={`mobile-nav-item ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => {setCurrentView('profile'); setShowMobileMenu(false);}}
          >
            <span className="nav-icon">👤</span>
            <span>Profile</span>
          </button>
          <button 
            className={`mobile-nav-item ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => {setCurrentView('history'); setShowMobileMenu(false);}}
          >
            <span className="nav-icon">📋</span>
            <span>History</span>
          </button>
          <button className="mobile-nav-item" onClick={() => {handleLogout(); setShowMobileMenu(false);}}>
            <span className="nav-icon">🏠</span>
            <span>Become a Host</span>
          </button>
        </div>
      )}

      {/* Traveler Main Content */}
      <main className="traveler-main px-4 md:px-6 lg:px-8" role="main" id="main-content">
        {currentView === 'homes' && <HomesView 
          listings={listings}
            filters={filters}
            setFilters={setFilters}
            onUpdateListing={updateListing}
            onDeleteListing={deleteListing}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
            onCreateBooking={createBooking}
          onOpenBooking={openBookingModal}
        />}
        {currentView === 'experiences' && <ExperiencesView />}
        {currentView === 'services' && <ServicesView />}
        {currentView === 'favorites' && <FavoritesView favorites={favorites} onRemoveFavorite={removeFromFavorites} onOpenBooking={openBookingModal} />}
        {currentView === 'profile' && <TravelerProfileView currentUser={currentUser} onUpdateProfile={updateProfile} />}
        {currentView === 'history' && <TravelerHistoryView currentUser={currentUser} bookings={bookings} onDeleteBooking={handleDeleteBooking} setCurrentView={setCurrentView} />}
        {currentView === 'messages' && <MessagesView currentUser={currentUser} userType="traveler" bookings={bookings} />}
      </main>
    </div>
    );
  }

  // Show Host UI
  if (userType === 'owner') {
    return (
      <div className="App host-app">
        {/* Skip to main content link */}
        <a href="#host-main-content" className="skip-link">Skip to main content</a>
        
        {/* Host Header */}
        <header className="host-header" role="banner">
          <div className="header-content px-4 md:px-6 lg:px-8">
            <div className="logo" onClick={() => {
              if (currentView === 'dashboard') {
                window.location.reload();
              } else {
                setCurrentView('dashboard');
              }
            }} style={{ cursor: 'pointer' }}>
              <div className="airbnb-icon">🏠</div>
              <span className="airbnb-text">airbnb</span>
            </div>
            
            <nav className="host-nav hidden md:flex" role="navigation" aria-label="Host navigation">
            <button 
              className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} 
              onClick={() => setCurrentView('dashboard')}
              aria-label="View host dashboard"
              aria-current={currentView === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button className={`nav-item ${currentView === 'today' ? 'active' : ''}`} onClick={() => setCurrentView('today')}>
              Today
            </button>
            <button className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentView('calendar')}>
              Calendar
            </button>
              <button className={`nav-item ${currentView === 'listings' ? 'active' : ''}`} onClick={() => setCurrentView('listings')}>
                Listings
              </button>
              <button className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentView('analytics')}>
                Analytics
              </button>
              <button className={`nav-item ${currentView === 'messages' ? 'active' : ''}`} onClick={() => setCurrentView('messages')}>
                Messages
              </button>
              <button className={`nav-item ${currentView === 'profile' ? 'active' : ''}`} onClick={() => setCurrentView('profile')}>
                Profile
              </button>
            </nav>
            
            <div className="header-actions">
              <div className="user-menu">
                <button className="profile-btn">M</button>
                <button className="menu-btn" onClick={() => setShowUserMenu(!showUserMenu)}>☰</button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-info">
                      <div className="user-avatar">M</div>
                      <div className="user-details">
                        <div className="user-name">Welcome, Host</div>
                        <div className="user-email">{loginForm.username}@airbnb.com</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={handleLogout}>Log out</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Host Secondary Navigation - Removed as filtering is now within HostTodayView */}

        {/* Host Main Content */}
        <main className="host-main px-4 md:px-6 lg:px-8" role="main" id="host-main-content">
          {currentView === 'dashboard' && <OwnerDashboardView 
            currentUser={currentUser}
            bookings={bookings}
            acceptBooking={acceptBooking}
            cancelBooking={cancelBooking}
          />}
          {currentView === 'today' && <HostTodayView 
            bookings={bookings} 
            currentUser={currentUser}
            acceptBooking={acceptBooking}
            cancelBooking={cancelBooking}
          />}
          {currentView === 'calendar' && <HostCalendarView 
            currentUser={currentUser}
            availability={availability}
            fetchAvailability={fetchAvailability}
            updateAvailability={updateAvailability}
            bulkUpdateAvailability={bulkUpdateAvailability}
            selectedListingForCalendar={selectedListingForCalendar}
            setSelectedListingForCalendar={setSelectedListingForCalendar}
          />}
          {currentView === 'listings' && <HostListingsView currentUser={currentUser} onCreateListing={createListing} />}
          {currentView === 'analytics' && <HostAnalyticsView 
            currentUser={currentUser}
            analytics={analytics}
            hostAnalytics={hostAnalytics}
            fetchPropertyAnalytics={fetchPropertyAnalytics}
            fetchHostAnalytics={fetchHostAnalytics}
          />}
          {currentView === 'messages' && <HostMessagesView currentUser={currentUser} bookings={bookings} />}
          {currentView === 'profile' && <OwnerProfileView currentUser={currentUser} onUpdateProfile={updateProfile} />}
        </main>
    </div>
  );
  }
}

// Homes View Component (Airbnb-style property listings)
function HomesView({ listings = [], filters = {}, setFilters = () => {}, onUpdateListing = () => {}, onDeleteListing = () => {}, onCreateBooking = () => {}, onOpenBooking = () => {}, isFavorite = () => false, toggleFavorite = () => {} }) {
  const [editingListing, setEditingListing] = useState(null);
  const [bookingForm, setBookingForm] = useState({ listingId: '', guestId: '', checkIn: '', checkOut: '' });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEditListing = (listing) => {
    setEditingListing(listing);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await onUpdateListing(editingListing.id, updatedData);
      setEditingListing(null);
    } catch (err) {
      alert('Failed to update listing');
    }
  };

  const handleDeleteListing = async (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await onDeleteListing(id);
      } catch (err) {
        alert('Failed to delete listing');
      }
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      await onCreateBooking(bookingForm);
      setBookingForm({ listingId: '', guestId: '', checkIn: '', checkOut: '' });
      alert('Booking created successfully!');
    } catch (err) {
      alert('Failed to create booking');
    }
  };

  return (
    <div className="homes-view">
      {/* Popular homes section */}
      <div className="section-header">
        <h2>Popular homes only</h2>
        <span className="section-arrow">&gt;</span>
      </div>
      
      {/* Filters - Hidden by default for cleaner look */}
      <div className="filters" style={{display: 'none'}}>
        <h3>Filter Listings</h3>
        <div className="filter-grid">
          <input
            type="text"
            placeholder="Location"
            value={filters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          />
          <select
            value={filters.property_type || ''}
            onChange={(e) => handleFilterChange('property_type', e.target.value)}
          >
            <option value="">All Property Types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="condo">Condo</option>
            <option value="villa">Villa</option>
            <option value="studio">Studio</option>
          </select>
          <input
            type="number"
            placeholder="Min Price"
            value={filters.min_price || ''}
            onChange={(e) => handleFilterChange('min_price', e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Price"
            value={filters.max_price || ''}
            onChange={(e) => handleFilterChange('max_price', e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Guests"
            value={filters.max_guests || ''}
            onChange={(e) => handleFilterChange('max_guests', e.target.value)}
          />
        </div>
      </div>

      {/* Homes Grid */}
      <div className="homes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {listings.map(listing => (
          <article key={listing.id} className="listing-card" role="article">
            <div className="listing-image">
              <img 
                src={listing.image_url || `/images/${getPropertyImage(listing.property_type, listing.id)}`}
                alt={`${listing.title} - ${listing.property_type} in ${listing.location}`}
                onError={(e) => {
                  // Fallback to gradient if image doesn't exist
                  e.target.style.background = `linear-gradient(135deg, hsl(${(getNumericId(listing.id) * 137.5) % 360}, 70%, 50%), hsl(${((getNumericId(listing.id) + 1) * 137.5) % 360}, 70%, 50%))`;
                  e.target.style.display = 'flex';
                  e.target.style.alignItems = 'center';
                  e.target.style.justifyContent = 'center';
                  e.target.style.color = 'white';
                  e.target.style.fontSize = '18px';
                  e.target.style.fontWeight = 'bold';
                  e.target.innerHTML = '🏠';
                }}
              />
              <div className="image-placeholder" style={{display: 'none'}}>
                <div style={{fontSize: '48px', marginBottom: '10px'}}>🏠</div>
                <div style={{fontSize: '14px', lineHeight: '1.2'}}>{listing.title}</div>
              </div>
              <div className="guest-favorite-tag">Guest favorite</div>
              <button 
                className={`favorite-btn ${isFavorite(listing.id) ? 'favorited' : ''}`}
                onClick={() => toggleFavorite(listing.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFavorite(listing.id);
                  }
                }}
                aria-label={isFavorite(listing.id) ? `Remove ${listing.title} from favorites` : `Add ${listing.title} to favorites`}
                title={isFavorite(listing.id) ? 'Remove from favorites' : 'Add to favorites'}
                tabIndex={0}
              >
                <span className="heart-icon" aria-hidden="true">{isFavorite(listing.id) ? '♥' : '♡'}</span>
              </button>
            </div>
            
            <div className="listing-content">
              <h3>{listing.title}</h3>
              <p className="listing-location" aria-label={`Location: ${listing.location}`}>{listing.location}</p>
              <p className="listing-price">${listing.price_per_night} for 2 nights</p>
              <div className="listing-rating">
                <span className="stars">★</span>
                <span className="rating">4.9</span>
              </div>
              
              {/* Book Now Button */}
              <button 
                className="book-now-btn"
                onClick={() => onOpenBooking(listing)}
              >
                Book Now
              </button>
              
              {/* Admin Controls - Hidden by default for cleaner look */}
              <div className="listing-details" style={{display: 'none'}}>
                <p><strong>Type:</strong> {listing.property_type}</p>
                <p><strong>Guests:</strong> {listing.max_guests}</p>
                <p><strong>Bedrooms:</strong> {listing.bedrooms}</p>
                <p><strong>Bathrooms:</strong> {listing.bathrooms}</p>
                {listing.description && <p><strong>Description:</strong> {listing.description}</p>}
              </div>

              <div className="listing-actions" style={{display: 'none'}}>
                <button onClick={() => handleEditListing(listing)} className="edit-btn">✏️ Edit</button>
                <button onClick={() => handleDeleteListing(listing.id)} className="delete-btn">🗑️ Delete</button>
              </div>

              {/* Booking Form - Hidden by default */}
              <div className="booking-form" style={{display: 'none'}}>
                <h4>Book This Listing</h4>
                <form onSubmit={handleCreateBooking}>
                  <input
                    type="hidden"
                    value={listing.id}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, listingId: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Guest ID"
                    value={bookingForm.guestId}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, guestId: e.target.value }))}
                    required
                  />
                  <input
                    type="date"
                    placeholder="Check-in Date"
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, checkIn: e.target.value }))}
                    required
                  />
                  <input
                    type="date"
                    placeholder="Check-out Date"
                    value={bookingForm.checkOut}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, checkOut: e.target.value }))}
                    required
                  />
                  <button type="submit" className="book-btn">Book Now</button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Edit Modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onSave={handleSaveEdit}
          onCancel={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}

// Experiences View Component
function ExperiencesView() {
  const experiences = [
    {
      id: 1,
      title: "Turkish Mosaic Lamp Workshops",
      price: 89,
      rating: 4.93,
      image: "🎨",
      date: "Sun 10 AM"
    },
    {
      id: 2,
      title: "Rug Tufting Workshop",
      price: 99,
      rating: 4.96,
      image: "🧶",
      date: "Sat 9 AM"
    },
    {
      id: 3,
      title: "Experience whale watching with a Naturalist",
      price: 185,
      rating: 4.94,
      image: "🐋",
      date: "Sun 8 AM"
    },
    {
      id: 4,
      title: "Explore Silicon Valley's landmarks",
      price: 150,
      rating: 4.91,
      image: "🏢",
      date: "Sat 2 PM"
    },
    {
      id: 5,
      title: "Take surf lessons with small group coaching",
      price: 139,
      rating: 4.9,
      image: "🏄",
      date: "Sun 9 AM"
    },
    {
      id: 6,
      title: "Unwind at a Santa Cruz Mountains spa retreat",
      price: 125,
      rating: 4.95,
      image: "🧘",
      date: "Sat 11 AM"
    },
    {
      id: 7,
      title: "Connect with rescue horses in a peaceful pasture",
      price: 65,
      rating: 4.99,
      image: "🐴",
      date: "Sun 3 PM"
    }
  ];

  return (
    <div className="experiences-view">
      {/* Experiences this weekend */}
      <div className="section-header">
        <h2>Experiences this weekend</h2>
        <span className="section-arrow">&gt;</span>
      </div>
      
      <div className="experiences-grid">
        {experiences.map(experience => (
          <div key={experience.id} className="experience-card">
            <div className="experience-image">
              <img 
                src={`/images/workshop${(experience.id % 3) + 1}.jpg`}
                alt={experience.title}
                onError={(e) => {
                  // Fallback to available local images
                  const fallbackImages = [
                    `/images/workshop1.jpg`,
                    `/images/workshop2.jpg`,
                    `/images/workshop3.jpg`,
                    `/images/surf1.jpg`,
                    `/images/whale1.jpg`
                  ];
                  const imageIndex = experience.id % fallbackImages.length;
                  e.target.src = fallbackImages[imageIndex];
                }}
              />
              <div className="image-placeholder" style={{display: 'none'}}>
                <div style={{fontSize: '48px', marginBottom: '10px'}}>{experience.image}</div>
                <div style={{fontSize: '12px', lineHeight: '1.2'}}>{experience.title}</div>
              </div>
              <div className="experience-date">{experience.date}</div>
              <button className="favorite-btn">♡</button>
            </div>
            
            <div className="experience-content">
              <h3>{experience.title}</h3>
              <p className="experience-price">From ${experience.price}/guest</p>
              <div className="experience-rating">
                <span className="stars">★</span>
                <span className="rating">{experience.rating}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All experiences section */}
      <div className="section-header">
        <h2>All experiences in San Jose</h2>
        <span className="section-arrow">&gt;</span>
      </div>
      
      <div className="experiences-grid">
        {experiences.map(experience => (
          <div key={`all-${experience.id}`} className="experience-card">
            <div className="experience-image">
              <div className="popular-tag">Popular</div>
              <button className="favorite-btn">♡</button>
              <div className="experience-emoji">{experience.image}</div>
            </div>
            
            <div className="experience-content">
              <h3>{experience.title}</h3>
              <p className="experience-price">From ${experience.price}/guest</p>
              <div className="experience-rating">
                <span className="stars">★</span>
                <span className="rating">{experience.rating}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Services View Component
function ServicesView() {
  const serviceCategories = [
    { name: "Photography", available: 10, image: "📸" },
    { name: "Chefs", available: 1, image: "👨‍🍳" },
    { name: "Prepared meals", available: 1, image: "🍽️" },
    { name: "Massage", available: 1, image: "💆" },
    { name: "Training", available: 3, image: "💪" },
    { name: "Hair", available: 1, image: "💇" },
    { name: "Spa treatments", available: 2, image: "🧖" },
    { name: "Catering", available: 2, image: "🍴" },
    { name: "Makeup", available: 0, image: "💄", comingSoon: true },
    { name: "Nails", available: 0, image: "💅", comingSoon: true }
  ];

  const photographyServices = [
    { name: "Classically beautiful photos by Deanna", price: 425, image: "📷" },
    { name: "Bay Area Photo Session", price: 400, image: "📸" },
    { name: "Say it in pictures by Marcus", price: 250, image: "🎭" },
    { name: "Photography by Lighting Up Your Life Studio", price: 350, image: "💡" },
    { name: "Handcrafted moments by Christopher", price: 1500, image: "🎨" },
    { name: "Family and friends photos by Chris", price: 325, image: "👨‍👩‍👧‍👦" },
    { name: "Bay area photography by Jennifer", price: 295, image: "🌉" }
  ];

  return (
    <div className="services-view">
      <div className="section-header">
        <h2>Services in San Jose</h2>
      </div>
      
      {/* Service Categories */}
      <div className="service-categories">
        {serviceCategories.map((service, index) => (
          <div key={index} className="service-category-card">
            <div className="service-category-image">
              <div className="service-emoji">{service.image}</div>
            </div>
            <div className="service-category-content">
              <h3>{service.name}</h3>
              <p>{service.comingSoon ? "Coming soon" : `${service.available} available`}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Photography Services */}
      <div className="section-header">
        <h2>Photography</h2>
        <span className="section-arrow">&gt;</span>
      </div>
      
      <div className="photography-grid">
        {photographyServices.map((service, index) => (
          <div key={index} className="photography-card">
            <div className="photography-image">
              <img 
                src={`/images/apartment${(index % 2) + 1}.jpg`}
                alt={service.name}
                onError={(e) => {
                  // Fallback to available local images
                  const fallbackImages = [
                    `/images/apartment1.jpg`,
                    `/images/apartment2.jpg`,
                    `/images/condo1.jpg`,
                    `/images/villa1.jpg`,
                    `/images/house1.jpg`,
                    `/images/house2.jpg`,
                    `/images/house3.jpg`
                  ];
                  const imageIndex = index % fallbackImages.length;
                  e.target.src = fallbackImages[imageIndex];
                }}
              />
              <div className="image-placeholder" style={{display: 'none'}}>
                <div style={{fontSize: '48px', marginBottom: '10px'}}>{service.image}</div>
                <div style={{fontSize: '14px', lineHeight: '1.2'}}>{service.name}</div>
              </div>
              <button className="favorite-btn">♡</button>
            </div>
            
            <div className="photography-content">
              <h3>{service.name}</h3>
              <p className="photography-price">From ${service.price} / group</p>
            </div>
          </div>
        ))}
      </div>

      {/* More services section */}
      <div className="section-header">
        <h2>More services in San Jose</h2>
        <span className="section-arrow">&gt;</span>
      </div>
    </div>
  );
}

// Favorites View Component
function FavoritesView({ favorites = [], onRemoveFavorite, onOpenBooking }) {
  if (favorites.length === 0) {
    return (
      <div className="favorites-view">
        <div className="empty-favorites">
          <div className="empty-icon">❤️</div>
          <h2>No favorites yet</h2>
          <p>Start exploring and save places you love!</p>
          <button 
            className="explore-btn"
            onClick={() => window.location.reload()}
          >
            Explore Homes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-view">
      <div className="favorites-header">
        <h1>Your Favorites</h1>
        <p>{favorites.length} saved places</p>
      </div>
      
      <div className="favorites-grid">
        {favorites.map(favorite => {
          const title = favorite.title || favorite.listing?.title || 'Favorite Listing';
          const location = favorite.location || favorite.listing?.location || '';
          const pricePerNight = favorite.price_per_night ?? favorite.listing?.price_per_night ?? null;
          const listingForBooking = {
            id: favorite.listing_id,
            title,
            location,
            price_per_night: pricePerNight,
            property_type: favorite.property_type || favorite.listing?.property_type,
            bedrooms: favorite.bedrooms || favorite.listing?.bedrooms,
            bathrooms: favorite.bathrooms || favorite.listing?.bathrooms,
            max_guests: favorite.max_guests || favorite.listing?.max_guests
          };
          return (
            <div key={favorite.id || favorite.listing_id} className="favorite-card">
            <div className="favorite-image">
              <img 
                src={`/images/house${(getNumericId(favorite.listing_id) % 7) + 1}.jpg`}
                  alt={title}
                onError={(e) => {
                  e.target.style.background = `linear-gradient(135deg, hsl(${(getNumericId(favorite.listing_id) * 137.5) % 360}, 70%, 50%), hsl(${((getNumericId(favorite.listing_id) + 1) * 137.5) % 360}, 70%, 50%))`;
                }}
              />
              <button 
                className="remove-favorite-btn"
                onClick={() => onRemoveFavorite(favorite.listing_id)}
                title="Remove from favorites"
              >
                <span>✕</span>
              </button>
            </div>
            
            <div className="favorite-content">
                <h3>{title}</h3>
                {location && <p className="favorite-location">{location}</p>}
                {pricePerNight !== null && (
              <p className="favorite-price">
                    ${pricePerNight} per night
              </p>
                )}
              <div className="favorite-actions">
                  <button className="book-now-btn" onClick={() => onOpenBooking && onOpenBooking(listingForBooking)}>Book Now</button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// Traveler Profile View Component
function TravelerProfileView({ currentUser, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState(currentUser?.profile_picture || localStorage.getItem(`profile_picture_${currentUser?.id}`) || '');
  const [profileData, setProfileData] = useState({
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    phone: currentUser?.phone || '',
    about_me: currentUser?.about_me || '',
    city: currentUser?.city || '',
    country: currentUser?.country || '',
    languages: currentUser?.languages || [],
    gender: currentUser?.gender || ''
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize profile picture from localStorage when component mounts
  useEffect(() => {
    const savedPicture = localStorage.getItem(`profile_picture_${currentUser?.id}`);
    if (savedPicture) {
      setProfilePicture(savedPicture);
    }
  }, [currentUser?.id]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 1MB for database TEXT column)
      if (file.size > 1024 * 1024) {
        alert('Image size must be less than 1MB. Please compress the image or choose a smaller file.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfilePicture(base64String);
        // Save to localStorage for persistence
        localStorage.setItem(`profile_picture_${currentUser?.id}`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 
    'Japan', 'South Korea', 'Australia', 'Brazil', 'Mexico', 'India', 'China'
  ];

  const genders = ['male', 'female', 'other', 'prefer-not-to-say'];

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !profileData.languages.includes(newLanguage.trim())) {
      setProfileData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (language) => {
    setProfileData(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== language)
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Include profile picture in the profile data
      const profileDataWithPicture = {
        ...profileData,
        profilePicture: profilePicture
      };
      const success = await onUpdateProfile(profileDataWithPicture);
      if (success) {
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      alert('Error updating profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      phone: currentUser?.phone || '',
      about_me: currentUser?.about_me || '',
      city: currentUser?.city || '',
      country: currentUser?.country || '',
      languages: currentUser?.languages || [],
      gender: currentUser?.gender || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="profile-view">
      <div className="profile-header">
        <div className="profile-avatar">
          {profilePicture ? (
            <img src={profilePicture} alt="Profile" className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">
              {currentUser?.first_name?.[0] || currentUser?.username?.[0] || 'U'}
            </div>
          )}
          {isEditing && (
            <label className="upload-avatar-btn">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              📷 Upload Photo
            </label>
          )}
        </div>
        <div className="profile-info">
          <h1>{currentUser?.first_name} {currentUser?.last_name}</h1>
          <p className="profile-email">{currentUser?.email}</p>
          <p className="profile-type">{currentUser?.user_type === 'traveler' ? 'Traveler' : 'Host'}</p>
        </div>
        <div className="profile-actions">
          {!isEditing ? (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="save-btn" onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={profileData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select Gender</option>
                  {genders.map(gender => (
                    <option key={gender} value={gender}>{gender.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <select
                  value={profileData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>About Me</label>
              <textarea
                value={profileData.about_me}
                onChange={(e) => handleInputChange('about_me', e.target.value)}
                disabled={!isEditing}
                rows={4}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="form-group">
              <label>Languages</label>
              <div className="languages-container">
                <div className="languages-list">
                  {profileData.languages.map((language, index) => (
                    <span key={index} className="language-tag">
                      {language}
                      {isEditing && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveLanguage(language)}
                          className="remove-language"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="add-language">
                    <input
                      type="text"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Add a language"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                    />
                    <button type="button" onClick={handleAddLanguage}>
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Traveler History View Component
function TravelerHistoryView({ currentUser, bookings, onDeleteBooking, setCurrentView }) {
  const [historyBookings, setHistoryBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // default to pending when arriving after booking

  useEffect(() => {
    const fetchHistoryBookings = async () => {
      setLoading(true);
      try {
        // Fetch bookings for this traveler
        const response = await fetch(`${API_BASE_URL}/bookings?user_id=${currentUser?.id || 'demo-traveler-1'}&user_type=traveler`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Backend returns array directly, not wrapped in {bookings: [...]}
          const bookings = Array.isArray(data) ? data : (data.bookings || []);
          console.log('Fetched history bookings:', bookings);
          setHistoryBookings(bookings);
        } else {
          setHistoryBookings([]);
        }
      } catch (error) {
        console.error('Error fetching history bookings:', error);
        setHistoryBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryBookings();

    // Listen for booking deletion events
    const handleBookingDeleted = (event) => {
      setHistoryBookings(event.detail);
    };

    window.addEventListener('bookingDeleted', handleBookingDeleted);

    return () => {
      window.removeEventListener('bookingDeleted', handleBookingDeleted);
    };
  }, [currentUser?.id]);

  const filteredBookings = historyBookings.filter(booking => {
    if (filter === 'all') return true;
    // Map backend status to frontend filter
    if (filter === 'completed') return booking.status === 'completed';
    if (filter === 'confirmed') return booking.status === 'confirmed';
    return booking.status === filter;
  });

  console.log('Filter:', filter, 'Total bookings:', historyBookings.length, 'Filtered:', filteredBookings.length);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'completed': return '#00A699';
      case 'cancelled': return '#FF5A5F';
      case 'pending': return '#FFB400';
      default: return '#717171';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Completed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="history-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your travel history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-header">
        <h2>Your Travel History</h2>
        <p>View all your past bookings and trips</p>
      </div>

      <div className="history-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Trips ({historyBookings.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({historyBookings.filter(b => b.status === 'pending').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
          onClick={() => setFilter('confirmed')}
        >
          Confirmed ({historyBookings.filter(b => b.status === 'confirmed').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({historyBookings.filter(b => b.status === 'completed').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({historyBookings.filter(b => b.status === 'cancelled').length})
        </button>
      </div>

      <div className="history-content">
        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No trips found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't made any bookings yet. Start exploring amazing places!"
                : `No ${filter} trips found.`
              }
            </p>
            <button 
              className="explore-btn"
              onClick={() => window.location.reload()}
            >
              Explore Properties
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="history-booking-card">
                <div className="booking-image">
                  <div className="property-image-placeholder">
                    {booking.listing?.property_type === 'house' ? '🏠' : 
                     booking.listing?.property_type === 'apartment' ? '🏢' :
                     booking.listing?.property_type === 'condo' ? '🏬' :
                     booking.listing?.property_type === 'studio' ? '🏠' : '🏠'}
                  </div>
                </div>
                
                <div className="booking-details">
                  <div className="booking-header">
                    <h3>{booking.listing_title || booking.listing?.title || 'Property'}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(booking.status) }}
                    >
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                  
                  <div className="booking-info">
                    <div className="info-row">
                      <span className="info-label">📍 Location:</span>
                      <span className="info-value">{booking.listing_location || booking.listing?.location || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📅 Dates:</span>
                      <span className="info-value">
                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">🌙 Nights:</span>
                      <span className="info-value">
                        {calculateNights(booking.check_in, booking.check_out)} nights
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">💰 Total:</span>
                      <span className="info-value">${booking.total_price}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📅 Booked:</span>
                      <span className="info-value">{formatDate(booking.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="booking-actions">
                  {booking.status === 'pending' && (
                    <button 
                      className="action-btn delete-booking"
                      onClick={() => onDeleteBooking(booking.id)}
                      style={{ backgroundColor: '#ff4444', color: 'white' }}
                    >
                      Delete
                  </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <button 
                      className="action-btn cancel-booking"
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel this confirmed booking?')) {
                          try {
                            const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/cancel`, {
                              method: 'POST',
                              credentials: 'include'
                            });
                            if (response.ok) {
                              alert('Booking cancelled successfully');
                              window.location.reload(); // Refresh to show updated status
                            } else {
                              alert('Failed to cancel booking. Please try again.');
                            }
                          } catch (error) {
                            console.error('Error cancelling booking:', error);
                            alert('Failed to cancel booking. Please try again.');
                          }
                        }
                      }}
                      style={{ backgroundColor: '#ff4444', color: 'white' }}
                    >
                      Cancel Booking
                    </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <button 
                      className="action-btn chat-with-host"
                      onClick={() => {
                        // Store selected booking for messages
                        sessionStorage.setItem('selectedBookingForMessage', JSON.stringify(booking));
                        setCurrentView('messages');
                      }}
                      style={{ backgroundColor: '#00A699', color: 'white', marginLeft: '10px' }}
                    >
                      Chat with Host
                    </button>
                  )}
                  {booking.status === 'completed' && (
                    <button className="action-btn write-review">
                      Write Review
                    </button>
                  )}
                  {booking.status === 'cancelled' && (
                    <button className="action-btn book-again">
                      Book Again
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Owner Dashboard View Component
function OwnerDashboardView({ currentUser, bookings, acceptBooking, cancelBooking }) {
  const [dashboardData, setDashboardData] = useState({
    recentBookings: [],
    upcomingBookings: [],
    completedBookings: [],
    totalRevenue: 0,
    totalBookings: 0,
    averageRating: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch bookings for this host
        const response = await fetch(`${API_BASE_URL}/bookings?as_host=true`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const hostBookings = Array.isArray(data) ? data : (data.bookings || []);
          
          // Process bookings data
          const now = new Date();
          const recentBookings = hostBookings
            .filter(booking => new Date(booking.created_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
          
          const upcomingBookings = hostBookings
            .filter(booking => booking.status === 'confirmed' && new Date(booking.check_in) > now)
            .sort((a, b) => new Date(a.check_in) - new Date(b.check_in))
            .slice(0, 5);
          
          const completedBookings = hostBookings
            .filter(booking => booking.status === 'confirmed' && new Date(booking.check_out) < now)
            .sort((a, b) => new Date(b.check_out) - new Date(a.check_out))
            .slice(0, 5);
          
          // Calculate metrics
          const totalRevenue = hostBookings
            .filter(booking => booking.status === 'confirmed')
            .reduce((sum, booking) => sum + parseFloat(booking.total_price || 0), 0);
          
          const totalBookings = hostBookings.length;
          const averageRating = 4.8; // Mock data
          const occupancyRate = 75; // Mock data
          
          setDashboardData({
            recentBookings,
            upcomingBookings,
            completedBookings,
            totalRevenue,
            totalBookings,
            averageRating,
            occupancyRate
          });
        } else {
          setDashboardData(prev => ({ ...prev, recentBookings: [], upcomingBookings: [], completedBookings: [] }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(prev => ({ ...prev, recentBookings: [], upcomingBookings: [], completedBookings: [] }));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#00A699';
      case 'pending': return '#FFB400';
      case 'cancelled': return '#FF5A5F';
      default: return '#717171';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <h1>Host Dashboard</h1>
        <p>Welcome back, {currentUser?.first_name || 'Host'}! Here's your hosting overview.</p>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Total Revenue</h3>
            <p className="metric-value">${dashboardData.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">📅</div>
          <div className="metric-content">
            <h3>Total Bookings</h3>
            <p className="metric-value">{dashboardData.totalBookings}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <h3>Average Rating</h3>
            <p className="metric-value">{dashboardData.averageRating}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🏠</div>
          <div className="metric-content">
            <h3>Occupancy Rate</h3>
            <p className="metric-value">{dashboardData.occupancyRate}%</p>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Bookings</h2>
          <p>Latest booking requests and updates</p>
        </div>
        <div className="bookings-list">
          {dashboardData.recentBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No recent bookings</h3>
              <p>New booking requests will appear here</p>
            </div>
          ) : (
            dashboardData.recentBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-image">
                  <img 
                    src={`/images/house${(getNumericId(booking.listing_id) % 7) + 1}.jpg`}
                    alt={booking.listing?.title || 'Property'}
                    onError={(e) => {
                      e.target.style.background = `linear-gradient(135deg, hsl(${(getNumericId(booking.listing_id) * 137.5) % 360}, 70%, 50%), hsl(${((getNumericId(booking.listing_id) + 1) * 137.5) % 360}, 70%, 50%))`;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="property-image-placeholder" style={{display: 'none'}}>
                    {booking.listing?.property_type === 'house' ? '🏠' : 
                     booking.listing?.property_type === 'apartment' ? '🏢' :
                     booking.listing?.property_type === 'condo' ? '🏬' :
                     booking.listing?.property_type === 'studio' ? '🏠' : '🏠'}
                  </div>
                </div>
                
                <div className="booking-details">
                  <div className="booking-header">
                    <h3>{booking.listing_title || booking.listing?.title || 'Property'}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(booking.status) }}
                    >
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                  
                  <div className="booking-info">
                    <div className="info-row">
                      <span className="info-label">📍 Location:</span>
                      <span className="info-value">{booking.listing_location || booking.listing?.location || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📅 Dates:</span>
                      <span className="info-value">
                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">💰 Total:</span>
                      <span className="info-value">${booking.total_price}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📅 Booked:</span>
                      <span className="info-value">{formatDate(booking.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="booking-actions">
                  {booking.status === 'pending' && (
                    <>
                      <button 
                        className="action-btn accept-btn"
                        onClick={() => acceptBooking(booking.id, 'demo-host-1')}
                      >
                        Accept
                      </button>
                      <button 
                        className="action-btn cancel-btn"
                        onClick={() => cancelBooking(booking.id, 'demo-host-1', 'owner', 'Not available')}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <button className="action-btn view-details">
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Upcoming Bookings</h2>
          <p>Confirmed bookings coming up</p>
        </div>
        <div className="bookings-list">
          {dashboardData.upcomingBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No upcoming bookings</h3>
              <p>Confirmed bookings will appear here</p>
            </div>
          ) : (
            dashboardData.upcomingBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-image">
                  <img 
                    src={`/images/house${(getNumericId(booking.listing_id) % 7) + 1}.jpg`}
                    alt={booking.listing?.title || 'Property'}
                    onError={(e) => {
                      e.target.style.background = `linear-gradient(135deg, hsl(${(getNumericId(booking.listing_id) * 137.5) % 360}, 70%, 50%), hsl(${((getNumericId(booking.listing_id) + 1) * 137.5) % 360}, 70%, 50%))`;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="property-image-placeholder" style={{display: 'none'}}>
                    {booking.listing?.property_type === 'house' ? '🏠' : 
                     booking.listing?.property_type === 'apartment' ? '🏢' :
                     booking.listing?.property_type === 'condo' ? '🏬' :
                     booking.listing?.property_type === 'studio' ? '🏠' : '🏠'}
                  </div>
                </div>
                
                <div className="booking-details">
                  <div className="booking-header">
                    <h3>{booking.listing_title || booking.listing?.title || 'Property'}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(booking.status) }}
                    >
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                  
                  <div className="booking-info">
                    <div className="info-row">
                      <span className="info-label">📍 Location:</span>
                      <span className="info-value">{booking.listing_location || booking.listing?.location || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📅 Dates:</span>
                      <span className="info-value">
                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">💰 Total:</span>
                      <span className="info-value">${booking.total_price}</span>
                    </div>
                  </div>
                </div>

                <div className="booking-actions">
                  <button className="action-btn view-details">
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Owner Profile View Component
function OwnerProfileView({ currentUser, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState(currentUser?.profile_picture || localStorage.getItem(`profile_picture_${currentUser?.id}`) || '');
  const [profileData, setProfileData] = useState({
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    phone: currentUser?.phone || '',
    about_me: currentUser?.about_me || '',
    city: currentUser?.city || '',
    country: currentUser?.country || '',
    languages: currentUser?.languages || [],
    gender: currentUser?.gender || ''
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize profile picture from localStorage when component mounts
  useEffect(() => {
    const savedPicture = localStorage.getItem(`profile_picture_${currentUser?.id}`);
    if (savedPicture) {
      setProfilePicture(savedPicture);
    }
  }, [currentUser?.id]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 1MB for database TEXT column)
      if (file.size > 1024 * 1024) {
        alert('Image size must be less than 1MB. Please compress the image or choose a smaller file.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfilePicture(base64String);
        // Save to localStorage for persistence
        localStorage.setItem(`profile_picture_${currentUser?.id}`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 
    'Japan', 'South Korea', 'Australia', 'Brazil', 'Mexico', 'India', 'China'
  ];

  const genders = ['male', 'female', 'other', 'prefer-not-to-say'];

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !profileData.languages.includes(newLanguage.trim())) {
      setProfileData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (language) => {
    setProfileData(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== language)
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Include profile picture in the profile data
      const profileDataWithPicture = {
        ...profileData,
        profilePicture: profilePicture
      };
      const success = await onUpdateProfile(profileDataWithPicture);
      if (success) {
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      alert('Error updating profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
      phone: currentUser?.phone || '',
      about_me: currentUser?.about_me || '',
      city: currentUser?.city || '',
      country: currentUser?.country || '',
      languages: currentUser?.languages || [],
      gender: currentUser?.gender || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="profile-view">
      <div className="profile-header">
        <div className="profile-avatar">
          {profilePicture ? (
            <img src={profilePicture} alt="Profile" className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">
              {currentUser?.first_name?.[0] || currentUser?.username?.[0] || 'H'}
            </div>
          )}
          {isEditing && (
            <label className="upload-avatar-btn">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              📷 Upload Photo
            </label>
          )}
        </div>
        <div className="profile-info">
          <h1>{currentUser?.first_name} {currentUser?.last_name}</h1>
          <p className="profile-email">{currentUser?.email}</p>
          <p className="profile-type">Host</p>
        </div>
        <div className="profile-actions">
          {!isEditing ? (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="save-btn" onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={profileData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select Gender</option>
                  {genders.map(gender => (
                    <option key={gender} value={gender}>{gender.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <select
                  value={profileData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>About Me</label>
              <textarea
                value={profileData.about_me}
                onChange={(e) => handleInputChange('about_me', e.target.value)}
                disabled={!isEditing}
                rows={4}
                placeholder="Tell us about yourself and your hosting experience..."
              />
            </div>

            <div className="form-group">
              <label>Languages</label>
              <div className="languages-container">
                <div className="languages-list">
                  {profileData.languages.map((language, index) => (
                    <span key={index} className="language-tag">
                      {language}
                      {isEditing && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveLanguage(language)}
                          className="remove-language"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="add-language">
                    <input
                      type="text"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Add a language"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                    />
                    <button type="button" onClick={handleAddLanguage}>
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Hosting Information</h3>
          <div className="hosting-stats">
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Properties Listed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Total Bookings</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Reviews</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">0</div>
              <div className="stat-label">Response Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Listing View Component
function CreateListingView({ onCreateListing, currentUser }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    imageFile: null,
    imagePreview: '',
    price_per_night: '',
    location: '',
    latitude: '',
    longitude: '',
    property_type: '',
    amenities: [],
    max_guests: 1,
    bedrooms: 1,
    bathrooms: 1.0,
    host_id: currentUser?.id || ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle image file upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image must be less than 5MB' });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Please select an image file' });
        return;
      }

      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  // Available amenities
  const availableAmenities = [
    'WiFi', 'Kitchen', 'Air Conditioning', 'TV', 'Pool', 'Garden', 'Parking',
    'Washing Machine', 'Dryer', 'Dishwasher', 'Microwave', 'Refrigerator',
    'Coffee Maker', 'Iron', 'Hair Dryer', 'Hot Tub', 'Fireplace', 'Balcony',
    'Terrace', 'Gym', 'Spa', 'Sauna', 'Tennis Court', 'BBQ Grill', 'Pet Friendly',
    'Wheelchair Accessible', 'Elevator', 'Doorman', 'Security', 'Concierge'
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.price_per_night || formData.price_per_night <= 0) {
      newErrors.price_per_night = 'Valid price is required';
    }
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.property_type) newErrors.property_type = 'Property type is required';
    if (formData.max_guests < 1) newErrors.max_guests = 'Max guests must be at least 1';
    if (formData.bedrooms < 1) newErrors.bedrooms = 'Bedrooms must be at least 1';
    if (formData.bathrooms < 1) newErrors.bathrooms = 'Bathrooms must be at least 1';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Convert image file to base64 if present
      let imageBase64 = formData.image_url; // Keep existing URL if no file
      
      if (formData.imageFile) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(formData.imageFile);
        });
      }
      
      // Create listing data with base64 image
      const listingData = {
        ...formData,
        image_url: imageBase64
      };
      
      await onCreateListing(listingData);
      alert('Listing created successfully!');
      setFormData({
        title: '',
        description: '',
        image_url: '',
        imageFile: null,
        imagePreview: '',
        price_per_night: '',
        location: '',
        latitude: '',
        longitude: '',
        property_type: '',
        amenities: [],
        max_guests: 1,
        bedrooms: 1,
        bathrooms: 1.0,
        host_id: currentUser?.id || ''
      });
      setErrors({});
    } catch (err) {
      alert('Failed to create listing: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="create-listing-view">
      <h2>➕ Create New Listing</h2>
      
      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={errors.title ? 'error' : ''}
            placeholder="e.g., Cozy Studio in Downtown LA"
            required
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows="4"
            placeholder="Describe your property, its unique features, and what makes it special..."
          />
        </div>

        <div className="form-group">
          <label>Property Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file-input"
          />
          {errors.image && <span className="error-message">{errors.image}</span>}
          {formData.imagePreview && (
            <div className="image-preview">
              <img src={formData.imagePreview} alt="Preview" style={{ maxWidth: '300px', maxHeight: '200px', marginTop: '1rem', borderRadius: '8px' }} />
            </div>
          )}
          <small className="hint">Upload an image from your computer (max 5MB)</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price per Night *</label>
            <div className="price-input">
              <span className="currency">$</span>
            <input
              type="number"
              step="0.01"
                min="0"
              value={formData.price_per_night}
                onChange={(e) => handleChange('price_per_night', parseFloat(e.target.value) || 0)}
                className={errors.price_per_night ? 'error' : ''}
                placeholder="0.00"
              required
            />
            </div>
            {errors.price_per_night && <span className="error-message">{errors.price_per_night}</span>}
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className={errors.location ? 'error' : ''}
              placeholder="e.g., Los Angeles, CA"
              required
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Property Type *</label>
            <select
              value={formData.property_type}
              onChange={(e) => handleChange('property_type', e.target.value)}
              className={errors.property_type ? 'error' : ''}
              required
            >
              <option value="">Select Property Type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condo</option>
              <option value="villa">Villa</option>
              <option value="studio">Studio</option>
              <option value="cabin">Cabin</option>
              <option value="loft">Loft</option>
              <option value="townhouse">Townhouse</option>
            </select>
            {errors.property_type && <span className="error-message">{errors.property_type}</span>}
          </div>

          <div className="form-group">
            <label>Coordinates (Optional)</label>
            <div className="coordinates-input">
            <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                placeholder="Latitude"
                className="coord-input"
              />
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                placeholder="Longitude"
                className="coord-input"
              />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Max Guests *</label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.max_guests}
              onChange={(e) => handleChange('max_guests', parseInt(e.target.value) || 1)}
              className={errors.max_guests ? 'error' : ''}
              required
            />
            {errors.max_guests && <span className="error-message">{errors.max_guests}</span>}
          </div>

          <div className="form-group">
            <label>Bedrooms *</label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.bedrooms}
              onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || 1)}
              className={errors.bedrooms ? 'error' : ''}
              required
            />
            {errors.bedrooms && <span className="error-message">{errors.bedrooms}</span>}
          </div>

          <div className="form-group">
            <label>Bathrooms *</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="20"
              value={formData.bathrooms}
              onChange={(e) => handleChange('bathrooms', parseFloat(e.target.value) || 1)}
              className={errors.bathrooms ? 'error' : ''}
              required
            />
            {errors.bathrooms && <span className="error-message">{errors.bathrooms}</span>}
          </div>
        </div>

        {/* Amenities Selection */}
        <div className="form-group">
          <label>Amenities</label>
          <div className="amenities-grid">
            {availableAmenities.map(amenity => (
              <label key={amenity} className="amenity-checkbox">
                <input
                  type="checkbox"
                  checked={formData.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                />
                <span className="amenity-label">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Listing...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
}

// Edit Listing Modal Component
function EditListingModal({ listing, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: listing.title,
    description: listing.description || '',
    price_per_night: listing.price_per_night,
    location: listing.location,
    property_type: listing.property_type,
    max_guests: listing.max_guests,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    is_active: listing.is_active,
    version: listing.version
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Edit Listing</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price per Night</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_night}
                onChange={(e) => handleChange('price_per_night', parseFloat(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Property Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => handleChange('property_type', e.target.value)}
                required
              >
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="condo">Condo</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
              </select>
            </div>

            <div className="form-group">
              <label>Max Guests</label>
              <input
                type="number"
                min="1"
                value={formData.max_guests}
                onChange={(e) => handleChange('max_guests', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bedrooms</label>
              <input
                type="number"
                min="1"
                value={formData.bedrooms}
                onChange={(e) => handleChange('bedrooms', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Bathrooms</label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={formData.bathrooms}
                onChange={(e) => handleChange('bathrooms', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
              />
              Active Listing
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" className="save-btn">Save Changes</button>
            <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Host View Components
function HostTodayView({ bookings = [], currentUser, acceptBooking, cancelBooking }) {
  const [localBookings, setLocalBookings] = useState(bookings);
  const [currentTab, setCurrentTab] = useState('new'); // 'new', 'confirmed', 'cancelled'

  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  const handleAccept = async (bookingId) => {
    try {
      await acceptBooking(bookingId, currentUser?.id);
      setLocalBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b));
      alert('Booking accepted and dates blocked.');
    } catch (e) {
      alert('Failed to accept booking');
    }
  };

  const handleCancel = async (bookingId) => {
    const reason = window.prompt('Please enter a reason for rejection/cancellation:','Not available for these dates');
    if (reason === null) return; // user cancelled prompt
    try {
      await cancelBooking(bookingId, currentUser?.id, 'owner', reason);
      setLocalBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', cancellation_reason: reason } : b));
      alert('Booking cancelled.');
    } catch (e) {
      alert('Failed to cancel booking');
    }
  };

  // Filter bookings for this host's properties
  const hostBookings = localBookings.filter(booking => {
    return currentUser?.user_type === 'owner' || booking.host_id === 'host-demo';
  });

  // Sort bookings by created_at date (most recent first)
  const sortedBookings = hostBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Filter by status
  const newRequests = sortedBookings.filter(b => b.status === 'pending');
  const confirmed = sortedBookings.filter(b => {
    if (b.status === 'confirmed') {
      // Only show confirmed bookings that haven't ended yet
  const today = new Date().toISOString().split('T')[0];
      return b.check_out >= today;
    }
    return false;
  });
  const cancelled = sortedBookings.filter(b => b.status === 'cancelled');

  // Get filtered bookings based on current tab
  const filteredBookings = currentTab === 'new' ? newRequests : 
                           currentTab === 'confirmed' ? confirmed : cancelled;

  return (
    <div className="host-today-view">
      <div className="bookings-header">
        <h2>Your Bookings</h2>
        <div className="booking-stats">
          <div className="stat-card">
            <div className="stat-number">{confirmed.length}</div>
            <div className="stat-label">Upcoming</div>
          </div>
          </div>
        </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-btn ${currentTab === 'new' ? 'active' : ''}`}
          onClick={() => setCurrentTab('new')}
        >
          New Requests ({newRequests.length})
        </button>
        <button 
          className={`filter-btn ${currentTab === 'confirmed' ? 'active' : ''}`}
          onClick={() => setCurrentTab('confirmed')}
        >
          Confirmed ({confirmed.length})
        </button>
        <button 
          className={`filter-btn ${currentTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setCurrentTab('cancelled')}
        >
          Cancelled ({cancelled.length})
        </button>
      </div>

      {/* Bookings Grid */}
      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>
            {currentTab === 'new' && 'No new booking requests'}
            {currentTab === 'confirmed' && 'No confirmed bookings'}
            {currentTab === 'cancelled' && 'No cancelled bookings'}
          </h3>
        </div>
      ) : (
          <div className="bookings-grid">
          {filteredBookings.map(booking => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                currentUser={currentUser}
              acceptBooking={currentTab === 'new' ? handleAccept : acceptBooking}
              cancelBooking={currentTab === 'new' ? handleCancel : cancelBooking}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, currentUser, acceptBooking, cancelBooking }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBookingStatus = (checkIn, checkOut, bookingStatus) => {
    // First check the actual booking status
    if (bookingStatus === 'pending') return 'pending';
    if (bookingStatus === 'cancelled') return 'cancelled';
    if (bookingStatus === 'confirmed') {
      // For confirmed bookings, determine the timeline status
      const today = new Date().toISOString().split('T')[0];
      if (checkIn === today) return 'checkin-today';
      if (checkIn > today) return 'upcoming';
      if (checkIn < today && checkOut > today) return 'current';
      return 'completed';
    }
    return 'pending'; // Default to pending
  };

  const status = getBookingStatus(booking.check_in, booking.check_out, booking.status);
  const statusLabels = {
    'pending': 'Pending Approval',
    'checkin-today': 'Check-in Today',
    'upcoming': 'Upcoming',
    'current': 'Current Stay',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };

  const statusColors = {
    'pending': '#FFB400',
    'checkin-today': '#FF385C',
    'upcoming': '#00A699',
    'current': '#FFB400',
    'completed': '#717171',
    'cancelled': '#717171'
  };

  return (
    <div className="booking-card" data-status={booking.status}>
      <div className="booking-image">
        <img 
          src={booking.listing_image} 
          alt={booking.listing_title}
          onError={(e) => {
            e.target.style.background = `linear-gradient(135deg, hsl(${(booking.id * 137.5) % 360}, 70%, 50%), hsl(${((booking.id + 1) * 137.5) % 360}, 70%, 50%))`;
            e.target.style.display = 'flex';
            e.target.style.alignItems = 'center';
            e.target.style.justifyContent = 'center';
            e.target.style.color = 'white';
            e.target.style.fontSize = '24px';
            e.target.textContent = '🏠';
          }}
        />
        <div 
          className="booking-status-badge"
          style={{ backgroundColor: statusColors[status] }}
        >
          {statusLabels[status]}
        </div>
      </div>
      
      <div className="booking-content">
        <h3>{booking.listing_title}</h3>
        <p className="booking-location">{booking.listing_location}</p>
        
        <div className="booking-dates">
          <div className="date-info">
            <span className="date-label">Check-in:</span>
            <span className="date-value">{formatDate(booking.check_in)}</span>
          </div>
          <div className="date-info">
            <span className="date-label">Check-out:</span>
            <span className="date-value">{formatDate(booking.check_out)}</span>
          </div>
        </div>
        
        <div className="booking-details">
          <div className="detail-item">
            <span className="detail-label">Guests:</span>
            <span className="detail-value">{booking.guests}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Nights:</span>
            <span className="detail-value">{booking.total_nights}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Total:</span>
            <span className="detail-value">${booking.total_price}</span>
          </div>
        </div>
        
        <div className="guest-info">
          <div className="guest-avatar">
            {(booking.user_name || booking.guest_username || 'G').charAt(0).toUpperCase()}
          </div>
          <div className="guest-details">
            <div className="guest-name">{booking.user_name || booking.guest_username || 'Guest'}</div>
            <div className="booking-date">Booked {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : 'N/A'}</div>
          </div>
        </div>
        
        <div className="booking-actions">
          {booking.status === 'pending' && currentUser?.user_type === 'owner' && (
            <>
              <button 
                className="accept-btn"
                onClick={() => {
                  if (window.confirm('Are you sure you want to accept this booking?')) {
                    acceptBooking(booking.id);
                  }
                }}
              >
                Accept Booking
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  cancelBooking(booking.id);
                }}
              >
                Cancel Booking
              </button>
            </>
          )}
          {booking.status === 'pending' && currentUser?.user_type === 'traveler' && (
            <button 
              className="cancel-btn"
              onClick={() => {
                const reason = prompt('Please provide a reason for cancellation:') || 'No reason provided';
                if (reason) {
                  cancelBooking(booking.id, currentUser?.id || 'traveler-demo', 'traveler', reason);
                }
              }}
            >
              Cancel Booking
            </button>
          )}
          {booking.status === 'confirmed' && (
            <>
              <button className="message-btn">Message Guest</button>
              <button className="view-details-btn">View Details</button>
            </>
          )}
          {booking.status === 'cancelled' && (
            <div className="cancelled-status">Booking Cancelled</div>
          )}
        </div>
      </div>
    </div>
  );
}

function HostCalendarView({ currentUser, availability, fetchAvailability, updateAvailability, bulkUpdateAvailability, selectedListingForCalendar, setSelectedListingForCalendar }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    is_available: true,
    price_override: null,
    min_nights: 1,
    max_nights: null,
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Get current month's start and end dates
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // Format dates for API
  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  // Fetch availability when component mounts or listing changes
  useEffect(() => {
    if (selectedListingForCalendar) {
      fetchAvailability(selectedListingForCalendar.id, startDate, endDate);
    }
  }, [selectedListingForCalendar, currentMonth]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get availability for a specific date
  const getAvailabilityForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.find(av => av.date === dateStr);
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (!selectedListingForCalendar) return;
    
    if (bulkEditMode) {
      const dateStr = date.toISOString().split('T')[0];
      if (selectedDates.includes(dateStr)) {
        setSelectedDates(prev => prev.filter(d => d !== dateStr));
      } else {
        setSelectedDates(prev => [...prev, dateStr]);
      }
    } else {
      // Toggle availability for single date
      const av = getAvailabilityForDate(date);
      const dateStr = date.toISOString().split('T')[0];
      
      updateAvailability(selectedListingForCalendar.id, dateStr, {
        is_available: !av?.is_available,
        price_override: av?.price_override || '',
        min_nights: av?.min_nights || 1,
        max_nights: av?.max_nights || '',
        notes: av?.notes || ''
      });
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedDates.length === 0) return;
    
    console.log('Bulk update data:', {
      listingId: selectedListingForCalendar.id,
      selectedDates: selectedDates,
      bulkEditData: bulkEditData
    });
    
    setLoading(true);
    try {
      await bulkUpdateAvailability(selectedListingForCalendar.id, selectedDates, bulkEditData);
      setSelectedDates([]);
      setBulkEditMode(false);
      alert(`Updated availability for ${selectedDates.length} dates`);
    } catch (error) {
      alert('Error updating availability: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get sample listings for selection (in real app, this would come from props)
  const sampleListings = [
    { id: "listing-1", title: "Cozy Studio in Downtown LA", location: "Los Angeles, CA" },
    { id: "listing-2", title: "Modern House in Burbank", location: "Burbank, CA" },
    { id: "listing-3", title: "Luxury Condo in Santa Monica", location: "Santa Monica, CA" }
  ];

  return (
    <div className="host-calendar-view">
      <div className="calendar-header">
        <h2>Availability Calendar</h2>
        <div className="calendar-controls">
          <select 
            value={selectedListingForCalendar?.id || ''} 
            onChange={(e) => {
              const listing = sampleListings.find(l => l.id === e.target.value);
              setSelectedListingForCalendar(listing || null);
            }}
            className="listing-selector"
          >
            <option value="">Select a listing</option>
            {sampleListings.map(listing => (
              <option key={listing.id} value={listing.id}>
                {listing.title} - {listing.location}
              </option>
            ))}
          </select>
          
          <div className="month-navigation">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="nav-btn"
            >
              ←
            </button>
            <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="nav-btn"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {selectedListingForCalendar ? (
        <>
          <div className="calendar-actions">
            <button 
              className={`action-btn ${bulkEditMode ? 'active' : ''}`}
              onClick={() => {
                setBulkEditMode(!bulkEditMode);
                setSelectedDates([]);
              }}
            >
              {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
            </button>
            
            {bulkEditMode && (
              <div className="bulk-edit-panel">
                <div className="bulk-edit-controls">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={bulkEditData.is_available}
                      onChange={(e) => setBulkEditData(prev => ({ ...prev, is_available: e.target.checked }))}
                    />
                    Available
                  </label>
                  <input 
                    type="number" 
                    placeholder="Price Override"
                    value={bulkEditData.price_override}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, price_override: e.target.value ? parseFloat(e.target.value) : null }))}
                  />
                  <input 
                    type="number" 
                    placeholder="Min Nights"
                    value={bulkEditData.min_nights}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, min_nights: parseInt(e.target.value) || 1 }))}
                  />
                  <input 
                    type="number" 
                    placeholder="Max Nights"
                    value={bulkEditData.max_nights}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, max_nights: e.target.value ? parseInt(e.target.value) : null }))}
                  />
                  <button 
                    onClick={handleBulkUpdate}
                    disabled={selectedDates.length === 0 || loading}
                    className="update-btn"
                  >
                    {loading ? 'Updating...' : `Update ${selectedDates.length} Dates`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="calendar-container">
            <div className="calendar-grid">
              <div className="calendar-header-row">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="calendar-day-header">{day}</div>
                ))}
              </div>
              
              <div className="calendar-days">
                {calendarDays.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const av = getAvailabilityForDate(date);
                  const dateStr = date.toISOString().split('T')[0];
                  const isSelected = selectedDates.includes(dateStr);
                  
                  return (
                    <div 
                      key={index}
                      className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${av?.is_available ? 'available' : 'unavailable'} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleDateClick(date)}
                    >
                      <span className="day-number">{date.getDate()}</span>
                      {av && (
                        <div className="availability-info">
                          {av.price_override && (
                            <span className="price-override">${av.price_override}</span>
                          )}
                          {av.min_nights > 1 && (
                            <span className="min-nights">{av.min_nights} min</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-color available"></div>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="legend-color unavailable"></div>
              <span>Unavailable</span>
            </div>
            <div className="legend-item">
              <div className="legend-color selected"></div>
              <span>Selected for bulk edit</span>
            </div>
          </div>
        </>
      ) : (
        <div className="no-listing-selected">
          <div className="empty-icon">📅</div>
          <h3>Select a listing to manage availability</h3>
          <p>Choose a listing from the dropdown above to start managing your calendar</p>
        </div>
      )}
    </div>
  );
}

function HostListingsView({ currentUser, onCreateListing }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingListing, setEditingListing] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Fetch listings from backend
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/listings`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter listings for this host
          const hostListings = data.listings.filter(listing => 
            listing.host_id === currentUser?.id || listing.host_id === 'demo-host-1'
          );
          setListings(hostListings);
        } else {
          setListings([]);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [currentUser?.id]);

  const handleCreateListing = async (listingData) => {
    try {
      const newListing = await onCreateListing(listingData);
      // Refetch all listings to get the complete data with proper ID
      const response = await fetch(`${API_BASE_URL}/listings`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const hostListings = data.listings.filter(listing => 
          listing.host_id === currentUser?.id || listing.host_id === 'demo-host-1'
        );
        setListings(hostListings);
      } else {
        // Fallback to adding the new listing to the list
      setListings(prev => [...prev, newListing]);
      }
      
      setShowCreateForm(false);
    } catch (error) {
      throw error; // Re-throw to be handled by CreateListingView
    }
  };

  const handleEditListing = (listing) => {
    console.log('Editing listing:', listing);
    console.log('Listing ID:', listing.id);
    setEditingListing(listing);
    setEditFormData({
      title: listing.title || '',
      location: listing.location || '',
      price_per_night: listing.price_per_night || 0,
      property_type: listing.property_type || 'apartment',
      max_guests: listing.max_guests || 1,
      bedrooms: listing.bedrooms || 1,
      bathrooms: listing.bathrooms || 1
    });
  };

  const handleSaveEdit = async () => {
    if (!editingListing || !editingListing.id) {
      console.error('Cannot save: No listing ID found');
      alert('Error: Listing ID is missing. Please try again.');
      return;
    }
    
    console.log('Saving listing with ID:', editingListing.id);
    console.log('Form data:', editFormData);
    
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${editingListing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(editFormData)
        });
      
      console.log('Update response status:', response.status);
        
        if (response.ok) {
        const responseData = await response.json();
        console.log('Update response:', responseData);
        
        // Handle both wrapped {success: true, listing: {...}} and direct listing object
        const updatedListing = responseData.listing || responseData;
        
        // Use the ID from the updated listing
        const listingIdToUpdate = updatedListing.id || editingListing.id;
        
        console.log('Updating listing in state with ID:', listingIdToUpdate);
        
          setListings(prev => prev.map(listing => 
          listing.id === listingIdToUpdate ? updatedListing : listing
          ));
        
          setEditingListing(null);
          setEditFormData({});
          alert('Listing updated successfully!');
        } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update failed:', errorData);
        alert(`Failed to update listing: ${errorData.error || 'Please try again.'}`);
        }
      } catch (error) {
        console.error('Error updating listing:', error);
        alert('Error updating listing. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingListing(null);
    setEditFormData({});
  };

  const handleDeleteListing = async (listingOrId) => {
    // Handle both ID (string) and listing object
    const listingId = typeof listingOrId === 'string' ? listingOrId : listingOrId.id;
    const listingTitle = typeof listingOrId === 'object' ? listingOrId.title : 'this listing';
    
    if (!listingId) {
      console.error('Cannot delete: No listing ID found');
      alert('Error: Listing ID is missing. Cannot delete this listing.');
      return;
    }
    
    console.log('Deleting listing:', { id: listingId, title: listingTitle });
    
    if (window.confirm(`Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`)) {
      try {
        console.log('Deleting listing with ID:', listingId);
        const response = await fetch(`${API_BASE_URL}/listings/${listingId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        console.log('Delete response status:', response.status);
        
        if (response.ok) {
          setListings(prev => prev.filter(l => l.id !== listingId));
          alert(`"${listingTitle}" has been deleted successfully!`);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Delete error:', errorData);
          alert(`Failed to delete listing: ${errorData.error || 'Please try again.'}`);
        }
      } catch (error) {
        console.error('Error deleting listing:', error);
        alert('Error deleting listing. Please try again.');
      }
    }
  };

  if (showCreateForm) {
    return (
      <div className="host-listings-view">
        <div className="listings-header">
          <button 
            className="back-btn" 
            onClick={() => setShowCreateForm(false)}
          >
            ← Back to Listings
          </button>
          <h2>Create New Listing</h2>
        </div>
        <CreateListingView 
          onCreateListing={handleCreateListing} 
          currentUser={currentUser}
        />
      </div>
    );
  }

  return (
    <div className="host-listings-view">
      <div className="listings-header">
        <h2>Your Listings</h2>
        <button 
          className="create-listing-btn"
          onClick={() => setShowCreateForm(true)}
        >
          + Add New Listing
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading your listings...</div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No listings yet</h3>
          <p>Create your first listing to start hosting guests!</p>
          <button 
            className="create-listing-btn primary"
            onClick={() => setShowCreateForm(true)}
          >
            Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="listings-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {listings.map(listing => (
            <div key={listing.id} className="listing-card">
              <div className="listing-image">
                <img 
                  src={listing.image_url || `/images/${getPropertyImage(listing.property_type, listing.id)}`} 
                  alt={listing.title}
                  onError={(e) => {
                    e.target.style.background = `linear-gradient(135deg, hsl(${(getNumericId(listing.id) * 137.5) % 360}, 70%, 50%), hsl(${((getNumericId(listing.id) + 1) * 137.5) % 360}, 70%, 50%))`;
                    e.target.style.display = 'flex';
                    e.target.style.alignItems = 'center';
                    e.target.style.justifyContent = 'center';
                    e.target.style.color = 'white';
                    e.target.style.fontSize = '24px';
                    e.target.textContent = '🏠';
                  }}
                />
              </div>
              <div className="listing-content">
                <div className="listing-header">
                  <h3>{listing.title}</h3>
                  <div className="listing-badges">
                    <span className="property-type-badge">{listing.property_type}</span>
                    <span className="status-badge active">Active</span>
                  </div>
                </div>
                <p className="listing-location">{listing.location}</p>
                <p className="listing-price">${listing.price_per_night}/night</p>
                <div className="listing-details">
                  <span>{listing.max_guests} guests</span>
                  <span>•</span>
                  <span>{listing.bedrooms} bedrooms</span>
                  <span>•</span>
                  <span>{listing.bathrooms} bathrooms</span>
                </div>
                <div className="listing-stats">
                  <div className="stat">
                    <span className="stat-label">Views</span>
                    <span className="stat-value">{Math.floor(Math.random() * 100) + 50}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Bookings</span>
                    <span className="stat-value">{Math.floor(Math.random() * 20) + 5}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Rating</span>
                    <span className="stat-value">4.{Math.floor(Math.random() * 5) + 5}</span>
                  </div>
                </div>
                <div className="listing-actions">
                  <button 
                    className="edit-btn" 
                    onClick={() => handleEditListing(listing)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDeleteListing(listing)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingListing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit Listing: {editingListing.title}</h3>
              <button className="close-btn" onClick={handleCancelEdit}>×</button>
            </div>
            <div className="edit-modal-content">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price per Night</label>
                  <div className="price-input">
                    <span className="currency">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.price_per_night}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, price_per_night: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Property Type</label>
                  <select
                    value={editFormData.property_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, property_type: e.target.value }))}
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="condo">Condo</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Studio</option>
                    <option value="cabin">Cabin</option>
                    <option value="loft">Loft</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editFormData.max_guests}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Bedrooms</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editFormData.bedrooms}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="form-group">
                  <label>Bathrooms</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="20"
                    value={editFormData.bathrooms}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bathrooms: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            </div>
            <div className="edit-modal-actions">
              <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
              <button className="save-btn" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HostMessagesView({ currentUser, bookings }) {
  return <MessagesView currentUser={currentUser} userType="owner" bookings={bookings} />;
}

// Host Analytics View Component
function HostAnalyticsView({ currentUser, analytics, hostAnalytics, fetchPropertyAnalytics, fetchHostAnalytics }) {
  const [selectedListing, setSelectedListing] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  // Sample listings for selection
  const sampleListings = [
    { id: "listing-1", title: "Cozy Studio in Downtown LA", location: "Los Angeles, CA" },
    { id: "listing-2", title: "Modern House in Burbank", location: "Burbank, CA" },
    { id: "listing-3", title: "Luxury Apartment in Hollywood", location: "Hollywood, CA" }
  ];

  const handleListingSelect = async (listingId) => {
    setSelectedListing(listingId);
    setLoading(true);
    try {
      await fetchPropertyAnalytics(listingId, dateRange.start, dateRange.end);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = async () => {
    if (selectedListing) {
      setLoading(true);
      try {
        await fetchPropertyAnalytics(selectedListing, dateRange.start, dateRange.end);
      } finally {
        setLoading(false);
      }
    }
  };

  // Load host analytics on component mount
  React.useEffect(() => {
    if (currentUser && currentUser.id) {
      fetchHostAnalytics(currentUser.id);
    }
  }, [currentUser]);

  return (
    <div className="host-analytics-view">
      <div className="analytics-header">
        <h2>Property Analytics</h2>
        <p>Track your property performance and optimize your listings</p>
      </div>

      {/* Host Overview */}
      {hostAnalytics && (
        <div className="host-overview">
          <h3>Host Overview</h3>
          <div className="overview-cards">
            <div className="overview-card">
              <div className="card-icon">🏠</div>
              <div className="card-content">
                <div className="card-value">{hostAnalytics.total_listings || 0}</div>
                <div className="card-label">Total Listings</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <div className="card-value">${(hostAnalytics.total_revenue || 0).toLocaleString()}</div>
                <div className="card-label">Total Revenue</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">📅</div>
              <div className="card-content">
                <div className="card-value">{hostAnalytics.total_bookings || 0}</div>
                <div className="card-label">Total Bookings</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <div className="card-value">{hostAnalytics.avg_occupancy_rate || 0}%</div>
                <div className="card-label">Avg Occupancy</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Selection */}
      <div className="property-selection">
        <h3>Select Property for Detailed Analytics</h3>
        <div className="listing-selector">
          {sampleListings.map(listing => (
            <button
              key={listing.id}
              className={`listing-option ${selectedListing === listing.id ? 'selected' : ''}`}
              onClick={() => handleListingSelect(listing.id)}
            >
              {listing.title}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Selector */}
      {selectedListing && (
        <div className="date-range-selector">
          <h4>Date Range</h4>
          <div className="date-inputs">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
            <button onClick={handleDateRangeChange} disabled={loading}>
              {loading ? 'Loading...' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {/* Property Analytics */}
      {analytics && selectedListing && (
        <div className="property-analytics">
          <h3>{analytics.listing_title} - Analytics</h3>
          
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.booking_metrics.total_bookings}</div>
                <div className="metric-label">Total Bookings</div>
                <div className="metric-trend">+{analytics.booking_metrics.booking_growth_rate}%</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">💰</div>
              <div className="metric-content">
                <div className="metric-value">${analytics.booking_metrics.total_revenue.toLocaleString()}</div>
                <div className="metric-label">Total Revenue</div>
                <div className="metric-trend">+15.3%</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.occupancy_metrics.occupancy_rate}%</div>
                <div className="metric-label">Occupancy Rate</div>
                <div className="metric-trend">{analytics.occupancy_metrics.occupancy_trend}</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.guest_satisfaction.avg_rating}</div>
                <div className="metric-label">Avg Rating</div>
                <div className="metric-trend">{analytics.guest_satisfaction.satisfaction_trend}</div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="detailed-analytics">
            <div className="analytics-section">
              <h4>Pricing Analysis</h4>
              <div className="pricing-info">
                <div className="price-item">
                  <span className="price-label">Base Price:</span>
                  <span className="price-value">${analytics.pricing_metrics.base_price}/night</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Avg Override Price:</span>
                  <span className="price-value">${analytics.pricing_metrics.avg_override_price}/night</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Price Variance:</span>
                  <span className="price-value">${analytics.pricing_metrics.price_variance}</span>
                </div>
              </div>
            </div>

            <div className="analytics-section">
              <h4>Occupancy Details</h4>
              <div className="occupancy-info">
                <div className="occupancy-item">
                  <span className="occupancy-label">Total Days:</span>
                  <span className="occupancy-value">{analytics.occupancy_metrics.total_days}</span>
                </div>
                <div className="occupancy-item">
                  <span className="occupancy-label">Available Days:</span>
                  <span className="occupancy-value">{analytics.occupancy_metrics.available_days}</span>
                </div>
                <div className="occupancy-item">
                  <span className="occupancy-label">Booked Days:</span>
                  <span className="occupancy-value">{analytics.occupancy_metrics.booked_days}</span>
                </div>
              </div>
            </div>

            <div className="analytics-section">
              <h4>Recommendations</h4>
              <div className="recommendations">
                {analytics.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <span className="rec-icon">💡</span>
                    <span className="rec-text">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedListing && (
        <div className="no-selection">
          <div className="no-selection-icon">📊</div>
          <h3>Select a Property</h3>
          <p>Choose a property from the list above to view detailed analytics</p>
        </div>
      )}
    </div>
  );
}

// ==================== MESSAGES COMPONENT ====================
function MessagesView({ currentUser, userType, bookings }) {
  const [messages, setMessages] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    
    // Check if we have a stored booking from Chat with Host button
    const storedBooking = sessionStorage.getItem('selectedBookingForMessage');
    if (storedBooking) {
      try {
        const booking = JSON.parse(storedBooking);
        setSelectedBooking(booking.id);
        // Clear the stored booking after using it
        sessionStorage.removeItem('selectedBookingForMessage');
      } catch (error) {
        console.error('Error parsing stored booking:', error);
      }
    }
  }, [currentUser]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        // If we have messages, auto-select the first booking
        if (data.messages && data.messages.length > 0 && !selectedBooking) {
          setSelectedBooking(data.messages[0].booking_id);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking) return;

    try {
      const bookingId = selectedBooking;
      
      // First, fetch the booking to get host_id and guest_id
      const bookingResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        credentials: 'include'
      });
      
      if (!bookingResponse.ok) {
        alert('Could not fetch booking details');
        return;
      }
      
      const bookingData = await bookingResponse.json();
      const booking = bookingData.booking;
      
      if (!booking) {
        alert('Booking not found');
        return;
      }

      // Determine receiver (host if sender is traveler, traveler if sender is host)
      let receiverId;
      if (userType === 'traveler') {
        receiverId = booking.host_id;
      } else {
        receiverId = booking.guest_id;
      }
      
      if (!receiverId) {
        alert('Could not determine receiver. Please try again.');
        return;
      }
      
      console.log('Sending message:', {
        booking_id: bookingId,
        receiver_id: receiverId,
        message: newMessage
      });

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          receiver_id: receiverId,
          message: newMessage
        }),
        credentials: 'include'
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Group messages by booking
  const messagesByBooking = messages.reduce((acc, msg) => {
    if (!acc[msg.booking_id]) acc[msg.booking_id] = [];
    acc[msg.booking_id].push(msg);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="messages-view">
        <div className="loading">Loading messages...</div>
      </div>
    );
  }

  // Get confirmed bookings to show as conversation starters
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  if (Object.keys(messagesByBooking).length === 0) {
    return (
      <div className="messages-view">
        <h2>{userType === 'traveler' ? 'Messages with Hosts' : 'Messages with Travelers'}</h2>
        
        {confirmedBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>You don't have any confirmed bookings yet to start a conversation.</p>
          </div>
        ) : (
          <div className="start-conversation-view">
            <h3>Select a booking to start messaging:</h3>
            <div className="bookings-list">
              {confirmedBookings.map(booking => (
                <div 
                  key={booking.id} 
                  className="booking-card"
                  onClick={() => setSelectedBooking(booking.id)}
                >
                  <h4>{booking.listing_title || booking.listing?.title || 'Property'}</h4>
                  <p>{booking.listing_location || booking.listing?.location || 'Location N/A'}</p>
                  <p>Dates: {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}</p>
                  <button className="start-chat-btn">Start Conversation</button>
                </div>
              ))}
            </div>
            
            {selectedBooking && (
              <div className="chat-interface">
                <div className="chat-header">
                  <h4>Chat about your booking</h4>
                </div>
                <div className="chat-messages">
                  <p className="no-messages-yet">No messages yet. Start the conversation!</p>
                </div>
                <div className="message-input">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <button onClick={sendMessage} disabled={!newMessage.trim()}>
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="messages-view">
      <h2>{userType === 'traveler' ? 'Messages with Hosts' : 'Messages with Travelers'}</h2>
      
      <div className="messages-container">
        <div className="conversations-sidebar">
          <h3>Conversations</h3>
          {Object.keys(messagesByBooking).map(bookingId => {
            const conversationMsgs = messagesByBooking[bookingId];
            const lastMsg = conversationMsgs[0];
            return (
              <div 
                key={bookingId}
                className={`conversation-item ${selectedBooking === bookingId ? 'active' : ''}`}
                onClick={() => setSelectedBooking(bookingId)}
              >
                <div className="conversation-title">{lastMsg.listing_title}</div>
                <div className="conversation-preview">{lastMsg.message}</div>
              </div>
            );
          })}
        </div>

        <div className="messages-main">
          {selectedBooking && messagesByBooking[selectedBooking] ? (
            <>
              <div className="messages-list">
                {[...messagesByBooking[selectedBooking]].reverse().map(msg => (
                  <div key={msg.id} className={`message ${msg.sender_id === currentUser?.id ? 'sent' : 'received'}`}>
                    <div className="message-header">
                      <strong>{msg.sender_id === currentUser?.id ? 'You' : (msg.sender_username || 'User')}</strong>
                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div className="message-text">{msg.message}</div>
                  </div>
                ))}
              </div>

              <div className="message-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!newMessage.trim()}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

/**
 * Property Redux Slice
 * Manages property listings data and search state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_PROPERTY_API_URL || 'http://localhost:5003';

const initialState = {
  properties: [],
  currentProperty: null,
  favorites: [],
  searchResults: [],
  filters: {
    location: '',
    checkIn: null,
    checkOut: null,
    guests: 1,
    priceRange: { min: 0, max: 10000 },
    propertyType: '',
    amenities: [],
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  isLoading: false,
  error: null,
};

// Async thunks

export const fetchProperties = createAsyncThunk(
  'properties/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.location) params.append('location', filters.location);
      if (filters.checkIn) params.append('check_in', filters.checkIn);
      if (filters.checkOut) params.append('check_out', filters.checkOut);
      if (filters.guests) params.append('guests', filters.guests);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.propertyType) params.append('property_type', filters.propertyType);
      
      const response = await axios.get(`${API_BASE_URL}/api/listings?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch properties');
    }
  }
);

export const fetchPropertyById = createAsyncThunk(
  'properties/fetchById',
  async (propertyId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/listings/${propertyId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Property not found');
    }
  }
);

export const searchProperties = createAsyncThunk(
  'properties/search',
  async (searchParams, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/listings/search`, searchParams);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Search failed');
    }
  }
);

export const fetchFavorites = createAsyncThunk(
  'properties/fetchFavorites',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get(`http://localhost:5001/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.favorites;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch favorites');
    }
  }
);

export const addFavorite = createAsyncThunk(
  'properties/addFavorite',
  async (listingId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `http://localhost:5001/api/favorites`,
        { listing_id: listingId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.favorite;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add favorite');
    }
  }
);

export const removeFavorite = createAsyncThunk(
  'properties/removeFavorite',
  async (listingId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      await axios.delete(`http://localhost:5001/api/favorites/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return listingId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove favorite');
    }
  }
);

// Slice

const propertySlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentProperty: (state, action) => {
      state.currentProperty = action.payload;
    },
    clearCurrentProperty: (state) => {
      state.currentProperty = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Properties
      .addCase(fetchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.isLoading = false;
        state.properties = action.payload.listings || action.payload;
        state.pagination.total = action.payload.total || state.properties.length;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Property By ID
      .addCase(fetchPropertyById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProperty = action.payload.listing || action.payload;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Search Properties
      .addCase(searchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProperties.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload.results || action.payload;
      })
      .addCase(searchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Favorites
      .addCase(fetchFavorites.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.isLoading = false;
        state.favorites = action.payload;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Add Favorite
      .addCase(addFavorite.fulfilled, (state, action) => {
        state.favorites.push(action.payload);
      })
      .addCase(addFavorite.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Remove Favorite
      .addCase(removeFavorite.fulfilled, (state, action) => {
        state.favorites = state.favorites.filter(
          fav => fav.listing_id !== action.payload
        );
      })
      .addCase(removeFavorite.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setCurrentProperty,
  clearCurrentProperty,
  clearError,
} = propertySlice.actions;

// Selectors
export const selectAllProperties = (state) => state.properties.properties;
export const selectCurrentProperty = (state) => state.properties.currentProperty;
export const selectFavorites = (state) => state.properties.favorites;
export const selectSearchResults = (state) => state.properties.searchResults;
export const selectFilters = (state) => state.properties.filters;
export const selectPropertyLoading = (state) => state.properties.isLoading;
export const selectPropertyError = (state) => state.properties.error;
export const selectIsFavorite = (listingId) => (state) => 
  state.properties.favorites.some(fav => fav.listing_id === listingId);

export default propertySlice.reducer;


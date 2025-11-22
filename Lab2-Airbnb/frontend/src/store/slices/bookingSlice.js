/**
 * Booking Redux Slice
 * Manages booking state and operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BOOKING_API_URL || 'http://localhost:5004';

const initialState = {
  bookings: [],
  currentBooking: null,
  cart: [],
  isLoading: false,
  error: null,
  bookingStatus: null, // 'idle', 'creating', 'success', 'error'
};

// Async thunks

export const createBooking = createAsyncThunk(
  'bookings/create',
  async (bookingData, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `${API_BASE_URL}/api/bookings`,
        bookingData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Booking creation failed');
    }
  }
);

export const fetchUserBookings = createAsyncThunk(
  'bookings/fetchUserBookings',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token, user } = getState().auth;
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/user/${user._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.bookings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bookings');
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  'bookings/fetchById',
  async (bookingId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Booking not found');
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateStatus',
  async ({ bookingId, status }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.put(
        `${API_BASE_URL}/api/bookings/${bookingId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Status update failed');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancel',
  async (bookingId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.put(
        `${API_BASE_URL}/api/bookings/${bookingId}`,
        { status: 'cancelled' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Cancellation failed');
    }
  }
);

// Owner-specific actions
export const acceptBooking = createAsyncThunk(
  'bookings/accept',
  async (bookingId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `http://localhost:5002/api/bookings/${bookingId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Accept failed');
    }
  }
);

export const rejectBooking = createAsyncThunk(
  'bookings/reject',
  async ({ bookingId, reason }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `http://localhost:5002/api/bookings/${bookingId}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Rejection failed');
    }
  }
);

// Slice

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const exists = state.cart.find(item => item.listing_id === action.payload.listing_id);
      if (!exists) {
        state.cart.push(action.payload);
      }
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter(item => item.listing_id !== action.payload);
    },
    clearCart: (state) => {
      state.cart = [];
    },
    setCurrentBooking: (state, action) => {
      state.currentBooking = action.payload;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetBookingStatus: (state) => {
      state.bookingStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Booking
      .addCase(createBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.bookingStatus = 'creating';
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings.push(action.payload);
        state.currentBooking = action.payload;
        state.bookingStatus = 'success';
        state.cart = []; // Clear cart after successful booking
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.bookingStatus = 'error';
      })
      
      // Fetch User Bookings
      .addCase(fetchUserBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Booking By ID
      .addCase(fetchBookingById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBooking = action.payload;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Booking Status
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        if (state.currentBooking?._id === action.payload._id) {
          state.currentBooking = action.payload;
        }
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Cancel Booking
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.bookings[index].status = 'cancelled';
        }
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Accept Booking (Owner)
      .addCase(acceptBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b.booking_id === action.payload.booking_id);
        if (index !== -1) {
          state.bookings[index].status = 'confirmed';
        }
      })
      
      // Reject Booking (Owner)
      .addCase(rejectBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b.booking_id === action.payload.booking_id);
        if (index !== -1) {
          state.bookings[index].status = 'cancelled';
        }
      });
  },
});

export const {
  addToCart,
  removeFromCart,
  clearCart,
  setCurrentBooking,
  clearCurrentBooking,
  clearError,
  resetBookingStatus,
} = bookingSlice.actions;

// Selectors
export const selectAllBookings = (state) => state.bookings.bookings;
export const selectCurrentBooking = (state) => state.bookings.currentBooking;
export const selectCart = (state) => state.bookings.cart;
export const selectBookingLoading = (state) => state.bookings.isLoading;
export const selectBookingError = (state) => state.bookings.error;
export const selectBookingStatus = (state) => state.bookings.bookingStatus;
export const selectPendingBookings = (state) => 
  state.bookings.bookings.filter(b => b.status === 'pending');
export const selectConfirmedBookings = (state) => 
  state.bookings.bookings.filter(b => b.status === 'confirmed');

export default bookingSlice.reducer;


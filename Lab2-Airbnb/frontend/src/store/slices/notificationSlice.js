/**
 * Notification Redux Slice
 * Manages real-time notifications from Kafka events
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

// Async thunks

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.notifications;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      await axios.put(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const { notifications } = getState().notifications;
      
      // Mark all unread notifications as read
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n._id);
      
      await Promise.all(
        unreadIds.map(id =>
          axios.put(
            `${API_BASE_URL}/api/notifications/${id}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      
      return unreadIds;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark all as read');
    }
  }
);

// Slice

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      // Add new notification at the beginning
      state.notifications.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.is_read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Mark As Read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n._id === action.payload);
        if (notification && !notification.is_read) {
          notification.is_read = true;
          notification.read_at = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Mark All As Read
      .addCase(markAllAsRead.fulfilled, (state, action) => {
        const readIds = action.payload;
        state.notifications = state.notifications.map(n => {
          if (readIds.includes(n._id)) {
            return { ...n, is_read: true, read_at: new Date().toISOString() };
          }
          return n;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  addNotification,
  clearNotifications,
  clearError,
} = notificationSlice.actions;

// Selectors
export const selectAllNotifications = (state) => state.notifications.notifications;
export const selectUnreadNotifications = (state) => 
  state.notifications.notifications.filter(n => !n.is_read);
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationLoading = (state) => state.notifications.isLoading;
export const selectNotificationError = (state) => state.notifications.error;
export const selectBookingNotifications = (state) =>
  state.notifications.notifications.filter(n => n.type === 'booking_update');

export default notificationSlice.reducer;


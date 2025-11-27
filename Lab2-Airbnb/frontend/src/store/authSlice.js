import { createSlice } from '@reduxjs/toolkit';

const getPersistedState = () => {
  try {
    const raw = localStorage.getItem('authState');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Unable to read persisted auth state:', err);
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false
  };
};

const persistState = (state) => {
  try {
    localStorage.setItem('authState', JSON.stringify(state));
  } catch (err) {
    console.warn('Unable to persist auth state:', err);
  }
};

const initialState = getPersistedState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload || {};
      state.user = user || null;
      state.token = token || null;
      state.isAuthenticated = !!(user || token);
      persistState({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated });
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      try {
        localStorage.removeItem('authState');
      } catch (err) {
        console.warn('Unable to clear persisted auth state:', err);
      }
    }
  }
});

export const { setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;
